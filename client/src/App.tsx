import React, { useState, useEffect } from 'react';
import { storage } from './lib/storage';
import { AppState, Task, Book } from './types';
import { AppLayout } from './components/AppLayout';
import { Navigation } from './components/Navigation';
import { BottomNavigationBar } from './components/BottomNavigationBar';
import { MobileHeader } from './components/MobileHeader';
import { DashboardModule } from './components/DashboardModule';
import { TasksModule } from './components/TasksModule';
import { CalendarModule } from './components/CalendarModule';
import { HabitsModule } from './components/HabitsModule';
import { BooksModule } from './components/BooksModule';
import { NotesModule } from './components/NotesModule';
import { ProjectsModule } from './components/ProjectsModule';
import { AIAnalystModule } from './components/AIAnalystModule';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { CommandPalette } from './components/CommandPalette';
import { SyncModal } from './components/SyncModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { LockScreen } from './components/LockScreen';
import { VoiceInputDialog } from './components/VoiceInputDialog';
import { DeepWorkZenModal } from './components/DeepWorkZenModal';
import { EveningReviewModal } from './components/EveningReviewModal';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { StandByView } from './components/StandByView';
import { DevicePairingModal } from './components/DevicePairingModal';
import { syncService, SyncState } from './lib/supabaseSync';
import { companionBridge, CompanionMessage } from './lib/companionBridge';
import { notificationService } from './lib/notificationService';
import { sound } from './lib/sound';
import { i18n } from './lib/i18n';
import { themeManager } from './lib/theme';
import {
  Sparkles,
  Search,
  Cloud,
  Sun,
  Moon,
  Globe,
  Bell,
  BellRing,
  Mic,
  Headphones,
  Columns,
  Smartphone,
  Radio,
} from 'lucide-react';

