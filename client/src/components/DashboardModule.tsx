import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  BookOpen,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  AlertCircle,
  Play,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MessageSquare,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { AppState, Priority, Task } from '../types';
import { storage } from '../lib/storage';
import { aiEngine } from '../lib/aiEngine';
import { sound } from '../lib/sound';

interface DashboardModuleProps {
  state: AppState;
  onNavigate: (view: AppState['activeView']) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ state, onNavigate }) => {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Priority>('medium');
  const [quickTaskTag, setQuickTaskTag] = useState(state.tags[0]?.id || '');
  const [currentGreeting, setCurrentGreeting] = useState<{ greeting: string; speechText: string } | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const hasSpokenOnMount = useRef(false);

  const today = new Date().toISOString().split('T')[0];

  const todayTasks = state.tasks.filter((t) => !t.dueDate || t.dueDate === today);
  const completedTodayTasks = todayTasks.filter((t) => t.isCompleted);
  const pendingTasks = todayTasks.filter((t) => !t.isCompleted);

  const activeBook = state.books.find((b) => b.status === 'reading') || state.books[0];

  // Initialize and speak dynamic Jarvis greeting on mount
  useEffect(() => {
    const greetingData = aiEngine.getRandomJarvisGreeting(state);
    setCurrentGreeting(greetingData);

    if (!hasSpokenOnMount.current && state.user.voiceGreetingEnabled !== false) {
      hasSpokenOnMount.current = true;
      // Trigger voice greeting with gentle delay
      const timer = setTimeout(() => {
        setIsPlayingVoice(true);
        aiEngine.speakText(
          greetingData.speechText,
          state.user.aiSettings?.selectedVoice || 'Zephyr',
          () => setIsPlayingVoice(true),
          () => setIsPlayingVoice(false)
        );
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePlayGreeting = () => {
    if (!currentGreeting) return;
    sound.playClick();
    setIsPlayingVoice(true);
    aiEngine.speakText(
      currentGreeting.speechText,
      state.user.aiSettings?.selectedVoice || 'Zephyr',
      () => setIsPlayingVoice(true),
      () => setIsPlayingVoice(false)
    );
  };

  const handleRefreshGreeting = () => {
    sound.playClick();
    const newGreeting = aiEngine.getRandomJarvisGreeting(state);
    setCurrentGreeting(newGreeting);
    setIsPlayingVoice(true);
    aiEngine.speakText(
      newGreeting.speechText,
      state.user.aiSettings?.selectedVoice || 'Zephyr',
      () => setIsPlayingVoice(true),
      () => setIsPlayingVoice(false)
    );
  };

  const handleToggleVoiceGreeting = () => {
    sound.playClick();
    const current = state.user.voiceGreetingEnabled !== false;
    storage.updateUserProfile({ voiceGreetingEnabled: !current });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    storage.addTask({
      title: quickTaskTitle.trim(),
      priority: quickTaskPriority,
      tagId: quickTaskTag || undefined,
      dueDate: today,
      dueTime: '12:00',
      isCompleted: false,
    });
    setQuickTaskTitle('');
  };

  const getTag = (tagId?: string) => state.tags.find((t) => t.id === tagId);

  const activeHabitsDoneToday = state.habits.filter((h) => !!h.logs[today]).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Nova Jarvis AI HUD Greeting Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-[#0d1628] via-[#131d33] to-[#0f182d] border border-[#00ffab]/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ffab]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#00e5ff]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab] shadow-lg shadow-[#00ffab]/10">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d1628] ${isPlayingVoice ? 'bg-[#00e5ff] animate-ping' : 'bg-[#00ffab]'}`} />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#00ffab]/15 text-[#00ffab] border border-[#00ffab]/30 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> NOVA JARVIS INTELLIGENCE • ONLINE
                </span>
                <span className="text-[10px] font-mono text-[#86948a]">
                  Командный центр • Бухара, Узбекистан
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#dae2fd] font-display leading-snug">
                {currentGreeting?.greeting || `Добро пожаловать в Zing OS, ${state.user.name}!`}
              </h2>

              <p className="text-xs text-[#bbcabf] font-sans flex items-center gap-2">
                <span>Личный ИИ-ассистент: <strong>Нова (Nova)</strong></span>
                <span>•</span>
                <span>Пользователь: <strong>{state.user.fullName || 'Аминов Сардор Азизжонович'}</strong> ({state.user.age || 14} лет)</span>
              </p>
            </div>
          </div>

          {/* Jarvis Voice & AI Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#222a3d]/80 flex-shrink-0">
            <button
              onClick={handlePlayGreeting}
              disabled={isPlayingVoice}
              className="px-3.5 py-2 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] text-xs font-mono text-[#00ffab] flex items-center gap-2 transition-all group"
              title="Озвучить приветствие голосом Новы"
            >
              <Volume2 className={`w-4 h-4 ${isPlayingVoice ? 'animate-bounce text-[#00e5ff]' : 'group-hover:scale-110'}`} />
              <span>{isPlayingVoice ? 'Нова говорит...' : 'Озвучить'}</span>
            </button>

            <button
              onClick={handleRefreshGreeting}
              className="p-2 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-all"
              title="Сгенерировать новое приветствие"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleVoiceGreeting}
              className={`p-2 rounded-xl border transition-all ${
                state.user.voiceGreetingEnabled !== false
                  ? 'bg-[#00ffab]/10 text-[#00ffab] border-[#00ffab]/30'
                  : 'bg-[#0b1326] text-[#86948a] border-[#222a3d]'
              }`}
              title={state.user.voiceGreetingEnabled !== false ? 'Авто-озвучка при входе включена' : 'Авто-озвучка выключена'}
            >
              {state.user.voiceGreetingEnabled !== false ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onNavigate('ai');
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#00ffab] to-[#00e5ff] hover:opacity-90 text-[#003824] font-bold text-xs font-mono rounded-xl shadow-lg shadow-[#00ffab]/20 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Чат с Новой (Full Screen)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Cockpit Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#131b2e] via-[#171f33] to-[#131b2e] border border-[#222a3d] shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4edea3] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            System Status: Operational • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#dae2fd] tracking-tight font-display">
            Командный пульт: {state.user.name}
          </h2>
          <p className="text-sm text-[#bbcabf] mt-1 font-sans">
            Осталось <span className="text-[#4edea3] font-semibold">{pendingTasks.length} задач</span> на сегодня, выполнено <span className="text-[#e5a93c] font-semibold">{activeHabitsDoneToday}/{state.habits.length} привычек</span>.
          </p>
        </div>

        {/* Quick Stat Capsules */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-[#0b1326]/80 border border-[#222a3d] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4edea3]/10 text-[#4edea3] flex items-center justify-center font-mono text-sm font-bold border border-[#4edea3]/20">
              {completedTodayTasks.length}/{todayTasks.length}
            </div>
            <div>
              <div className="text-[10px] text-[#86948a] uppercase font-mono tracking-wider">Задачи</div>
              <div className="text-xs font-semibold text-[#dae2fd]">
                {todayTasks.length > 0 ? Math.round((completedTodayTasks.length / todayTasks.length) * 100) : 0}% Готово
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-[#0b1326]/80 border border-[#222a3d] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e5a93c]/10 text-[#e5a93c] flex items-center justify-center font-mono text-sm font-bold border border-[#e5a93c]/20">
              <Flame className="w-4 h-4 text-[#e5a93c]" />
            </div>
            <div>
              <div className="text-[10px] text-[#86948a] uppercase font-mono tracking-wider">Макс. стрейк</div>
              <div className="text-xs font-semibold text-[#dae2fd]">
                {state.habits[0]?.streak || 0} Дней
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Today's Primary Tasks */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4edea3]" />
                <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                  Today's Execution Focus
                </h3>
                <span className="text-xs font-mono text-[#86948a] px-2 py-0.5 rounded-full bg-[#171f33] border border-[#222a3d]">
                  {todayTasks.length}
                </span>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-mono text-[#4edea3] hover:underline flex items-center gap-1"
              >
                All Tasks <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Input Bar */}
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Quick capture a new task..."
                className="flex-1 bg-[#0b1326] border border-[#222a3d] rounded-xl px-4 py-2.5 text-sm text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#4edea3] transition-colors"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim()}
                className="px-4 py-2.5 bg-[#4edea3] hover:bg-[#10b981] disabled:opacity-40 text-[#003824] font-semibold text-sm rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#4edea3]/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline font-mono">Add</span>
              </button>
            </form>

            {/* Task Items List */}
            <div className="space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#86948a] border border-dashed border-[#222a3d] rounded-xl">
                  No tasks scheduled for today. Create one above to establish orbit.
                </div>
              ) : (
                todayTasks.map((task) => {
                  const tag = getTag(task.tagId);
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                        task.isCompleted
                          ? 'bg-[#0b1326]/40 border-[#222a3d]/50 opacity-60'
                          : 'bg-[#171f33]/70 hover:bg-[#171f33] border-[#222a3d] hover:border-[#3c4a42]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button
                          onClick={() => storage.toggleTask(task.id)}
                          className="text-[#86948a] hover:text-[#4edea3] transition-colors flex-shrink-0"
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-[#4edea3]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#86948a] group-hover:text-[#4edea3]" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              task.isCompleted
                                ? 'line-through text-[#86948a]'
                                : 'text-[#dae2fd]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.dueTime && (
                              <span className="text-[11px] font-mono text-[#86948a] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#89ceff]" />
                                {task.dueTime}
                              </span>
                            )}
                            {tag && (
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor: `${tag.color}15`,
                                  borderColor: `${tag.color}35`,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.priority === 'high' && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30">
                            High
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Daily Habit Rhythm Module */}
          <div className="p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#e5a93c]" />
                <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                  Daily Habit Check-in
                </h3>
              </div>
              <button
                onClick={() => onNavigate('habits')}
                className="text-xs font-mono text-[#4edea3] hover:underline flex items-center gap-1"
              >
                Heatmap <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.habits.map((habit) => {
                const isDone = !!habit.logs[today];
                return (
                  <button
                    key={habit.id}
                    onClick={() => storage.toggleHabitLog(habit.id, today)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isDone
                        ? 'bg-[#4edea3]/10 border-[#4edea3]/40 shadow-sm shadow-[#4edea3]/10'
                        : 'bg-[#171f33]/60 hover:bg-[#171f33] border-[#222a3d] hover:border-[#3c4a42]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className={`text-xs font-semibold truncate ${isDone ? 'text-[#4edea3]' : 'text-[#dae2fd]'}`}>
                        {habit.name}
                      </div>
                      <div className="text-[10px] font-mono text-[#86948a] mt-0.5 flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-[#e5a93c]" />
                        {habit.streak} day streak
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
                        isDone
                          ? 'bg-[#4edea3] text-[#003824] border-[#4edea3]'
                          : 'bg-[#0b1326] border-[#222a3d] text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col (5 cols): Reading Tracker & Projects Quick View */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Reading Card */}
          {activeBook && (
            <div className="p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#e5a93c]" />
                  <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                    Currently Reading
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('books')}
                  className="text-xs font-mono text-[#e5a93c] hover:underline flex items-center gap-1"
                >
                  Book Vault <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex gap-4 items-center">
                {activeBook.coverUrl && (
                  <img
                    src={activeBook.coverUrl}
                    alt={activeBook.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-24 object-cover rounded-lg border border-[#222a3d] shadow-md flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#dae2fd] truncate">
                    {activeBook.title}
                  </h4>
                  <p className="text-xs text-[#86948a] font-sans mt-0.5">
                    {activeBook.author}
                  </p>
                  <div className="text-[11px] font-mono text-[#e5a93c] mt-2">
                    Page {activeBook.currentPage} of {activeBook.totalPages} ({Math.round((activeBook.currentPage / activeBook.totalPages) * 100)}%)
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#0b1326] h-2 rounded-full overflow-hidden border border-[#222a3d]">
                <div
                  className="bg-gradient-to-r from-[#e5a93c] to-[#00ffab] h-full rounded-full transition-all duration-300"
                  style={{ width: `${(activeBook.currentPage / activeBook.totalPages) * 100}%` }}
                />
              </div>

              {/* Quick Page Increment Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#222a3d]/60">
                <span className="text-xs text-[#86948a] font-mono">Quick Log:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => storage.updateBook(activeBook.id, { currentPage: Math.min(activeBook.totalPages, activeBook.currentPage + 5) })}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] border border-[#222a3d] transition-colors"
                  >
                    +5 pgs
                  </button>
                  <button
                    onClick={() => storage.updateBook(activeBook.id, { currentPage: Math.min(activeBook.totalPages, activeBook.currentPage + 15) })}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] border border-[#222a3d] transition-colors"
                  >
                    +15 pgs
                  </button>
                  <button
                    onClick={() => onNavigate('books')}
                    className="px-3 py-1 text-xs font-mono rounded-lg bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-semibold transition-colors"
                  >
                    Timer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Objectives Overview */}
          <div className="p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#89ceff]" />
                <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                  Active Objectives
                </h3>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-mono text-[#89ceff] hover:underline flex items-center gap-1"
              >
                Projects <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {state.projects.slice(0, 2).map((proj) => (
                <div key={proj.id} className="p-3.5 rounded-xl bg-[#171f33]/60 border border-[#222a3d] space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-[#dae2fd] truncate">{proj.title}</h5>
                    <span className="text-[10px] font-mono text-[#4edea3] font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-[#0b1326] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#4edea3] h-full rounded-full transition-all"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
