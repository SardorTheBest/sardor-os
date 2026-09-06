import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Flame,
  Sparkles,
  Mic,
  Send,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
  ChevronRight,
  Plus,
  Check,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { AppState, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { screenLock } from '../lib/screenLock';
import { companionBridge, CompanionMessage } from '../lib/companionBridge';
import { voiceIntentService, isSpeechRecognitionSupported } from '../lib/voiceIntentService';

interface StandByViewProps {
  state: AppState;
  onExit: () => void;
}

const STRATEGIC_QUOTES = [
  'Фокус рождается из способности отсекать лишнее.',
  'Каждый завершенный блок концентрации приближает большую цель.',
  'Глубокая работа — суперсила XXI века.',
  'Дисциплина — это мост между целью и свершением.',
  'Качественное чтение перепрошивает архитектуру мышления.',
  'Спокойный разум видит траекторию яснее.',
];

export const StandByView: React.FC<StandByViewProps> = ({ state, onExit }) => {
  // Time and Date
  const [currentTime, setCurrentTime] = useState(new Date());

  // Focus Timer state (25 min default)
  const [timerDuration, setTimerDuration] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  // Selected task
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(0);

  // Anti-Burn-In OLED Pixel Shift (X and Y offsets)
  const [pixelShift, setPixelShift] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Quick Drop Note / Voice Input State
  const [dropNoteText, setDropNoteText] = useState<string>('');
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [dropSuccessToast, setDropSuccessToast] = useState<string | null>(null);

  // Quote Index
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Companion status
  const [companionConnected, setCompanionConnected] = useState<boolean>(
    companionBridge.getStatus() === 'connected'
  );

  const pendingTasks = state.tasks.filter((t) => !t.isCompleted);
  const currentTask: Task | undefined = pendingTasks[activeTaskIndex] || pendingTasks[0];

  // Today stats
  const today = new Date().toISOString().split('T')[0];
  const pagesReadToday = state.readingSessions
    .filter((s) => s.timestamp.startsWith(today))
    .reduce((acc, s) => acc + s.pagesRead, 0);
  const habitsDoneCount = state.habits.filter((h) => !!h.logs[today]).length;

  // Request Wake Lock on mount
  useEffect(() => {
    screenLock.requestWakeLock();
    return () => {
      screenLock.releaseWakeLock();
    };
  }, []);

  // Clock Ticking Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Focus Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          companionBridge.sendTimerUpdate({
            isRunning: true,
            timeLeft: next,
            totalTime: timerDuration,
            activeTaskTitle: currentTask?.title,
            mode: timerMode === 'focus' ? 'pomodoro' : 'shortBreak',
          });
          return next;
        });
      }, 1000);
    } else if (isTimerRunning && timeLeft <= 0) {
      sound.playComplete();
      setIsTimerRunning(false);
      if (timerMode === 'focus') {
        setTimerMode('break');
        setTimeLeft(5 * 60);
        setTimerDuration(5 * 60);
      } else {
        setTimerMode('focus');
        setTimeLeft(25 * 60);
        setTimerDuration(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode, timerDuration, currentTask]);

  // Anti-Burn-In OLED Pixel Shift every 3 minutes
  useEffect(() => {
    const shiftInterval = setInterval(() => {
      const randomX = Math.floor(Math.random() * 7) - 3; // -3px to +3px
      const randomY = Math.floor(Math.random() * 7) - 3; // -3px to +3px
      setPixelShift({ x: randomX, y: randomY });
      setQuoteIndex((prev) => (prev + 1) % STRATEGIC_QUOTES.length);
    }, 3 * 60 * 1000);
    return () => clearInterval(shiftInterval);
  }, []);

  // Companion Bridge Subscription
  useEffect(() => {
    const unsubStatus = companionBridge.onStatusChange((status) => {
      setCompanionConnected(status === 'connected');
    });

    const unsubMsg = companionBridge.onMessage((msg: CompanionMessage) => {
      if (msg.type === 'CONTROL_ACTION') {
        const action = msg.payload?.action;
        if (action === 'TOGGLE_TIMER') {
          handleToggleTimer();
        } else if (action === 'RESET_TIMER') {
          handleResetTimer();
        } else if (action === 'COMPLETE_TASK' && currentTask) {
          handleCompleteCurrentTask();
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [currentTask, isTimerRunning]);

  const handleToggleTimer = () => {
    sound.playClick();
    setIsTimerRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    sound.playPop();
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
  };

  const handleSetPreset = (minutes: number) => {
    sound.playClick();
    setIsTimerRunning(false);
    setTimerDuration(minutes * 60);
    setTimeLeft(minutes * 60);
    setTimerMode('focus');
  };

  const handleCompleteCurrentTask = () => {
    if (!currentTask) return;
    sound.playComplete();
    storage.toggleTask(currentTask.id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }
  };

  const handleNextTask = () => {
    sound.playClick();
    if (pendingTasks.length <= 1) return;
    setActiveTaskIndex((prev) => (prev + 1) % pendingTasks.length);
  };

  // Instant Note Drop
  const handleDropNoteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dropNoteText.trim()) return;

    sound.playPop();
    const clean = dropNoteText.trim();
    const newNote = storage.addNote({
      title: clean.slice(0, 40) + (clean.length > 40 ? '...' : ''),
      content: clean,
      category: 'StandBy Drops',
      tags: ['StandBy', 'DeskCapture'],
      pinned: false,
    });

    // Broadcast to companion PC / tablet
    companionBridge.sendNoteDrop('StandBy Note', clean, ['StandBy']);

    setDropNoteText('');
    setDropSuccessToast('Мысль сохранена в Заметки');
    setTimeout(() => setDropSuccessToast(null), 3000);
  };

  // Voice Dictation for StandBy
  const handleToggleVoiceDictation = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Голосовой ввод не поддерживается браузером');
      return;
    }

    if (isListeningVoice) {
      voiceIntentService.stopListening();
      setIsListeningVoice(false);
      handleDropNoteSubmit();
    } else {
      setIsListeningVoice(true);
      voiceIntentService.setLanguage(state.language);
      voiceIntentService.startListening({
        onStart: () => sound.playClick(),
        onInterim: (text) => setDropNoteText(text),
        onFinal: (text) => {
          setDropNoteText(text);
          setIsListeningVoice(false);
        },
        onError: () => setIsListeningVoice(false),
        onEnd: () => setIsListeningVoice(false),
      });
    }
  };

  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format Time Strings
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');
  const dayName = currentTime.toLocaleDateString(state.language === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
  });
  const dateFormatted = currentTime.toLocaleDateString(
    state.language === 'ru' ? 'ru-RU' : 'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );

  // Timer format
  const tMinutes = Math.floor(timeLeft / 60);
  const tSeconds = timeLeft % 60;
  const timerStr = `${String(tMinutes).padStart(2, '0')}:${String(tSeconds).padStart(2, '0')}`;
  const timerPercent = ((timerDuration - timeLeft) / timerDuration) * 100;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#090c12] text-[#dae2fd] select-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden font-sans transition-transform duration-700 ease-out"
      style={{
        transform: `translate(${pixelShift.x}px, ${pixelShift.y}px)`,
      }}
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4edea3]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Utility Header */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131b2e] border border-[#222a3d] text-xs font-mono text-[#86948a]">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="uppercase tracking-widest text-[11px] font-semibold text-[#dae2fd]">
              StandBy Desk
            </span>
          </div>

          {companionConnected && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-xs font-mono text-[#00e5ff]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Bridge Connected</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#131b2e] hover:bg-[#1c253b] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors"
            title="Полноэкранный режим"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onExit();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#1c253b] border border-[#222a3d] text-xs font-mono text-[#86948a] hover:text-[#dae2fd] transition-colors"
          >
            Выход
          </button>
        </div>
      </header>

      {/* Main Center Content (Grid: Left Clock & Date, Right Focus & Stats) */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto z-10">
        {/* Left Side (6 cols): Giant Brutalist Clock */}
        <div className="md:col-span-6 flex flex-col justify-center space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-6xl sm:text-7xl lg:text-9xl font-extrabold tracking-tighter text-[#dae2fd] leading-none">
              {hours}:{minutes}
            </span>
            <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#86948a]">
              {seconds}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-lg sm:text-xl font-bold text-[#4edea3] capitalize font-display">
              {dayName}
            </div>
            <div className="text-sm font-mono text-[#86948a] uppercase tracking-wider">
              {dateFormatted}
            </div>
          </div>
        </div>

        {/* Right Side (6 cols): Active Task Focus Timer & Mini Progress Hub */}
        <div className="md:col-span-6 space-y-4">
          {/* Active Task & Pomodoro Widget */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111724]/90 border border-[#222a3d] backdrop-blur-md shadow-2xl space-y-3.5">
            {/* Task Title / Status */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#4edea3] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {timerMode === 'focus' ? 'Фокус-блок' : 'Перерыв на отдых'}
                </div>
                <div className="text-sm sm:text-base font-bold text-[#dae2fd] truncate mt-0.5">
                  {currentTask ? currentTask.title : 'Все задачи на сегодня выполнены'}
                </div>
              </div>

              {currentTask && (
                <button
                  onClick={handleCompleteCurrentTask}
                  className="px-3 py-1.5 rounded-xl bg-[#4edea3]/15 hover:bg-[#4edea3]/30 border border-[#4edea3]/40 text-[#4edea3] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
                  title="Отметить задачу выполненной"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Готово</span>
                </button>
              )}
            </div>

            {/* Timer Counter Bar */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="font-mono text-3xl sm:text-4xl font-black text-[#00e5ff] tracking-tight">
                {timerStr}
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleTimer}
                  className={`p-3 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg ${
                    isTimerRunning
                      ? 'bg-[#e5a93c] text-[#001e2f] shadow-[#e5a93c]/20'
                      : 'bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-[#003640] shadow-[#00e5ff]/20'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button
                  onClick={handleResetTimer}
                  className="p-3 rounded-xl bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors"
                  title="Сбросить таймер"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {pendingTasks.length > 1 && (
                  <button
                    onClick={handleNextTask}
                    className="p-3 rounded-xl bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors"
                    title="Следующая задача"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress line */}
            <div className="w-full bg-[#090c12] h-1.5 rounded-full overflow-hidden border border-[#222a3d]/50">
              <div
                className="bg-gradient-to-r from-[#00e5ff] to-[#4edea3] h-full rounded-full transition-all duration-300"
                style={{ width: `${timerPercent}%` }}
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-[#86948a]">
              <span className="text-[#55645c]">Пресеты:</span>
              <button
                onClick={() => handleSetPreset(15)}
                className={`px-2 py-0.5 rounded-lg border ${
                  timerDuration === 15 * 60 ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40' : 'border-[#222a3d] hover:text-[#dae2fd]'
                }`}
              >
                15m
              </button>
              <button
                onClick={() => handleSetPreset(25)}
                className={`px-2 py-0.5 rounded-lg border ${
                  timerDuration === 25 * 60 ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40' : 'border-[#222a3d] hover:text-[#dae2fd]'
                }`}
              >
                25m
              </button>
              <button
                onClick={() => handleSetPreset(50)}
                className={`px-2 py-0.5 rounded-lg border ${
                  timerDuration === 50 * 60 ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40' : 'border-[#222a3d] hover:text-[#dae2fd]'
                }`}
              >
                50m
              </button>
            </div>
          </div>

          {/* Quick Day Metrics: Reading & Habits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#111724]/70 border border-[#222a3d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e5a93c]/10 border border-[#e5a93c]/30 text-[#e5a93c] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-[#86948a] uppercase">Чтение сегодня</div>
                <div className="text-sm font-bold text-[#dae2fd] truncate">
                  {pagesReadToday} стр.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111724]/70 border border-[#222a3d] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-[#86948a] uppercase">Привычки</div>
                <div className="text-sm font-bold text-[#dae2fd] truncate">
                  {habitsDoneCount}/{state.habits.length} выполнено
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Drop-Zone & Strategic Quote */}
      <footer className="space-y-3 z-10">
        {/* Strategic Quote Line */}
        <div className="flex items-center justify-between text-xs font-mono text-[#86948a] px-1">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[#4edea3] font-bold">[Nova]</span>
            <span className="truncate">{STRATEGIC_QUOTES[quoteIndex]}</span>
          </div>

          {dropSuccessToast && (
            <span className="text-[#4edea3] font-bold flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              {dropSuccessToast}
            </span>
          )}
        </div>

        {/* 1-Tap Quick Note / Quote Drop-Zone */}
        <form
          onSubmit={handleDropNoteSubmit}
          className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#111724] border border-[#222a3d] focus-within:border-[#4edea3] transition-colors shadow-lg"
        >
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            className={`p-2.5 rounded-xl transition-all ${
              isListeningVoice
                ? 'bg-[#ff5555] text-white animate-pulse'
                : 'bg-[#171f33] text-[#4edea3] hover:bg-[#222a3d]'
            }`}
            title="Надиктовать мысль или цитату"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={dropNoteText}
            onChange={(e) => setDropNoteText(e.target.value)}
            placeholder="Быстрая мысль или цитата в Заметки (1-Tap AirDrop)..."
            className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-[#dae2fd] placeholder-[#64748b] focus:outline-none"
          />

          <button
            type="submit"
            disabled={!dropNoteText.trim()}
            className="p-2.5 rounded-xl bg-[#4edea3] hover:bg-[#4edea3]/90 disabled:opacity-30 text-[#003824] font-bold transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};
