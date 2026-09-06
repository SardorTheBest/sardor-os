// Smart Voice-to-Action & Intent Parsing Service
// Powered by Web Speech API + Heuristic Offline NLP + AI Engine Booster

import { storage } from './storage';
import { sound } from './sound';
import { notificationService } from './notificationService';
import { Task, Book, Habit, Note, AppState } from '../types';

export type VoiceIntentType = 'create_task' | 'create_book' | 'log_reading' | 'create_habit' | 'check_habit' | 'create_note' | 'unknown';

export interface ParsedTaskPayload {
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  reminderEnabled: boolean;
  reminderOffsetMinutes?: number;
  estimatedMinutes?: number;
}

export interface ParsedBookPayload {
  title: string;
  author?: string;
  totalPages?: number;
  genre?: string;
  pagesReadNow?: number;
}

export interface ParsedReadingLogPayload {
  bookTitle?: string;
  pagesRead: number;
  durationMinutes?: number;
}

export interface ParsedHabitPayload {
  title: string;
  targetPerWeek?: number;
  color?: string;
  reminderTime?: string;
}

export interface ParsedNotePayload {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface ParsedVoiceAction {
  id: string;
  type: VoiceIntentType;
  rawTranscript: string;
  confidence: number;
  summary: string;
  taskPayload?: ParsedTaskPayload;
  bookPayload?: ParsedBookPayload;
  readingLogPayload?: ParsedReadingLogPayload;
  habitPayload?: ParsedHabitPayload;
  notePayload?: ParsedNotePayload;
  secondaryActions?: ParsedVoiceAction[];
}

// Check speech recognition support
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

class VoiceIntentService {
  private recognition: any = null;
  private isListening: boolean = false;
  private currentLanguage: 'ru' | 'en' = 'ru';

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  public setLanguage(lang: 'ru' | 'en') {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang === 'ru' ? 'ru-RU' : 'en-US';
    }
  }

