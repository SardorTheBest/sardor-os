import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Activity,
  MoreHorizontal,
  BookOpen,
  FileText,
  Target,
  BrainCircuit,
  Headphones,
  Sunset,
  Mic,
  Smartphone,
  Columns,
  Radio,
  Globe,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Keyboard,
  Lock,
  Cloud,
  Bell,
  X,
} from 'lucide-react';
import { AppState } from '../types';
import { sound } from '../lib/sound';
import { MobileBottomSheet } from './MobileBottomSheet';

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
  onOpenVoiceInput?: () => void;
  onOpenDeepWork?: () => void;
  onOpenEveningReview?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  onToggleLanguage?: () => void;
  currentLang?: 'ru' | 'en';
  onOpenSync?: () => void;
  onOpenStandBy?: () => void;
  onOpenPairing?: () => void;
  onToggleSplitView?: () => void;
  isSplitView?: boolean;
  onOpenNotifications?: () => void;
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
  onOpenVoiceInput,
  onOpenDeepWork,
  onOpenEveningReview,
  onToggleTheme,
  isDark = true,
  onToggleLanguage,
  currentLang = 'ru',
  onOpenSync,
  onOpenStandBy,
  onOpenPairing,
  onToggleSplitView,
  isSplitView = false,
  onOpenNotifications,
}) => {
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  // 4 Primary Views + 1 "More" Drawer Trigger (Strictly 5 items, max 5)
  const primaryTabs = [
    { id: 'dashboard' as const, label: 'Пульт', icon: LayoutDashboard },
    { id: 'tasks' as const, label: 'Задачи', icon: CheckSquare, badge: tasksCount },
    { id: 'calendar' as const, label: 'Календарь', icon: Calendar },
    { id: 'habits' as const, label: 'Привычки', icon: Activity },
  ];

  const handleTabClick = (viewId: AppState['activeView']) => {
    sound.playClick();
    onSelectView(viewId);
  };

  const handleDrawerItemClick = (viewId: AppState['activeView']) => {
    sound.playClick();
    onSelectView(viewId);
    setIsMoreDrawerOpen(false);
  };

  const isMoreActive = ['books', 'notes', 'projects', 'ai'].includes(activeView);

  return (
    <>
      {/* Native Mobile Bottom Navigation Bar (< 768px) */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0C0E]/95 backdrop-blur-2xl border-t border-[rgba(255,255,255,0.08)] md:hidden px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all relative active:scale-95 touch-manipulation ${
                isActive
                  ? 'text-[#10B981]'
                  : 'text-[#9CA3AF] active:text-[#F9FAFB]'
              }`}
              aria-label={tab.label}
            >
              {/* Active Indicator Pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 text-[#10B981]' : 'text-[#9CA3AF]'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#10B981] text-[#0B0C0E] font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] font-medium mt-1 truncate max-w-[62px] leading-tight ${
                  isActive ? 'text-[#10B981] font-bold' : 'text-[#9CA3AF]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Tab 5: "More" Drawer Trigger */}
        <button
          onClick={() => {
            sound.playPop();
            setIsMoreDrawerOpen(true);
          }}
          className={`flex-1 min-h-[48px] py-1 px-1 flex flex-col items-center justify-center rounded-xl transition-all relative active:scale-95 touch-manipulation ${
            isMoreActive
              ? 'text-[#10B981]'
              : 'text-[#9CA3AF] active:text-[#F9FAFB]'
          }`}
          aria-label="Все разделы и утилиты"
        >
          {isMoreActive && (
            <span className="absolute top-0 w-8 h-1 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]" />
          )}
          <MoreHorizontal
            className={`w-5 h-5 transition-transform duration-150 ${
              isMoreActive ? 'scale-110 text-[#10B981]' : 'text-[#9CA3AF]'
            }`}
          />
          <span
            className={`text-[11px] font-medium mt-1 truncate max-w-[62px] leading-tight ${
              isMoreActive ? 'text-[#10B981] font-bold' : 'text-[#9CA3AF]'
            }`}
          >
            Ещё
          </span>
        </button>
      </nav>

      {/* Native Bottom Sheet via Vaul for "More" Navigation & Utilities */}
      <MobileBottomSheet
        open={isMoreDrawerOpen}
        onOpenChange={setIsMoreDrawerOpen}
        title="Разделы и Инструменты"
        description="Быстрый доступ ко всем модулям Sardor OS"
      >
        <div className="space-y-5 select-none">
          {/* Section 1: Secondary Modules */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold mb-2 px-1">
              Основные разделы
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDrawerItemClick('books')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left min-h-[56px] ${
                  activeView === 'books'
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#16171A] border-[rgba(255,255,255,0.08)] text-[#F9FAFB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 text-[#0EA5E9] flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">Библиотека</div>
                  <div className="text-[11px] text-[#9CA3AF] truncate">Aqil Reader</div>
                </div>
              </button>

              <button
                onClick={() => handleDrawerItemClick('notes')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left min-h-[56px] ${
                  activeView === 'notes'
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#16171A] border-[rgba(255,255,255,0.08)] text-[#F9FAFB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">Заметки</div>
                  <div className="text-[11px] text-[#9CA3AF] truncate">Second Brain</div>
                </div>
              </button>

              <button
                onClick={() => handleDrawerItemClick('projects')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left min-h-[56px] ${
                  activeView === 'projects'
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#16171A] border-[rgba(255,255,255,0.08)] text-[#F9FAFB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">Проекты</div>
                  <div className="text-[11px] text-[#9CA3AF] truncate">Цели и задачи</div>
                </div>
              </button>

              <button
                onClick={() => handleDrawerItemClick('ai')}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left min-h-[56px] ${
                  activeView === 'ai'
                    ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#16171A] border-[rgba(255,255,255,0.08)] text-[#F9FAFB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 text-[#10B981] flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">Nova AI</div>
                  <div className="text-[11px] text-[#10B981] truncate">Нейро-ассистент</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Quick Modes & Utilities */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold mb-2 px-1">
              Режимы и Быстрые действия
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {onOpenDeepWork && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playPop();
                    onOpenDeepWork();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Headphones className="w-4 h-4 text-[#0EA5E9]" />
                  <span className="truncate font-medium">Deep Work Zen</span>
                </button>
              )}

              {onOpenEveningReview && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playPop();
                    onOpenEveningReview();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Sunset className="w-4 h-4 text-[#F59E0B]" />
                  <span className="truncate font-medium">Вечерний обзор</span>
                </button>
              )}

              {onOpenVoiceInput && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playPop();
                    onOpenVoiceInput();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Mic className="w-4 h-4 text-[#10B981]" />
                  <span className="truncate font-medium">Голосовой ввод</span>
                </button>
              )}

              {onOpenStandBy && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playPop();
                    onOpenStandBy();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Smartphone className="w-4 h-4 text-[#9CA3AF]" />
                  <span className="truncate font-medium">Режим StandBy</span>
                </button>
              )}

              {onToggleSplitView && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    onToggleSplitView();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Columns className="w-4 h-4 text-[#0EA5E9]" />
                  <span className="truncate font-medium">
                    {isSplitView ? 'Закрыть сплит' : '2 Окна (Сплит)'}
                  </span>
                </button>
              )}

              {onOpenPairing && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playPop();
                    onOpenPairing();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[48px]"
                >
                  <Radio className="w-4 h-4 text-[#10B981]" />
                  <span className="truncate font-medium">QR Companion</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 3: System & Preferences Controls */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] font-semibold mb-2 px-1">
              Система и Настройки
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {onToggleTheme && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onToggleTheme();
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[44px]"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-[#F59E0B]" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#0EA5E9]" />
                  )}
                  <span className="truncate">{isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
                </button>
              )}

              {onToggleLanguage && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onToggleLanguage();
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[44px]"
                >
                  <Globe className="w-4 h-4 text-[#0EA5E9]" />
                  <span className="truncate">Язык: {currentLang.toUpperCase()}</span>
                </button>
              )}

              {onOpenSync && (
                <button
                  onClick={() => {
                    setIsMoreDrawerOpen(false);
                    sound.playClick();
                    onOpenSync();
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[44px]"
                >
                  <Cloud className="w-4 h-4 text-[#10B981]" />
                  <span className="truncate">Синхронизация</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playClick();
                  onToggleSound();
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[44px]"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#9CA3AF]" />
                )}
                <span className="truncate">{soundEnabled ? 'Звук: Вкл' : 'Звук: Выкл'}</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  sound.playClick();
                  onOpenShortcuts();
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F9FAFB] active:scale-[0.98] min-h-[44px]"
              >
                <Keyboard className="w-4 h-4 text-[#0EA5E9]" />
                <span className="truncate">Клавиши</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreDrawerOpen(false);
                  sound.playClick();
                  onLockApp();
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] text-xs text-[#F43F5E] active:scale-[0.98] min-h-[44px]"
              >
                <Lock className="w-4 h-4" />
                <span className="truncate">Заблокировать</span>
              </button>
            </div>
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
};
