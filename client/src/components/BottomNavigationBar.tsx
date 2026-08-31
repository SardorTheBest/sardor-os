import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Activity,
  BookOpen,
  BrainCircuit,
  MoreHorizontal,
  FileText,
  Target,
  Sparkles,
  Volume2,
  VolumeX,
  Keyboard,
  Lock,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../lib/sound';

interface BottomNavigationBarProps {
  activeView: AppState['activeView'];
  onSelectView: (view: AppState['activeView']) => void;
  tasksCount: number;
  user: AppState['user'];
  onToggleFocus: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenShortcuts: () => void;
  onLockApp: () => void;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeView,
  onSelectView,
  tasksCount,
  user,
  onToggleFocus,
  soundEnabled,
  onToggleSound,
  onOpenShortcuts,
  onLockApp,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainItems = [
    { id: 'dashboard' as const, label: 'Пульт', icon: LayoutDashboard },
    { id: 'tasks' as const, label: 'Задачи', icon: CheckSquare, badge: tasksCount },
    { id: 'calendar' as const, label: 'Календарь', icon: Calendar },
    { id: 'habits' as const, label: 'Привычки', icon: Activity },
    { id: 'books' as const, label: 'Книги', icon: BookOpen },
    { id: 'ai' as const, label: 'Nova AI', icon: BrainCircuit, isAi: true },
  ];

  const handleItemClick = (id: AppState['activeView']) => {
    sound.playClick();
    onSelectView(id);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar on mobile screens */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#060e20]/95 backdrop-blur-2xl border-t border-[#222a3d] md:hidden px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      >
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-0.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#00ffab]'
                  : item.isAi
                  ? 'text-[#00e5ff] hover:text-[#00e5ff]'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              {/* Active glowing indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-[#00ffab] rounded-full shadow-[0_0_8px_#00ffab]" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive
                      ? 'scale-110 text-[#00ffab]'
                      : item.isAi
                      ? 'text-[#00e5ff] animate-pulse'
                      : 'text-[#86948a]'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#00ffab] text-[#003824] font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {item.isAi && !isActive && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
                )}
              </div>

              <span
                className={`text-[10px] font-medium mt-1 truncate max-w-[54px] ${
                  isActive ? 'text-[#00ffab] font-bold' : 'text-[#86948a]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Menu Trigger Button */}
        <button
          onClick={() => {
            sound.playPop();
            setIsMoreMenuOpen(true);
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-0.5 rounded-xl transition-all ${
            ['notes', 'projects'].includes(activeView)
              ? 'text-[#00ffab]'
              : 'text-[#86948a] hover:text-[#dae2fd]'
          }`}
        >
          {['notes', 'projects'].includes(activeView) && (
            <span className="absolute top-0 w-8 h-1 bg-[#00ffab] rounded-full shadow-[0_0_8px_#00ffab]" />
          )}
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1 truncate">Меню</span>
        </button>
      </nav>

      {/* "More" Bottom Sheet for Mobile */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMoreMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Sheet Body */}
          <div className="relative bg-[#0d1628] border-t border-[#222a3d] rounded-t-3xl p-5 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] z-50 animate-in slide-in-from-bottom duration-200">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-[#3c4a42] rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00ffab]/20 text-[#00ffab] flex items-center justify-center font-mono text-xs font-bold">
                  Z
                </div>
                <h3 className="text-sm font-bold text-[#dae2fd] font-display">
                  Zing • Быстрое меню
                </h3>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Additional Modules Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleItemClick('notes')}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeView === 'notes'
                    ? 'bg-[#171f33] border-[#00ffab]/50 text-[#00ffab]'
                    : 'bg-[#131b2e] border-[#222a3d] text-[#dae2fd]'
                }`}
              >
                <div className="p-2 rounded-xl bg-[#0b1326] text-[#00e5ff]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Заметки</div>
                  <div className="text-[10px] text-[#86948a]">Second Brain</div>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('projects')}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeView === 'projects'
                    ? 'bg-[#171f33] border-[#00ffab]/50 text-[#00ffab]'
                    : 'bg-[#131b2e] border-[#222a3d] text-[#dae2fd]'
                }`}
              >
                <div className="p-2 rounded-xl bg-[#0b1326] text-[#d0bcff]">
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Проекты</div>
                  <div className="text-[10px] text-[#86948a]">OKR & Цели</div>
                </div>
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="p-3 rounded-2xl bg-[#0b1326] border border-[#222a3d] space-y-2">
              <div className="text-[10px] font-mono text-[#86948a] uppercase tracking-wider">
                Управление системой
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    onToggleFocus();
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    user.focusMode
                      ? 'bg-[#00ffab]/20 border-[#00ffab]/40 text-[#00ffab]'
                      : 'bg-[#131b2e] border-[#222a3d] text-[#86948a]'
                  }`}
                  title="Режим фокуса"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Фокус</span>
                </button>

                <button
                  onClick={() => {
                    onToggleSound();
                    sound.playClick();
                  }}
                  className="p-2.5 rounded-xl bg-[#131b2e] border border-[#222a3d] flex flex-col items-center gap-1 text-[#86948a] hover:text-[#00ffab]"
                  title="Звуки"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00ffab]" /> : <VolumeX className="w-4 h-4" />}
                  <span className="text-[10px] font-mono">Звук</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenShortcuts();
                  }}
                  className="p-2.5 rounded-xl bg-[#131b2e] border border-[#222a3d] flex flex-col items-center gap-1 text-[#86948a] hover:text-[#00e5ff]"
                  title="Горячие клавиши"
                >
                  <Keyboard className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Кнопки</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onLockApp();
                  }}
                  className="p-2.5 rounded-xl bg-[#131b2e] border border-[#222a3d] flex flex-col items-center gap-1 text-[#86948a] hover:text-[#e5a93c]"
                  title="Заблокировать"
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-[10px] font-mono">Блок</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
