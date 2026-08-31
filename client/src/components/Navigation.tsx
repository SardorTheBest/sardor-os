import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Activity,
  BookOpen,
  FileText,
  Target,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  Keyboard,
  BrainCircuit,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AppState } from '../types';
import { i18n } from '../lib/i18n';

interface NavigationProps {
  activeView: AppState['activeView'];
  onSelectView: (view: AppState['activeView']) => void;
  user: AppState['user'];
  onToggleFocus: () => void;
  tasksCount: number;
  onLockApp: () => void;
  onOpenShortcuts: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onSelectView,
  user,
  onToggleFocus,
  tasksCount,
  onLockApp,
  onOpenShortcuts,
  soundEnabled,
  onToggleSound,
  isCollapsed: controlledCollapsed = true,
  onToggleCollapse,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = React.useState(false);
  const tNav = i18n.t('nav');

  // Expanded if pinned open OR if hovered
  const isExpanded = isPinnedOpen || isHovered;

  const navItems = [
    { id: 'dashboard' as const, label: tNav.dashboard, icon: LayoutDashboard },
    { id: 'tasks' as const, label: tNav.tasks, icon: CheckSquare, badge: tasksCount },
    { id: 'calendar' as const, label: tNav.calendar, icon: Calendar },
    { id: 'habits' as const, label: tNav.habits, icon: Activity },
    { id: 'books' as const, label: tNav.books, icon: BookOpen },
    { id: 'notes' as const, label: tNav.notes, icon: FileText },
    { id: 'projects' as const, label: tNav.projects, icon: Target },
    { id: 'ai' as const, label: 'Nova', icon: BrainCircuit, isAi: true },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex ${
        isExpanded ? 'w-64' : 'w-20'
      } bg-[#060e20]/95 backdrop-blur-xl border-r border-[#222a3d] flex-col justify-between flex-shrink-0 z-30 transition-all duration-200 ease-in-out select-none`}
    >
      {/* Brand & Wordmark */}
      <div className="p-4 md:p-5 border-b border-[#222a3d]/50 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00ffab] via-[#4edea3] to-[#00e5ff] flex items-center justify-center shadow-lg shadow-[#00ffab]/20 flex-shrink-0">
            <span className="font-bold text-[#003824] text-xl font-mono tracking-tighter">Z</span>
          </div>
          {isExpanded && (
            <div className="hidden md:block overflow-hidden transition-opacity duration-200">
              <h1 className="font-bold text-base tracking-wider text-[#dae2fd] font-mono flex items-center gap-1.5">
                ZING <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00ffab]/10 text-[#00ffab] font-mono border border-[#00ffab]/30">OS</span>
              </h1>
              <p className="text-[11px] text-[#86948a] truncate font-mono mt-0.5">
                SARDOR NEXUS
              </p>
            </div>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={() => setIsPinnedOpen((prev) => !prev)}
            title={isPinnedOpen ? 'Открепить панель (авто-сворачивание)' : 'Закрепить открытую панель'}
            className="hidden md:flex p-1.5 rounded-lg text-[#86948a] hover:text-[#dae2fd] hover:bg-[#131b2e] transition-colors"
          >
            {isPinnedOpen ? <PanelLeftClose className="w-4 h-4 text-[#00ffab]" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Primary Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {isExpanded && (
          <div className="hidden md:block px-3 pb-2 text-[10px] font-mono tracking-widest text-[#86948a] uppercase font-semibold">
            {i18n.t('orbit')}
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full flex items-center ${
                !isExpanded ? 'justify-center px-2' : 'gap-3 px-3.5'
              } py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${
                isActive
                  ? 'bg-[#171f33] text-[#00ffab] border border-[#00ffab]/30 shadow-md shadow-[#00ffab]/5'
                  : 'text-[#bbcabf] hover:bg-[#131b2e] hover:text-[#dae2fd] border border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00ffab] rounded-r-full shadow-[0_0_8px_#00ffab]" />
              )}
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-150 ${
                  isActive
                    ? 'text-[#00ffab] scale-105'
                    : item.isAi
                    ? 'text-[#00e5ff] group-hover:text-[#00e5ff]'
                    : 'text-[#86948a] group-hover:text-[#dae2fd]'
                }`}
              />
              {isExpanded && <span className="hidden md:inline font-sans truncate">{item.label}</span>}
              {isExpanded && item.badge !== undefined && item.badge > 0 && (
                <span className="hidden md:inline-flex ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1b2332] text-[#89ceff] border border-[#89ceff]/20">
                  {item.badge}
                </span>
              )}
              {isExpanded && item.isAi && (
                <span className="hidden md:inline-flex ml-auto text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Focus Mode & User Profile Footer */}
      <div className="p-2.5 md:p-4 border-t border-[#222a3d]/50 space-y-2.5">
        {/* Focus Mode Button */}
        <button
          onClick={onToggleFocus}
          title={user.focusMode ? tNav.focusActive : tNav.focusOrbit}
          className={`w-full flex items-center ${
            !isExpanded ? 'justify-center px-2' : 'justify-center md:justify-start gap-2.5 px-3'
          } py-2 rounded-xl text-xs font-mono transition-all border ${
            user.focusMode
              ? 'bg-[#00ffab]/10 text-[#00ffab] border-[#00ffab]/40 shadow-sm shadow-[#00ffab]/10'
              : 'bg-[#131b2e] text-[#86948a] border-[#222a3d] hover:text-[#dae2fd] hover:border-[#3c4a42]'
          }`}
        >
          <Sparkles className={`w-4 h-4 flex-shrink-0 ${user.focusMode ? 'text-[#00ffab] animate-pulse' : ''}`} />
          {isExpanded && (
            <span className="hidden md:inline truncate">
              {user.focusMode ? tNav.focusActive : tNav.focusOrbit}
            </span>
          )}
        </button>

        {/* Quick Utility Icons Row (Sound, Shortcuts, Lock) */}
        <div className={`flex items-center ${!isExpanded ? 'flex-col gap-1' : 'justify-between px-1'} text-[#86948a]`}>
          <button
            onClick={onToggleSound}
            title={soundEnabled ? tNav.muteAudio : tNav.unmuteAudio}
            className="p-1.5 hover:text-[#00ffab] rounded-lg hover:bg-[#131b2e] transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00ffab]" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenShortcuts}
            title={tNav.shortcuts}
            className="p-1.5 hover:text-[#00e5ff] rounded-lg hover:bg-[#131b2e] transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={onLockApp}
            title={tNav.lock}
            className="p-1.5 hover:text-[#e5a93c] rounded-lg hover:bg-[#131b2e] transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

        {/* User Capsule for Sardor */}
        <div className={`flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} p-2 rounded-xl bg-[#131b2e]/60 border border-[#222a3d]/60`}>
          <div className="w-8 h-8 rounded-lg bg-[#00ffab]/20 text-[#00ffab] flex items-center justify-center font-mono text-xs font-bold border border-[#00ffab]/30 flex-shrink-0">
            S
          </div>
          {isExpanded && (
            <div className="hidden md:block overflow-hidden flex-1">
              <div className="text-xs font-medium text-[#dae2fd] truncate">Сардор</div>
              <div className="text-[10px] text-[#00ffab] truncate font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ffab] animate-ping" />
                {tNav.autonomous}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