  public startListening(callbacks: {
    onStart?: () => void;
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }): boolean {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognition.lang = this.currentLanguage === 'ru' ? 'ru-RU' : 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      sound.playClick();
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        callbacks.onInterim?.(interim);
      }
      if (final) {
        callbacks.onFinal?.(final);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      callbacks.onError?.(event.error || 'Voice recognition error');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      callbacks.onError?.(e.message || 'Could not start voice recognition');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Smart Offline Natural Language Intent Parsing
  public parseTranscript(rawText: string, state?: AppState): ParsedVoiceAction {
    const text = rawText.trim();
    const lower = text.toLowerCase();
    const now = new Date();

    // 1. Check for Multiple Tasks (e.g. "... и доделать ... и написать ...")
    if (lower.includes(' и ') && (lower.includes('напомни') || lower.includes('задач') || lower.includes('сделать'))) {
      const parts = text.split(/\s+и\s+/i);
      if (parts.length > 1) {
        const primary = this.parseSingleIntent(parts[0], now, state);
        const secondary = parts.slice(1).map((p) => this.parseSingleIntent(p, now, state));
        return {
          ...primary,
          rawTranscript: text,
          secondaryActions: secondary,
        };
      }
    }

    return this.parseSingleIntent(text, now, state);
  }

  private parseSingleIntent(rawText: string, now: Date, state?: AppState): ParsedVoiceAction {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // Clean greeting triggers like "нова", "nova", "эй нова", "привет нова"
    let cleanText = text
      .replace(/^(нова|nova|привет нова|эй нова|nova ai|нова аи)[,\s:]*/i, '')
      .trim();

    // --- Intent: Note / Second Brain ---
    if (
      lower.startsWith('запиши мысль') ||
      lower.startsWith('заметка') ||
      lower.startsWith('мысль:') ||
      lower.startsWith('запиши:') ||
      lower.includes('в заметки')
    ) {
      let content = cleanText
        .replace(/^(запиши мысль|заметка|мысль|запиши|добавь заметку)[,\s:]*/i, '')
        .replace(/\s+в заметки$/i, '')
        .trim();

      const title = content.length > 40 ? content.slice(0, 40) + '...' : content || 'Голосовая заметка';
      return {
        id: `action-${Date.now()}`,
        type: 'create_note',
        rawTranscript: text,
        confidence: 0.95,
        summary: `Создать заметку: "${title}"`,
        notePayload: {
          title,
          content,
          category: 'Голосовые мысли',
          tags: ['Голос', 'Вдохновение'],
        },
      };
    }

    // --- Intent: Habit Check / Habit Creation ---
    if (lower.includes('привычк')) {
      if (lower.includes('отметь') || lower.includes('выполнил') || lower.includes('сделал')) {
        const habitName = cleanText.replace(/.*?(привычку|привычка)\s*/i, '').trim();
        return {
          id: `action-${Date.now()}`,
          type: 'check_habit',
          rawTranscript: text,
          confidence: 0.9,
          summary: `Отметить привычку: "${habitName || 'Привычка'}"`,
          habitPayload: {
            title: habitName,
          },
        };
      } else {
        const habitName = cleanText.replace(/.*?(новая привычка|создай привычку|добавь привычку)\s*/i, '').trim();
        return {
          id: `action-${Date.now()}`,
          type: 'create_habit',
          rawTranscript: text,
          confidence: 0.9,
          summary: `Создать привычку: "${habitName || 'Новая привычка'}"`,
          habitPayload: {
            title: habitName || 'Новая привычка',
            targetPerWeek: 7,
            color: '#00ffab',
          },
        };
      }
    }

    // --- Intent: Books / Reading Session ---
    const pagesMatch = lower.match(/(почитал|прочитал|прочел)\s+(\d+)\s+страниц/i) || lower.match(/(\d+)\s+страниц.*?(книг[иа])/i);
    if (pagesMatch) {
      const pagesCount = parseInt(pagesMatch[2] || pagesMatch[1], 10) || 20;
      let bookTitle = '';
      const bookMatch = cleanText.match(/книг[иеау]\s+["«]?([^"»]+)["»]?/i);
      if (bookMatch) {
        bookTitle = bookMatch[1].trim();
      }

      return {
        id: `action-${Date.now()}`,
        type: 'log_reading',
        rawTranscript: text,
        confidence: 0.92,
        summary: `Зафиксировать чтение: ${pagesCount} стр.${bookTitle ? ` («${bookTitle}»)` : ''}`,
        readingLogPayload: {
          pagesRead: pagesCount,
          bookTitle,
          durationMinutes: Math.round(pagesCount * 1.5),
        },
      };
    }

    if (lower.includes('книг') && (lower.includes('добавь') || lower.includes('купил') || lower.includes('начал читать'))) {
      const bookTitleMatch = cleanText.match(/(добавь книгу|начал читать|купил книгу)\s+["«]?([^"»]+)["»]?/i);
      const title = bookTitleMatch ? bookTitleMatch[2].trim() : 'Новая книга';
      return {
        id: `action-${Date.now()}`,
        type: 'create_book',
        rawTranscript: text,
        confidence: 0.88,
        summary: `Добавить книгу: «${title}»`,
        bookPayload: {
          title,
          totalPages: 320,
          genre: 'Саморазвитие & Мышление',
        },
      };
    }

    // --- Default & Universal Intent: Task Creation with Smart Scheduling ---
    const taskDetails = this.extractTaskDetails(cleanText, now);

    return {
      id: `action-${Date.now()}`,
      type: 'create_task',
      rawTranscript: text,
      confidence: 0.94,
      summary: `Создать задачу: "${taskDetails.title}"`,
      taskPayload: taskDetails,
    };
  }

  // Comprehensive Date/Time/Priority/Tags Extractor
  private extractTaskDetails(input: string, now: Date): ParsedTaskPayload {
    let clean = input
      .replace(/^(напомни|создай задачу|добавь задачу|запланируй|надо|нужно|сделай|поставь задачу)[,\s:]*/i, '')
      .trim();

    let targetDate = new Date(now);
    let dueTime: string | undefined = undefined;
    let reminderEnabled = false;
    let priority: 'low' | 'medium' | 'high' = 'medium';
    const tags: string[] = [];

    const lower = clean.toLowerCase();

    // Priority Detection
    if (lower.includes('срочно') || lower.includes('важно') || lower.includes('высокий приоритет') || lower.includes('high priority')) {
      priority = 'high';
      clean = clean.replace(/\b(срочно|важно|высокий приоритет|high priority)\b/gi, '').trim();
    } else if (lower.includes('низкий приоритет') || lower.includes('не срочно')) {
      priority = 'low';
      clean = clean.replace(/\b(низкий приоритет|не срочно)\b/gi, '').trim();
    }

    // Reminder Flag
    if (lower.includes('напомни') || lower.includes('с напоминанием') || lower.includes('поставь напоминание')) {
      reminderEnabled = true;
    }

    // Tag keywords
    if (lower.includes('книг') || lower.includes('почитать') || lower.includes('страниц')) tags.push('Книги');
    if (lower.includes('код') || lower.includes('программир') || lower.includes('стил') || lower.includes('css') || lower.includes('api')) tags.push('Разработка');
    if (lower.includes('дизайн') || lower.includes('ui') || lower.includes('ux') || lower.includes('карточк')) tags.push('Дизайн');
    if (lower.includes('спорт') || lower.includes('тренировк') || lower.includes('зал') || lower.includes('бег')) tags.push('Здоровье');
    if (lower.includes('работ') || lower.includes('митинг') || lower.includes('созвон') || lower.includes('клиент')) tags.push('Работа');
    if (lower.includes('учеб') || lower.includes('философи') || lower.includes('лекци') || lower.includes('экзамен')) tags.push('Обучение');

    // Date parsing
    if (lower.includes('послезавтра')) {
      targetDate.setDate(targetDate.getDate() + 2);
      clean = clean.replace(/\bпослезавтра\b/gi, '').trim();
    } else if (lower.includes('завтра') || lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
      clean = clean.replace(/\b(завтра|tomorrow)\b/gi, '').trim();
    } else if (lower.includes('сегодня') || lower.includes('today')) {
      // stays today
      clean = clean.replace(/\b(сегодня|today)\b/gi, '').trim();
    } else if (lower.includes('в понедельник')) {
      this.advanceToDay(targetDate, 1);
      clean = clean.replace(/\bв понедельник\b/gi, '').trim();
    } else if (lower.includes('во вторник')) {
      this.advanceToDay(targetDate, 2);
      clean = clean.replace(/\bво вторник\b/gi, '').trim();
    } else if (lower.includes('в среду')) {
      this.advanceToDay(targetDate, 3);
      clean = clean.replace(/\bв среду\b/gi, '').trim();
    } else if (lower.includes('в четверг')) {
      this.advanceToDay(targetDate, 4);
      clean = clean.replace(/\bв четверг\b/gi, '').trim();
    } else if (lower.includes('в пятницу')) {
      this.advanceToDay(targetDate, 5);
      clean = clean.replace(/\bв пятницу\b/gi, '').trim();
    } else if (lower.includes('в субботу')) {
      this.advanceToDay(targetDate, 6);
      clean = clean.replace(/\bв субботу\b/gi, '').trim();
    } else if (lower.includes('в воскресенье')) {
      this.advanceToDay(targetDate, 0);
      clean = clean.replace(/\bв воскресенье\b/gi, '').trim();
    }

    // Time parsing (e.g. "в 4 дня", "в 16:00", "в 9 вечера", "в 11 утра", "в 14 часов")
    const timeMatch =
      clean.match(/в\s+(\d{1,2})[:.](\d{2})/i) ||
      clean.match(/в\s+(\d{1,2})\s+(дня|вечера|утра|ночи|часов|ч|pm|am)/i) ||
      clean.match(/в\s+(\d{1,2})\b/i);

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      let minutes = timeMatch[2] && !isNaN(parseInt(timeMatch[2], 10)) ? parseInt(timeMatch[2], 10) : 0;
      const period = (timeMatch[2] || '').toLowerCase();

      if (period === 'дня' || period === 'вечера' || period === 'pm') {
        if (hours < 12) hours += 12;
      } else if (period === 'утра' || period === 'am') {
        if (hours === 12) hours = 0;
      } else if (hours <= 6 && !period) {
        // Assume afternoon if someone says "в 4" -> 16:00
        hours += 12;
      }

      hours = Math.max(0, Math.min(23, hours));
      minutes = Math.max(0, Math.min(59, minutes));

      dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      clean = clean.replace(timeMatch[0], '').trim();
      reminderEnabled = true;
    }

    // Final cleanup of title
    let title = clean
      .replace(/^[\s,.;:-]+/, '')
      .replace(/[\s,.;:-]+$/, '')
      .trim();

    if (!title) {
      title = 'Новая задача';
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    return {
      title,
      dueDate: dueDateStr,
      dueTime,
      priority,
      tags,
      reminderEnabled,
      reminderOffsetMinutes: 0,
      estimatedMinutes: 30,
    };
  }

  private advanceToDay(d: Date, targetDayOfWeek: number) {
    const currentDay = d.getDay();
    let diff = targetDayOfWeek - currentDay;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
  }

  // Execute and persist the parsed voice action into storage & system alarms
  public async executeAction(action: ParsedVoiceAction, state?: AppState): Promise<{ success: boolean; message: string }> {
    sound.playComplete();

    if (action.type === 'create_task' && action.taskPayload) {
      const p = action.taskPayload;
      const tagId = (state?.tags || []).find((t) =>
        p.tags && p.tags.length > 0 && p.tags[0].toLowerCase().includes(t.name.toLowerCase())
      )?.id || (state?.tags && state.tags[0] ? state.tags[0].id : undefined);

      const createdTask = storage.addTask({
        title: p.title,
        dueDate: p.dueDate,
        dueTime: p.dueTime,
        startTime: p.dueTime,
        priority: p.priority || 'medium',
        tagId,
        isCompleted: false,
        reminderEnabled: p.reminderEnabled,
        reminderPreset: p.reminderOffsetMinutes === 15 ? '15m' : p.reminderOffsetMinutes === 60 ? '1h' : 'exact',
      });

      // Schedule system alarm if reminder is set
      if (p.reminderEnabled && p.dueTime) {
        notificationService.syncAllReminders(storage.getState().tasks, storage.getState().habits);
      }

      // Execute secondary actions if any
      if (action.secondaryActions && action.secondaryActions.length > 0) {
        for (const sec of action.secondaryActions) {
          await this.executeAction(sec, state);
        }
      }

      return {
        success: true,
        message: `Задача «${p.title}» успешно создана${p.dueTime ? ` на ${p.dueDate} в ${p.dueTime}` : ''}!`,
      };
    }

    if (action.type === 'create_note' && action.notePayload) {
      const np = action.notePayload;
      storage.addNote({
        title: np.title,
        content: np.content,
        category: np.category || 'Голосовые мысли',
        tags: np.tags || ['Голос'],
        pinned: false,
      });
      return {
        success: true,
        message: `Заметка «${np.title}» сохранена в Second Brain!`,
      };
    }

    if (action.type === 'log_reading' && action.readingLogPayload) {
      const rp = action.readingLogPayload;
      // Find matching book or default to active reading book
      const targetBook =
        (state?.books || []).find((b) => rp.bookTitle && b.title.toLowerCase().includes(rp.bookTitle.toLowerCase())) ||
        (state?.books || []).find((b) => b.status === 'reading') ||
        (state?.books || [])[0];

      if (targetBook) {
        storage.logReadingSession(targetBook.id, rp.durationMinutes || 30, rp.pagesRead);
        return {
          success: true,
          message: `Записано ${rp.pagesRead} стр. для книги «${targetBook.title}»!`,
        };
      }
    }

    if (action.type === 'create_habit' && action.habitPayload) {
      const hp = action.habitPayload;
      storage.addHabit({
        name: hp.title,
        category: 'Продуктивность',
        frequency: 'daily',
        targetCount: hp.targetPerWeek || 7,
        color: hp.color || '#00ffab',
        reminderEnabled: false,
      });
      return {
        success: true,
        message: `Привычка «${hp.title}» добавлена!`,
      };
    }

    if (action.type === 'check_habit' && action.habitPayload) {
      const hp = action.habitPayload;
      const today = new Date().toISOString().split('T')[0];
      const matchHabit = (state?.habits || []).find((h) =>
        hp.title ? h.name.toLowerCase().includes(hp.title.toLowerCase()) : false
      );
      if (matchHabit) {
        storage.toggleHabitLog(matchHabit.id, today);
        return {
          success: true,
          message: `Привычка «${matchHabit.name}» отмечена на сегодня!`,
        };
      }
    }

    return {
      success: true,
      message: 'Действие выполнено!',
    };
  }
}

export const voiceIntentService = new VoiceIntentService();
