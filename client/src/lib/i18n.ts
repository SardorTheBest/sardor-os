import { Language } from '../types';

export const translations = {
  ru: {
    appName: 'Sardor OS',
    appSubtitle: 'САРДОР • БУХАРА',
    orbit: 'ОРБИТА УПРАВЛЕНИЯ',
    
    // Navigation
    nav: {
      dashboard: 'Дашборд',
      tasks: 'Задачи',
      calendar: 'Календарь',
      habits: 'Привычки',
      books: 'Книги',
      notes: 'База знаний',
      projects: 'Проекты',
      ai: 'Nova',
      focusActive: 'Фокус: Активен',
      focusOrbit: 'Режим фокуса',
      muteAudio: 'Выключить звуки',
      unmuteAudio: 'Включить звуки',
      shortcuts: 'Горячие клавиши (?)',
      lock: 'Заблокировать пульт',
      autonomous: 'Автономно',
    },

    // Topbar
    topbar: {
      searchPlaceholder: 'Поиск по Sardor OS...',
      synced: 'Синхронизировано',
      syncing: 'Синхронизация...',
      offline: 'Офлайн (IndexedDB)',
      error: 'Ошибка синхронизации',
      focusOrbit: 'Focus Orbit',
      themeDark: 'Тёмная тема',
      themeLight: 'Светлая тема',
      toggleLanguage: 'Switch to English',
      toggleSidebar: 'Свернуть / Развернуть панель',
    },

    // Nova AI
    nova: {
      title: 'Nova',
      subtitle: 'Интеллектуальный ассистент',
      newChat: 'Новый чат',
      searchChats: 'Поиск диалогов...',
      pinnedChats: 'Закрепленные',
      recentChats: 'История диалогов',
      noChats: 'Диалогов пока нет',
      renameChat: 'Переименовать',
      pinChat: 'Закрепить',
      unpinChat: 'Открепить',
      deleteChat: 'Удалить диалог',
      deleteConfirm: 'Удалить этот диалог безвозвратно?',
      editPrompt: 'Редактировать запрос',
      saveAndRegenerate: 'Сохранить и перегенерировать',
      cancel: 'Отмена',
      copy: 'Копировать',
      copied: 'Скопировано!',
      deleteMessage: 'Удалить сообщение',
      inputPlaceholder: 'Спросите Nova о коде, архитектуре, задачах или саммари...',
      send: 'Отправить',
      dictation: 'Голосовой ввод',
      speak: 'Озвучить ответ',
      stopSpeaking: 'Остановить озвучку',
      engine: 'Движок',
      searchGrounding: 'Поиск Google',
      mapsGrounding: 'Карты Google',
      chatTab: 'Чат Nova',
      imageTab: 'Image Studio',
      videoTab: 'Veo Video Studio',
      clearChat: 'Очистить диалог',
      generating: 'Nova обрабатывает запрос...',
      connectionError: 'Ошибка подключения к модели.',
      initialGreeting: `⚡ **Приветствую, Сардор!** Я **Nova** — твой персональный ИИ-ассистент в системе **Sardor OS**.

Чем могу помочь сегодня? Вы можете писать код, разбирать алгоритмы, анализировать продуктивность или создавать медиа через Google AI Studio & Veo.`,
      
      // Image Studio
      imageStudioTitle: 'Генерация изображений',
      imagePromptPlaceholder: 'Опишите изображение в деталях...',
      aspectRatio: 'Формат кадра',
      quality: 'Разрешение',
      generateImage: 'Сгенерировать',
      generatingImage: 'Генерация...',
      imageGallery: 'Галерея изображений',
      noImages: 'Здесь появятся ваши сгенерированные изображения.',
      download: 'Скачать',

      // Video Studio
      videoStudioTitle: 'Veo 3.1 • Кинематографичные видео',
      videoPromptPlaceholder: 'Опишите сцену видео...',
      generateVideo: 'Создать видео Veo',
      renderingVideo: 'Рендеринг...',
      videoGallery: 'Галерея видеороликов',
      noVideos: 'Здесь появятся ваши кинематографичные видео от Google Veo.',
    },

    // Empty States
    empty: {
      tasksTitle: 'Нет активных задач',
      tasksDesc: 'Создайте новую задачу, чтобы спланировать сегодняшний день и расставить приоритеты.',
      tasksAction: 'Добавить задачу',

      habitsTitle: 'Список привычек пуст',
      habitsDesc: 'Добавьте полезную привычку для формирования дисциплины и отслеживания ежедневных стрейков.',
      habitsAction: 'Создать привычку',

      booksTitle: 'Reading Vault пуст',
      booksDesc: 'Добавьте первую книгу, чтобы отслеживать прочитанные страницы, цитаты и конспекты.',
      booksAction: 'Добавить книгу',

      notesTitle: 'Заметок пока нет',
      notesDesc: 'Фиксируйте мысли, архитектурные решения и конспекты в единой базе знаний.',
      notesAction: 'Создать заметку',

      projectsTitle: 'Нет активных проектов',
      projectsDesc: 'Сформулируйте квартальную цель и декомпозируйте её на конкретные задачи.',
      projectsAction: 'Создать проект',

      calendarEmpty: 'На этот день нет запланированных событий.',
    },

    // Common actions & terms
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      close: 'Закрыть',
      search: 'Поиск',
      filter: 'Фильтр',
      all: 'Все',
      today: 'Сегодня',
      settings: 'Настройки',
      online: 'В сети',
      offline: 'Офлайн',
      high: 'Высокий',
      medium: 'Средний',
      low: 'Низкий',
      status: 'Статус',
      progress: 'Прогресс',
    },
  },

  en: {
    appName: 'Sardor OS',
    appSubtitle: 'SARDOR • BUKHARA',
    orbit: 'COMMAND ORBIT',

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      calendar: 'Calendar',
      habits: 'Habits',
      books: 'Reading',
      notes: 'Knowledge',
      projects: 'Projects',
      ai: 'Nova',
      focusActive: 'Focus: Active',
      focusOrbit: 'Focus Orbit',
      muteAudio: 'Mute Audio FX',
      unmuteAudio: 'Enable Audio FX',
      shortcuts: 'Keyboard Shortcuts (?)',
      lock: 'Lock Cockpit',
      autonomous: 'Autonomous',
    },

    // Topbar
    topbar: {
      searchPlaceholder: 'Search anything in Sardor OS...',
      synced: 'Synced',
      syncing: 'Syncing...',
      offline: 'Offline (IndexedDB)',
      error: 'Sync Error',
      focusOrbit: 'Focus Orbit',
      themeDark: 'Dark Theme',
      themeLight: 'Light Theme',
      toggleLanguage: 'Переключить на Русский',
      toggleSidebar: 'Toggle Sidebar',
    },

    // Nova AI
    nova: {
      title: 'Nova',
      subtitle: 'Intelligent AI Assistant',
      newChat: 'New Chat',
      searchChats: 'Search chats...',
      pinnedChats: 'Pinned',
      recentChats: 'Recent Chats',
      noChats: 'No conversations yet',
      renameChat: 'Rename',
      pinChat: 'Pin to top',
      unpinChat: 'Unpin',
      deleteChat: 'Delete Chat',
      deleteConfirm: 'Are you sure you want to permanently delete this chat?',
      editPrompt: 'Edit prompt',
      saveAndRegenerate: 'Save & Regenerate',
      cancel: 'Cancel',
      copy: 'Copy',
      copied: 'Copied!',
      deleteMessage: 'Delete message',
      inputPlaceholder: 'Ask Nova about code, architecture, tasks, or summaries...',
      send: 'Send',
      dictation: 'Voice input',
      speak: 'Speak response',
      stopSpeaking: 'Stop audio',
      engine: 'Engine',
      searchGrounding: 'Google Search',
      mapsGrounding: 'Google Maps',
      chatTab: 'Nova Chat',
      imageTab: 'Image Studio',
      videoTab: 'Veo Video Studio',
      clearChat: 'Clear chat',
      generating: 'Nova is processing...',
      connectionError: 'Connection error to AI model.',
      initialGreeting: `⚡ **Greetings, Sardor!** I am **Nova** — your personal AI assistant in **Sardor OS**.

How can I assist you today? You can write code, analyze algorithms, audit productivity, or generate media with Google AI Studio & Veo.`,

      // Image Studio
      imageStudioTitle: 'Image Generation',
      imagePromptPlaceholder: 'Describe your desired image in detail...',
      aspectRatio: 'Aspect Ratio',
      quality: 'Resolution',
      generateImage: 'Generate',
      generatingImage: 'Generating...',
      imageGallery: 'Created Artworks',
      noImages: 'Your generated artworks will appear here.',
      download: 'Download',

      // Video Studio
      videoStudioTitle: 'Veo 3.1 • Cinematic Videos',
      videoPromptPlaceholder: 'Describe the video scene...',
      generateVideo: 'Generate Veo Video',
      renderingVideo: 'Rendering...',
      videoGallery: 'Created Videos',
      noVideos: 'Your cinematic videos from Google Veo will appear here.',
    },

    // Empty States
    empty: {
      tasksTitle: 'No active tasks',
      tasksDesc: 'Create a new task to plan your day, schedule priorities, and track milestones.',
      tasksAction: 'Add Task',

      habitsTitle: 'No habits tracked yet',
      habitsDesc: 'Add a habit to build empowering daily routines and maintain high-consistency streaks.',
      habitsAction: 'Create Habit',

      booksTitle: 'Reading Vault is empty',
      booksDesc: 'Add your first book to track reading progress, save quotes, and summarize insights.',
      booksAction: 'Add Book',

      notesTitle: 'No notes found',
      notesDesc: 'Capture architectural insights, ideas, and cheat sheets in your unified knowledge base.',
      notesAction: 'Create Note',

      projectsTitle: 'No active projects',
      projectsDesc: 'Define a high-impact objective and break it down into actionable milestones.',
      projectsAction: 'Create Project',

      calendarEmpty: 'No scheduled events for this date.',
    },

    // Common actions & terms
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      close: 'Close',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      today: 'Today',
      settings: 'Settings',
      online: 'Online',
      offline: 'Offline',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      status: 'Status',
      progress: 'Progress',
    },
  },
};

const LANG_KEY = 'sardor_os_language';

type Listener = (lang: Language) => void;
const listeners: Set<Listener> = new Set();

let currentLanguage: Language = ((): Language => {
  if (typeof window === 'undefined') return 'ru';
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'ru' || saved === 'en') return saved;
  return 'ru';
})();

export const i18n = {
  getLanguage(): Language {
    return currentLanguage;
  },

  setLanguage(lang: Language) {
    if (lang === currentLanguage) return;
    currentLanguage = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, lang);
    }
    listeners.forEach((fn) => fn(currentLanguage));
  },

  toggleLanguage(): Language {
    const next: Language = currentLanguage === 'ru' ? 'en' : 'ru';
    this.setLanguage(next);
    return next;
  },

  t<K extends keyof typeof translations['ru']>(key: K): (typeof translations['ru'])[K] {
    return translations[currentLanguage][key] || translations['ru'][key];
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
