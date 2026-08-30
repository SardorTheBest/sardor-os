export type Priority = 'low' | 'medium' | 'high';

export interface Tag {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
  isSynced?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  tagId?: string;
  priority: Priority;
  projectId?: string;
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
  logs: Record<string, boolean>; // 'YYYY-MM-DD': boolean
  createdAt: string;
}

export interface BookQuote {
  id: string;
  text: string;
  page?: number;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  totalPages: number;
  currentPage: number;
  status: 'reading' | 'completed' | 'want_to_read';
  rating: number;
  startDate?: string;
  finishDate?: string;
  quotes: BookQuote[];
  notes?: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  durationMinutes: number;
  pagesRead: number;
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
  status: 'in_progress' | 'planned' | 'completed';
  progress: number;
  quarter: string;
  objectives: ProjectObjective[];
  color: string;
}

export type AIProvider = 'gemini' | 'webllm' | 'ollama' | 'groq' | 'openrouter';

export interface AISettings {
  provider: AIProvider;
  geminiModel?: string;
  groqApiKey: string;
  groqModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  webllmModel: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  temperature: number;
  selectedVoice?: string;
  voiceAutoSpeak?: boolean;
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
  voiceGreetingEnabled?: boolean;
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
  language: Language;
  theme: Theme;
}
