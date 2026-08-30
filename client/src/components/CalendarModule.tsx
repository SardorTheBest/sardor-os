import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  X,
  CheckCircle2,
  Circle,
  Tag as TagIcon,
  GripVertical,
  Move,
  Sparkles,
  Inbox,
  ArrowRight,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { AppState, Priority, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';

interface CalendarModuleProps {
  state: AppState;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarModule: React.FC<CalendarModuleProps> = ({ state }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // Drag and Drop active indicators
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<string | null>(null);
  const [isTrayDropTarget, setIsTrayDropTarget] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(true);

  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState('');
  
  // Quick Reschedule state in Modal
  const [rescheduleDateInput, setRescheduleDateInput] = useState('');
  const [rescheduleTimeInput, setRescheduleTimeInput] = useState('');

  // More tasks popup
  const [moreTasksDate, setMoreTasksDate] = useState<string | null>(null);

  // Form states for creating task
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newTagId, setNewTagId] = useState(state.tags[0]?.id || '');

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const draggedTaskObj = useMemo(() => {
    return state.tasks.find((t) => t.id === draggedTaskId) || null;
  }, [draggedTaskId, state.tasks]);

  const unscheduledTasks = useMemo(() => {
    return state.tasks.filter((t) => !t.dueDate && !t.isCompleted);
  }, [state.tasks]);

  const handlePrev = () => {
    sound.playClick();
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    sound.playClick();
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    sound.playClick();
    setCurrentDate(new Date());
  };

  // Calendar Grid Calculation for Month View
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Monday start

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to reach 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate, todayStr]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    state.tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    // Sort tasks in each day by dueTime
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'));
    });
    return map;
  }, [state.tasks]);

  const getTag = (tagId?: string) => state.tags.find((t) => t.id === tagId);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    sound.playClick();
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDate(null);
    setDragOverHour(null);
    setIsTrayDropTarget(false);
  };

  const handleDropOnDate = (e: React.DragEvent, dateStr: string, timeStr?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      storage.rescheduleTask(taskId, dateStr, timeStr);
    }
    setDraggedTaskId(null);
    setDragOverDate(null);
    setDragOverHour(null);
    setIsTrayDropTarget(false);
  };

  const handleDropOnTray = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      storage.updateTask(taskId, { dueDate: undefined, dueTime: undefined });
      sound.playPop();
    }
    setDraggedTaskId(null);
    setIsTrayDropTarget(false);
  };

  const openCreateForDate = (dateStr: string, defaultTime: string = '10:00') => {
    setCreateDate(dateStr);
    setNewTitle('');
    setNewTime(defaultTime);
    setNewPriority('medium');
    setNewTagId(state.tags[0]?.id || '');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !createDate) return;
    storage.addTask({
      title: newTitle.trim(),
      dueDate: createDate,
      dueTime: newTime,
      priority: newPriority,
      tagId: newTagId || undefined,
      isCompleted: false,
    });
    setIsCreateModalOpen(false);
  };

  const handleOpenTaskModal = (task: Task) => {
    setSelectedTask(task);
    setRescheduleDateInput(task.dueDate || todayStr);
    setRescheduleTimeInput(task.dueTime || '12:00');
    setIsTaskModalOpen(true);
  };

  const handleManualReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    storage.rescheduleTask(selectedTask.id, rescheduleDateInput, rescheduleTimeInput);
    setSelectedTask({
      ...selectedTask,
      dueDate: rescheduleDateInput,
      dueTime: rescheduleTimeInput,
    });
    setIsTaskModalOpen(false);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffab]/10 text-[#00ffab] flex items-center justify-center border border-[#00ffab]/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#dae2fd] font-display">
              {monthYearLabel}
            </h2>
            <p className="text-xs font-mono text-[#86948a] flex items-center gap-1.5">
              <span>DRAG & DROP SCHEDULING ENGINE</span>
              <span className="w-1 h-1 rounded-full bg-[#00ffab]" />
              <span className="text-[#00ffab]">INDEXEDDB PERSISTENT</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unscheduled Tray Toggle */}
          <button
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all ${
              isTrayOpen
                ? 'bg-[#00ffab]/10 border-[#00ffab]/40 text-[#00ffab]'
                : 'bg-[#171f33] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Unscheduled ({unscheduledTasks.length})</span>
          </button>

          {/* Month / Week / Day Selector */}
          <div className="flex items-center gap-1 bg-[#0b1326] p-1 rounded-xl border border-[#222a3d]">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  sound.playClick();
                  setViewMode(mode);
                }}
                className={`px-3 py-1 text-xs font-mono capitalize rounded-lg transition-colors ${
                  viewMode === mode
                    ? 'bg-[#171f33] text-[#00ffab] font-semibold border border-[#00ffab]/30'
                    : 'text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono text-[#dae2fd] border border-[#222a3d] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] border border-[#222a3d] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] border border-[#222a3d] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Hint Banner / Active Drag State Notice */}
      <div className="px-4 py-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-[11px] font-mono text-[#86948a] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-[#00e5ff] animate-pulse" />
          {draggedTaskObj ? (
            <span className="text-[#00ffab] font-semibold">
              Dragging "{draggedTaskObj.title}" — Drop on any day cell or time block to reschedule!
            </span>
          ) : (
            <span>Перетаскивайте задачи между днями, часовыми слотами или из корзины задач для мгновенного переноса дедлайна.</span>
          )}
        </div>
        <span className="text-[#00e5ff] flex items-center gap-1 font-mono">
          <Sparkles className="w-3 h-3" />
          IndexedDB Auto-Sync (0ms Latency)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Unscheduled / Drag-and-Drop Task Staging Tray */}
        {isTrayOpen && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (!isTrayDropTarget) setIsTrayDropTarget(true);
            }}
            onDragLeave={() => setIsTrayDropTarget(false)}
            onDrop={handleDropOnTray}
            className={`lg:col-span-3 rounded-2xl bg-[#131b2e] border p-4 space-y-3 transition-all ${
              isTrayDropTarget
                ? 'border-[#00ffab] ring-2 ring-[#00ffab] bg-[#171f33]'
                : 'border-[#222a3d]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#222a3d]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#dae2fd]">
                <Inbox className="w-4 h-4 text-[#00ffab]" />
                <span>UNSCHEDULED TRAY</span>
              </div>
              <span className="text-[10px] font-mono text-[#86948a]">
                {unscheduledTasks.length} tasks
              </span>
            </div>

            <p className="text-[11px] text-[#86948a] font-mono">
              Drag tasks into calendar cells to schedule, or drop scheduled tasks here to clear date.
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0b1326] border border-dashed border-[#222a3d] text-center text-xs text-[#86948a] font-mono">
                  No unscheduled tasks. All set!
                </div>
              ) : (
                unscheduledTasks.map((t) => {
                  const tag = getTag(t.tagId);
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenTaskModal(t)}
                      className={`p-2.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] hover:border-[#00ffab] transition-all cursor-grab active:cursor-grabbing group ${
                        draggedTaskId === t.id ? 'opacity-40 scale-95' : ''
                      }`}
                      style={{
                        borderLeftWidth: '3px',
                        borderLeftColor: tag?.color || '#00e5ff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-[#86948a] uppercase">
                          {t.priority}
                        </span>
                        <GripVertical className="w-3 h-3 text-[#86948a] opacity-40 group-hover:opacity-100" />
                      </div>
                      <div className="text-xs text-[#dae2fd] font-medium truncate">{t.title}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Main Calendar View (Month / Week / Day) */}
        <div className={isTrayOpen ? 'lg:col-span-9' : 'lg:col-span-12'}>
          {/* View: Month Grid */}
          {viewMode === 'month' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] overflow-hidden shadow-xl">
              {/* Weekday Labels Header */}
              <div className="grid grid-cols-7 border-b border-[#222a3d] bg-[#0b1326]/60">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="py-2.5 text-center text-xs font-mono font-semibold text-[#86948a] tracking-wider"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Cells Grid */}
              <div className="grid grid-cols-7 auto-rows-fr bg-[#222a3d] gap-[1px]">
                {calendarDays.map((cell) => {
                  const cellTasks = tasksByDate[cell.dateStr] || [];
                  const visibleTasks = cellTasks.slice(0, 3);
                  const extraCount = cellTasks.length - 3;
                  const isDragTarget = dragOverDate === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => openCreateForDate(cell.dateStr)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverDate !== cell.dateStr) setDragOverDate(cell.dateStr);
                      }}
                      onDragLeave={() => {
                        if (dragOverDate === cell.dateStr) setDragOverDate(null);
                      }}
                      onDrop={(e) => handleDropOnDate(e, cell.dateStr)}
                      className={`min-h-[115px] p-2 bg-[#131b2e] transition-all relative cursor-pointer flex flex-col justify-between group ${
                        !cell.isCurrentMonth ? 'opacity-40' : ''
                      } ${
                        isDragTarget ? 'bg-[#171f33] ring-2 ring-[#00ffab] z-10 scale-[1.01]' : 'hover:bg-[#171f33]/80'
                      }`}
                    >
                      {/* Date Number Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-[#00ffab] text-[#003824] shadow-[0_0_10px_#00ffab]'
                              : 'text-[#dae2fd]'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateForDate(cell.dateStr);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#86948a] hover:text-[#00ffab] rounded-md transition-opacity"
                          title="Add task on this day"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Drop Target Indicator Box */}
                      {isDragTarget && (
                        <div className="my-1 py-1 rounded border border-dashed border-[#00ffab] bg-[#00ffab]/10 text-center text-[10px] font-mono text-[#00ffab] animate-pulse">
                          + Drop here
                        </div>
                      )}

                      {/* Task Pills (Draggable) */}
                      <div className="space-y-1 my-1 flex-1">
                        {visibleTasks.map((t) => {
                          const tag = getTag(t.tagId);
                          const tagColor = tag ? tag.color : '#00e5ff';
                          return (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskModal(t);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono truncate flex items-center gap-1 border transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                                t.isCompleted
                                  ? 'line-through opacity-50 bg-[#0b1326] border-[#222a3d] text-[#86948a]'
                                  : 'bg-[#0b1326] hover:bg-[#1b2332] text-[#dae2fd]'
                              } ${draggedTaskId === t.id ? 'opacity-40 scale-95 ring-1 ring-[#00e5ff]' : ''}`}
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: tagColor,
                              }}
                            >
                              <GripVertical className="w-2.5 h-2.5 text-[#86948a] flex-shrink-0 opacity-40 group-hover:opacity-100" />
                              {t.dueTime && (
                                <span className="text-[#00e5ff] flex-shrink-0 font-bold">
                                  {t.dueTime}
                                </span>
                              )}
                              <span className="truncate">{t.title}</span>
                            </div>
                          );
                        })}

                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoreTasksDate(cell.dateStr);
                            }}
                            className="text-[10px] font-mono text-[#00ffab] hover:underline block pt-0.5"
                          >
                            +{extraCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View: Week Grid (7-Day Column Slots with Drag-and-Drop) */}
          {viewMode === 'week' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono text-[#86948a] uppercase">
                  Week Schedule • 7-Day Orbit Matrix
                </h3>
                <span className="text-xs font-mono text-[#00ffab]">Drag across days to reschedule</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(currentDate);
                  const day = d.getDay();
                  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i;
                  d.setDate(diff);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const dayTasks = tasksByDate[dateStr] || [];
                  const isDragTarget = dragOverDate === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => openCreateForDate(dateStr)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
                      }}
                      onDragLeave={() => {
                        if (dragOverDate === dateStr) setDragOverDate(null);
                      }}
                      onDrop={(e) => handleDropOnDate(e, dateStr)}
                      className={`p-3 rounded-xl border min-h-[280px] flex flex-col justify-between cursor-pointer transition-all ${
                        dateStr === todayStr
                          ? 'bg-[#171f33] border-[#00ffab]/40 shadow-sm shadow-[#00ffab]/10'
                          : 'bg-[#0b1326] border-[#222a3d] hover:border-[#3c4a42]'
                      } ${isDragTarget ? 'ring-2 ring-[#00ffab] bg-[#1b2332] scale-[1.02]' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#222a3d]">
                          <span className="text-xs font-mono font-bold text-[#86948a]">
                            {daysOfWeek[i]}
                          </span>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                              dateStr === todayStr
                                ? 'bg-[#00ffab] text-[#003824] font-bold'
                                : 'text-[#dae2fd]'
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        </div>

                        {/* Drop Target Hint */}
                        {isDragTarget && (
                          <div className="mb-2 p-1.5 rounded border border-dashed border-[#00ffab] bg-[#00ffab]/10 text-center text-[10px] font-mono text-[#00ffab] animate-pulse">
                            + Drop on {daysOfWeek[i]}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {dayTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskModal(t);
                              }}
                              className={`p-2 rounded-lg bg-[#131b2e] border border-[#222a3d] text-[11px] font-sans truncate hover:border-[#00ffab] cursor-grab active:cursor-grabbing ${
                                draggedTaskId === t.id ? 'opacity-40 ring-1 ring-[#00e5ff]' : ''
                              }`}
                            >
                              <div className="text-[10px] font-mono text-[#00e5ff] font-bold flex items-center justify-between">
                                <span>{t.dueTime || 'Anytime'}</span>
                                <span className="text-[9px] uppercase px-1 rounded bg-[#0b1326] text-[#86948a]">
                                  {t.priority}
                                </span>
                              </div>
                              <div className="truncate text-[#dae2fd] mt-0.5">{t.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateForDate(dateStr);
                        }}
                        className="w-full mt-2 py-1 text-center text-[10px] font-mono text-[#00ffab] hover:bg-[#171f33] rounded transition-colors"
                      >
                        + Add Task
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View: Day View (Google Calendar Time-Blocked Grid) */}
          {viewMode === 'day' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#222a3d] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-xs font-mono text-[#00ffab]">
                    DAILY TIME-BLOCKED TIMELINE • DRAG TASKS TO HOURLY SLOTS
                  </p>
                </div>
                <button
                  onClick={() => {
                    const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                    openCreateForDate(dStr, '12:00');
                  }}
                  className="px-4 py-2 bg-[#00ffab] text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00ffab]/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Task for Day
                </button>
              </div>

              {/* Hourly Slots */}
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((hour) => {
                  const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                  const slotTasks = (tasksByDate[dStr] || []).filter(
                    (t) => t.dueTime && t.dueTime.startsWith(hour.slice(0, 2))
                  );
                  const isSlotTarget = dragOverHour === hour;

                  return (
                    <div
                      key={hour}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverHour !== hour) setDragOverHour(hour);
                      }}
                      onDragLeave={() => {
                        if (dragOverHour === hour) setDragOverHour(null);
                      }}
                      onDrop={(e) => handleDropOnDate(e, dStr, hour)}
                      className={`flex gap-4 p-3 rounded-xl border transition-all items-start ${
                        isSlotTarget
                          ? 'bg-[#1b2332] border-[#00ffab] ring-2 ring-[#00ffab] scale-[1.01]'
                          : 'bg-[#0b1326]/70 border-[#222a3d]/60 hover:border-[#3c4a42]'
                      }`}
                    >
                      <span className="w-14 text-xs font-mono text-[#86948a] pt-1 font-bold">{hour}</span>
                      
                      <div className="flex-1 space-y-1.5 min-h-[32px]">
                        {isSlotTarget && (
                          <div className="py-1 px-3 rounded border border-dashed border-[#00ffab] bg-[#00ffab]/10 text-xs font-mono text-[#00ffab] animate-pulse">
                            + Drop task here to schedule for {hour}
                          </div>
                        )}

                        {slotTasks.length === 0 && !isSlotTarget ? (
                          <div
                            onClick={() => openCreateForDate(dStr, hour)}
                            className="text-[11px] text-[#3c4a42] font-mono hover:text-[#86948a] cursor-pointer py-1"
                          >
                            + Click or drop task to schedule for {hour}
                          </div>
                        ) : (
                          slotTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleOpenTaskModal(t)}
                              className={`p-2.5 rounded-lg bg-[#171f33] border border-[#222a3d] flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-[#00ffab] ${
                                draggedTaskId === t.id ? 'opacity-40 ring-1 ring-[#00e5ff]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-medium ${
                                    t.isCompleted ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                                  }`}
                                >
                                  {t.title}
                                </span>
                                <span className="text-[10px] font-mono text-[#00e5ff] font-bold">
                                  {t.dueTime}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b1326] text-[#86948a]">
                                {t.priority}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Details / Edit / Reschedule Modal */}
      {isTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    storage.toggleTask(selectedTask.id);
                    setSelectedTask({ ...selectedTask, isCompleted: !selectedTask.isCompleted });
                  }}
                  className="text-[#86948a] hover:text-[#00ffab]"
                >
                  {selectedTask.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00ffab]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#86948a]" />
                  )}
                </button>
                <h3 className="text-base font-bold text-[#dae2fd] font-display truncate">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTask.description && (
              <p className="text-xs text-[#bbcabf] bg-[#0b1326] p-3 rounded-xl border border-[#222a3d]">
                {selectedTask.description}
              </p>
            )}

            {/* Reschedule Form */}
            <form onSubmit={handleManualReschedule} className="space-y-3 p-3.5 rounded-xl bg-[#0b1326] border border-[#222a3d]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#00ffab] font-bold">
                  QUICK RESCHEDULE TASK
                </span>
                <span className="text-[10px] font-mono text-[#86948a]">or Drag on calendar</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#86948a] mb-1">DATE</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDateInput}
                    onChange={(e) => setRescheduleDateInput(e.target.value)}
                    className="w-full bg-[#131b2e] border border-[#222a3d] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#86948a] mb-1">TIME</label>
                  <input
                    type="time"
                    value={rescheduleTimeInput}
                    onChange={(e) => setRescheduleTimeInput(e.target.value)}
                    className="w-full bg-[#131b2e] border border-[#222a3d] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] text-xs font-mono text-[#00ffab] rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Update Schedule in IndexedDB
              </button>
            </form>

            <div className="flex justify-between items-center pt-3 border-t border-[#222a3d]">
              <button
                onClick={() => {
                  storage.deleteTask(selectedTask.id);
                  setIsTaskModalOpen(false);
                }}
                className="text-xs font-mono text-[#ffb4ab] hover:underline"
              >
                Delete Task
              </button>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono text-[#dae2fd] rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Tasks Day Popover Modal */}
      {moreTasksDate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Tasks for {moreTasksDate}
              </h3>
              <button
                onClick={() => setMoreTasksDate(null)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(tasksByDate[moreTasksDate] || []).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    handleOpenTaskModal(t);
                    setMoreTasksDate(null);
                  }}
                  className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] hover:border-[#00ffab] cursor-pointer flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-[#dae2fd] truncate">{t.title}</span>
                  <span className="text-[10px] font-mono text-[#00e5ff]">{t.dueTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Add Task for {createDate}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">TASK TITLE *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">DUE TIME</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">TAG</label>
                  <select
                    value={newTagId}
                    onChange={(e) => setNewTagId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  >
                    {state.tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00ffab] text-[#003824] font-mono text-xs font-semibold rounded-xl shadow-md shadow-[#00ffab]/20"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
