import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  BookOpen,
  FileText,
  Target,
  Activity,
  Calendar,
  Sparkles,
  Zap,
  ArrowRight,
  X,
  LayoutDashboard,
  BrainCircuit,
  Tag,
  Hash,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../lib/sound';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSelectView: (view: AppState['activeView']) => void;
  onOpenSync: () => void;
}

interface SpotlightItem {
  id: string;
  category: 'Задачи' | 'Заметки' | 'Проекты' | 'Книги' | 'Привычки' | 'Навигация' | 'Действия';
  title: string;
  subtitle?: string;
  snippet?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  state,
  onSelectView,
  onOpenSync,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = useMemo<SpotlightItem[]>(() => {
    const q = search.toLowerCase().trim();

    // 1. Core Navigation & Quick Actions
    const navActions: SpotlightItem[] = [
      {
        id: 'nav-dash',
        category: 'Навигация',
        title: 'Дашборд',
        subtitle: 'Главная панель управления и метрики дня',
        icon: LayoutDashboard,
        action: () => onSelectView('dashboard'),
      },
      {
        id: 'nav-tasks',
        category: 'Навигация',
        title: 'Задачи & Фокус',
        subtitle: `${state.tasks.filter((t) => !t.isCompleted).length} активных задач`,
        icon: CheckSquare,
        action: () => onSelectView('tasks'),
      },
      {
        id: 'nav-cal',
        category: 'Навигация',
        title: 'Календарь',
        subtitle: 'Расписание событий и планирование времени',
        icon: Calendar,
        action: () => onSelectView('calendar'),
      },
      {
        id: 'nav-habits',
        category: 'Навигация',
        title: 'Привычки & Дисциплина',
        subtitle: `${state.habits.length} трекеров привычек`,
        icon: Activity,
        action: () => onSelectView('habits'),
      },
      {
        id: 'nav-books',
        category: 'Навигация',
        title: 'Библиотека & Reading Vault',
        subtitle: `${state.books.length} книг в хранилище`,
        icon: BookOpen,
        action: () => onSelectView('books'),
      },
      {
        id: 'nav-notes',
        category: 'Навигация',
        title: 'База знаний & Заметки',
        subtitle: `${state.notes.length} заметок (Second Brain)`,
        icon: FileText,
        action: () => onSelectView('notes'),
      },
      {
        id: 'nav-projects',
        category: 'Навигация',
        title: 'Стратегические проекты',
        subtitle: `${state.projects.length} проектов с целями и задачами`,
        icon: Target,
        action: () => onSelectView('projects'),
      },
      {
        id: 'nav-ai',
        category: 'Навигация',
        title: 'Nova AI Assistant',
        subtitle: 'Чат, кодинг, генерация изображений и видео',
        icon: BrainCircuit,
        badge: 'AI',
        action: () => onSelectView('ai'),
      },
      {
        id: 'action-sync',
        category: 'Действия',
        title: 'Синхронизация & Бэкап',
        subtitle: 'Резервное копирование и экспорт данных',
        icon: Zap,
        action: () => onOpenSync(),
      },
      {
        id: 'action-test-push',
        category: 'Действия',
        title: 'Тест Push-уведомлений и Звука',
        subtitle: 'Отправить локальное звуковое оповещение',
        icon: Sparkles,
        action: () => {
          import('../lib/notificationService').then(({ notificationService }) => {
            notificationService.sendTestNotification();
          });
        },
      },
    ];

    // 2. Tasks Search
    const taskItems: SpotlightItem[] = state.tasks.map((t) => ({
      id: `task-${t.id}`,
      category: 'Задачи',
      title: t.title,
      subtitle: `${t.dueDate || 'Без дедлайна'} • Приоритет: ${t.priority.toUpperCase()}${t.isCompleted ? ' (Выполнено)' : ''}`,
      icon: CheckSquare,
      badge: t.priority,
      action: () => onSelectView('tasks'),
    }));

    // 3. Notes Search (Full text content search included)
    const noteItems: SpotlightItem[] = state.notes.map((n) => {
      let snippet = n.content.replace(/[#*`_\[\]-]/g, '').trim().slice(0, 110);
      if (q && n.content.toLowerCase().includes(q)) {
        const idx = n.content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(n.content.length, idx + q.length + 50);
        snippet = `...${n.content.slice(start, end).replace(/\n/g, ' ')}...`;
      }

      return {
        id: `note-${n.id}`,
        category: 'Заметки',
        title: n.title,
        subtitle: n.tags && n.tags.length > 0 ? `#${n.tags.join(' #')}` : 'Без тегов',
        snippet,
        icon: FileText,
        action: () => onSelectView('notes'),
      };
    });

    // 4. Projects Search
    const projectItems: SpotlightItem[] = state.projects.map((p) => {
      const pTasks = state.tasks.filter((t) => t.projectId === p.id);
      return {
        id: `proj-${p.id}`,
        category: 'Проекты',
        title: p.title,
        subtitle: `${p.quarter} • Прогресс: ${p.progress}% • ${pTasks.length} задач`,
        snippet: p.description || (p.objectives && p.objectives.length > 0 ? p.objectives.map(o => o.title).join(', ') : undefined),
        icon: Target,
        badge: `${p.progress}%`,
        action: () => onSelectView('projects'),
      };
    });

    // 5. Books Search
    const bookItems: SpotlightItem[] = state.books.map((b) => ({
      id: `book-${b.id}`,
      category: 'Книги',
      title: b.title,
      subtitle: `${b.author} • стр. ${b.currentPage}/${b.totalPages}`,
      snippet: b.quotes && b.quotes.length > 0 ? `Цитата: "${b.quotes[0]}"` : undefined,
      icon: BookOpen,
      badge: `${Math.round((b.currentPage / (b.totalPages || 1)) * 100)}%`,
      action: () => onSelectView('books'),
    }));

    // 6. Habits Search
    const habitItems: SpotlightItem[] = state.habits.map((h) => ({
      id: `habit-${h.id}`,
      category: 'Привычки',
      title: h.name,
      subtitle: `Стрейк: ${h.streak} дн. (рекорд: ${h.bestStreak} дн.) • ${h.frequency}`,
      icon: Activity,
      action: () => onSelectView('habits'),
    }));

    if (!q) {
      // Default Spotlight view: Quick navigation + top tasks + recent notes
      return [
        ...navActions.slice(0, 4),
        ...taskItems.slice(0, 3),
        ...noteItems.slice(0, 3),
      ];
    }

    // Full-text search matcher
    const matches = (item: SpotlightItem) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchSnippet = item.snippet?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchSnippet || matchCategory;
    };

    const filtered = [
      ...noteItems.filter(matches),
      ...taskItems.filter(matches),
      ...projectItems.filter(matches),
      ...bookItems.filter(matches),
      ...habitItems.filter(matches),
      ...navActions.filter(matches),
    ];

    return filtered.slice(0, 20);
  }, [search, state, onSelectView, onOpenSync]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (items.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % (items.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          sound.playClick();
          items[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Group items by category for Spotlight rendering
  const groupedCategories = items.reduce((acc, item, index) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ item, globalIndex: index });
    return acc;
  }, {} as Record<string, Array<{ item: SpotlightItem; globalIndex: number }>>);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center pt-16 md:pt-24 p-3 md:p-4 animate-in fade-in-0 duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0b1326] border border-[#222a3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
      >
        {/* Spotlight Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#222a3d] bg-[#131b2e]/70">
          <Search className="w-5 h-5 text-[#00ffab] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Поиск по задачам, заметкам, проектам, книгам..."
            className="flex-1 bg-transparent text-sm md:text-base text-[#dae2fd] placeholder-[#86948a] focus:outline-none font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 rounded-lg hover:bg-[#222a3d] text-[#86948a] hover:text-[#dae2fd]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded-lg bg-[#060e20] border border-[#222a3d] text-[10px] font-mono text-[#86948a]">
            ESC
          </kbd>
        </div>

        {/* Spotlight Results List */}
        <div className="overflow-y-auto p-2 space-y-3 custom-scrollbar flex-1">
          {items.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#86948a]">
              Ничего не найдено по запросу «{search}»
            </div>
          ) : (
            Object.entries(groupedCategories).map(([categoryName, entries]) => (
              <div key={categoryName} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#86948a] font-semibold">
                  {categoryName}
                </div>
                {entries.map(({ item, globalIndex }) => {
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        sound.playClick();
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#171f33] text-[#00ffab] border border-[#00ffab]/30 shadow-md shadow-[#00ffab]/5'
                          : 'text-[#bbcabf] hover:bg-[#131b2e]/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3 truncate flex-1 min-w-0 pr-2">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-[#00ffab]/15 text-[#00ffab]'
                              : 'bg-[#131b2e] text-[#86948a]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm font-semibold truncate font-sans">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#060e20] text-[#00e5ff] border border-[#222a3d]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[11px] text-[#86948a] truncate mt-0.5 font-sans">
                              {item.subtitle}
                            </p>
                          )}
                          {item.snippet && (
                            <p className="text-[11px] text-[#bbcabf]/70 truncate mt-0.5 italic font-sans">
                              {item.snippet}
                            </p>
                          )}
                        </div>
                      </div>

                      <ArrowRight
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${
                          isSelected ? 'text-[#00ffab] translate-x-0.5' : 'text-transparent'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#060e20]/80 border-t border-[#222a3d] flex items-center justify-between text-[10px] font-mono text-[#86948a]">
          <span>↑↓ Навигация</span>
          <span>↵ Выбрать</span>
        </div>
      </div>
    </div>
  );
};
