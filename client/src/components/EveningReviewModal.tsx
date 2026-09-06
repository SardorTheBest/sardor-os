import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  Flame,
  BookOpen,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import { AppState, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';

interface EveningReviewModalProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: AppState['activeView']) => void;
}

export const EveningReviewModal: React.FC<EveningReviewModalProps> = ({
  state,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const isRu = state.language === 'ru';
  const userName = state.user.name || 'Сардор';
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduledCount, setRescheduledCount] = useState<number | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Today's Tasks
  const todayTasks = useMemo(() => {
    return state.tasks.filter((t) => t.dueDate === todayStr || (!t.dueDate && !t.isCompleted));
  }, [state.tasks, todayStr]);

  const completedTodayTasks = useMemo(() => {
    return todayTasks.filter((t) => t.isCompleted);
  }, [todayTasks]);

  const pendingTodayTasks = useMemo(() => {
    return todayTasks.filter((t) => !t.isCompleted);
  }, [todayTasks]);

  const taskCompletionRate = todayTasks.length > 0
    ? Math.round((completedTodayTasks.length / todayTasks.length) * 100)
    : 100;

  // Reading stats today
  const todayReadingSessions = useMemo(() => {
    return state.readingSessions.filter((s) => s.timestamp.startsWith(todayStr));
  }, [state.readingSessions, todayStr]);

  const totalPagesReadToday = useMemo(() => {
    return todayReadingSessions.reduce((acc, s) => acc + s.pagesRead, 0);
  }, [todayReadingSessions]);

  const totalReadingMinutesToday = useMemo(() => {
    return todayReadingSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [todayReadingSessions]);

  // Habits today
  const habitsDoneToday = useMemo(() => {
    return state.habits.filter((h) => !!h.logs[todayStr]).length;
  }, [state.habits, todayStr]);

  const maxHabitStreak = useMemo(() => {
    return state.habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  }, [state.habits]);

  // Reschedule all pending tasks for today to tomorrow in 1 click
  const handleReschedulePendingToTomorrow = () => {
    if (pendingTodayTasks.length === 0) return;
    setIsRescheduling(true);
    sound.playComplete();

    let count = 0;
    pendingTodayTasks.forEach((task) => {
      storage.updateTask(task.id, {
        dueDate: tomorrowStr,
      });
      count++;
    });

    setRescheduledCount(count);
    setIsRescheduling(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-float pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2 sm:hidden" />

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#9333ea]/20 to-[#00ffab]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab] flex-shrink-0">
              <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-[#d0bcff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono text-[#00ffab] uppercase tracking-wider">
                  {isRu ? 'ВЕЧЕРНИЙ ИИ-ДАЙДЖЕСТ' : 'EVENING AI DIGEST'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ffab] animate-ping" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#dae2fd] font-display">
                {isRu ? `Итоги дня: ${userName}` : `Daily Review: ${userName}`}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#86948a] hover:text-[#dae2fd] hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* AI Personalized Insight Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131b2e] to-[#17223b] border border-[#00ffab]/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00ffab]">
              <Sparkles className="w-4 h-4" />
              <span>Nova AI Reflection</span>
            </div>
            <p className="text-xs text-[#dae2fd] leading-relaxed">
              {isRu
                ? `«Сегодня ты закрыл ${taskCompletionRate}% задач${
                    totalPagesReadToday > 0 ? `, прочитал ${totalPagesReadToday} страниц` : ''
                  }${
                    maxHabitStreak > 0 ? ` и держишь стрейк привычек ${maxHabitStreak} дней подряд` : ''
                  }. Отличная продуктивность! Завтра продолжим движение к ключевым квартальным целям.»`
                : `«You completed ${taskCompletionRate}% of tasks today${
                    totalPagesReadToday > 0 ? `, read ${totalPagesReadToday} pages` : ''
                  }${
                    maxHabitStreak > 0 ? ` and hold a ${maxHabitStreak}-day habit streak` : ''
                  }. Fantastic consistency!»`}
            </p>
          </div>

          {/* Metric Stats Bento Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-[#222a3d] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[#86948a] mb-1 font-mono">
                <CheckSquare className="w-3.5 h-3.5 text-[#00ffab]" />
                {isRu ? 'Задачи' : 'Tasks'}
              </div>
              <div className="text-xl font-bold font-mono text-[#00ffab]">
                {completedTodayTasks.length}/{todayTasks.length}
              </div>
              <div className="text-[10px] text-[#86948a] mt-0.5">{taskCompletionRate}% выполнено</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-[#222a3d] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[#86948a] mb-1 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-[#00e5ff]" />
                {isRu ? 'Чтение' : 'Reading'}
              </div>
              <div className="text-xl font-bold font-mono text-[#00e5ff]">
                {totalPagesReadToday}
              </div>
              <div className="text-[10px] text-[#86948a] mt-0.5">
                {isRu ? 'страниц сегодня' : 'pages read'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-[#222a3d] text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[#86948a] mb-1 font-mono">
                <Flame className="w-3.5 h-3.5 text-[#e5a93c]" />
                {isRu ? 'Привычки' : 'Habits'}
              </div>
              <div className="text-xl font-bold font-mono text-[#e5a93c]">
                {habitsDoneToday}/{state.habits.length}
              </div>
              <div className="text-[10px] text-[#86948a] mt-0.5">
                {maxHabitStreak}д стрейк
              </div>
            </div>
          </div>

          {/* Pending Tasks & Reschedule Action */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#e5a93c]" />
                {isRu ? 'НЕЗАВЕРШЕННЫЕ ДЕЛА' : 'PENDING TASKS'} ({pendingTodayTasks.length})
              </span>

              {pendingTodayTasks.length > 0 && !rescheduledCount && (
                <button
                  onClick={handleReschedulePendingToTomorrow}
                  disabled={isRescheduling}
                  className="px-3 py-1.5 rounded-xl bg-[#00ffab]/10 hover:bg-[#00ffab]/20 border border-[#00ffab]/30 text-[#00ffab] font-mono text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  {isRu ? 'Перенести на завтра' : 'Move to tomorrow'}
                </button>
              )}
            </div>

            {rescheduledCount !== null && (
              <div className="p-3 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 text-xs text-[#00ffab] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  {isRu
                    ? `Успешно перенесено ${rescheduledCount} задач на завтра!`
                    : `Successfully rescheduled ${rescheduledCount} tasks to tomorrow!`}
                </span>
              </div>
            )}

            {pendingTodayTasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#131b2e]/60 border border-[#222a3d] text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-[#00ffab] mx-auto opacity-70" />
                <div className="text-xs font-semibold text-[#dae2fd]">
                  {isRu ? 'Все задачи на сегодня выполнены!' : 'All tasks for today completed!'}
                </div>
                <div className="text-[11px] text-[#86948a]">
                  {isRu ? 'Отличная работа, время для отдыха и восстановления.' : 'Great work! Time to rest and recharge.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {pendingTodayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#131b2e] border border-[#222a3d] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#e5a93c]" />
                      <span className="text-[#dae2fd] font-medium truncate">{t.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#86948a] flex-shrink-0">
                      {t.dueTime || t.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b] flex items-center justify-between bg-[#0b1326]/80 text-[11px] text-[#86948a]">
          <div className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-[#d0bcff]" />
            <span>{isRu ? 'Вечерний отчет сформирован Nova' : 'Daily report generated by Nova'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#171f33] hover:bg-[#1e293b] text-xs font-mono text-[#dae2fd] transition-colors"
          >
            {isRu ? 'Готово' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
