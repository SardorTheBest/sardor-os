import { AppState, Book, BookQuote, Habit, Note, Project, ReadingSession, Tag, Task, UserProfile, AISettings, Language, Theme } from '../types';
import { db } from './db';
import { sound } from './sound';
import { syncService } from './supabaseSync';
import { i18n } from './i18n';
import { themeManager } from './theme';
import { notificationService } from './notificationService';

const STORAGE_KEY = 'sardor_os_state_v3_clean';

export const defaultAISettings: AISettings = {
  provider: 'gemini',
  geminiModel: 'gemini-3.7-flash',
  groqApiKey: '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',
  groqModel: 'openai/gpt-oss-120b',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  webllmModel: 'gemma-2-2b-it-q4f16_1-MLC',
  temperature: 0.7,
  selectedVoice: 'Zephyr',
  voiceAutoSpeak: true,
};

const defaultUserProfile: UserProfile = {
  name: 'Сардор',
  fullName: 'Аминов Сардор Азизжонович',
  birthDate: '2012-01-29',
  birthPlace: 'Бухара, Узбекистан',
  age: 14,
  aiName: 'Nova',
  email: 's6sarik@gmail.com',
  title: 'Systems & Cognitive Architect',
  status: 'Deep Space Orbit • Bukhara Nexus',
  focusMode: false,
  pinCode: '',
  pinEnabled: false,
  soundFxEnabled: true,
  voiceGreetingEnabled: true,
  language: 'ru',
  theme: 'dark',
  aiSettings: defaultAISettings,
};

const defaultTags: Tag[] = [
  { id: 'tag-1', name: 'Deep Work', color: '#4edea3', updatedAt: new Date().toISOString() },
  { id: 'tag-2', name: 'System', color: '#89ceff', updatedAt: new Date().toISOString() },
  { id: 'tag-3', name: 'Strategy', color: '#d0bcff', updatedAt: new Date().toISOString() },
];

const defaultTasks: Task[] = [];
const defaultHabits: Habit[] = [];
const defaultBooks: Book[] = [];
const defaultNotes: Note[] = [];
const defaultProjects: Project[] = [];

export class StorageManager {
  private state: AppState;
  private listeners: Array<(state: AppState) => void> = [];

  constructor() {
    this.state = this.loadInitialState();
    this.seedDexieIfEmpty();
  }

  private loadInitialState(): AppState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Ensure Sardor user is set
        if (!parsed.user || parsed.user.name !== 'Sardor') {
          parsed.user = {
            ...defaultUserProfile,
            ...(parsed.user || {}),
            name: 'Sardor',
            email: 's6sarik@gmail.com',
          };
        }
        return {
          user: parsed.user || defaultUserProfile,
          tasks: parsed.tasks || defaultTasks,
          tags: parsed.tags || defaultTags,
          habits: parsed.habits || defaultHabits,
          books: parsed.books || defaultBooks,
          readingSessions: parsed.readingSessions || [],
          notes: parsed.notes || defaultNotes,
          projects: parsed.projects || defaultProjects,
          activeView: parsed.activeView || 'dashboard',
          language: i18n.getLanguage(),
          theme: themeManager.getTheme(),
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved state, using defaults', e);
    }

