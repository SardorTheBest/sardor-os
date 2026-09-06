export type Priority = 'low' | 'medium' | 'high';

export interface Tag {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
  isSynced?: boolean;
}

export interface ScheduledReminder {
  id: string;
  targetId: string;
  type: 'task' | 'habit' | 'system';
  title: string;
  body: string;
  scheduledTime: number; // Unix timestamp in ms
  dueDateStr?: string;
  dueTimeStr?: string;
  fired: boolean;
  createdAt: string;
  tag?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM (legacy or fallback)
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  tagId?: string;
  priority: Priority;
  projectId?: string;
  reminderEnabled?: boolean;
  reminderDateTime?: string; // YYYY-MM-DDTHH:mm
  reminderPreset?: 'exact' | '15m' | '1h' | '1d';
  reminderFired?: boolean;
  createdAt: string;
  updatedAt: string;
  isSynced?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  frequency: 'daily' | 'weekly';
  targetCount: number;
  color: string;
  streak: number;
  bestStreak: number;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM
  logs: Record<string, boolean>; // 'YYYY-MM-DD': boolean
  createdAt: string;
}

export interface BookQuote {
  id: string;
  text: string;
  page?: number;
  createdAt: string;
}

export interface BookChapter {
  id: string;
  title: string;
  content: string;
}

export interface BookHighlight {
  id: string;
  text: string;
  color: string;
  createdAt: string;
  note?: string;
  page?: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  coverUrl?: string;
  coverColor?: string;
  totalPages: number;
  currentPage: number;
  status: 'reading' | 'completed' | 'want_to_read';
  rating: number;
  startDate?: string;
  finishDate?: string;
  quotes: BookQuote[];
  notes?: string;
  content?: string; // Full text content
  fileType?: 'text' | 'pdf' | 'epub' | 'fb2';
  fileDataUrl?: string; // Data URL or object URL for uploaded PDF/EPUB/FB2
  hasLocalFile?: boolean;
  fileName?: string;
  fileSize?: number;
  chapters?: BookChapter[];
  highlights?: BookHighlight[];
  lastReadPosition?: number; // 0 to 100%
  fontSize?: number;
  readerTheme?: 'dark' | 'light' | 'sepia' | 'oled';
  fontFamily?: 'serif' | 'sans' | 'mono';
  readingSpeedPerHour?: number;
  estimatedCompletionDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SplitViewConfig {
  enabled: boolean;
  leftView: AppState['activeView'];
  rightView: AppState['activeView'];
  ratio: number; // percentage width for left view (e.g. 50 = 50%, 60 = 60%)
}

export interface ReadingSession {
  id: string;
  bookId: string;
  durationMinutes: number;
  pagesRead: number;
  startPage?: number;
  endPage?: number;
  speedPagesPerHour?: number;
  timestamp: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
}

export interface ProjectObjective {
  id: string;
  title: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'in_progress' | 'planned' | 'completed' | 'archived';
  progress: number;
  quarter: string;
  objectives: ProjectObjective[];
  color: string;
  icon?: string;
  isArchived?: boolean;
  targetDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AIProvider = 'gemini' | 'webllm' | 'ollama' | 'groq' | 'openrouter';

export interface AISettings {
  provider: AIProvider;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  webllmModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  temperature?: number;
  selectedVoice?: string;
  voiceAutoSpeak?: boolean;
  speechSpeed?: number;
  systemPromptOverride?: string;
}

export type Language = 'ru' | 'en';
export type Theme = 'dark' | 'light';

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

export interface AIChatThread {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  isSynced?: boolean;
}

export interface UserProfile {
  name: string;
  fullName: string;
  birthDate: string; // 2012-01-29
  birthPlace: string; // Бухара, Узбекистан
  age: number; // 14
  aiName: string; // Nova
  email: string;
  title: string;
  status: string;
  avatarUrl?: string;
  focusMode: boolean;
  pinCode?: string;
  pinEnabled?: boolean;
  soundFxEnabled?: boolean;
  notificationsEnabled?: boolean;
  notificationSoundEnabled?: boolean;
  voiceGreetingEnabled?: boolean;
  autoStandByOnLandscape?: boolean;
  language?: Language;
  theme?: Theme;
  aiSettings?: AISettings;
}

export interface AppState {
  user: UserProfile;
  tasks: Task[];
  tags: Tag[];
  habits: Habit[];
  books: Book[];
  readingSessions: ReadingSession[];
  notes: Note[];
  projects: Project[];
  activeView: 'dashboard' | 'tasks' | 'calendar' | 'habits' | 'books' | 'notes' | 'projects' | 'ai';
  splitView?: SplitViewConfig;
  language: Language;
  theme: Theme;
}
