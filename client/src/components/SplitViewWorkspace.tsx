import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Activity,
  BookOpen,
  FileText,
  Target,
  BrainCircuit,
  Columns,
  ArrowLeftRight,
  Maximize2,
  X,
  GripVertical,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { AppState, Book, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';

// Modules to render inside panes
import { DashboardModule } from './DashboardModule';
import { TasksModule } from './TasksModule';
import { CalendarModule } from './CalendarModule';
import { HabitsModule } from './HabitsModule';
import { BooksModule } from './BooksModule';
import { NotesModule } from './NotesModule';
import { ProjectsModule } from './ProjectsModule';
import { AIAnalystModule } from './AIAnalystModule';

interface SplitViewWorkspaceProps {
  state: AppState;
  onOpenVoiceInput?: () => void;
  onOpenDeepWork?: (task?: Task | null, book?: Book | null) => void;
  onOpenEveningReview?: () => void;
  onCloseSplitView?: () => void;
}

type ViewType = AppState['activeView'];

export const SplitViewWorkspace: React.FC<SplitViewWorkspaceProps> = ({
  state,
  onOpenVoiceInput,
  onOpenDeepWork,
  onOpenEveningReview,
  onCloseSplitView,
}) => {
  const initialConfig = state.splitView || {
    enabled: true,
    leftView: 'books',
    rightView: 'tasks',
    ratio: 50,
  };

  const [leftView, setLeftView] = useState<ViewType>(initialConfig.leftView || 'books');
  const [rightView, setRightView] = useState<ViewType>(initialConfig.rightView || 'tasks');
  const [ratio, setRatio] = useState<number>(initialConfig.ratio || 50);

  // Dropdowns for view selector
  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState(false);
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isRu = state.language === 'ru';
  const tNav = i18n.t('nav');

  const VIEW_OPTIONS: Array<{ id: ViewType; label: string; icon: React.ElementType; color: string }> = [
    { id: 'dashboard', label: tNav.dashboard, icon: LayoutDashboard, color: '#00ffab' },
    { id: 'tasks', label: tNav.tasks, icon: CheckSquare, color: '#00e5ff' },
    { id: 'calendar', label: tNav.calendar, icon: Calendar, color: '#89ceff' },
    { id: 'habits', label: tNav.habits, icon: Activity, color: '#00ffab' },
    { id: 'books', label: tNav.books, icon: BookOpen, color: '#e5a93c' },
    { id: 'notes', label: tNav.notes, icon: FileText, color: '#d0bcff' },
    { id: 'projects', label: tNav.projects, icon: Target, color: '#ffb4ab' },
    { id: 'ai', label: 'Nova AI', icon: BrainCircuit, color: '#00e5ff' },
  ];

  // Save split state to storage
  useEffect(() => {
    storage.setSplitViewConfig({
      leftView,
      rightView,
      ratio,
    });
  }, [leftView, rightView, ratio]);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const newRatio = Math.min(80, Math.max(20, Math.round((clientX / rect.width) * 100)));
      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSwapViews = () => {
    sound.playClick();
    const temp = leftView;
    setLeftView(rightView);
    setRightView(temp);
  };

  const renderModule = (view: ViewType) => {
    switch (view) {
      case 'dashboard':
        return (
          <DashboardModule
            state={state}
            onNavigate={(v) => storage.setActiveView(v)}
            onOpenVoiceInput={onOpenVoiceInput}
            onOpenDeepWork={() => onOpenDeepWork && onOpenDeepWork(null, null)}
            onOpenEveningReview={onOpenEveningReview}
          />
        );
      case 'tasks':
        return (
          <TasksModule
            state={state}
            onOpenDeepWork={(task?: Task) => onOpenDeepWork && onOpenDeepWork(task || null, null)}
            onOpenVoiceInput={onOpenVoiceInput}
          />
        );
      case 'calendar':
        return <CalendarModule state={state} />;
      case 'habits':
        return <HabitsModule state={state} />;
      case 'books':
        return (
          <BooksModule
            state={state}
            onOpenDeepWork={(book?: Book) => onOpenDeepWork && onOpenDeepWork(null, book || null)}
          />
        );
      case 'notes':
        return <NotesModule state={state} />;
      case 'projects':
        return (
          <ProjectsModule
            state={state}
            onNavigate={(v) => storage.setActiveView(v)}
          />
        );
      case 'ai':
        return (
          <AIAnalystModule
            state={state}
            onNavigate={(v) => storage.setActiveView(v)}
          />
        );
      default:
        return <TasksModule state={state} />;
    }
  };

  const leftItem = VIEW_OPTIONS.find((v) => v.id === leftView) || VIEW_OPTIONS[0];
  const rightItem = VIEW_OPTIONS.find((v) => v.id === rightView) || VIEW_OPTIONS[1];

  const LeftIcon = leftItem.icon;
  const RightIcon = rightItem.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] w-full overflow-hidden select-none">
      {/* Top Split View Toolbar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#060e20]/95 backdrop-blur-xl border-b border-[#222a3d] flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 text-[#00ffab] text-xs font-mono font-semibold">
            <Columns className="w-3.5 h-3.5" />
            <span>{isRu ? 'Параллельный режим (Dual Workspace)' : 'Split Workspace'}</span>
          </div>

          {/* Quick Ratio Presets */}
          <div className="hidden sm:flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-[#222a3d]">
            {[
              { label: '50:50', val: 50 },
              { label: '60:40', val: 60 },
              { label: '70:30', val: 70 },
              { label: '30:70', val: 30 },
              { label: '40:60', val: 40 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => {
                  setRatio(p.val);
                  sound.playClick();
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                  ratio === p.val
                    ? 'bg-[#00ffab] text-[#003824] font-bold shadow-sm'
                    : 'text-[#86948a] hover:text-[#dae2fd] hover:bg-[#171f33]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSwapViews}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#222a3d] bg-[#131b2e] text-xs font-mono text-[#89ceff] hover:text-white hover:bg-[#1a243d] transition-colors"
            title={isRu ? 'Поменять окна местами' : 'Swap left and right panes'}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isRu ? 'Поменять' : 'Swap'}</span>
          </button>

          <button
            onClick={onCloseSplitView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-xs font-mono text-[#ffb4ab] hover:bg-[#ffb4ab]/20 transition-colors"
            title={isRu ? 'Выйти из сплит-режима' : 'Exit Split View'}
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isRu ? 'Один экран' : 'Single Pane'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Body Container */}
      <div
        ref={containerRef}
        className={`flex-1 flex w-full overflow-hidden relative ${isDragging ? 'cursor-col-resize select-none' : ''}`}
      >
        {/* Left Pane */}
        <div
          style={{ width: `${ratio}%` }}
          className="h-full flex flex-col overflow-hidden border-r border-[#222a3d] bg-[#0b1326] relative"
        >
          {/* Left Pane Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#131b2e]/90 border-b border-[#222a3d] flex-shrink-0 z-10">
            <div className="relative">
              <button
                onClick={() => setIsLeftDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#171f33] border border-[#222a3d] hover:border-[#00ffab]/40 text-xs font-medium text-[#dae2fd] transition-all"
              >
                <LeftIcon className="w-3.5 h-3.5" style={{ color: leftItem.color }} />
                <span>{leftItem.label}</span>
                <ChevronDown className="w-3 h-3 text-[#86948a]" />
              </button>

              {/* Left Dropdown */}
              {isLeftDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#0d1628] border border-[#222a3d] rounded-xl shadow-2xl z-30 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  {VIEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setLeftView(opt.id);
                          setIsLeftDropdownOpen(false);
                          sound.playClick();
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          leftView === opt.id
                            ? 'bg-[#171f33] text-[#00ffab] font-bold'
                            : 'text-[#bbcabf] hover:bg-[#131b2e] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#86948a]">
              {ratio}% {isRu ? 'ширины' : 'width'}
            </span>
          </div>

          {/* Left Module Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar select-text">
            {renderModule(leftView)}
          </div>
        </div>

        {/* Resizer Divider Bar */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-2 hover:w-3.5 bg-[#171f33] hover:bg-[#00ffab] active:bg-[#00ffab] transition-all duration-150 cursor-col-resize flex items-center justify-center relative z-20 group flex-shrink-0 ${
            isDragging ? 'bg-[#00ffab] w-3.5' : ''
          }`}
          title={isRu ? 'Потяните для изменения размера окон' : 'Drag to resize panes'}
        >
          <div className="h-10 w-1 bg-[#86948a] group-hover:bg-[#003824] rounded-full" />
        </div>

        {/* Right Pane */}
        <div
          style={{ width: `${100 - ratio}%` }}
          className="h-full flex flex-col overflow-hidden bg-[#0b1326] relative"
        >
          {/* Right Pane Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#131b2e]/90 border-b border-[#222a3d] flex-shrink-0 z-10">
            <div className="relative">
              <button
                onClick={() => setIsRightDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#171f33] border border-[#222a3d] hover:border-[#00e5ff]/40 text-xs font-medium text-[#dae2fd] transition-all"
              >
                <RightIcon className="w-3.5 h-3.5" style={{ color: rightItem.color }} />
                <span>{rightItem.label}</span>
                <ChevronDown className="w-3 h-3 text-[#86948a]" />
              </button>

              {/* Right Dropdown */}
              {isRightDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#0d1628] border border-[#222a3d] rounded-xl shadow-2xl z-30 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  {VIEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setRightView(opt.id);
                          setIsRightDropdownOpen(false);
                          sound.playClick();
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          rightView === opt.id
                            ? 'bg-[#171f33] text-[#00e5ff] font-bold'
                            : 'text-[#bbcabf] hover:bg-[#131b2e] hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#86948a]">
              {100 - ratio}% {isRu ? 'ширины' : 'width'}
            </span>
          </div>

          {/* Right Module Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar select-text">
            {renderModule(rightView)}
          </div>
        </div>
      </div>
    </div>
  );
};
