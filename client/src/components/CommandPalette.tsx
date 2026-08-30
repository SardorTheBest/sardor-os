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
  Command,
  ArrowRight,
  Zap,
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

  const items = useMemo(() => {
    const q = search.toLowerCase().trim();

    const navigationActions = [
      { id: 'nav-dash', type: 'View', title: 'Dashboard', subtitle: 'Overview & Velocity', icon: Sparkles, action: () => onSelectView('dashboard') },
      { id: 'nav-tasks', type: 'View', title: 'Tasks Orbit', subtitle: 'Unified Task Manager', icon: CheckSquare, action: () => onSelectView('tasks') },
      { id: 'nav-cal', type: 'View', title: 'Interactive Calendar', subtitle: 'Drag & Drop Schedule', icon: Calendar, action: () => onSelectView('calendar') },
      { id: 'nav-habits', type: 'View', title: 'Habit Matrix', subtitle: 'Consistency Heatmaps', icon: Activity, action: () => onSelectView('habits') },
      { id: 'nav-books', type: 'View', title: 'Reading Vault', subtitle: 'Book Progress & Quotes', icon: BookOpen, action: () => onSelectView('books') },
      { id: 'nav-notes', type: 'View', title: 'Knowledge Base', subtitle: 'Notes & Systems Architecture', icon: FileText, action: () => onSelectView('notes') },
      { id: 'nav-projects', type: 'View', title: 'Strategic Projects', subtitle: 'Objectives & Milestones', icon: Target, action: () => onSelectView('projects') },
      { id: 'nav-ai', type: 'View', title: 'AI Productivity Advisor', subtitle: 'Cognitive load, WebLLM, Ollama & Groq', icon: Zap, action: () => onSelectView('ai') },
      { id: 'action-ai-habits', type: 'AI Action', title: 'AI: Анализ привычек', subtitle: 'Оценка стрейков и дисциплины через ИИ', icon: Sparkles, action: () => onSelectView('ai') },
      { id: 'action-ai-summary', type: 'AI Action', title: 'AI: Саммари книги', subtitle: 'Главные выжимки и тезисы из чтения', icon: BookOpen, action: () => onSelectView('ai') },
      { id: 'action-ai-rec', type: 'AI Action', title: 'AI: Рекомендации книг', subtitle: 'Подборка 3 книг на основе предпочтений', icon: Sparkles, action: () => onSelectView('ai') },
      { id: 'action-sync', type: 'Action', title: 'Sync & Backup Center', subtitle: 'Supabase & IndexedDB Dexie', icon: Zap, action: () => onOpenSync() },
    ];

    const taskItems = state.tasks.map((t) => ({
      id: t.id,
      type: 'Task',
      title: t.title,
      subtitle: `${t.dueDate || 'No date'} • Priority: ${t.priority}`,
      icon: CheckSquare,
      action: () => onSelectView('tasks'),
    }));

    const bookItems = state.books.map((b) => ({
      id: b.id,
      type: 'Book',
      title: b.title,
      subtitle: `${b.author} • ${b.currentPage}/${b.totalPages} pages`,
      icon: BookOpen,
      action: () => onSelectView('books'),
    }));

    const noteItems = state.notes.map((n) => ({
      id: n.id,
      type: 'Note',
      title: n.title,
      subtitle: `${n.category} • ${n.content.slice(0, 40)}...`,
      icon: FileText,
      action: () => onSelectView('notes'),
    }));

    const projectItems = state.projects.map((p) => ({
      id: p.id,
      type: 'Project',
      title: p.title,
      subtitle: `${p.quarter} • ${p.progress}% completed`,
      icon: Target,
      action: () => onSelectView('projects'),
    }));

    const all = [...navigationActions, ...taskItems, ...bookItems, ...noteItems, ...projectItems];

    if (!q) return all.slice(0, 9);

    return all
      .filter((item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q))
      .slice(0, 12);
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

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl bg-[#131b2e] border border-[#222a3d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#222a3d] bg-[#0b1326]/60">
          <Search className="w-5 h-5 text-[#86948a]" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search tasks, books, notes, projects..."
            className="flex-1 bg-transparent text-sm text-[#dae2fd] placeholder-[#86948a] focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 rounded bg-[#171f33] border border-[#222a3d] text-[10px] font-mono text-[#86948a]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#86948a]">
              No matching records found for "{search}"
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    sound.playClick();
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#171f33] text-[#00ffab] border border-[#00ffab]/30 shadow-sm'
                      : 'text-[#bbcabf] hover:bg-[#0b1326]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#00ffab]/10 border-[#00ffab]/30 text-[#00ffab]'
                          : 'bg-[#0b1326] border-[#222a3d] text-[#86948a]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-[#dae2fd] truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] font-mono text-[#86948a] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b1326] text-[#86948a] border border-[#222a3d] ml-2 flex-shrink-0">
                    {item.type}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-[#0b1326] border-t border-[#222a3d] flex items-center justify-between text-[10px] font-mono text-[#86948a]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[#00ffab]">Zenith Omnibar</span>
        </div>
      </div>
    </div>
  );
};
