import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  Edit3,
  Trash2,
  BellRing,
  Clock,
  Archive,
} from 'lucide-react';
import { Task, Tag } from '../types';
import { storage } from '../lib/storage';

interface SwipeableTaskItemProps {
  task: Task;
  tag?: Tag;
  isRu: boolean;
  onOpenDeepWork?: (task: Task) => void;
  openEditModal: (task: Task) => void;
}

export const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
  task,
  tag,
  isRu,
  onOpenDeepWork,
  openEditModal,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startXRef.current;
    
    // Limit max swipe distance to 120px
    if (diffX > 120) setDragOffset(120);
    else if (diffX < -120) setDragOffset(-120);
    else setDragOffset(diffX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    startXRef.current = null;

    // Trigger action if swiped beyond 75px threshold
    if (dragOffset > 75) {
      // Swiped Right -> Toggle Complete / Archive
      storage.toggleTask(task.id);
    } else if (dragOffset < -75) {
      // Swiped Left -> Delete
      storage.deleteTask(task.id);
    }
    setDragOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background Actions for Touch Swipe */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded-2xl pointer-events-none">
        {/* Left Side Background: Swipe Right (Archive/Complete) */}
        <div
          className={`flex items-center gap-2 text-[#00ffab] font-mono text-xs font-bold transition-opacity ${
            dragOffset > 20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-[#00ffab]" />
          <span>{task.isCompleted ? (isRu ? 'Восстановить' : 'Restore') : (isRu ? 'Готово' : 'Done')}</span>
        </div>

        {/* Right Side Background: Swipe Left (Delete) */}
        <div
          className={`flex items-center gap-2 text-[#ff5370] font-mono text-xs font-bold transition-opacity ml-auto ${
            dragOffset < -20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span>{isRu ? 'Удалить' : 'Delete'}</span>
          <Trash2 className="w-5 h-5 text-[#ff5370]" />
        </div>
      </div>

      {/* Main Task Item Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`group flex items-start sm:items-center justify-between p-4 rounded-2xl border transition-colors duration-150 gap-3 relative z-10 ${
          task.isCompleted
            ? 'bg-[#0b1326]/60 border-[#222a3d]/40 opacity-60'
            : 'bg-[#131b2e] hover:bg-[#171f33] border-[#222a3d] hover:border-[#3c4a42] shadow-sm'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <button
            onClick={() => storage.toggleTask(task.id)}
            className="mt-0.5 sm:mt-0 text-[#86948a] hover:text-[#4edea3] transition-colors flex-shrink-0"
          >
            {task.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-[#4edea3]" />
            ) : (
              <Circle className="w-5 h-5 text-[#86948a] group-hover:text-[#4edea3]" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold truncate ${
                  task.isCompleted ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                }`}
              >
                {task.title}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-[#bbcabf] mt-1 line-clamp-1">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Due Date & Time Badge */}
              {task.dueDate && (
                <span className="text-[11px] font-mono text-[#86948a] flex items-center gap-1 bg-[#0b1326] px-2 py-0.5 rounded border border-[#222a3d]">
                  <Calendar className="w-3 h-3 text-[#89ceff]" />
                  {task.dueDate}
                  {task.startTime || task.dueTime ? (
                    <span className="text-[#dae2fd]">@ {task.startTime || task.dueTime}</span>
                  ) : (
                    <span className="text-[#00ffab] text-[10px] bg-[#00ffab]/10 px-1 rounded font-bold">
                      {isRu ? 'Весь день' : 'All day'}
                    </span>
                  )}
                </span>
              )}

              {!task.dueDate && (!task.startTime && !task.dueTime) && (
                <span className="text-[10px] font-mono text-[#86948a] bg-[#0b1326] px-2 py-0.5 rounded border border-[#222a3d] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#86948a]" />
                  <span>{isRu ? 'Без времени' : 'Untimed'}</span>
                </span>
              )}

              {tag && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    borderColor: `${tag.color}35`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              )}

              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  task.priority === 'high'
                    ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30'
                    : task.priority === 'medium'
                    ? 'bg-[#e5a93c]/10 text-[#e5a93c] border-[#e5a93c]/30'
                    : 'bg-[#89ceff]/10 text-[#89ceff] border-[#89ceff]/30'
                }`}
              >
                {task.priority === 'high'
                  ? isRu
                    ? 'Высокий'
                    : 'High'
                  : task.priority === 'medium'
                  ? isRu
                    ? 'Средний'
                    : 'Medium'
                  : isRu
                  ? 'Низкий'
                  : 'Low'}
              </span>

              {task.reminderEnabled && (
                <span
                  title={task.reminderDateTime ? `Напоминание: ${task.reminderDateTime}` : 'Напоминание активно'}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ffab]/10 border border-[#00ffab]/30 text-[#00ffab] flex items-center gap-1 shadow-xs"
                >
                  <BellRing className="w-3 h-3 text-[#00ffab] animate-pulse" />
                  <span>
                    {task.reminderDateTime
                      ? `${isRu ? 'Напомнить ' : 'Alert '}${task.reminderDateTime.replace('T', ' ')}`
                      : isRu
                      ? 'Напоминание вкл.'
                      : 'Reminder on'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onOpenDeepWork && !task.isCompleted && (
            <button
              onClick={() => onOpenDeepWork(task)}
              title={isRu ? 'Режим Погружения (Deep Work Zen)' : 'Deep Work Zen Focus'}
              className="p-1.5 rounded-lg text-[#00ffab] hover:bg-[#00ffab]/10 border border-[#00ffab]/20 transition-colors flex items-center gap-1 text-[11px] font-mono"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00ffab] animate-pulse" />
              <span className="hidden xl:inline">{isRu ? 'Фокус' : 'Focus'}</span>
            </button>
          )}
          <button
            onClick={() => openEditModal(task)}
            className="p-1.5 rounded-lg text-[#86948a] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => storage.deleteTask(task.id)}
            className="p-1.5 rounded-lg text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#222a3d] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
