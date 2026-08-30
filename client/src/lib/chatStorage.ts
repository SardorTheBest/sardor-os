import { AIChatThread, ChatMessage } from '../types';
import { db } from './db';
import { syncService } from './supabaseSync';
import { i18n } from './i18n';

const THREADS_CACHE_KEY = 'sardor_os_ai_threads_v1';
const ACTIVE_THREAD_ID_KEY = 'sardor_os_active_thread_id';

type ThreadsListener = (threads: AIChatThread[], activeThreadId: string | null) => void;
const listeners: Set<ThreadsListener> = new Set();

function createInitialDefaultThread(): AIChatThread {
  const lang = i18n.getLanguage();
  const id = `thread-${Date.now()}`;
  return {
    id,
    title: lang === 'ru' ? 'Новый диалог' : 'New Conversation',
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-init-welcome',
        role: 'assistant',
        content:
          lang === 'ru'
            ? `⚡ **Приветствую, Сардор!** Я **Nova** — твой персональный ИИ-ассистент в системе **Sardor OS**.

Чем могу помочь сегодня? Вы можете писать код, разбирать алгоритмы, анализировать продуктивность или создавать фотореалистичные изображения и видео через **Google AI Studio & Veo**!`
            : `⚡ **Greetings, Sardor!** I am **Nova** — your personal intelligent AI assistant in **Sardor OS**.

How can I assist you today? You can write code, analyze algorithms, brainstorm architectures, or generate high-quality media with **Google AI Studio & Veo**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: 'gemini',
        modelUsed: 'gemini-3.7-flash',
      },
    ],
  };
}

let cachedThreads: AIChatThread[] = (() => {
  if (typeof window === 'undefined') return [createInitialDefaultThread()];
  try {
    const raw = localStorage.getItem(THREADS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load cached threads:', e);
  }
  const defaultThread = createInitialDefaultThread();
  return [defaultThread];
})();

let activeThreadId: string | null = (() => {
  if (typeof window === 'undefined') return cachedThreads[0]?.id || null;
  const saved = localStorage.getItem(ACTIVE_THREAD_ID_KEY);
  if (saved && cachedThreads.some((t) => t.id === saved)) return saved;
  return cachedThreads[0]?.id || null;
})();

// Load from Dexie asynchronously
if (typeof window !== 'undefined') {
  db.aiThreads.toArray().then((dbThreads) => {
    if (dbThreads && dbThreads.length > 0) {
      cachedThreads = dbThreads.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      if (!activeThreadId || !cachedThreads.some((t) => t.id === activeThreadId)) {
        activeThreadId = cachedThreads[0]?.id || null;
      }
      persistCache();
      notify();
    } else {
      // Seed Dexie with initial thread
      if (cachedThreads.length > 0) {
        db.aiThreads.bulkPut(cachedThreads).catch(console.error);
      }
    }
  }).catch(console.error);
}

function persistCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(cachedThreads));
    if (activeThreadId) {
      localStorage.setItem(ACTIVE_THREAD_ID_KEY, activeThreadId);
    }
  } catch (e) {
    console.error('Failed to persist threads cache:', e);
  }
}

function notify() {
  listeners.forEach((fn) => fn([...cachedThreads], activeThreadId));
}

export const chatStorage = {
  getThreads(): AIChatThread[] {
    return [...cachedThreads];
  },

  getActiveThreadId(): string | null {
    return activeThreadId;
  },

  getActiveThread(): AIChatThread | undefined {
    return cachedThreads.find((t) => t.id === activeThreadId);
  },

  setActiveThreadId(id: string) {
    if (activeThreadId === id) return;
    activeThreadId = id;
    persistCache();
    notify();
  },

  createThread(title?: string, initialPrompt?: string): AIChatThread {
    const lang = i18n.getLanguage();
    const id = `thread-${Date.now()}`;
    const newThread: AIChatThread = {
      id,
      title: title || (initialPrompt ? initialPrompt.slice(0, 36) + '...' : lang === 'ru' ? 'Новый диалог' : 'New Conversation'),
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: initialPrompt
        ? [
            {
              id: `user-${Date.now()}`,
              role: 'user',
              content: initialPrompt,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]
        : [],
    };

    cachedThreads = [newThread, ...cachedThreads];
    activeThreadId = id;
    persistCache();

    // Persist to Dexie & sync
    db.aiThreads.put(newThread).catch(console.error);
    syncService.queueRecord('ai_threads', 'insert', newThread);

    notify();
    return newThread;
  },

  saveThread(thread: AIChatThread) {
    const idx = cachedThreads.findIndex((t) => t.id === thread.id);
    const updatedThread: AIChatThread = {
      ...thread,
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      cachedThreads[idx] = updatedThread;
    } else {
      cachedThreads = [updatedThread, ...cachedThreads];
    }

    // Keep sorted: pinned first, then by updatedAt
    cachedThreads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    persistCache();

    // Persist to Dexie & sync
    db.aiThreads.put(updatedThread).catch(console.error);
    syncService.queueRecord('ai_threads', 'update', updatedThread);

    notify();
  },

  updateThreadTitle(id: string, title: string) {
    const thread = cachedThreads.find((t) => t.id === id);
    if (!thread) return;
    this.saveThread({ ...thread, title: title.trim() || 'Untitled Chat' });
  },

  togglePinThread(id: string) {
    const thread = cachedThreads.find((t) => t.id === id);
    if (!thread) return;
    this.saveThread({ ...thread, isPinned: !thread.isPinned });
  },

  deleteThread(id: string) {
    cachedThreads = cachedThreads.filter((t) => t.id !== id);
    if (activeThreadId === id) {
      activeThreadId = cachedThreads[0]?.id || null;
      if (!activeThreadId) {
        const fallback = this.createThread();
        activeThreadId = fallback.id;
      }
    }

    persistCache();

    // Remove from Dexie & sync
    db.aiThreads.delete(id).catch(console.error);
    syncService.queueRecord('ai_threads', 'delete', { id });

    notify();
  },

  addMessage(threadId: string, message: ChatMessage) {
    const thread = cachedThreads.find((t) => t.id === threadId);
    if (!thread) return;

    let title = thread.title;
    // Auto-generate title from first user prompt if still default
    if (
      message.role === 'user' &&
      (title === 'Новый диалог' || title === 'New Conversation' || title.startsWith('Untitled'))
    ) {
      title = message.content.slice(0, 32) + (message.content.length > 32 ? '...' : '');
    }

    const updatedMessages = [...thread.messages, message];
    this.saveThread({
      ...thread,
      title,
      messages: updatedMessages,
    });
  },

  updateMessage(threadId: string, messageId: string, update: Partial<ChatMessage>) {
    const thread = cachedThreads.find((t) => t.id === threadId);
    if (!thread) return;

    const updatedMessages = thread.messages.map((m) => (m.id === messageId ? { ...m, ...update } : m));
    this.saveThread({
      ...thread,
      messages: updatedMessages,
    });
  },

  deleteMessage(threadId: string, messageId: string) {
    const thread = cachedThreads.find((t) => t.id === threadId);
    if (!thread) return;

    const updatedMessages = thread.messages.filter((m) => m.id !== messageId);
    this.saveThread({
      ...thread,
      messages: updatedMessages,
    });
  },

  // Truncate everything after target message (used when editing a prompt to re-run AI generation)
  truncateAfterMessage(threadId: string, messageId: string): ChatMessage[] {
    const thread = cachedThreads.find((t) => t.id === threadId);
    if (!thread) return [];

    const index = thread.messages.findIndex((m) => m.id === messageId);
    if (index === -1) return thread.messages;

    const truncated = thread.messages.slice(0, index + 1);
    this.saveThread({
      ...thread,
      messages: truncated,
    });
    return truncated;
  },

  clearThreadMessages(threadId: string) {
    const thread = cachedThreads.find((t) => t.id === threadId);
    if (!thread) return;
    this.saveThread({
      ...thread,
      messages: [],
    });
  },

  subscribe(listener: ThreadsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