    return {
      user: defaultUserProfile,
      tasks: defaultTasks,
      tags: defaultTags,
      habits: defaultHabits,
      books: defaultBooks,
      readingSessions: [],
      notes: defaultNotes,
      projects: defaultProjects,
      activeView: 'dashboard',
      language: i18n.getLanguage(),
      theme: themeManager.getTheme(),
    };
  }

  private async seedDexieIfEmpty() {
    try {
      const taskCount = await db.tasks.count();
      if (taskCount === 0) {
        await db.tasks.bulkPut(this.state.tasks);
        await db.tags.bulkPut(this.state.tags);
        await db.habits.bulkPut(this.state.habits);
        await db.books.bulkPut(this.state.books);
        await db.notes.bulkPut(this.state.notes);
        await db.projects.bulkPut(this.state.projects);
      }
    } catch (err) {
      console.warn('Dexie seed warning:', err);
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('LocalStorage save failed', e);
    }
    this.notify();
    
    // Background sync to Dexie
    this.syncToDexie();
  }

  private async syncToDexie() {
    try {
      await db.tasks.bulkPut(this.state.tasks);
      await db.tags.bulkPut(this.state.tags);
      await db.habits.bulkPut(this.state.habits);
      await db.books.bulkPut(this.state.books);
      await db.notes.bulkPut(this.state.notes);
      await db.projects.bulkPut(this.state.projects);
      // Sync scheduled reminders to SW & Dexie
      notificationService.syncAllReminders(this.state.tasks, this.state.habits);
    } catch (e) {
      // Background operation failure shouldn't crash app
    }
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((l) => l(copy));
  }

  // --- Navigation & View ---
  public setActiveView(view: AppState['activeView']) {
    this.state.activeView = view;
    sound.playClick();
    this.saveState();
  }

  public toggleFocusMode() {
    this.state.user.focusMode = !this.state.user.focusMode;
    sound.playPop();
    this.saveState();
  }

  public updateUserProfile(updates: Partial<UserProfile>) {
    this.state.user = {
      ...this.state.user,
      ...updates,
    };
    this.saveState();
  }

  // --- Task CRUD & Drag-and-Drop ---
  public addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.tasks.unshift(newTask);
    sound.playPop();
    this.saveState();
    return newTask;
  }

  public toggleTask(id: string): boolean {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return false;
    task.isCompleted = !task.isCompleted;
    task.updatedAt = new Date().toISOString();
    if (task.isCompleted) {
      sound.playComplete();
    } else {
      sound.playClick();
    }
    this.saveState();
    return true;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const index = this.state.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.state.tasks[index] = {
      ...this.state.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.state.tasks[index];
  }

  public deleteTask(id: string): boolean {
    const initialLen = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((t) => t.id !== id);
    if (this.state.tasks.length !== initialLen) {
      sound.playClick();
      this.saveState();
      return true;
    }
    return false;
  }

  public rescheduleTask(
    id: string,
    newDate?: string,
    newTime?: string,
    startTime?: string,
    endTime?: string
  ): boolean {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return false;
    if (newDate !== undefined) {
      task.dueDate = newDate || undefined;
    }
    if (newTime !== undefined) {
      task.dueTime = newTime || undefined;
    }
    if (startTime !== undefined) {
      task.startTime = startTime || undefined;
    }
    if (endTime !== undefined) {
      task.endTime = endTime || undefined;
    }
    task.updatedAt = new Date().toISOString();
    sound.playPop();
    this.saveState();
    return true;
  }

  public scheduleTaskTimeSpan(
    id: string,
    dateStr: string,
    startTime: string,
    endTime: string
  ): boolean {
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) return false;
    task.dueDate = dateStr;
    task.dueTime = startTime;
    task.startTime = startTime;
    task.endTime = endTime;
    task.updatedAt = new Date().toISOString();
    sound.playPop();
    this.saveState();
    return true;
  }

  // --- Habit CRUD ---
  public toggleHabitLog(id: string, dateStr: string): boolean {
    const habit = this.state.habits.find((h) => h.id === id);
    if (!habit) return false;
    
    const wasCompleted = !!habit.logs[dateStr];
    habit.logs[dateStr] = !wasCompleted;

    // Recalculate streak
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (habit.logs[str]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    habit.streak = streak;
    if (streak > habit.bestStreak) {
      habit.bestStreak = streak;
    }

    if (!wasCompleted) {
      sound.playComplete();
    } else {
      sound.playClick();
    }

    this.saveState();
    return true;
  }

  public addHabit(habitData: Omit<Habit, 'id' | 'streak' | 'bestStreak' | 'logs' | 'createdAt'>): Habit {
    const newHabit: Habit = {
      ...habitData,
      id: `habit-${Date.now()}`,
      streak: 0,
      bestStreak: 0,
      logs: {},
      createdAt: new Date().toISOString(),
    };
    this.state.habits.push(newHabit);
    sound.playPop();
    this.saveState();
    return newHabit;
  }

  public updateHabit(id: string, updates: Partial<Habit>): Habit | null {
    const index = this.state.habits.findIndex((h) => h.id === id);
    if (index === -1) return null;
    this.state.habits[index] = {
      ...this.state.habits[index],
      ...updates,
    };
    this.saveState();
    return this.state.habits[index];
  }

  public deleteHabit(id: string): boolean {
    const initialLen = this.state.habits.length;
    this.state.habits = this.state.habits.filter((h) => h.id !== id);
    if (this.state.habits.length !== initialLen) {
      sound.playClick();
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Book CRUD ---
  public addBook(bookData: Omit<Book, 'id' | 'quotes'> & { quotes?: BookQuote[] }): Book {
    const id = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const newBook: Book = {
      ...bookData,
      id,
      quotes: bookData.quotes || [],
      currentPage: Number(bookData.currentPage) || 0,
      totalPages: Number(bookData.totalPages) || 100,
      status: bookData.status || 'reading',
      rating: bookData.rating ?? 5,
      createdAt: now,
      updatedAt: now,
    };
    this.state.books = [newBook, ...this.state.books];
    sound.playPop();
    this.saveState();

    // Async Dexie & Supabase sync
    db.books.put(newBook).catch((err) => console.warn('Dexie book insert error:', err));
    syncService.queueRecord('books', 'insert', newBook);

    return newBook;
  }

  public updateBook(id: string, updates: Partial<Book>): Book | null {
    const index = this.state.books.findIndex((b) => b.id === id);
    if (index === -1) return null;
    const current = this.state.books[index];
    const updated: Book = {
      ...current,
      ...updates,
      currentPage: updates.currentPage !== undefined ? Number(updates.currentPage) : current.currentPage,
      totalPages: updates.totalPages !== undefined ? Number(updates.totalPages) : current.totalPages,
      updatedAt: new Date().toISOString(),
    };

    if (updated.currentPage >= updated.totalPages && updated.status !== 'completed') {
      updated.status = 'completed';
      if (!updated.finishDate) {
        updated.finishDate = new Date().toISOString().split('T')[0];
      }
      sound.playComplete();
    }

    this.state.books[index] = updated;
    this.saveState();

    db.books.put(updated).catch((err) => console.warn('Dexie book update error:', err));
    syncService.queueRecord('books', 'update', updated);

    return updated;
  }

  public deleteBook(id: string): boolean {
    const initialLen = this.state.books.length;
    this.state.books = this.state.books.filter((b) => b.id !== id);
    if (this.state.books.length !== initialLen) {
      sound.playClick();
      this.saveState();
      db.books.delete(id).catch((err) => console.warn('Dexie book delete error:', err));
      syncService.queueRecord('books', 'delete', { id });
      return true;
    }
    return false;
  }

  public logReadingSession(bookId: string, durationMinutes: number, pagesRead: number): ReadingSession {
    const session: ReadingSession = {
      id: `session-${Date.now()}`,
      bookId,
      durationMinutes,
      pagesRead,
      timestamp: new Date().toISOString(),
    };
    this.state.readingSessions.unshift(session);
    
    // Increment book page
    const book = this.state.books.find((b) => b.id === bookId);
    if (book) {
      const newPage = Math.min(book.totalPages, book.currentPage + pagesRead);
      this.updateBook(bookId, {
        currentPage: newPage,
        ...(newPage >= book.totalPages ? { status: 'completed', finishDate: new Date().toISOString().split('T')[0] } : {}),
      });
    }

    sound.playComplete();
    this.saveState();
    db.readingSessions.put(session).catch(console.warn);
    syncService.queueRecord('reading_sessions', 'insert', session);
    return session;
  }

  public addBookQuote(bookId: string, text: string, page?: number) {
    const book = this.state.books.find((b) => b.id === bookId);
    if (!book) return;
    const newQuote: BookQuote = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: text.trim(),
      page,
      createdAt: new Date().toISOString(),
    };
    book.quotes = [newQuote, ...book.quotes];
    book.updatedAt = new Date().toISOString();
    sound.playPop();
    this.saveState();
    db.books.put(book).catch(console.warn);
    syncService.queueRecord('books', 'update', book);
  }

  public deleteBookQuote(bookId: string, quoteId: string) {
    const book = this.state.books.find((b) => b.id === bookId);
    if (!book) return;
    book.quotes = book.quotes.filter((q) => q.id !== quoteId);
    book.updatedAt = new Date().toISOString();
    sound.playClick();
    this.saveState();
    db.books.put(book).catch(console.warn);
    syncService.queueRecord('books', 'update', book);
  }

  // --- Note CRUD ---
  public addNote(noteData: Omit<Note, 'id' | 'updatedAt'>): Note {
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    this.state.notes.unshift(newNote);
    sound.playPop();
    this.saveState();
    return newNote;
  }

  public togglePinNote(id: string): boolean {
    const note = this.state.notes.find((n) => n.id === id);
    if (!note) return false;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    sound.playClick();
    this.saveState();
    return true;
  }

  public updateNote(id: string, updates: Partial<Note>): Note | null {
    const index = this.state.notes.findIndex((n) => n.id === id);
    if (index === -1) return null;
    this.state.notes[index] = {
      ...this.state.notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.state.notes[index];
  }

  public deleteNote(id: string): boolean {
    const initialLen = this.state.notes.length;
    this.state.notes = this.state.notes.filter((n) => n.id !== id);
    if (this.state.notes.length !== initialLen) {
      sound.playClick();
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Projects CRUD ---
  public addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.projects.unshift(newProject);
    sound.playPop();
    this.saveState();
    db.projects.put(newProject).catch(console.warn);
    syncService.queueRecord('projects', 'insert', newProject);
    return newProject;
  }

  public updateProject(id: string, updates: Partial<Project>): Project | null {
    const index = this.state.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.state.projects[index] = {
      ...this.state.projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    db.projects.put(this.state.projects[index]).catch(console.warn);
    syncService.queueRecord('projects', 'update', this.state.projects[index]);
    return this.state.projects[index];
  }

  public deleteProject(id: string): { success: boolean; deletedTasksCount: number } {
    const initialLen = this.state.projects.length;
    const projectToDelete = this.state.projects.find((p) => p.id === id);
    if (!projectToDelete) {
      return { success: false, deletedTasksCount: 0 };
    }

    this.state.projects = this.state.projects.filter((p) => p.id !== id);

    // Delete all tasks linked to this project
    const tasksToDelete = this.state.tasks.filter((t) => t.projectId === id);
    const deletedTasksCount = tasksToDelete.length;
    this.state.tasks = this.state.tasks.filter((t) => t.projectId !== id);

    sound.playClick();
    this.saveState();

    // Delete from Dexie
    db.projects.delete(id).catch((err) => console.warn('Dexie project delete error:', err));
    if (deletedTasksCount > 0) {
      db.tasks.bulkDelete(tasksToDelete.map((t) => t.id)).catch((err) => console.warn('Dexie tasks delete error:', err));
    }

    // Queue sync to Supabase
    syncService.queueRecord('projects', 'delete', { id });
    tasksToDelete.forEach((t) => {
      syncService.queueRecord('tasks', 'delete', { id: t.id });
    });

    return { success: true, deletedTasksCount };
  }

  public toggleArchiveProject(id: string): Project | null {
    const project = this.state.projects.find((p) => p.id === id);
    if (!project) return null;
    const isNowArchived = project.status !== 'archived';
    project.status = isNowArchived ? 'archived' : 'in_progress';
    project.isArchived = isNowArchived;
    project.updatedAt = new Date().toISOString();
    sound.playPop();
    this.saveState();
    db.projects.put(project).catch(console.warn);
    syncService.queueRecord('projects', 'update', project);
    return project;
  }

  public toggleObjective(projectId: string, objectiveId: string): boolean {
    const project = this.state.projects.find((p) => p.id === projectId);
    if (!project) return false;
    const obj = project.objectives.find((o) => o.id === objectiveId);
    if (!obj) return false;
    obj.completed = !obj.completed;
    
    // Recalculate progress
    const total = project.objectives.length;
    const done = project.objectives.filter((o) => o.completed).length;
    project.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    if (project.progress === 100 && project.status !== 'archived') {
      project.status = 'completed';
      sound.playComplete();
    } else {
      sound.playClick();
    }
    project.updatedAt = new Date().toISOString();
    this.saveState();
    db.projects.put(project).catch(console.warn);
    syncService.queueRecord('projects', 'update', project);
    return true;
  }

  public addObjective(projectId: string, title: string): boolean {
    const project = this.state.projects.find((p) => p.id === projectId);
    if (!project || !title.trim()) return false;
    project.objectives.push({
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      completed: false,
    });
    // Recalculate progress
    const total = project.objectives.length;
    const done = project.objectives.filter((o) => o.completed).length;
    project.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    project.updatedAt = new Date().toISOString();
    sound.playPop();
    this.saveState();
    db.projects.put(project).catch(console.warn);
    syncService.queueRecord('projects', 'update', project);
    return true;
  }

  public deleteObjective(projectId: string, objectiveId: string): boolean {
    const project = this.state.projects.find((p) => p.id === projectId);
    if (!project) return false;
    project.objectives = project.objectives.filter((o) => o.id !== objectiveId);
    // Recalculate progress
    const total = project.objectives.length;
    const done = project.objectives.filter((o) => o.completed).length;
    project.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    project.updatedAt = new Date().toISOString();
    sound.playClick();
    this.saveState();
    db.projects.put(project).catch(console.warn);
    syncService.queueRecord('projects', 'update', project);
    return true;
  }

  // --- Tags CRUD ---
  public addTag(name: string, color: string): Tag {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: name.trim(),
      color,
      updatedAt: new Date().toISOString(),
    };
    this.state.tags.push(newTag);
    sound.playPop();
    this.saveState();
    return newTag;
  }

  public updateTag(id: string, updates: Partial<Tag>): Tag | null {
    const index = this.state.tags.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.state.tags[index] = {
      ...this.state.tags[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.state.tags[index];
  }

  public deleteTag(id: string): boolean {
    const initialLen = this.state.tags.length;
    this.state.tags = this.state.tags.filter((t) => t.id !== id);
    if (this.state.tags.length !== initialLen) {
      sound.playClick();
      this.saveState();
      return true;
    }
    return false;
  }

  // AI Settings
  public getAISettings(): AISettings {
    const userSettings: Partial<AISettings> = this.state.user?.aiSettings || {};
    
    // Auto-migrate any deprecated model IDs to active Groq models
    let groqModel = userSettings.groqModel || defaultAISettings.groqModel;
    if (
      !groqModel ||
      groqModel === 'llama-3.1-8b-instant' ||
      groqModel === 'llama-3.3-70b-versatile' ||
      groqModel === 'mixtral-8x7b-32768' ||
      groqModel === 'gemma2-9b-it'
    ) {
      groqModel = 'openai/gpt-oss-120b';
    }

    return {
      ...defaultAISettings,
      ...userSettings,
      groqModel,
      groqApiKey: (userSettings.groqApiKey && userSettings.groqApiKey.trim()) || defaultAISettings.groqApiKey,
    };
  }

  public updateAISettings(settings: Partial<AISettings>): AISettings {
    const current = this.getAISettings();
    const updated: AISettings = {
      ...current,
      ...settings,
    };
    this.state.user.aiSettings = updated;
    this.saveState();
    return updated;
  }

  public setLanguage(lang: Language) {
    i18n.setLanguage(lang);
    this.state.language = lang;
    this.state.user.language = lang;
    this.saveState();
  }

  public toggleLanguage(): Language {
    const next = i18n.toggleLanguage();
    this.state.language = next;
    this.state.user.language = next;
    this.saveState();
    return next;
  }

  public setTheme(theme: Theme) {
    themeManager.setTheme(theme);
    this.state.theme = theme;
    this.state.user.theme = theme;
    this.saveState();
  }

  public toggleTheme(): Theme {
    const next = themeManager.toggleTheme();
    this.state.theme = next;
    this.state.user.theme = next;
    this.saveState();
    return next;
  }

  public clearAllData() {
    this.state.tasks = [];
    this.state.habits = [];
    this.state.books = [];
    this.state.readingSessions = [];
    this.state.notes = [];
    this.state.projects = [];
    this.saveState();
    db.tasks.clear().catch(console.error);
    db.habits.clear().catch(console.error);
    db.books.clear().catch(console.error);
    db.readingSessions.clear().catch(console.error);
    db.notes.clear().catch(console.error);
    db.projects.clear().catch(console.error);
  }

  // Import whole JSON state
  public importState(newState: AppState) {
    this.state = newState;
    this.saveState();
    sound.playComplete();
  }
}

export const storage = new StorageManager();
