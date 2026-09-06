import { AppState, AIProvider, AISettings } from '../types';
import { storage } from './storage';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  providerUsed?: AIProvider;
  modelUsed?: string;
  image?: string; // base64
  mimeType?: string;
  audioUrl?: string;
  videoUrl?: string;
  isGeneratingMedia?: boolean;
}

export interface ModelProgress {
  progress: number; // 0 to 100
  text: string;
  isLoading: boolean;
}

// Comprehensive Models Directory
export const AI_MODELS = {
  gemini: [
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash',
      category: 'Text & Reasoning',
      description: 'Новейшая флагманская модель Google. Сверхбыстрая, глубокое рассуждение и код ⚡',
      badge: 'Рекомендуется',
      isDefault: true,
    },
    {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro',
      category: 'Deep Thought & Math',
      description: 'Максимальная точность для сложной архитектуры, олимпиадных задач и науки 🧠',
      badge: 'Pro Tier',
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      category: 'Fast Assistant',
      description: 'Экономичная и молниеносная модель для повседневных задач 🚀',
      badge: 'Ultra Fast',
    },
  ],
  geminiMedia: {
    images: [
      { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Lite Image (Быстрая генерация & Редактирование)' },
      { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image (Высокая детализация 1K/2K)' },
      { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image (Ultra HD 4K Quality)' },
    ],
    videos: [
      { id: 'veo-3.1-lite-generate-preview', name: 'Veo 3.1 Lite (Быстрая генерация видео 720p/1080p)' },
      { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 (Кинематографичное видео 1080p)' },
    ],
    audio: [
      { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS (Синтез голоса Nova)' },
      { id: 'gemini-3.5-transcribe', name: 'Gemini 3.5 Transcribe (Распознавание речи)' },
      { id: 'lyria-3-clip-preview', name: 'Lyria 3 Clip (Генерация музыки до 30 секунд)' },
      { id: 'lyria-3-pro-preview', name: 'Lyria 3 Pro (Полноформатные треки)' },
    ],
  },
  webllm: [
    {
      id: 'gemma-2-2b-it-q4f16_1-MLC',
      name: 'Google Gemma 2 2B Instruct',
      size: '~1.4GB',
      badge: 'Google Offline',
      description: 'Официальная модель Google Gemma для работы прямо в браузере без интернета.',
    },
    {
      id: 'gemma-2-2b-it-q4f32_1-MLC',
      name: 'Google Gemma 2 2B (Float32)',
      size: '~1.9GB',
      badge: 'High Precision',
      description: 'Полноточная версия Gemma 2 с повышенной глубиной ответов.',
    },
    {
      id: 'gemma-2-9b-it-q4f16_1-MLC',
      name: 'Google Gemma 2 9B Instruct',
      size: '~5.4GB',
      badge: 'Heavy / Top Quality',
      description: 'Мощнейшая открытая модель Google для ПК с 8GB+ VRAM.',
    },
    {
      id: 'gemma-2b-it-q4f16_1-MLC',
      name: 'Google Gemma 1 2B',
      size: '~1.3GB',
      badge: 'Legacy Google',
      description: 'Компактная классическая модель Gemma.',
    },
    {
      id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      name: 'Meta Llama 3.2 1B',
      size: '~650MB',
      badge: 'Super Fast',
      description: 'Легковесная модель Meta для моментального старта.',
    },
    {
      id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      name: 'Meta Llama 3.2 3B',
      size: '~1.8GB',
      badge: 'Balanced',
      description: 'Отличное соотношение скорости и логики.',
    },
    {
      id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      name: 'Alibaba Qwen 2.5 0.5B',
      size: '~350MB',
      badge: 'Ultra-light',
      description: 'Загрузка за секунды, минимальное потребление памяти.',
    },
    {
      id: 'SmolLM2-135M-Instruct-q0f16-MLC',
      name: 'HuggingFace SmolLM2 135M',
      size: '~120MB',
      badge: 'Instant',
      description: 'Микро-модель для мгновенного тестирования.',
    },
  ],
  groq: [
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Точный, глубокий и умный)', speed: '🧠 Top Precision' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B (Мгновенный отклик ⚡)', speed: '⚡ Ultra Fast' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Отличное знание языков)', speed: '⚡ Fast' },
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', speed: '🚀 Advanced' },
    { id: 'groq/compound-mini', name: 'Compound Mini', speed: '⚡ Fast' },
    { id: 'groq/compound', name: 'Compound', speed: '🧠 Analytical' },
  ],
  ollama: [
    { id: 'gemma2:2b', name: 'Google Gemma 2 2B (Ollama)' },
    { id: 'gemma2:9b', name: 'Google Gemma 2 9B (Ollama)' },
    { id: 'llama3.2', name: 'Llama 3.2' },
    { id: 'llama3.1', name: 'Llama 3.1' },
    { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
    { id: 'phi3', name: 'Phi-3 Mini' },
    { id: 'mistral', name: 'Mistral 7B' },
  ],
};

class AIEngineService {
  private webllmEngine: any = null;
  private currentWebLLMModel: string | null = null;
  private isWebLLMInitializing = false;
  private audioContext: AudioContext | null = null;

  public isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  // Generate Nova / Jarvis persona system prompt with structured user & database context
  public buildSystemContext(state: AppState): string {
    const today = new Date().toISOString().split('T')[0];
    const user = state.user;
    
    // User profile attributes
    const userName = user.fullName || 'Аминов Сардор Азизжонович';
    const userShortName = user.name || 'Сардор';
    const birthDate = user.birthDate || '2012-01-29';
    const birthPlace = user.birthPlace || 'Бухара, Узбекистан';
    const userAge = user.age || 14;

    // Habits context
    const habitsSummary = state.habits.map((h) => {
      const isDoneToday = !!h.logs[today];
      return `- ${h.name}: ${h.streak} дн. стрейк (макс: ${h.bestStreak}), сегодня: ${isDoneToday ? '✅ Выполнено' : '⏳ Не выполнено'}`;
    }).join('\n');

    // Books context
    const readingBooks = state.books.filter((b) => b.status === 'reading').map((b) => {
      const pct = Math.round((b.currentPage / b.totalPages) * 100);
      return `- "${b.title}" (${b.author}): стр. ${b.currentPage}/${b.totalPages} (${pct}%), заметок: ${b.quotes?.length || 0}`;
    }).join('\n');

    const completedBooks = state.books.filter((b) => b.status === 'completed').map((b) => 
      `- "${b.title}" (${b.author}) - Оценка: ${b.rating}/5`
    ).join('\n');

    // Tasks context
    const pendingTasks = state.tasks.filter((t) => !t.isCompleted);
    const highPriorityTasks = pendingTasks.filter((t) => t.priority === 'high');
    const tasksSummary = `Активных задач: ${pendingTasks.length} (из них ${highPriorityTasks.length} высокого приоритета):\n` +
      pendingTasks.slice(0, 6).map((t) => `- [${t.priority.toUpperCase()}] ${t.title} (дедлайн: ${t.dueDate || 'сегодня'} ${t.dueTime || ''})`).join('\n');

    return `Ты — **Nova (Нова)**, персональный интеллектуальный ИИ-ассистент мужского рода для пользователя **${userName}** (${userShortName}).

👤 **ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:**
- ФИО: ${userName}
- Имя для обращения: ${userShortName}, Сэр или Сардор Азизжонович
- Возраст: ${userAge} лет
- Роль: ${user.title || 'Ведущий архитектор систем и технологий'}
- Текущий статус: ${user.status || 'Active Orbit'}

🤖 **ПРАВИЛА И СТИЛЬ ОТВЕТОВ (NOVA):**
1. **Мужской род**: Говори о себе в мужском роде ("я подготовил", "я проанализировал", "я готов").
2. **Лаконичность по умолчанию**: Отвечай строго по существу, четко, емко и без лишней воды или длинных вводных фраз.
3. **Глубина по запросу**: Если пользователь прямо просит подробный разбор (слова "подробно", "детально", "развернуто", "распиши", "полная информация"), давай исчерпывающий структурированный ответ с разделами и кодом.
4. **Форматирование**: Используй чистый Markdown (списки, таблицы, блоки кода).
5. **Запрет скрытых мыслей**: Не выводи теги <thought> или <think> в ответ — только финальный полезный текст.

📊 **ТЕКУЩИЙ КОНТЕКСТ СИСТЕМЫ:**
📅 Дата: ${today}

🔥 **ПРИВЫЧКИ (${state.habits.length}):**
${habitsSummary || 'Нет активных привычек.'}

📖 **КНИГИ В ЧТЕНИИ:**
${readingBooks || 'Сейчас нет активных книг.'}

📋 **ЗАДАЧИ:**
${tasksSummary}

🎯 **ПРОЕКТЫ:**
${state.projects.map((p) => `- ${p.title} (${p.progress}%)`).join('\n') || 'Нет активных проектов.'}`;
  }

  // Main Stream Chat Router
  public async streamChat({
    messages,
    state,
    onChunk,
    onDone,
    onError,
    onProgress,
    enableSearch = false,
    enableMaps = false,
    imageAttachment,
  }: {
    messages: ChatMessage[];
    state: AppState;
    onChunk: (chunk: string) => void;
    onDone: (fullText: string) => void;
    onError: (err: Error) => void;
    onProgress?: (progress: ModelProgress) => void;
    enableSearch?: boolean;
    enableMaps?: boolean;
    imageAttachment?: { data: string; mimeType: string };
  }): Promise<void> {
    const settings = storage.getAISettings();
    const provider = settings.provider || 'gemini';

    try {
      if (provider === 'gemini') {
        await this.streamGemini(messages, state, settings, onChunk, onDone, onError, enableSearch, enableMaps, imageAttachment);
      } else if (provider === 'webllm') {
        await this.streamWebLLM(messages, state, settings, onChunk, onDone, onError, onProgress);
      } else if (provider === 'ollama') {
        await this.streamOllama(messages, state, settings, onChunk, onDone, onError);
      } else if (provider === 'groq') {
        await this.streamGroq(messages, state, settings, onChunk, onDone, onError);
      } else {
        await this.streamGemini(messages, state, settings, onChunk, onDone, onError, enableSearch, enableMaps, imageAttachment);
      }
    } catch (err: any) {
      console.warn(`[AIEngine] Primary provider ${provider} encountered an error, attempting auto-fallback:`, err);
      
      // Auto-fallback chain: Gemini -> Groq -> WebLLM / Heuristics
      if (provider === 'gemini') {
        // Fallback to Groq if Groq key exists, else smart heuristics
        if (settings.groqApiKey && settings.groqApiKey.trim()) {
          try {
            const fallbackNote = `*(Нова: переключаюсь на резервный квантовый канал Groq Cloud API...)*\n\n`;
            onChunk(fallbackNote);
            await this.streamGroq(messages, state, settings, onChunk, (text) => onDone(fallbackNote + text), onError);
            return;
          } catch (groqErr) {
            console.warn('[AIEngine] Groq fallback failed:', groqErr);
          }
        }
      }

      if (provider === 'groq') {
        if (this.isWebGPUSupported()) {
          try {
            const fallbackNote = `*(Нова: переключаюсь на локальный движок WebLLM Gemma в браузере...)*\n\n`;
            onChunk(fallbackNote);
            await this.streamWebLLM(messages, state, settings, onChunk, (text) => onDone(fallbackNote + text), onError, onProgress);
            return;
          } catch (webllmErr) {
            console.warn('[AIEngine] WebLLM fallback failed:', webllmErr);
          }
        }
      }

      // Default smart local heuristics engine
      this.streamLocalHeuristics(messages, state, onChunk, onDone);
    }
  }

  // --- Provider 1: Google Gemini 3.x via Server-Side API ---
  private async streamGemini(
    messages: ChatMessage[],
    state: AppState,
    settings: AISettings,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: Error) => void,
    enableSearch = false,
    enableMaps = false,
    imageAttachment?: { data: string; mimeType: string }
  ) {
    const model = settings.geminiModel || 'gemini-3.7-flash';
    const systemInstruction = this.buildSystemContext(state);

    const payload = {
      model,
      systemInstruction,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        image: m.image,
        mimeType: m.mimeType,
      })),
      temperature: settings.temperature || 0.7,
      enableSearch,
      enableMaps,
      imageParts: imageAttachment ? [imageAttachment] : [],
    };

    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server Gemini error (HTTP ${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const fullText = data.text || '';

    // Smoothly stream output to the UI
    const words = fullText.split(' ');
    let currentIdx = 0;

    if (words.length <= 1) {
      onChunk(fullText);
      onDone(fullText);
      return;
    }

    const interval = setInterval(() => {
      if (currentIdx < words.length) {
        const nextBatch = words.slice(currentIdx, currentIdx + 4).join(' ') + ' ';
        onChunk(nextBatch);
        currentIdx += 4;
      } else {
        clearInterval(interval);
        onDone(fullText);
      }
    }, 20);
  }

  // --- Provider 2: WebLLM In-Browser Offline GPU Inference (Gemma 2, Llama 3.2, Qwen) ---
  private async streamWebLLM(
    messages: ChatMessage[],
    state: AppState,
    settings: AISettings,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: Error) => void,
    onProgress?: (progress: ModelProgress) => void
  ) {
    if (!this.isWebGPUSupported()) {
      throw new Error('WebGPU не поддерживается в текущем браузере.');
    }

    const modelId = settings.webllmModel || 'gemma-2-2b-it-q4f16_1-MLC';

    if (!this.webllmEngine || this.currentWebLLMModel !== modelId) {
      this.isWebLLMInitializing = true;
      onProgress?.({ progress: 5, text: `Подключение к WebGPU & загрузка весов ${modelId}...`, isLoading: true });

      try {
        const webllm = await import('@mlc-ai/web-llm');
        
        const engine = await webllm.CreateMLCEngine(modelId, {
          initProgressCallback: (report) => {
            const pct = Math.round(report.progress * 100);
            onProgress?.({
              progress: pct,
              text: report.text || `Кэширование модели Google Gemma в IndexedDB: ${pct}%`,
              isLoading: pct < 100,
            });
          },
        });

        this.webllmEngine = engine;
        this.currentWebLLMModel = modelId;
        this.isWebLLMInitializing = false;
        onProgress?.({ progress: 100, text: 'Модель готова к офлайн-работе!', isLoading: false });
      } catch (err: any) {
        this.isWebLLMInitializing = false;
        throw new Error(`Failed to initialize WebLLM engine: ${err.message}`);
      }
    }

    const systemPrompt = this.buildSystemContext(state);
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let fullText = '';
    const chunks = await this.webllmEngine.chat.completions.create({
      messages: formattedMessages,
      temperature: settings.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }

    onDone(fullText);
  }

  // --- Provider 3: Local Ollama ---
  public async fetchOllama(
    endpoint: string,
    options: RequestInit,
    settings: AISettings
  ): Promise<Response> {
    const rawUrl = (settings.ollamaUrl || 'http://localhost:11434').trim().replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const isLocalhost =
      rawUrl.includes('localhost') ||
      rawUrl.includes('127.0.0.1') ||
      rawUrl.includes('0.0.0.0') ||
      rawUrl === '';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    const candidates: string[] = [];
    if (rawUrl) {
      candidates.push(`${rawUrl}${cleanEndpoint}`);
    }
    if (isLocalhost) {
      candidates.push(`/api/ollama${cleanEndpoint}`);
      candidates.push(`http://127.0.0.1:11434${cleanEndpoint}`);
    } else {
      candidates.push(`/api/ollama${cleanEndpoint}`);
    }

    if (isHttps && isLocalhost) {
      candidates.sort((a) => (a.startsWith('/') ? -1 : 1));
    }

    let lastError: Error | null = null;
    for (const url of candidates) {
      try {
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
        };

        const response = await fetch(url, {
          ...options,
          headers: reqHeaders,
          mode: 'cors',
        });

        if (response.ok || response.status === 404 || response.status === 400) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error(`Не удалось связаться с Ollama (${rawUrl})`);
  }

  private async streamOllama(
    messages: ChatMessage[],
    state: AppState,
    settings: AISettings,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: Error) => void
  ) {
    const model = settings.ollamaModel || 'gemma2:2b';
    const systemPrompt = this.buildSystemContext(state);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await this.fetchOllama(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          stream: true,
          options: {
            temperature: settings.temperature || 0.7,
          },
        }),
      },
      settings
    );

    if (!response.ok) {
      throw new Error(`Ollama вернула статус ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Нет входящего потока от Ollama.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const delta = json.message?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // ignore
        }
      }
    }

    onDone(fullText);
  }

  // --- Provider 4: Groq Cloud API ---
  private async streamGroq(
    messages: ChatMessage[],
    state: AppState,
    settings: AISettings,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: Error) => void
  ) {
    const apiKey = settings.groqApiKey?.trim();
    if (!apiKey) {
      throw new Error('Groq API Key is missing. Please set it in AI Settings.');
    }

    let model = settings.groqModel || 'openai/gpt-oss-120b';
    const systemPrompt = this.buildSystemContext(state);
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: settings.temperature || 0.7,
        stream: true,
      }),
    });

    if (!response.ok && response.status === 404) {
      model = 'openai/gpt-oss-20b';
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: settings.temperature || 0.7,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorBody);
      } catch {
        // non-json
      }
      throw new Error(errorJson?.error?.message || `Groq API error (${response.status}): ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No stream returned from Groq API.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue;

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.substring(5).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || delta?.text || '';
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    onDone(fullText);
  }

  // --- Smart Local Heuristics Fallback Engine ---
  private streamLocalHeuristics(
    messages: ChatMessage[],
    state: AppState,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void
  ) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const q = lastUserMessage.toLowerCase();
    const user = state.user;
    const name = user.name || 'Сардор';

    let fullResponse = '';

    if (q.includes('привыч') || q.includes('habit') || q.includes('streak') || q.includes('дисциплин')) {
      const today = new Date().toISOString().split('T')[0];
      const doneToday = state.habits.filter((h) => !!h.logs[today]).length;
      const totalHabits = state.habits.length;
      const topHabit = [...state.habits].sort((a, b) => b.streak - a.streak)[0];

      fullResponse = `📊 **Нова (Jarvis OS): Анализ привычек и стрейков Сардора**\n\n` +
        `• **Статус на сегодня:** Выполнено **${doneToday} из ${totalHabits}** привычек.\n` +
        `• **Лидер по непрерывности:** **${topHabit?.name || 'Deep Work'}** (активный стрейк: **${topHabit?.streak || 0} дней**, рекорд: **${topHabit?.bestStreak || 0}**).\n\n` +
        `💡 **3 тактических совета от Новы:**\n` +
        `1. **Правило двух минут:** Если к вечеру устали, сделайте мини-версию (1 страницу, 2 минуты разминки) — главное не обрывать цепочку стрейка.\n` +
        `2. **Habit Stacking:** Привязывайте чтение книги к вечернему чаепитию.\n` +
        `3. **Фокус на постоянстве:** Вы на отличном пути, Сэр! Закройте оставшиеся цели до сна.`;
    } else if (q.includes('саммари') || q.includes('summary') || q.includes('книг') || q.includes('выжимк')) {
      const activeBook = state.books.find((b) => b.status === 'reading') || state.books[0];
      if (activeBook) {
        const pct = Math.round((activeBook.currentPage / activeBook.totalPages) * 100);
        fullResponse = `📖 **Нова: Саммари и аналитика «${activeBook.title}» (${activeBook.author})**\n\n` +
          `• **Текущий прогресс Сардора:** прочитано ${activeBook.currentPage} из ${activeBook.totalPages} стр. (${pct}%).\n` +
          `• **Сохранено цитат в Vault:** ${activeBook.quotes?.length || 0}.\n\n` +
          `🧠 **Главные тезисы и выжимка книги:**\n` +
          `1. **Системность важнее случайного вдохновения:** Великие результаты строятся на регулярности микро-шагов.\n` +
          `2. **Осознанная практика:** Анализ ошибок и быстрая обратная связь дают десятикратное ускорение прогресса.\n` +
          `3. **Применение на практике:** Не откладывайте прочитанное — сразу превращайте инсайты в задачи Zing OS.\n\n` +
          `*Совет:* Запустите 25-минутную сессию с таймером в модуле Reading Vault.`;
      } else {
        fullResponse = `📖 **Нова:** Сэр, в вашем хранилище сейчас нет активных книг. Добавьте книгу в Reading Vault, и я подготовлю её детальный разбор!`;
      }
    } else if (q.includes('порекомендуй') || q.includes('recommend') || q.includes('следующ') || q.includes('что почитать')) {
      fullResponse = `📚 **Нова: Персональные рекомендации книг для Сардора:**\n\n` +
        `1. **«Атомные привычки» — Джеймс Клир**\n` +
        `   *Почему стоит прочесть:* Мощная база для автоматизации дисциплины и масштабирования личных результатов.\n\n` +
        `2. **«В работу с головой» (Deep Work) — Кэл Ньюпорт**\n` +
        `   *Почему стоит прочесть:* Искусство бескомпромиссного фокуса в мире бесконечных уведомлений.\n\n` +
        `3. **«Чистый код» — Роберт Мартин**\n` +
        `   *Почему стоит прочесть:* Фундамент архитектурного мышления для создания надежных программных комплексов.\n\n` +
        `Хотите, я помогу внести одну из них в ваш список чтения?`;
    } else if (q.includes('задач') || q.includes('план') || q.includes('день') || q.includes('schedule') || q.includes('time')) {
      const pending = state.tasks.filter((t) => !t.isCompleted);
      const high = pending.filter((t) => t.priority === 'high');
      
      fullResponse = `🎯 **Нова: Стратегический план продуктивности для Сардора:**\n\n` +
        `• **Ключевой фокус (Top Priority):**\n` +
        (high.length > 0 
          ? high.map((t) => `  - ⚡ **${t.title}** (${t.dueTime || 'Утренний блок'})`).join('\n')
          : `  - Все срочные задачи закрыты! Отличная работа, Сэр.`) +
        `\n\n• **Рекомендуемый распорядок:**\n` +
        `  - **Блок 1 (09:00 - 11:30):** Deep Work (главная задача, программирование, учеба).\n` +
        `  - **Блок 2 (14:00 - 15:30):** Аналитика, задачи и текущие дела (${pending.length} активных).\n` +
        `  - **Блок 3 (20:00 - 21:00):** Чтение в Reading Vault и отметка привычек.\n\n` +
        `Я готов помочь с любой из этих задач.`;
    } else {
      fullResponse = `🤖 **Нова (Ваш личный ИИ-ассистент):**\n\n` +
        `Приветствую, Сардор! Все бортовые системы Zing OS в норме:\n` +
        `• Активных задач: **${state.tasks.filter((t) => !t.isCompleted).length}**\n` +
        `• Трекинг привычек: **${state.habits.length}** активных цепочек\n` +
        `• Книг в хранилище: **${state.books.length}**\n\n` +
        `Чем я могу помочь вам прямо сейчас, Сэр? Вы можете спросить меня о коде, учебе, планах, попросить сгенерировать иллюстрацию или составить саммари.`;
    }

    const words = fullResponse.split(' ');
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < words.length) {
        const nextBatch = words.slice(currentIdx, currentIdx + 3).join(' ') + ' ';
        onChunk(nextBatch);
        currentIdx += 3;
      } else {
        clearInterval(interval);
        onDone(fullResponse);
      }
    }, 20);
  }

  // --- Image Generation & Editing API ---
  public async generateImage({
    prompt,
    model = 'gemini-3.1-flash-lite-image',
    aspectRatio = '1:1',
    imageSize = '1K',
    baseImage,
    mimeType,
  }: {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    baseImage?: string;
    mimeType?: string;
  }): Promise<{ imageUrl: string; text?: string; modelUsed: string }> {
    const res = await fetch('/api/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        aspectRatio,
        imageSize,
        baseImage,
        mimeType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Ошибка генерации изображения (${res.status})`);
    }

    return await res.json();
  }

  // --- Video Generation with Veo API ---
  public async generateVideo({
    prompt,
    model = 'veo-3.1-lite-generate-preview',
    aspectRatio = '16:9',
    resolution = '720p',
    imageBytes,
    mimeType,
    onStatusUpdate,
  }: {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    resolution?: string;
    imageBytes?: string;
    mimeType?: string;
    onStatusUpdate?: (status: string) => void;
  }): Promise<{ videoBlobUrl: string }> {
    onStatusUpdate?.('Инициализация генерации видео в Google Veo...');
    
    const initRes = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        aspectRatio,
        resolution,
        imageBytes,
        mimeType,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      throw new Error(err.error || 'Не удалось запустить генерацию видео.');
    }

    const { operationName } = await initRes.json();
    if (!operationName) {
      throw new Error('Операция Veo не возвратила operationName.');
    }

    onStatusUpdate?.('Обработка видео нейросетью Google Veo (обычно занимает 20-45 сек)...');

    // Poll operation status
    let done = false;
    let attempts = 0;
    while (!done && attempts < 40) {
      attempts++;
      await new Promise((r) => setTimeout(r, 6000));
      onStatusUpdate?.(`Рендеринг видеокадров... (${attempts * 6}с)`);

      const statusRes = await fetch('/api/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.done) {
          done = true;
          if (statusData.error) {
            throw new Error(`Ошибка генерации видео: ${statusData.error.message || JSON.stringify(statusData.error)}`);
          }
          break;
        }
      }
    }

    onStatusUpdate?.('Загрузка готового видеопотока...');

    const downloadRes = await fetch('/api/video-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName }),
    });

    if (!downloadRes.ok) {
      throw new Error('Не удалось скачать видео.');
    }

    const blob = await downloadRes.blob();
    const videoBlobUrl = URL.createObjectURL(blob);
    return { videoBlobUrl };
  }

  // --- Voice / Text-to-Speech (TTS) for Nova Jarvis Voice ---
  public async speakText(
    text: string,
    voiceName = 'Zephyr',
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    try {
      // 1. Try high-fidelity server-side Gemini TTS
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voiceName || 'Zephyr',
          promptModifier: 'Говори четко, интеллигентно, доброжелательно и технологично в роли Новы/Джарвиса',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          // Play base64 audio
          const audioSrc = `data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`;
          const audio = new Audio(audioSrc);
          audio.onplay = () => onStart?.();
          audio.onended = () => onEnd?.();
          audio.onerror = () => {
            this.speakWithWebSpeech(text, onStart, onEnd);
          };
          try {
            await audio.play();
          } catch {
            onEnd?.();
          }
          return;
        }
      }
    } catch {
      // Fallback
    }

    // 2. Fallback to browser Web Speech API
    this.speakWithWebSpeech(text, onStart, onEnd);
  }

  public speakWithWebSpeech(text: string, onStart?: () => void, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~[\]()]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 0.95; // slightly lower pitch for male Jarvis feel

    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find((v) => v.lang.startsWith('ru') && (v.name.includes('Male') || v.name.includes('Dmitri') || v.name.includes('Pavel') || v.name.includes('Yuri'))) ||
      voices.find((v) => v.lang.startsWith('ru')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (ruVoice) {
      utterance.voice = ruVoice;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  }

  public stopTTS() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Dynamic Dashboard Jarvis Greetings ---
  public getRandomJarvisGreeting(state: AppState): { greeting: string; speechText: string } {
    const user = state.user;
    const name = user.name || 'Сардор';
    const hour = new Date().getHours();
    
    const pendingTasks = state.tasks.filter((t) => !t.isCompleted).length;
    const activeHabitsDone = state.habits.filter((h) => !!h.logs[new Date().toISOString().split('T')[0]]).length;
    const totalHabits = state.habits.length;
    const activeBook = state.books.find((b) => b.status === 'reading');

    let timeGreeting = 'Добрый день';
    if (hour >= 5 && hour < 12) timeGreeting = 'Доброе утро';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Добрый день';
    else if (hour >= 18 && hour < 23) timeGreeting = 'Добрый вечер';
    else timeGreeting = 'Доброй ночи';

    const greetings = [
      {
        greeting: `⚡ ${timeGreeting}, ${name}! Нова на связи. Все системы Zing OS синхронизированы и функционируют в штатном режиме. Сегодня у вас ${pendingTasks} активных задач. Приступим к покорению новых высот!`,
        speechText: `${timeGreeting}, ${name}! Нова на связи. Все системы функционируют в штатном режиме. Сегодня у вас ${pendingTasks} активных задач. Готов к выполнению ваших поручений!`,
      },
      {
        greeting: `🌌 Приветствую, ${name}! Нова приветствует вас в командном центре Бухары. Привычки закрыты на ${activeHabitsDone} из ${totalHabits}. Фокусируемся на главном!`,
        speechText: `Приветствую, Сардор! Нова на связи. Готов помочь с кодом, учебой и задачами на сегодня.`,
      },
      {
        greeting: `🎯 ${timeGreeting}, Сэр! Бортовой ИИ Нова готов к работе. ${activeBook ? `В хранилище вас ожидает книга «${activeBook.title}».` : 'Библиотека готова к новым книгам.'} Чем займемся в первую очередь?`,
        speechText: `${timeGreeting}, Сэр! Нова готов к работе. Чем займемся в первую очередь?`,
      },
      {
        greeting: `🚀 Здравствуйте, Сардор Азизжонович! Ваши стрейки активности защищены локальным хранилищем. Нова готов обработать любые запросы, от генерации медиа до аналитики дня.`,
        speechText: `Здравствуйте, Сардор Азизжонович! Нова к вашим услугам. Удачного и продуктивного дня!`,
      },
      {
        greeting: `✨ Рад видеть вас в Zing OS, ${name}! Протоколы Deep Work активны. Нова готов ассистировать вам во всех начинаниях.`,
        speechText: `Рад видеть вас в Zing OS, ${name}! Нова готов ассистировать вам во всех начинаниях.`,
      },
    ];

    const idx = Math.floor(Math.random() * greetings.length);
    return greetings[idx];
  }

  // --- Audio Transcription ---
  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1] || '');
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);
    const audioData = await base64Promise;

    const res = await fetch('/api/gemini/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData,
        mimeType: audioBlob.type || 'audio/webm',
      }),
    });

    if (!res.ok) {
      throw new Error('Ошибка распознавания речи.');
    }

    const data = await res.json();
    return data.text || '';
  }

  // --- Test Provider Connection ---
  public async testProvider(provider: AIProvider, settings: AISettings): Promise<{ success: boolean; message: string; models?: string[] }> {
    if (provider === 'gemini') {
      try {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.geminiModel || 'gemini-3.7-flash',
            messages: [{ role: 'user', content: 'Тест связи. Ответь одним словом "Готов".' }],
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            message: `Google AI Studio (Gemini 3.7 / 3.1) подключен успешно! Ответ: "${data.text?.trim()}"`,
            models: AI_MODELS.gemini.map((m) => m.name),
          };
        } else {
          const err = await res.json().catch(() => ({}));
          return {
            success: false,
            message: err.error || `Ошибка связи с Google Gemini (HTTP ${res.status})`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Не удалось связаться с сервером Gemini: ${err.message}`,
        };
      }
    }

    if (provider === 'webllm') {
      if (!this.isWebGPUSupported()) {
        return { success: false, message: 'WebGPU не поддерживается в этом браузере. Используйте Chrome 113+, Edge или Safari 18+.' };
      }
      return {
        success: true,
        message: 'WebGPU доступен! Модели Google Gemma 2 2B / 9B готовы к автономной работе в браузере.',
        models: AI_MODELS.webllm.map((m) => m.name),
      };
    }

    if (provider === 'ollama') {
      try {
        const res = await this.fetchOllama('/api/tags', { method: 'GET' }, settings);
        if (res.ok) {
          const data = await res.json();
          const models = data.models?.map((m: any) => m.name) || [];
          const modelListStr = models.length > 0 ? ` (${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''})` : '';
          return {
            success: true,
            message: `Подключение к Ollama успешно! Найдено локальных моделей: ${models.length}${modelListStr}`,
            models,
          };
        }
        return { success: false, message: `Ollama вернула статус: ${res.status}` };
      } catch (err: any) {
        return { success: false, message: `Не удалось подключиться к Ollama: ${err.message}` };
      }
    }

    if (provider === 'groq') {
      const key = settings.groqApiKey?.trim();
      if (!key) {
        return { success: false, message: 'Введите Groq API ключ для тестирования.' };
      }
      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) {
          const data = await res.json();
          const models = data.data?.map((m: any) => m.id).filter((id: string) => !id.includes('whisper') && !id.includes('guard')) || [];
          return {
            success: true,
            message: 'Groq API подключен успешно! Высокоскоростной доступ к GPT OSS 120B и Qwen активен.',
            models,
          };
        }
        return { success: false, message: `Ошибка проверки ключа Groq (HTTP ${res.status})` };
      } catch (err: any) {
        return { success: false, message: `Ошибка сети при подключении к Groq: ${err.message}` };
      }
    }

    return { success: true, message: 'Локальный движок Новы готов к работе.' };
  }
}

export const aiEngine = new AIEngineService();