export function App() {
  const [state, setState] = useState<AppState>(storage.getState());
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isStandByOpen, setIsStandByOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false);
  const [isDeepWorkOpen, setIsDeepWorkOpen] = useState(false);
  const [deepWorkInitialTask, setDeepWorkInitialTask] = useState<Task | null>(null);
  const [deepWorkInitialBook, setDeepWorkInitialBook] = useState<Book | null>(null);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const [currentLang, setCurrentLang] = useState(i18n.getLanguage());
  const [currentTheme, setCurrentTheme] = useState(themeManager.getTheme());

  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Initialize offline notification system
    notificationService.init();
    const unsubNotifyNav = notificationService.onNotificationNavigate((targetView) => {
      if (targetView) {
        handleSelectView(targetView as any);
      }
    });

    const unsubStorage = storage.subscribe((newState) => {
      setState({ ...newState });
    });
    const unsubSync = syncService.subscribe((s, time) => {
      setSyncState(s);
      setLastSyncTime(time);
    });
    const unsubLang = i18n.subscribe((lang) => {
      setCurrentLang(lang);
    });
    const unsubTheme = themeManager.subscribe((th) => {
      setCurrentTheme(th);
    });

    // Companion bridge note drop listener
    const unsubCompanion = companionBridge.onMessage((msg: CompanionMessage) => {
      if (msg.type === 'NOTE_DROP' && msg.payload) {
        sound.playComplete();
        storage.addNote({
          title: msg.payload.title || 'Входящая мысль с Companion',
          content: msg.payload.content || '',
          category: 'Companion AirDrop',
          tags: msg.payload.tags || ['AirDrop', 'Companion'],
          pinned: true,
        });
      }
    });

    // Landscape orientation auto-detection for StandBy on mobile
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const isLandscape = window.innerWidth > window.innerHeight;
      const isSmallHeight = window.innerHeight <= 520;
      if (isLandscape && isSmallHeight && state.user.autoStandByOnLandscape) {
        setIsStandByOpen(true);
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      unsubNotifyNav();
      unsubStorage();
      unsubSync();
      unsubLang();
      unsubTheme();
      unsubCompanion();
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [state.user.autoStandByOnLandscape]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmnibarOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsOmnibarOpen(false);
        setIsSyncModalOpen(false);
        setIsShortcutsOpen(false);
        return;
      }

      if (isInput) return;

      // Top-level hotkeys
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLocked(true);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        storage.toggleFocusMode();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        storage.setActiveView('dashboard');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        storage.setActiveView('tasks');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        storage.setActiveView('calendar');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        storage.setActiveView('habits');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        storage.setActiveView('books');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        storage.setActiveView('notes');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        storage.setActiveView('projects');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        storage.setActiveView('ai');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectView = (view: AppState['activeView']) => {
    storage.setActiveView(view);
  };

  const handleToggleFocus = () => {
    storage.toggleFocusMode();
  };

  const handleToggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  const handleToggleLanguage = () => {
    storage.toggleLanguage();
    sound.playPop();
  };

  const handleToggleTheme = () => {
    storage.toggleTheme();
    sound.playPop();
  };

  const pendingTasksCount = state.tasks.filter((t) => !t.isCompleted).length;
  const tTop = i18n.t('topbar');

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} correctPin={state.user.pinCode} />;
  }

  if (isStandByOpen) {
    return <StandByView state={state} onExit={() => setIsStandByOpen(false)} />;
  }

  return (
    <AppLayout
      focusMode={state.user.focusMode}
      sidebar={
        <Navigation
          activeView={state.activeView}
          onSelectView={handleSelectView}
          user={state.user}
          onToggleFocus={handleToggleFocus}
          tasksCount={pendingTasksCount}
          onLockApp={() => setIsLocked(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed((prev) => !prev)}
        />
      }
      header={
        <>
          <div className="flex items-center gap-2.5">
            {/* Mobile Brand Wordmark */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] via-[#059669] to-[#0EA5E9] flex items-center justify-center shadow-md shadow-[#10B981]/20 flex-shrink-0">
                <span className="font-bold text-[#0B0C0E] text-sm font-mono tracking-tighter">Z</span>
              </div>
              <span className="font-bold text-sm font-mono text-[#F9FAFB] tracking-wider">
                ZING
              </span>
            </div>

            {/* Spotlight search launcher */}
            <button
              onClick={() => setIsOmnibarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="hidden sm:inline">{tTop.searchPlaceholder}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Parallel Split-Screen Mode Toggle */}
            <button
              onClick={() => {
                storage.toggleSplitView();
                sound.playPop();
              }}
              title={
                state.splitView?.enabled
                  ? 'Выйти из режима разделенного экрана'
                  : 'Включить режим разделенного экрана (2 окна параллельно)'
              }
              className={`p-2 rounded-xl border transition-all relative group shadow-sm flex items-center gap-1.5 ${
                state.splitView?.enabled
                  ? 'bg-[#10B981] text-[#0B0C0E] border-[#10B981] font-bold shadow-[#10B981]/20'
                  : 'bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] text-[#0EA5E9]'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden xl:inline text-xs font-mono">
                {state.splitView?.enabled ? '2 Окна (Сплит)' : 'Сплит-экран'}
              </span>
            </button>

            {/* Voice Input Quick Launch Button */}
            <button
              onClick={() => setIsVoiceInputOpen(true)}
              title={currentLang === 'ru' ? 'Голосовой Flow-Ввод задач и заметок' : 'Voice-to-Action Flow Input'}
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[#10B981]/40 text-[#10B981] transition-all relative group shadow-sm"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Deep Work Zen Mode Quick Launch */}
            <button
              onClick={() => {
                setDeepWorkInitialTask(null);
                setDeepWorkInitialBook(null);
                setIsDeepWorkOpen(true);
              }}
              title={currentLang === 'ru' ? 'Deep Work Zen Фокус-режим' : 'Deep Work Zen Focus'}
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[#0EA5E9]/40 text-[#0EA5E9] transition-all relative group shadow-sm"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Offline Notification Bell & Reminders Center */}
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              title={currentLang === 'ru' ? 'Офлайн-напоминания и уведомления' : 'Offline Reminders & Notifications'}
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#9CA3AF] hover:text-[#10B981] transition-all hover:border-[#10B981]/40 relative group"
            >
              <Bell className="w-4 h-4" />
              {notificationService.isPermissionGranted() && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
              )}
            </button>

            {/* StandBy Smart Desk Mode */}
            <button
              onClick={() => setIsStandByOpen(true)}
              title="Режим StandBy (Умный настольный экран)"
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#9CA3AF] hover:text-[#10B981] transition-all relative group shadow-sm"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* QR Companion Device Link */}
            <button
              onClick={() => setIsPairingModalOpen(true)}
              title="QR-Связь с телефоном (Live Bridge)"
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#0EA5E9] transition-all relative group shadow-sm"
            >
              <Radio className="w-4 h-4" />
            </button>

            {/* Language Switcher (RU / EN) */}
            <button
              onClick={handleToggleLanguage}
              title={currentLang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              className="flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs font-mono text-[#F9FAFB] transition-all hover:border-[#10B981]/40"
            >
              <Globe className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span className="font-bold">{currentLang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={handleToggleTheme}
              title={currentTheme === 'dark' ? tTop.themeLight : tTop.themeDark}
              className="p-2 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#9CA3AF] hover:text-[#F59E0B] transition-all hover:border-[#F59E0B]/40"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F59E0B]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0EA5E9]" />
              )}
            </button>

            {/* Sync Status Pill */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl bg-[#16171A] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs font-mono transition-all group"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  syncState === 'synced'
                    ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
                    : syncState === 'syncing'
                    ? 'bg-[#0EA5E9] animate-ping'
                    : syncState === 'offline'
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#F43F5E]'
                }`}
              />
              <span className="hidden sm:inline text-[#D1D5DB] group-hover:text-[#F9FAFB]">
                {syncState === 'synced' && tTop.synced}
                {syncState === 'syncing' && tTop.syncing}
                {syncState === 'offline' && tTop.offline}
                {syncState === 'error' && tTop.error}
              </span>
              <Cloud className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#0EA5E9]" />
            </button>

            {state.user.focusMode && (
              <div className="px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/40 text-[#10B981] text-xs font-mono flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus Orbit</span>
              </div>
            )}

            <div className="text-xs font-mono text-[#9CA3AF] hidden lg:block">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </>
      }
      mobileHeader={
        <MobileHeader
          activeView={state.activeView}
          onSelectView={handleSelectView}
          user={state.user}
          onOpenSearch={() => setIsOmnibarOpen(true)}
          onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
          onQuickAdd={() => {
            if (state.activeView === 'books') {
              window.dispatchEvent(new CustomEvent('open-add-book-modal'));
            } else if (state.activeView === 'notes') {
              window.dispatchEvent(new CustomEvent('create-new-note'));
            } else {
              window.dispatchEvent(new CustomEvent('open-quick-task-modal'));
            }
          }}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
          syncState={syncState}
          onOpenSync={() => setIsSyncModalOpen(true)}
          hasUnreadNotifications={notificationService.isPermissionGranted()}
        />
      }
      bottomNav={
        <BottomNavigationBar
          activeView={state.activeView}
          onSelectView={handleSelectView}
          tasksCount={pendingTasksCount}
          user={state.user}
          onToggleFocus={handleToggleFocus}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onLockApp={() => setIsLocked(true)}
          onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
          onOpenDeepWork={() => {
            setDeepWorkInitialTask(null);
            setDeepWorkInitialBook(null);
            setIsDeepWorkOpen(true);
          }}
          onOpenEveningReview={() => setIsEveningReviewOpen(true)}
          onToggleTheme={handleToggleTheme}
          isDark={currentTheme === 'dark'}
          onToggleLanguage={handleToggleLanguage}
          currentLang={currentLang}
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenStandBy={() => setIsStandByOpen(true)}
          onOpenPairing={() => setIsPairingModalOpen(true)}
          onToggleSplitView={() => {
            storage.toggleSplitView();
            sound.playPop();
          }}
          isSplitView={!!state.splitView?.enabled}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
        />
      }
      modals={
        <>
          {/* Omnibar / Command Palette */}
          <CommandPalette
            isOpen={isOmnibarOpen}
            onClose={() => setIsOmnibarOpen(false)}
            state={state}
            onSelectView={handleSelectView}
            onOpenSync={() => setIsSyncModalOpen(true)}
            onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
            onOpenDeepWork={() => {
              setDeepWorkInitialTask(null);
              setDeepWorkInitialBook(null);
              setIsDeepWorkOpen(true);
            }}
            onOpenEveningReview={() => setIsEveningReviewOpen(true)}
          />

          {/* Supabase & IndexedDB Sync Modal */}
          <SyncModal
            state={state}
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
          />

          {/* QR Companion Device Pairing Modal */}
          <DevicePairingModal
            isOpen={isPairingModalOpen}
            onClose={() => setIsPairingModalOpen(false)}
            state={state}
          />

          {/* Offline Notification Center Modal */}
          <NotificationCenterModal
            state={state}
            isOpen={isNotificationModalOpen}
            onClose={() => setIsNotificationModalOpen(false)}
            onNavigate={(view, id) => {
              handleSelectView(view);
              setIsNotificationModalOpen(false);
            }}
          />

          {/* Voice-to-Action Natural Language Modal */}
          <VoiceInputDialog
            isOpen={isVoiceInputOpen}
            onClose={() => setIsVoiceInputOpen(false)}
            state={state}
            onNavigate={handleSelectView}
          />

          {/* Deep Work Zen Focus Modal with Ambient Noise Generator */}
          <DeepWorkZenModal
            isOpen={isDeepWorkOpen}
            onClose={() => setIsDeepWorkOpen(false)}
            state={state}
            initialTask={deepWorkInitialTask}
            initialBook={deepWorkInitialBook}
          />

          {/* Evening AI Review & Daily Digest Modal */}
          <EveningReviewModal
            isOpen={isEveningReviewOpen}
            onClose={() => setIsEveningReviewOpen(false)}
            state={state}
          />

          {/* Keyboard Shortcuts Cheat Sheet */}
          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />

          {/* Floating AI Assistant Drawer & FAB */}
          <AIAssistantDrawer state={state} onNavigate={handleSelectView} />
        </>
      }
    >
      {state.splitView?.enabled ? (
        <div className="flex-1 flex flex-col min-h-0 w-full h-full overflow-hidden">
          <SplitViewWorkspace
            state={state}
            onOpenDeepWork={(task?: Task | null, book?: Book | null) => {
              setDeepWorkInitialTask(task || null);
              setDeepWorkInitialBook(book || null);
              setIsDeepWorkOpen(true);
            }}
            onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
            onOpenEveningReview={() => setIsEveningReviewOpen(true)}
          />
        </div>
      ) : (
        <div key={state.activeView} className="flex-1 flex flex-col min-h-0 w-full animate-fade-in">
          {state.activeView === 'dashboard' && (
            <DashboardModule
              state={state}
              onNavigate={handleSelectView}
              onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
              onOpenDeepWork={() => {
                setDeepWorkInitialTask(null);
                setDeepWorkInitialBook(null);
                setIsDeepWorkOpen(true);
              }}
              onOpenEveningReview={() => setIsEveningReviewOpen(true)}
              onOpenStandBy={() => setIsStandByOpen(true)}
              onOpenPairing={() => setIsPairingModalOpen(true)}
            />
          )}
          {state.activeView === 'tasks' && (
            <TasksModule
              state={state}
              onOpenDeepWork={(task) => {
                setDeepWorkInitialTask(task || null);
                setDeepWorkInitialBook(null);
                setIsDeepWorkOpen(true);
              }}
              onOpenVoiceInput={() => setIsVoiceInputOpen(true)}
            />
          )}
          {state.activeView === 'calendar' && <CalendarModule state={state} />}
          {state.activeView === 'habits' && <HabitsModule state={state} />}
          {state.activeView === 'books' && (
            <BooksModule
              state={state}
              onOpenDeepWork={(book) => {
                setDeepWorkInitialBook(book || null);
                setDeepWorkInitialTask(null);
                setIsDeepWorkOpen(true);
              }}
            />
          )}
          {state.activeView === 'notes' && <NotesModule state={state} />}
          {state.activeView === 'projects' && (
            <ProjectsModule state={state} onNavigate={handleSelectView} />
          )}
          {state.activeView === 'ai' && (
            <AIAnalystModule state={state} onNavigate={handleSelectView} />
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default App;
