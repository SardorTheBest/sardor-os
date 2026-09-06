import React from 'react';
import {
  ChevronLeft,
  Search,
  Plus,
  Mic,
  Bell,
  Sparkles,
  Cloud,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../lib/sound';

interface MobileHeaderProps {
  activeView: AppState['activeView'];
  onSelectView: (view: AppState['activeView']) => void;
  user: AppState['user'];
  onOpenSearch: () => void;
  onOpenVoiceInput?: () => void;
  onQuickAdd?: () => void;
  onOpenNotifications?: () => void;
  syncState?: 'synced' | 'syncing' | 'offline' | 'error';
  onOpenSync?: () => void;
  hasUnreadNotifications?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeView,
  onSelectView,
  user,
  onOpenSearch,
  onOpenVoiceInput,
  onQuickAdd,
  onOpenNotifications,
  syncState = 'synced',
  onOpenSync,
  hasUnreadNotifications,
}) => {
  const isDashboard = activeView === 'dashboard';

  const viewTitles: Record<AppState['activeView'], string> = {
    dashboard: 'Пульт',
    tasks: 'Задачи',
    calendar: 'Календарь',
    habits: 'Привычки',
    books: 'Библиотека',
    notes: 'Заметки',
    projects: 'Проекты',
    ai: 'Nova AI',
  };

  const handleBack = () => {
    sound.playClick();
    onSelectView('dashboard');
  };

  return (
    <div
      id="native-mobile-header"
      className="md:hidden w-full h-[58px] flex items-center justify-between px-3.5 bg-[#0B0C0E]/95 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)] select-none z-30 pt-[max(0px,env(safe-area-inset-top))]"
    >
      {isDashboard ? (
        /* Dashboard Header: User Avatar + Name / Live Status */
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10B981] to-[#0EA5E9] text-[#0B0C0E] font-bold text-xs flex items-center justify-center shadow-sm shadow-[#10B981]/20 flex-shrink-0">
            {user.name ? user.name[0].toUpperCase() : 'S'}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#F9FAFB] tracking-tight truncate">
                {user.name || 'Сардор'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
            </div>
            <span className="text-[10px] font-mono text-[#9CA3AF] truncate">
              {user.focusMode ? '⚡ Focus Orbit' : 'Zing OS • Online'}
            </span>
          </div>
        </div>
      ) : (
        /* Inner View Header: Back Chevron + Page Title */
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleBack}
            className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-xl text-[#F9FAFB] active:bg-[rgba(255,255,255,0.1)] transition-colors"
            aria-label="Назад на главную"
          >
            <ChevronLeft className="w-5 h-5 text-[#F9FAFB]" />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold text-[#F9FAFB] tracking-tight truncate">
              {viewTitles[activeView] || 'Раздел'}
            </h1>
          </div>
        </div>
      )}

      {/* Right Contextual Actions (Min 44x44px touch targets) */}
      <div className="flex items-center gap-1">
        {/* Quick Add Button (+) */}
        {onQuickAdd && (
          <button
            onClick={() => {
              sound.playPop();
              onQuickAdd();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 active:scale-95 transition-transform"
            aria-label="Быстрое добавление"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Voice Input (Mic) */}
        {onOpenVoiceInput && (
          <button
            onClick={() => {
              sound.playPop();
              onOpenVoiceInput();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#0EA5E9] hover:bg-[rgba(255,255,255,0.06)] active:scale-95 transition-transform"
            aria-label="Голосовой ввод"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Global Search / Command Palette */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenSearch();
          }}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[#9CA3AF] active:text-[#F9FAFB] active:bg-[rgba(255,255,255,0.06)] transition-colors"
          aria-label="Поиск"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Sync or Notification Pill */}
        {onOpenNotifications && (
          <button
            onClick={() => {
              sound.playClick();
              onOpenNotifications();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#9CA3AF] active:text-[#F9FAFB] relative active:bg-[rgba(255,255,255,0.06)] transition-colors"
            aria-label="Уведомления"
          >
            <Bell className="w-4 h-4" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#10B981] ring-2 ring-[#0B0C0E]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
