import React, { useState, useEffect } from 'react';
import { storage } from './lib/storage';
import { AppState } from './types';
import { Navigation } from './components/Navigation';
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
import { LockScreen } from './components/LockScreen';
import { syncService, SyncState } from './lib/supabaseSync';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export function App() {
  const [state, setState] = useState<AppState>(storage.getState());
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const [currentLang, setCurrentLang] = useState(i18n.getLanguage());
  const [currentTheme, setCurrentTheme] = useState(themeManager.getTheme());

  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
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

    return () => {
      unsubStorage();
      unsubSync();
      unsubLang();
      unsubTheme();
    };
  }, []);

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

  return (
    <div
      className={`min-h-screen bg-[#060e20] text-[#dae2fd] flex flex-col md:flex-row antialiased font-sans ${
        state.user.focusMode ? 'focus-mode' : ''
      }`}
    >
      {/* Side Navigation Rail */}
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

      {/* Main Execution View Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Floating App Bar */}
        <header className="h-16 border-b border-[#222a3d] px-4 md:px-8 flex items-center justify-between bg-[#060e20]/90 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Nav expand toggle button for small screens / collapsed state */}
            <button
              onClick={() => setIsNavCollapsed((prev) => !prev)}
              title={isNavCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
              className="p-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors md:hidden"
            >
              {isNavCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Omnibar search launcher */}
            <button
              onClick={() => setIsOmnibarOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-xs text-[#86948a] hover:text-[#dae2fd] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tTop.searchPlaceholder}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#0b1326] text-[10px] font-mono border border-[#222a3d]">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Language Switcher (RU / EN) */}
            <button
              onClick={handleToggleLanguage}
              title={currentLang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-xs font-mono text-[#dae2fd] transition-all hover:border-[#00ffab]/40"
            >
              <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="font-bold">{currentLang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={handleToggleTheme}
              title={currentTheme === 'dark' ? tTop.themeLight : tTop.themeDark}
              className="p-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-[#86948a] hover:text-[#e5a93c] transition-all hover:border-[#e5a93c]/40"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#e5a93c]" />
              ) : (
                <Moon className="w-4 h-4 text-[#89ceff]" />
              )}
            </button>

            {/* Sync Status Pill */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-xs font-mono transition-all group"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  syncState === 'synced'
                    ? 'bg-[#00ffab] shadow-[0_0_6px_#00ffab]'
                    : syncState === 'syncing'
                    ? 'bg-[#00e5ff] animate-ping'
                    : syncState === 'offline'
                    ? 'bg-[#e5a93c]'
                    : 'bg-[#ffb4ab]'
                }`}
              />
              <span className="hidden sm:inline text-[#bbcabf] group-hover:text-[#dae2fd]">
                {syncState === 'synced' && tTop.synced}
                {syncState === 'syncing' && tTop.syncing}
                {syncState === 'offline' && tTop.offline}
                {syncState === 'error' && tTop.error}
              </span>
              <Cloud className="w-3.5 h-3.5 text-[#86948a] group-hover:text-[#00e5ff]" />
            </button>

            {state.user.focusMode && (
              <div className="px-3 py-1 rounded-full bg-[#00ffab]/10 border border-[#00ffab]/40 text-[#00ffab] text-xs font-mono flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus Orbit</span>
              </div>
            )}

            <div className="text-xs font-mono text-[#86948a] hidden lg:block">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className={`flex-1 ${state.activeView === 'ai' ? 'p-4 md:p-8' : 'p-4 md:p-8'}`}>
          {state.activeView === 'dashboard' && (
            <DashboardModule state={state} onNavigate={handleSelectView} />
          )}
          {state.activeView === 'tasks' && <TasksModule state={state} />}
          {state.activeView === 'calendar' && <CalendarModule state={state} />}
          {state.activeView === 'habits' && <HabitsModule state={state} />}
          {state.activeView === 'books' && <BooksModule state={state} />}
          {state.activeView === 'notes' && <NotesModule state={state} />}
          {state.activeView === 'projects' && <ProjectsModule state={state} />}
          {state.activeView === 'ai' && (
            <AIAnalystModule state={state} onNavigate={handleSelectView} />
          )}
        </main>
      </div>

      {/* Omnibar / Command Palette */}
      <CommandPalette
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        state={state}
        onSelectView={handleSelectView}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      {/* Supabase & IndexedDB Sync Modal */}
      <SyncModal
        state={state}
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating AI Assistant Drawer & FAB */}
      <AIAssistantDrawer state={state} onNavigate={handleSelectView} />
    </div>
  );
}

export default App;
