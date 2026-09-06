import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  BookOpen,
  CheckSquare,
  Flame,
  Shield,
  Maximize2,
  Minimize2,
  Eye,
  Coffee,
  BrainCircuit,
  Hourglass,
  Clock,
} from 'lucide-react';
import { AppState, Task, Book } from '../types';
import { ambientSound, AMBIENT_TRACKS, AmbientSoundType } from '../lib/ambientSound';
import { sound } from '../lib/sound';
import { storage } from '../lib/storage';
import { haptics, fireCelebrationConfetti } from '../lib/haptics';

interface DeepWorkZenModalProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  initialBook?: Book | null;
}

export const DeepWorkZenModal: React.FC<DeepWorkZenModalProps> = ({
  state,
  isOpen,
  onClose,
  initialTask = null,
  initialBook = null,
}) => {
  const isRu = state.language === 'ru';
  const userName = state.user.name || 'Сардор';

  // Target task or book
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTask?.id || '');
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBook?.id || '');
  const [mode, setMode] = useState<'task' | 'book' | 'freestyle'>(
    initialBook ? 'book' : initialTask ? 'task' : 'freestyle'
  );

  // Timer Visual Styles: 'ring' | 'hourglass' | 'candle'
  const [timerVisualStyle, setTimerVisualStyle] = useState<'ring' | 'hourglass' | 'candle'>('hourglass');

  // Timer State
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Ambient Sound State
  const [activeSound, setActiveSound] = useState<AmbientSoundType>('rain');
  const [soundVolume, setSoundVolume] = useState<number>(ambientSound.getVolume());
  const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(true);

  // AI Guardian state (Tracks tab switches & idle distractions)
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [guardianToast, setGuardianToast] = useState<string | null>(null);

  // Long-press exit button state (1.2 seconds hold)
  const [exitHoldProgress, setExitHoldProgress] = useState<number>(0);
  const holdIntervalRef = useRef<any>(null);

  // Reading pages input for book mode finish
  const [pagesReadInput, setPagesReadInput] = useState<string>('');

  // Sync initial targets
  useEffect(() => {
    if (initialBook) {
      setMode('book');
      setSelectedBookId(initialBook.id);
    } else if (initialTask) {
      setMode('task');
      setSelectedTaskId(initialTask.id);
    }
  }, [initialBook, initialTask]);

  // Start ambient audio on open if enabled
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(sessionDurationMinutes * 60);
      setSecondsElapsed(0);
      setIsRunning(true);
      setTabSwitchCount(0);
      setGuardianToast(null);

      // Start ambient sound
      if (activeSound !== 'none') {
        ambientSound.play(activeSound);
        setIsSoundPlaying(true);
      }
    } else {
      ambientSound.stop();
      setIsSoundPlaying(false);
    }
    return () => {
      ambientSound.stop();
    };
  }, [isOpen]);

  // Main countdown timer interval
  useEffect(() => {
    if (!isOpen || !isRunning) return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Session Completed
          sound.playComplete();
          haptics.celebrate();
          fireCelebrationConfetti('zen_pomodoro');
          handleSessionCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isRunning]);

  // AI Guardian: Tab visibility & focus change detector
  useEffect(() => {
    if (!isOpen || !isRunning) return;

    let blurTimestamp = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurTimestamp = Date.now();
      } else {
        if (blurTimestamp > 0) {
          const awaySeconds = Math.round((Date.now() - blurTimestamp) / 1000);
          if (awaySeconds >= 6) {
            setTabSwitchCount((c) => c + 1);
            sound.playAlert();
            haptics.warning();
            const elapsedMins = Math.max(1, Math.round(secondsElapsed / 60));
            const remainingMins = Math.max(1, Math.round(secondsRemaining / 60));
            setGuardianToast(
              isRu
                ? `${userName}, ты в режиме Deep Work уже ${elapsedMins} мин! Осталось ${remainingMins} мин до цели. Держи фокус 🧠`
                : `${userName}, you are ${elapsedMins}m into Deep Work! ${remainingMins}m remaining. Keep focus 🧠`
            );
            setTimeout(() => setGuardianToast(null), 8000);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, isRunning, secondsElapsed, secondsRemaining, userName, isRu]);

  const handleSessionCompleted = () => {
    setIsRunning(false);
    ambientSound.stop();
    setIsSoundPlaying(false);

    const activeTask = state.tasks.find((t) => t.id === selectedTaskId);
    const activeBook = state.books.find((b) => b.id === selectedBookId);

    if (mode === 'task' && activeTask) {
      storage.toggleTask(activeTask.id);
    }
  };

  const handleSelectPreset = (mins: number) => {
    sound.playClick();
    haptics.light();
    setSessionDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
    setSecondsElapsed(0);
    setIsRunning(true);
  };

  const handleToggleAudio = () => {
    sound.playClick();
    haptics.light();
    if (isSoundPlaying) {
      ambientSound.stop();
      setIsSoundPlaying(false);
    } else {
      ambientSound.play(activeSound === 'none' ? 'rain' : activeSound);
      if (activeSound === 'none') setActiveSound('rain');
      setIsSoundPlaying(true);
    }
  };

  const handleChangeTrack = (track: AmbientSoundType) => {
    sound.playClick();
    haptics.light();
    setActiveSound(track);
    if (track === 'none') {
      ambientSound.stop();
      setIsSoundPlaying(false);
    } else {
      ambientSound.play(track);
      setIsSoundPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSoundVolume(val);
    ambientSound.setVolume(val);
  };

  // Long-press exit handler (requires holding for 1.2s to prevent accidental disruption)
  const handleHoldStart = () => {
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 5;
      setExitHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdIntervalRef.current);
        sound.playPop();
        haptics.success();
        ambientSound.stop();
        onClose();
      }
    }, 55);
  };

  const handleHoldEnd = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setExitHoldProgress(0);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalSecs = sessionDurationMinutes * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSecs - secondsRemaining) / totalSecs) * 100));

  const activeTask = state.tasks.find((t) => t.id === selectedTaskId);
  const activeBook = state.books.find((b) => b.id === selectedBookId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-[#050914] text-[#dae2fd] flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-300">
      {/* Background Animated Breathing Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#00ffab]/5 via-[#00e5ff]/5 to-purple-500/5 blur-3xl animate-pulse" />
      </div>

      {/* AI Guardian Distraction Toast */}
      {guardianToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 rounded-2xl bg-[#131b2e]/95 border border-[#00ffab]/50 shadow-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00ffab]/20 text-[#00ffab]">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-mono font-bold text-[#00ffab] uppercase">
                {isRu ? 'ИИ-Страж Погружения (Nova)' : 'AI Focus Guardian'}
              </div>
              <p className="text-xs text-[#dae2fd] mt-0.5">{guardianToast}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar: Target & Session Selector */}
      <div className="relative z-10 p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 flex items-center justify-center text-[#00ffab] flex-shrink-0">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-mono font-bold text-[#00ffab] tracking-wider uppercase truncate">
              {isRu ? 'РЕЖИМ DEEP WORK ZEN' : 'DEEP WORK ZEN MODE'}
            </div>
            <div className="text-xs text-[#86948a] truncate">
              {mode === 'task' && activeTask
                ? activeTask.title
                : mode === 'book' && activeBook
                ? `Чтение: «${activeBook.title}»`
                : isRu
                ? 'Чистый поток концентрации'
                : 'Pure Flow State'}
            </div>
          </div>
        </div>

        {/* Visual Style Selector: Hourglass / Candle / Ring */}
        <div className="flex items-center bg-[#131b2e]/80 p-1 rounded-xl border border-[#222a3d]">
          <button
            onClick={() => {
              setTimerVisualStyle('hourglass');
              sound.playPop();
              haptics.light();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              timerVisualStyle === 'hourglass'
                ? 'bg-[#00ffab]/20 text-[#00ffab] font-bold shadow-sm'
                : 'text-[#86948a] hover:text-[#dae2fd]'
            }`}
            title="Песочные часы"
          >
            <Hourglass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Песочные часы</span>
          </button>

          <button
            onClick={() => {
              setTimerVisualStyle('candle');
              sound.playPop();
              haptics.light();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              timerVisualStyle === 'candle'
                ? 'bg-[#e5a93c]/20 text-[#e5a93c] font-bold shadow-sm'
                : 'text-[#86948a] hover:text-[#dae2fd]'
            }`}
            title="Тающая свеча"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Свеча</span>
          </button>

          <button
            onClick={() => {
              setTimerVisualStyle('ring');
              sound.playPop();
              haptics.light();
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              timerVisualStyle === 'ring'
                ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold shadow-sm'
                : 'text-[#86948a] hover:text-[#dae2fd]'
            }`}
            title="Кольцо времени"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Кольцо</span>
          </button>
        </div>

        {/* Long-Press Hold Exit Button */}
        <div className="relative">
          <button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            className="px-4 py-2 rounded-2xl bg-[#131b2e]/80 hover:bg-[#1a233a] border border-[#222a3d] text-xs font-mono text-[#86948a] hover:text-[#dae2fd] transition-all flex items-center gap-2 relative overflow-hidden"
          >
            <span
              className="absolute left-0 top-0 bottom-0 bg-[#ff5252]/20 transition-all duration-75"
              style={{ width: `${exitHoldProgress}%` }}
            />
            <span className="relative z-10 flex items-center gap-1.5">
              <X className="w-4 h-4 text-[#ff7979]" />
              {exitHoldProgress > 0
                ? isRu ? `Удерживайте (${Math.round(exitHoldProgress)}%)` : `Holding (${Math.round(exitHoldProgress)}%)`
                : isRu ? 'Удерживайте для выхода' : 'Hold to Exit'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Focus Center Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 my-auto">
        {/* Visual 1: SANDGLASS / HOURGLASS VISUAL */}
        {timerVisualStyle === 'hourglass' && (
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative w-48 h-64 sm:w-56 sm:h-72 border-4 border-[#334155] rounded-3xl bg-[#090e1a]/80 shadow-2xl overflow-hidden flex flex-col justify-between p-2">
              {/* Top Bulb (Depleting sand) */}
              <div className="relative w-full h-[48%] rounded-t-2xl overflow-hidden bg-[#0a1220] border-b border-[#1e293b]">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#e5a93c] via-[#f59e0b] to-[#d97706] transition-all duration-1000 ease-linear rounded-b-md"
                  style={{ height: `${Math.max(0, 100 - progressPercent)}%` }}
                />
              </div>

              {/* Middle Sandglass Neck & Falling Stream */}
              <div className="relative h-4 w-full flex items-center justify-center">
                {isRunning && secondsRemaining > 0 && (
                  <div className="w-1 h-full bg-[#f59e0b] animate-pulse rounded-full shadow-[0_0_8px_#f59e0b]" />
                )}
              </div>

              {/* Bottom Bulb (Filling sand) */}
              <div className="relative w-full h-[48%] rounded-b-2xl overflow-hidden bg-[#0a1220] border-t border-[#1e293b]">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#d97706] via-[#f59e0b] to-[#fbbf24] transition-all duration-1000 ease-linear rounded-t-lg"
                  style={{ height: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Time Overlay */}
            <div className="mt-4 text-center">
              <div className="text-4xl sm:text-5xl font-mono font-light text-[#dae2fd] drop-shadow-md">
                {formatTime(secondsRemaining)}
              </div>
              <div className="text-xs font-mono text-[#86948a] mt-1 tracking-widest uppercase">
                {isRunning ? (isRu ? 'Песок течет • Поток фокуса' : 'Sand flowing • Pure Focus') : (isRu ? 'Пауза' : 'Paused')}
              </div>
            </div>
          </div>
        )}

        {/* Visual 2: MELTING CANDLE VISUAL */}
        {timerVisualStyle === 'candle' && (
          <div className="relative flex flex-col items-center justify-center">
            {/* Candle Stage */}
            <div className="relative w-28 h-64 sm:w-32 sm:h-72 flex flex-col items-center justify-end">
              {/* Flickering Flame */}
              {isRunning && secondsRemaining > 0 && (
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="w-6 h-10 rounded-full bg-gradient-to-t from-[#ea580c] via-[#f59e0b] to-[#fef08a] blur-[1px] animate-pulse shadow-[0_0_24px_#f59e0b]" />
                  <div className="w-1 h-3 bg-zinc-800 -mt-1" />
                </div>
              )}

              {/* Candle Body (Melting height based on remaining time) */}
              <div
                className="w-full bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#d97706] rounded-t-xl rounded-b-lg border-2 border-amber-400/40 shadow-2xl transition-all duration-1000 ease-linear relative overflow-hidden"
                style={{ height: `${Math.max(15, 100 - progressPercent)}%` }}
              >
                {/* Wax drips texture */}
                <div className="absolute top-0 left-2 w-3 h-4 bg-[#fffbeb] rounded-full opacity-70" />
                <div className="absolute top-0 right-3 w-2 h-6 bg-[#fffbeb] rounded-full opacity-60" />
              </div>

              {/* Candle Plate */}
              <div className="w-40 h-3 bg-[#334155] rounded-full border-t border-slate-400 shadow-xl -mt-1" />
            </div>

            {/* Time Overlay */}
            <div className="mt-4 text-center">
              <div className="text-4xl sm:text-5xl font-mono font-light text-[#dae2fd] drop-shadow-md">
                {formatTime(secondsRemaining)}
              </div>
              <div className="text-xs font-mono text-[#e5a93c] mt-1 tracking-widest uppercase">
                {isRunning ? (isRu ? 'Свеча горит • Чистое внимание' : 'Candle burning • Pure Attention') : (isRu ? 'Пауза' : 'Paused')}
              </div>
            </div>
          </div>
        )}

        {/* Visual 3: CIRCULAR ZEN RING */}
        {timerVisualStyle === 'ring' && (
          <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="#131b2e"
                strokeWidth="6"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="url(#zenGradient)"
                strokeWidth="6"
                strokeDasharray={552.92}
                strokeDashoffset={552.92 - (552.92 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="zenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ffab" />
                  <stop offset="100%" stopColor="#00e5ff" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-5xl sm:text-6xl font-mono font-light tracking-tight text-[#dae2fd] drop-shadow-md">
                {formatTime(secondsRemaining)}
              </div>
              <div className="text-xs font-mono text-[#86948a] mt-2 tracking-widest uppercase">
                {isRunning
                  ? isRu ? 'Глубокое погружение' : 'Deep Focus Flow'
                  : isRu ? 'Пауза' : 'Paused'}
              </div>
            </div>
          </div>
        )}

        {/* Controls: Play / Pause / Reset */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => {
              sound.playClick();
              haptics.medium();
              setIsRunning((r) => !r);
            }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
              isRunning
                ? 'bg-[#131b2e] hover:bg-[#1a233a] text-[#00ffab] border border-[#00ffab]/40'
                : 'bg-gradient-to-tr from-[#00ffab] to-[#00e5ff] text-[#003824] hover:scale-105 shadow-[#00ffab]/20'
            }`}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
          </button>

          <button
            onClick={() => {
              sound.playPop();
              haptics.light();
              setSecondsRemaining(sessionDurationMinutes * 60);
              setSecondsElapsed(0);
            }}
            title={isRu ? 'Сбросить таймер' : 'Reset Timer'}
            className="p-3.5 rounded-2xl bg-[#131b2e] hover:bg-[#1a233a] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Duration Quick Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {[15, 25, 45, 60, 90].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSelectPreset(mins)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
                sessionDurationMinutes === mins
                  ? 'bg-[#00ffab]/20 text-[#00ffab] border border-[#00ffab]/40 font-bold'
                  : 'bg-[#131b2e] text-[#86948a] hover:text-[#dae2fd] border border-[#222a3d]'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Floating Bar: Ambient Sound Generator & Atmosphere */}
      <div className="relative z-10 p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#131b2e]/60 bg-[#080d1a]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleAudio}
              className={`p-2.5 rounded-xl border transition-all ${
                isSoundPlaying
                  ? 'bg-[#00ffab]/20 border-[#00ffab]/50 text-[#00ffab]'
                  : 'bg-[#131b2e] border-[#222a3d] text-[#86948a]'
              }`}
            >
              {isSoundPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {AMBIENT_TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleChangeTrack(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans flex items-center gap-1.5 transition-all border ${
                  activeSound === t.id && isSoundPlaying
                    ? 'bg-[#00e5ff]/20 border-[#00e5ff]/40 text-[#00e5ff] font-medium shadow-sm'
                    : 'bg-[#131b2e] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                <span>{t.icon}</span>
                <span>{isRu ? t.name : t.nameEn}</span>
              </button>
            ))}
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-3 w-full md:w-48">
            <Volume2 className="w-4 h-4 text-[#86948a] flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={handleVolumeChange}
              className="w-full accent-[#00ffab] h-1.5 bg-[#222a3d] rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[#86948a] w-8">
              {Math.round(soundVolume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
