import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Search,
  Check,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  Sliders,
} from 'lucide-react';
import { AppState, Priority, Tag, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';

interface CalendarModuleProps {
  state: AppState;
}

type ViewMode = 'week' | 'day' | 'month';

const HOUR_HEIGHT = 60; // 60px per hour => 1px per minute
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00

// Helper functions for time calculations
function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9 * 60; // default 09:00
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
  return Math.min(1439, Math.max(0, h * 60 + m));
}

function minutesToTime(minutes: number): string {
  const m = Math.min(1439, Math.max(0, Math.round(minutes)));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

function formatDuration(minutes: number, isRu: boolean): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return isRu ? `${m} мин` : `${m}m`;
  if (m === 0) return isRu ? `${h} ч` : `${h}h`;
  return isRu ? `${h} ч ${m} мин` : `${h}h ${m}m`;
}

interface TimedTaskLayout {
  task: Task;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  colIndex: number;
  totalCols: number;
  top: number;
  height: number;
}

// Google Calendar style overlapping task cluster algorithm
function calculateOverlappingLayout(tasks: Task[]): TimedTaskLayout[] {
  if (tasks.length === 0) return [];

  // 1. Convert all tasks to minute intervals
  const items = tasks.map((task) => {
    let startM = timeToMinutes(task.startTime || task.dueTime || '09:00');
    let endM = task.endTime ? timeToMinutes(task.endTime) : startM + 60;
    if (endM <= startM) endM = Math.min(1439, startM + 30); // fallback min 30m
    return {
      task,
      startM,
      endM,
      durationM: endM - startM,
    };
  });

  // 2. Sort by start time ASC, then longest duration DESC
  items.sort((a, b) => {
    if (a.startM !== b.startM) return a.startM - b.startM;
    return b.durationM - a.durationM;
  });

  // 3. Cluster overlapping tasks
  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endM;
    } else {
      if (item.startM < clusterEnd) {
        // Overlaps with current cluster
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endM);
      } else {
        // Start new cluster
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEnd = item.endM;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. Assign columns within each cluster (Greedy column packing)
  const result: TimedTaskLayout[] = [];

  for (const cluster of clusters) {
    const columns: number[] = []; // stores the latest endM for each column index

    const clusterLayouts: Array<{
      item: (typeof items)[0];
      colIndex: number;
    }> = [];

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c] <= item.startM) {
          placedCol = c;
          columns[c] = item.endM;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columns.length;
        columns.push(item.endM);
      }
      clusterLayouts.push({ item, colIndex: placedCol });
    }

    const totalCols = Math.max(1, columns.length);

    for (const { item, colIndex } of clusterLayouts) {
      const top = (item.startM / 60) * HOUR_HEIGHT;
      const height = Math.max(22, (item.durationM / 60) * HOUR_HEIGHT);

      result.push({
        task: item.task,
        startMinutes: item.startM,
        endMinutes: item.endM,
        durationMinutes: item.durationM,
        colIndex,
        totalCols,
        top,
        height,
      });
    }
  }

  return result;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({ state }) => {
  const isRu = state.language === 'ru';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isTrayOpen, setIsTrayOpen] = useState(true);
  const [traySearch, setTraySearch] = useState('');

  // Live Current Time Indicator
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const nowMinutes = useMemo(() => {
    return now.getHours() * 60 + now.getMinutes();
  }, [now]);

  // Drag and Drop (Move task) state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragHoverDate, setDragHoverDate] = useState<string | null>(null);
  const [dragHoverMinute, setDragHoverMinute] = useState<number | null>(null);
  const [isTrayDropTarget, setIsTrayDropTarget] = useState(false);

  // Live Resize state
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
  const [resizingOriginalEndM, setResizingOriginalEndM] = useState<number>(0);
  const [resizingCurrentEndM, setResizingCurrentEndM] = useState<number>(0);
  const [resizingStartM, setResizingStartM] = useState<number>(0);
  const resizeStartYRef = useRef<number>(0);

  // 1-Click / Drag Selection to Create
  const [selectionRange, setSelectionRange] = useState<{
    dateStr: string;
    startM: number;
    endM: number;
  } | null>(null);
  const isSelectingRef = useRef(false);

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState(todayStr);
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('10:00');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<Priority>('medium');
  const [createTagId, setCreateTagId] = useState(state.tags[0]?.id || '');

  // Month view more tasks modal
  const [moreTasksDate, setMoreTasksDate] = useState<string | null>(null);

  // Scroll container ref to auto-center on ~08:00
  const timeGridScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (timeGridScrollRef.current && (viewMode === 'week' || viewMode === 'day')) {
      const scrollPos = 7.5 * HOUR_HEIGHT; // scroll to 07:30 AM
      timeGridScrollRef.current.scrollTop = scrollPos;
    }
  }, [viewMode]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    state.tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [state.tasks]);

  const unscheduledTasks = useMemo(() => {
    return state.tasks.filter((t) => {
      if (t.isCompleted) return false;
      if (t.dueDate) return false;
      if (traySearch.trim()) {
        return t.title.toLowerCase().includes(traySearch.toLowerCase());
      }
      return true;
    });
  }, [state.tasks, traySearch]);

  const getTag = useCallback(
    (tagId?: string) => state.tags.find((t) => t.id === tagId),
    [state.tags]
  );

  // Week days calculation (Monday start)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      return {
        date: dayDate,
        dateStr,
        dayName: dayDate.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { weekday: 'short' }),
        dayNum: dayDate.getDate(),
        isToday: dateStr === todayStr,
      };
    });
  }, [currentDate, todayStr, isRu]);

  // Month days calculation
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Prev month padding
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

    // Current month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to 35 or 42
    const total = days.length <= 35 ? 35 : 42;
    const remaining = total - days.length;
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

  // Navigation handlers
  const handlePrev = () => {
    sound.playClick();
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      setCurrentDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    sound.playClick();
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      setCurrentDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    sound.playClick();
    setCurrentDate(new Date());
  };

  const viewHeaderLabel = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    if (viewMode === 'week') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      const m1 = first.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { month: 'short' });
      const m2 = last.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { month: 'short' });
      const y = first.getFullYear();
      if (m1 === m2) {
        return `${first.getDate()} - ${last.getDate()} ${m1} ${y}`;
      }
      return `${first.getDate()} ${m1} - ${last.getDate()} ${m2} ${y}`;
    }
    return currentDate.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate, viewMode, weekDays, isRu]);

  // --- Drag and Drop: Move Task Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (resizingTaskId) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    sound.playClick();
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragHoverDate(null);
    setDragHoverMinute(null);
    setIsTrayDropTarget(false);
  };

  const handleGridDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.max(0, Math.min(1425, snapTo15(rawMinutes)));

    if (dragHoverDate !== dateStr || dragHoverMinute !== snappedMinutes) {
      setDragHoverDate(dateStr);
      setDragHoverMinute(snappedMinutes);
    }
  };

  const handleGridDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
    const newStartM = Math.max(0, Math.min(1425, snapTo15(rawMinutes)));

    // Preserve original duration
    const origStartM = timeToMinutes(task.startTime || task.dueTime || '09:00');
    const origEndM = task.endTime ? timeToMinutes(task.endTime) : origStartM + 60;
    const duration = Math.max(15, origEndM - origStartM);
    const newEndM = Math.min(1439, newStartM + duration);

    const startTimeStr = minutesToTime(newStartM);
    const endTimeStr = minutesToTime(newEndM);

    storage.scheduleTaskTimeSpan(taskId, dateStr, startTimeStr, endTimeStr);

    setDraggedTaskId(null);
    setDragHoverDate(null);
    setDragHoverMinute(null);
  };

  const handleMonthDayDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      const task = state.tasks.find((t) => t.id === taskId);
      const startTime = task?.startTime || task?.dueTime || '09:00';
      const endTime = task?.endTime || '10:00';
      storage.scheduleTaskTimeSpan(taskId, dateStr, startTime, endTime);
    }
    setDraggedTaskId(null);
    setDragHoverDate(null);
  };

  const handleDropOnTray = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      storage.updateTask(taskId, {
        dueDate: undefined,
        dueTime: undefined,
        startTime: undefined,
        endTime: undefined,
      });
      sound.playPop();
    }
    setDraggedTaskId(null);
    setIsTrayDropTarget(false);
  };

  // --- Resize Task Handlers (Bottom Edge Drag) ---
  const handleResizeStart = (
    e: React.PointerEvent,
    taskId: string,
    startM: number,
    endM: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingTaskId(taskId);
    setResizingStartM(startM);
    setResizingOriginalEndM(endM);
    setResizingCurrentEndM(endM);
    resizeStartYRef.current = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - resizeStartYRef.current;
      const deltaMinutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
      const newEnd = Math.max(startM + 15, Math.min(1439, endM + deltaMinutes));
      setResizingCurrentEndM(newEnd);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const deltaY = upEvent.clientY - resizeStartYRef.current;
      const deltaMinutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
      const finalEnd = Math.max(startM + 15, Math.min(1439, endM + deltaMinutes));

      const newEndTimeStr = minutesToTime(finalEnd);
      storage.updateTask(taskId, { endTime: newEndTimeStr });
      sound.playPop();

      setResizingTaskId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // --- 1-Click / Drag to Create on Grid ---
  const handleGridMouseDown = (e: React.MouseEvent, dateStr: string) => {
    // Only left click on empty background
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-task-block]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const startM = Math.max(0, Math.min(1425, snapTo15((offsetY / HOUR_HEIGHT) * 60)));
    const endM = Math.min(1439, startM + 60);

    isSelectingRef.current = true;
    setSelectionRange({ dateStr, startM, endM });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isSelectingRef.current) return;
      const currentOffsetY = moveEvent.clientY - rect.top;
      const currentM = Math.max(0, Math.min(1439, snapTo15((currentOffsetY / HOUR_HEIGHT) * 60)));
      if (currentM > startM) {
        setSelectionRange({ dateStr, startM, endM: Math.max(startM + 15, currentM) });
      }
    };

    const handleMouseUp = () => {
      isSelectingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setSelectionRange((current) => {
        if (current) {
          openCreateModalForSpan(
            current.dateStr,
            minutesToTime(current.startM),
            minutesToTime(current.endM)
          );
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const openCreateModalForSpan = (
    dateStr: string,
    startTime: string = '09:00',
    endTime: string = '10:00'
  ) => {
    setCreateDate(dateStr);
    setCreateStartTime(startTime);
    setCreateEndTime(endTime);
    setCreateTitle('');
    setCreateDescription('');
    setCreatePriority('medium');
    setCreateTagId(state.tags[0]?.id || '');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createDate) return;

    let end = createEndTime;
    if (timeToMinutes(end) <= timeToMinutes(createStartTime)) {
      end = minutesToTime(Math.min(1439, timeToMinutes(createStartTime) + 60));
    }

    storage.addTask({
      title: createTitle.trim(),
      description: createDescription.trim() || undefined,
      dueDate: createDate,
      dueTime: createStartTime,
      startTime: createStartTime,
      endTime: end,
      priority: createPriority,
      tagId: createTagId || undefined,
      isCompleted: false,
    });

    setIsCreateModalOpen(false);
  };

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const daysOfWeekLabels = isRu
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none">
      {/* 1. Header Toolbar (Navigation, View Modes, Today, Actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#131b2e] border border-[#222a3d] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffab]/10 text-[#00ffab] flex items-center justify-center border border-[#00ffab]/20 shadow-inner">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#dae2fd] font-display capitalize">
                {viewHeaderLabel}
              </h2>
              {viewMode === 'day' && currentDate.toDateString() === new Date().toDateString() && (
                <span className="px-2 py-0.5 rounded-full bg-[#00ffab]/10 text-[#00ffab] text-[10px] font-mono font-bold border border-[#00ffab]/30">
                  {isRu ? 'СЕГОДНЯ' : 'TODAY'}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#86948a] flex items-center gap-1.5 mt-0.5">
              <span>{isRu ? 'GOOGLE-CALENDAR ENGINE' : 'GOOGLE-CALENDAR ENGINE'}</span>
              <span className="w-1 h-1 rounded-full bg-[#00ffab]" />
              <span className="text-[#00ffab]">
                {isRu ? '15-МИН СЕТКА & RESIZE' : '15-MIN GRID & RESIZE'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unscheduled Backlog Drawer Button */}
          <button
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all ${
              isTrayOpen
                ? 'bg-[#00ffab]/10 border-[#00ffab]/40 text-[#00ffab] font-bold'
                : 'bg-[#171f33] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>
              {isRu ? 'Бэклог' : 'Unscheduled'} ({unscheduledTasks.length})
            </span>
          </button>

          {/* View Mode Toggle (Week / Day / Month) */}
          <div className="flex items-center gap-1 bg-[#0b1326] p-1 rounded-xl border border-[#222a3d]">
            {[
              { id: 'week', label: isRu ? 'Неделя' : 'Week' },
              { id: 'day', label: isRu ? 'День' : 'Day' },
              { id: 'month', label: isRu ? 'Месяц' : 'Month' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setViewMode(tab.id as ViewMode);
                }}
                className={`px-3 py-1 text-xs font-mono capitalize rounded-lg transition-all ${
                  viewMode === tab.id
                    ? 'bg-[#171f33] text-[#00ffab] font-bold border border-[#00ffab]/30 shadow-sm'
                    : 'text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Nav: Today, Prev, Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono text-[#dae2fd] border border-[#222a3d] transition-colors"
            >
              {isRu ? 'Сегодня' : 'Today'}
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

          {/* Quick Create Task */}
          <button
            onClick={() => openCreateModalForSpan(todayStr, '09:00', '10:00')}
            className="px-3.5 py-1.5 bg-[#00ffab] text-[#003824] font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00ffab]/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isRu ? 'Создать' : 'New Event'}</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Guide / Hint Bar */}
      <div className="px-4 py-2 rounded-xl bg-[#0b1326] border border-[#222a3d] text-[11px] font-mono text-[#86948a] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-[#00ffab] animate-pulse" />
          <span>
            {isRu
              ? '💡 Кликните по сетке для создания задачи • Тяните карточку для переноса • Тяните нижний край для изменения времени'
              : '💡 Click/drag grid to create • Drag card to move • Pull bottom handle to resize (15-min snapping)'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#ff5370]">
            <span className="w-2 h-2 rounded-full bg-[#ff5370] animate-ping" />
            {isRu ? 'Текущее время:' : 'Live now:'} {minutesToTime(nowMinutes)}
          </span>
          <span className="text-[#00ffab] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {isRu ? 'Авто-синхронизация 0ms' : '0ms Local Sync'}
          </span>
        </div>
      </div>

      {/* 3. Main Workspace: Unscheduled Tray + Calendar Time Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Unscheduled / Backlog Tasks Tray */}
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
                <span>{isRu ? 'БЭКЛОГ ЗАДАЧ' : 'UNSCHEDULED TRAY'}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0b1326] text-[#00ffab] border border-[#222a3d]">
                {unscheduledTasks.length}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={traySearch}
                onChange={(e) => setTraySearch(e.target.value)}
                placeholder={isRu ? 'Поиск задач...' : 'Filter backlog...'}
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#00ffab]"
              />
            </div>

            <p className="text-[10px] text-[#86948a] font-mono">
              {isRu
                ? 'Перетащите задачу на сетку календаря или сбросьте сюда для отмены даты.'
                : 'Drag tasks onto calendar slots to schedule, or drop here to unschedule.'}
            </p>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#0b1326] border border-dashed border-[#222a3d] text-center text-xs text-[#86948a] font-mono">
                  {isRu ? 'Все задачи распланированы! 🎉' : 'All tasks scheduled! 🎉'}
                </div>
              ) : (
                unscheduledTasks.map((task) => {
                  const tag = getTag(task.tagId);
                  const isDraggingThis = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenTaskDetails(task)}
                      className={`p-2.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] hover:border-[#00ffab] transition-all cursor-grab active:cursor-grabbing group shadow-sm ${
                        isDraggingThis ? 'opacity-40 scale-95 ring-1 ring-[#00ffab]' : ''
                      }`}
                      style={{
                        borderLeftWidth: '3.5px',
                        borderLeftColor: tag?.color || '#00ffab',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-mono text-[#86948a] uppercase font-bold">
                          {task.priority}
                        </span>
                        <GripVertical className="w-3 h-3 text-[#86948a] opacity-40 group-hover:opacity-100" />
                      </div>
                      <div className="text-xs text-[#dae2fd] font-medium leading-tight line-clamp-2">
                        {task.title}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. Calendar Core Display */}
        <div className={isTrayOpen ? 'lg:col-span-9' : 'lg:col-span-12'}>
          {/* VIEW A: WEEK VIEW (Google Calendar Time Grid with Overlaps & Resizing) */}
          {viewMode === 'week' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] shadow-2xl overflow-hidden flex flex-col">
              {/* Sticky Days Header */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#222a3d] bg-[#0b1326]/90 backdrop-blur sticky top-0 z-20">
                {/* Time zone label */}
                <div className="p-3 border-r border-[#222a3d] flex items-center justify-center text-[10px] font-mono text-[#86948a]">
                  GMT
                </div>
                {/* 7 Week Day Column Headers */}
                {weekDays.map((col) => {
                  const isTodayCol = col.isToday;
                  const dayTaskCount = (tasksByDate[col.dateStr] || []).length;

                  return (
                    <div
                      key={col.dateStr}
                      onClick={() => openCreateModalForSpan(col.dateStr, '09:00', '10:00')}
                      className={`p-2.5 text-center border-r border-[#222a3d] last:border-r-0 transition-colors cursor-pointer group ${
                        isTodayCol ? 'bg-[#00ffab]/5' : 'hover:bg-[#171f33]/50'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-[#86948a] uppercase">
                        {col.dayName}
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span
                          className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-transform group-hover:scale-110 ${
                            isTodayCol
                              ? 'bg-[#00ffab] text-[#003824] shadow-[0_0_12px_#00ffab]'
                              : 'text-[#dae2fd] bg-[#171f33]'
                          }`}
                        >
                          {col.dayNum}
                        </span>
                        {dayTaskCount > 0 && (
                          <span className="text-[9px] font-mono text-[#86948a]">
                            ({dayTaskCount})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable 24-Hour Time Grid */}
              <div
                ref={timeGridScrollRef}
                className="max-h-[680px] overflow-y-auto overflow-x-hidden relative"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div
                  className="grid grid-cols-[60px_repeat(7,1fr)] relative"
                  style={{ height: `${24 * HOUR_HEIGHT}px` }}
                >
                  {/* Left Time Axis Column */}
                  <div className="border-r border-[#222a3d] bg-[#0b1326]/60 sticky left-0 z-10 select-none">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="relative border-b border-[#222a3d]/40 flex items-start justify-end pr-2 pt-1 text-[10px] font-mono text-[#86948a]"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span>{String(hour).padStart(2, '0')}:00</span>
                      </div>
                    ))}
                  </div>

                  {/* 7 Day Columns */}
                  {weekDays.map((col) => {
                    const dayTasks = tasksByDate[col.dateStr] || [];
                    const layouts = calculateOverlappingLayout(dayTasks);
                    const isTodayCol = col.isToday;
                    const isHoveredCol = dragHoverDate === col.dateStr;

                    return (
                      <div
                        key={col.dateStr}
                        data-day-column
                        onDragOver={(e) => handleGridDragOver(e, col.dateStr)}
                        onDrop={(e) => handleGridDrop(e, col.dateStr)}
                        onMouseDown={(e) => handleGridMouseDown(e, col.dateStr)}
                        className={`relative border-r border-[#222a3d] last:border-r-0 transition-colors ${
                          isTodayCol ? 'bg-[#00ffab]/[0.02]' : ''
                        } ${isHoveredCol ? 'bg-[#00ffab]/[0.06]' : ''}`}
                        style={{ height: `${24 * HOUR_HEIGHT}px` }}
                      >
                        {/* Hour Background Grid Lines */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-[#222a3d]/40 relative group/slot hover:bg-[#00ffab]/5 transition-colors"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                          >
                            {/* 30-minute subtle dashed divider */}
                            <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-[#222a3d]/20 pointer-events-none" />
                          </div>
                        ))}

                        {/* Live Current Time Red Line for Today */}
                        {isTodayCol && (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
                          >
                            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-[#ff5370] shadow-[0_0_8px_#ff5370]" />
                            <div className="flex-1 h-[2px] bg-[#ff5370] shadow-[0_0_6px_#ff5370]" />
                            <span className="text-[9px] font-mono text-[#ff5370] bg-[#131b2e] px-1 py-0.2 rounded border border-[#ff5370]/40 -mr-1">
                              {minutesToTime(nowMinutes)}
                            </span>
                          </div>
                        )}

                        {/* Ghost Drop Preview when Dragging a Task */}
                        {isHoveredCol && dragHoverMinute !== null && draggedTaskId && (
                          <div
                            className="absolute left-1 right-1 z-20 rounded-lg border-2 border-dashed border-[#00ffab] bg-[#00ffab]/20 pointer-events-none p-1.5 flex flex-col justify-between animate-pulse"
                            style={{
                              top: `${(dragHoverMinute / 60) * HOUR_HEIGHT}px`,
                              height: `${Math.max(30, HOUR_HEIGHT)}px`,
                            }}
                          >
                            <span className="text-[10px] font-mono font-bold text-[#00ffab]">
                              {minutesToTime(dragHoverMinute)} -{' '}
                              {minutesToTime(dragHoverMinute + 60)}
                            </span>
                            <span className="text-[9px] font-mono text-[#00ffab]">
                              + {isRu ? 'Переместить сюда' : 'Drop task here'}
                            </span>
                          </div>
                        )}

                        {/* Ghost Selection Range Preview when dragging on empty slot */}
                        {selectionRange && selectionRange.dateStr === col.dateStr && (
                          <div
                            className="absolute left-1 right-1 z-20 rounded-lg border-2 border-[#00e5ff] bg-[#00e5ff]/20 pointer-events-none p-1.5 text-[10px] font-mono text-[#00e5ff] font-bold"
                            style={{
                              top: `${(selectionRange.startM / 60) * HOUR_HEIGHT}px`,
                              height: `${Math.max(20, ((selectionRange.endM - selectionRange.startM) / 60) * HOUR_HEIGHT)}px`,
                            }}
                          >
                            {minutesToTime(selectionRange.startM)} –{' '}
                            {minutesToTime(selectionRange.endM)}
                          </div>
                        )}

                        {/* Render Overlapping Task Cards */}
                        {layouts.map((layout) => {
                          const { task, startMinutes, endMinutes, colIndex, totalCols } = layout;
                          const tag = getTag(task.tagId);
                          const tagColor = tag?.color || '#00ffab';
                          const isCompleted = task.isCompleted;

                          const isBeingResized = resizingTaskId === task.id;
                          const currentEndM = isBeingResized ? resizingCurrentEndM : endMinutes;
                          const effectiveHeight = Math.max(
                            22,
                            ((currentEndM - startMinutes) / 60) * HOUR_HEIGHT
                          );
                          const isBeingDragged = draggedTaskId === task.id;

                          // Horizontal position based on Google Calendar cluster columns
                          const colWidthPercent = 100 / totalCols;
                          const leftPercent = colIndex * colWidthPercent;

                          return (
                            <div
                              key={task.id}
                              data-task-block
                              draggable={!isBeingResized}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskDetails(task);
                              }}
                              className={`absolute rounded-lg border p-1.5 select-none transition-shadow z-10 cursor-grab active:cursor-grabbing group shadow-md flex flex-col justify-between overflow-hidden ${
                                isCompleted
                                  ? 'bg-[#0b1326]/85 border-[#222a3d] opacity-60 text-[#86948a]'
                                  : 'bg-[#171f33]/95 hover:bg-[#1c263d] border-[#222a3d] hover:border-[#00ffab] text-[#dae2fd]'
                              } ${isBeingDragged ? 'opacity-30 ring-2 ring-[#00ffab]' : ''} ${
                                isBeingResized ? 'ring-2 ring-[#00e5ff] shadow-xl z-30' : ''
                              }`}
                              style={{
                                top: `${layout.top}px`,
                                height: `${effectiveHeight}px`,
                                left: `calc(${leftPercent}% + 2px)`,
                                width: `calc(${colWidthPercent}% - 4px)`,
                                borderLeftWidth: '3.5px',
                                borderLeftColor: tagColor,
                              }}
                            >
                              {/* Top Content: Time & Title */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="text-[9px] font-mono font-bold truncate"
                                    style={{ color: isCompleted ? '#86948a' : tagColor }}
                                  >
                                    {minutesToTime(startMinutes)} - {minutesToTime(currentEndM)}
                                  </span>
                                  {effectiveHeight >= 45 && (
                                    <span className="text-[8px] font-mono px-1 rounded bg-[#0b1326] text-[#86948a] uppercase flex-shrink-0">
                                      {task.priority[0]}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[11px] font-medium leading-tight truncate mt-0.5 ${
                                    isCompleted ? 'line-through' : 'text-[#dae2fd]'
                                  }`}
                                >
                                  {task.title}
                                </div>
                              </div>

                              {/* Duration / Live Resize Tooltip */}
                              {isBeingResized && (
                                <div className="absolute top-1 right-1 bg-[#00e5ff] text-[#003824] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                                  {formatDuration(currentEndM - startMinutes, isRu)}
                                </div>
                              )}

                              {/* Bottom Interactive Resize Handle */}
                              <div
                                onPointerDown={(e) =>
                                  handleResizeStart(e, task.id, startMinutes, endMinutes)
                                }
                                className="w-full h-2 -mb-1 mt-auto flex items-center justify-center cursor-ns-resize group/handle hover:bg-[#00ffab]/30 rounded-b transition-colors"
                                title={
                                  isRu
                                    ? 'Потяните для изменения длительности'
                                    : 'Drag to change duration'
                                }
                              >
                                <div className="w-6 h-1 bg-[#86948a]/50 group-hover/handle:bg-[#00ffab] rounded-full transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: DAY VIEW (High-Detail Google Calendar Timeline) */}
          {viewMode === 'day' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] shadow-2xl overflow-hidden flex flex-col">
              {/* Day Header */}
              <div className="p-4 border-b border-[#222a3d] bg-[#0b1326]/90 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#dae2fd] font-display">
                    {currentDate.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <p className="text-xs font-mono text-[#00ffab]">
                    {isRu
                      ? 'ПОДРОБНОЕ РАСПИСАНИЕ ДНЯ • 15-МИНУТНАЯ ТОЧНОСТЬ'
                      : 'DETAILED DAILY TIMELINE • 15-MINUTE PRECISION'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                    openCreateModalForSpan(dStr, '10:00', '11:00');
                  }}
                  className="px-3.5 py-1.5 bg-[#00ffab] text-[#003824] font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00ffab]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRu ? 'Добавить задачу на день' : 'Add Day Task'}</span>
                </button>
              </div>

              {/* Day Timeline */}
              <div
                ref={timeGridScrollRef}
                className="max-h-[680px] overflow-y-auto overflow-x-hidden relative"
              >
                {(() => {
                  const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                  const dayTasks = tasksByDate[dStr] || [];
                  const layouts = calculateOverlappingLayout(dayTasks);
                  const isToday = dStr === todayStr;
                  const isHovered = dragHoverDate === dStr;

                  return (
                    <div
                      className="grid grid-cols-[80px_1fr] relative"
                      style={{ height: `${24 * HOUR_HEIGHT}px` }}
                    >
                      {/* Left Time Axis */}
                      <div className="border-r border-[#222a3d] bg-[#0b1326]/60 sticky left-0 z-10">
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-[#222a3d]/40 flex items-start justify-end pr-3 pt-1 text-xs font-mono text-[#86948a]"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                          >
                            <span>{String(hour).padStart(2, '0')}:00</span>
                          </div>
                        ))}
                      </div>

                      {/* Main Day Content Area */}
                      <div
                        data-day-column
                        onDragOver={(e) => handleGridDragOver(e, dStr)}
                        onDrop={(e) => handleGridDrop(e, dStr)}
                        onMouseDown={(e) => handleGridMouseDown(e, dStr)}
                        className={`relative transition-colors ${
                          isToday ? 'bg-[#00ffab]/[0.02]' : ''
                        } ${isHovered ? 'bg-[#00ffab]/[0.06]' : ''}`}
                        style={{ height: `${24 * HOUR_HEIGHT}px` }}
                      >
                        {/* Hour Grid Lines with 15-min & 30-min Subdivisions */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-[#222a3d]/40 relative group/slot hover:bg-[#00ffab]/5 transition-colors"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                          >
                            <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-[#222a3d]/20 pointer-events-none" />
                          </div>
                        ))}

                        {/* Current Time Indicator for Today */}
                        {isToday && (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
                          >
                            <div className="w-3 h-3 -ml-1.5 rounded-full bg-[#ff5370] shadow-[0_0_10px_#ff5370]" />
                            <div className="flex-1 h-[2px] bg-[#ff5370] shadow-[0_0_8px_#ff5370]" />
                            <span className="text-[10px] font-mono font-bold text-[#ff5370] bg-[#131b2e] px-2 py-0.5 rounded border border-[#ff5370]/40 -mr-2">
                              {minutesToTime(nowMinutes)}
                            </span>
                          </div>
                        )}

                        {/* Ghost Drop Preview */}
                        {isHovered && dragHoverMinute !== null && draggedTaskId && (
                          <div
                            className="absolute left-2 right-2 z-20 rounded-xl border-2 border-dashed border-[#00ffab] bg-[#00ffab]/20 pointer-events-none p-2 flex flex-col justify-between animate-pulse"
                            style={{
                              top: `${(dragHoverMinute / 60) * HOUR_HEIGHT}px`,
                              height: `${HOUR_HEIGHT}px`,
                            }}
                          >
                            <span className="text-xs font-mono font-bold text-[#00ffab]">
                              {minutesToTime(dragHoverMinute)} -{' '}
                              {minutesToTime(dragHoverMinute + 60)}
                            </span>
                            <span className="text-[10px] font-mono text-[#00ffab]">
                              + {isRu ? 'Переместить задачу сюда' : 'Drop task here'}
                            </span>
                          </div>
                        )}

                        {/* Render Day Tasks */}
                        {layouts.map((layout) => {
                          const { task, startMinutes, endMinutes, colIndex, totalCols } = layout;
                          const tag = getTag(task.tagId);
                          const tagColor = tag?.color || '#00ffab';
                          const isCompleted = task.isCompleted;

                          const isBeingResized = resizingTaskId === task.id;
                          const currentEndM = isBeingResized ? resizingCurrentEndM : endMinutes;
                          const effectiveHeight = Math.max(
                            28,
                            ((currentEndM - startMinutes) / 60) * HOUR_HEIGHT
                          );
                          const isBeingDragged = draggedTaskId === task.id;

                          const colWidthPercent = 100 / totalCols;
                          const leftPercent = colIndex * colWidthPercent;

                          return (
                            <div
                              key={task.id}
                              data-task-block
                              draggable={!isBeingResized}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskDetails(task);
                              }}
                              className={`absolute rounded-xl border p-3 select-none transition-shadow z-10 cursor-grab active:cursor-grabbing group shadow-md flex flex-col justify-between overflow-hidden ${
                                isCompleted
                                  ? 'bg-[#0b1326]/85 border-[#222a3d] opacity-60'
                                  : 'bg-[#171f33] hover:bg-[#1c263d] border-[#222a3d] hover:border-[#00ffab]'
                              } ${isBeingDragged ? 'opacity-30 ring-2 ring-[#00ffab]' : ''} ${
                                isBeingResized ? 'ring-2 ring-[#00e5ff] shadow-2xl z-30' : ''
                              }`}
                              style={{
                                top: `${layout.top}px`,
                                height: `${effectiveHeight}px`,
                                left: `calc(${leftPercent}% + 4px)`,
                                width: `calc(${colWidthPercent}% - 8px)`,
                                borderLeftWidth: '4px',
                                borderLeftColor: tagColor,
                              }}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span
                                    className="text-xs font-mono font-bold"
                                    style={{ color: isCompleted ? '#86948a' : tagColor }}
                                  >
                                    {minutesToTime(startMinutes)} – {minutesToTime(currentEndM)} (
                                    {formatDuration(currentEndM - startMinutes, isRu)})
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b1326] text-[#86948a] uppercase">
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                                <h4
                                  className={`text-sm font-semibold leading-tight ${
                                    isCompleted
                                      ? 'line-through text-[#86948a]'
                                      : 'text-[#dae2fd]'
                                  }`}
                                >
                                  {task.title}
                                </h4>
                                {task.description && effectiveHeight > 65 && (
                                  <p className="text-xs text-[#86948a] line-clamp-2 mt-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Resize Tooltip */}
                              {isBeingResized && (
                                <div className="absolute top-2 right-2 bg-[#00e5ff] text-[#003824] text-xs font-mono font-bold px-2 py-0.5 rounded-lg shadow-lg">
                                  {minutesToTime(startMinutes)} - {minutesToTime(currentEndM)} (
                                  {formatDuration(currentEndM - startMinutes, isRu)})
                                </div>
                              )}

                              {/* Bottom Resize Grip */}
                              <div
                                onPointerDown={(e) =>
                                  handleResizeStart(e, task.id, startMinutes, endMinutes)
                                }
                                className="w-full h-3 -mb-1 mt-auto flex items-center justify-center cursor-ns-resize group/handle hover:bg-[#00ffab]/30 rounded-b transition-colors"
                              >
                                <div className="w-10 h-1.5 bg-[#86948a]/50 group-hover/handle:bg-[#00ffab] rounded-full transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* VIEW C: MONTH VIEW (Grid with Task Drag & Drop) */}
          {viewMode === 'month' && (
            <div className="rounded-2xl bg-[#131b2e] border border-[#222a3d] overflow-hidden shadow-2xl">
              {/* Month Day Names */}
              <div className="grid grid-cols-7 border-b border-[#222a3d] bg-[#0b1326]/90">
                {daysOfWeekLabels.map((name) => (
                  <div
                    key={name}
                    className="py-2.5 text-center text-xs font-mono font-bold text-[#86948a] tracking-wider"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr bg-[#222a3d] gap-[1px]">
                {monthDays.map((cell) => {
                  const cellTasks = tasksByDate[cell.dateStr] || [];
                  const visibleTasks = cellTasks.slice(0, 3);
                  const extraCount = cellTasks.length - 3;
                  const isHovered = dragHoverDate === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => openCreateModalForSpan(cell.dateStr, '09:00', '10:00')}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragHoverDate !== cell.dateStr) setDragHoverDate(cell.dateStr);
                      }}
                      onDragLeave={() => {
                        if (dragHoverDate === cell.dateStr) setDragHoverDate(null);
                      }}
                      onDrop={(e) => handleMonthDayDrop(e, cell.dateStr)}
                      className={`min-h-[120px] p-2 bg-[#131b2e] transition-all relative cursor-pointer flex flex-col justify-between group ${
                        !cell.isCurrentMonth ? 'opacity-40' : ''
                      } ${
                        isHovered
                          ? 'bg-[#171f33] ring-2 ring-[#00ffab] z-10 scale-[1.01]'
                          : 'hover:bg-[#171f33]/80'
                      }`}
                    >
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
                            openCreateModalForSpan(cell.dateStr, '09:00', '10:00');
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#86948a] hover:text-[#00ffab] rounded transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Drop Target Hint */}
                      {isHovered && (
                        <div className="my-1 py-1 rounded border border-dashed border-[#00ffab] bg-[#00ffab]/10 text-center text-[10px] font-mono text-[#00ffab] animate-pulse">
                          + {isRu ? 'Сбросить сюда' : 'Drop here'}
                        </div>
                      )}

                      {/* Task Pills */}
                      <div className="space-y-1 my-1 flex-1">
                        {visibleTasks.map((t) => {
                          const tag = getTag(t.tagId);
                          const tagColor = tag ? tag.color : '#00ffab';

                          return (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTaskDetails(t);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono truncate flex items-center gap-1 border transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                                t.isCompleted
                                  ? 'line-through opacity-50 bg-[#0b1326] border-[#222a3d] text-[#86948a]'
                                  : 'bg-[#0b1326] hover:bg-[#1b2332] text-[#dae2fd] border-[#222a3d]'
                              } ${draggedTaskId === t.id ? 'opacity-40 ring-1 ring-[#00ffab]' : ''}`}
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: tagColor,
                              }}
                            >
                              <GripVertical className="w-2.5 h-2.5 text-[#86948a] flex-shrink-0 opacity-40 group-hover:opacity-100" />
                              {(t.startTime || t.dueTime) && (
                                <span className="text-[#00ffab] flex-shrink-0 font-bold">
                                  {t.startTime || t.dueTime}
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
                            +{extraCount} {isRu ? 'ещё' : 'more'}
                          </button>
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

      {/* 5. Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#00ffab]" />
                {isRu ? `Новая задача: ${createDate}` : `Add Event: ${createDate}`}
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
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'НАЗВАНИЕ СОБЫТИЯ *' : 'EVENT TITLE *'}
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={isRu ? 'Название задачи...' : 'Event title...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ОПИСАНИЕ / ЗАМЕТКИ' : 'DESCRIPTION / NOTES'}
                </label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={isRu ? 'Дополнительные детали...' : 'Optional details...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              {/* Time Span Inputs (Start & End Time) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ВРЕМЯ НАЧАЛА' : 'START TIME'}
                  </label>
                  <input
                    type="time"
                    required
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ВРЕМЯ ОКОНЧАНИЯ' : 'END TIME'}
                  </label>
                  <input
                    type="time"
                    required
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ПРИОРИТЕТ' : 'PRIORITY'}
                  </label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as Priority)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  >
                    <option value="low">{isRu ? 'Низкий' : 'Low'}</option>
                    <option value="medium">{isRu ? 'Средний' : 'Medium'}</option>
                    <option value="high">{isRu ? 'Высокий' : 'High'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ТЕГ / КАТЕГОРИЯ' : 'TAG'}
                  </label>
                  <select
                    value={createTagId}
                    onChange={(e) => setCreateTagId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  >
                    <option value="">{isRu ? 'Без тега' : 'No Tag'}</option>
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
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00ffab] text-[#003824] font-mono text-xs font-bold rounded-xl shadow-md shadow-[#00ffab]/20"
                >
                  {isRu ? 'Создать событие' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Task Details / Edit / Delete Modal */}
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

            {/* Quick Reschedule & Time Adjuster */}
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0b1326] border border-[#222a3d]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#00ffab] font-bold">
                  {isRu ? 'ВРЕМЕННОЙ ИНТЕРВАЛ' : 'TIME INTERVAL'}
                </span>
                <span className="text-[10px] font-mono text-[#86948a]">
                  {selectedTask.dueDate || (isRu ? 'Не задана' : 'No date')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#86948a] mb-1">
                    {isRu ? 'НАЧАЛО' : 'START'}
                  </label>
                  <input
                    type="time"
                    value={selectedTask.startTime || selectedTask.dueTime || '09:00'}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      storage.updateTask(selectedTask.id, {
                        startTime: newStart,
                        dueTime: newStart,
                      });
                      setSelectedTask({ ...selectedTask, startTime: newStart, dueTime: newStart });
                    }}
                    className="w-full bg-[#131b2e] border border-[#222a3d] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#86948a] mb-1">
                    {isRu ? 'ОКОНЧАНИЕ' : 'END'}
                  </label>
                  <input
                    type="time"
                    value={selectedTask.endTime || '10:00'}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      storage.updateTask(selectedTask.id, { endTime: newEnd });
                      setSelectedTask({ ...selectedTask, endTime: newEnd });
                    }}
                    className="w-full bg-[#131b2e] border border-[#222a3d] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#222a3d]">
              <button
                onClick={() => {
                  storage.deleteTask(selectedTask.id);
                  setIsTaskModalOpen(false);
                }}
                className="text-xs font-mono text-[#ff5370] hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isRu ? 'Удалить задачу' : 'Delete Task'}
              </button>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono text-[#dae2fd] rounded-xl"
              >
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Month View More Tasks Popover */}
      {moreTasksDate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                {isRu ? `Задачи на ${moreTasksDate}` : `Events for ${moreTasksDate}`}
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
                    handleOpenTaskDetails(t);
                    setMoreTasksDate(null);
                  }}
                  className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] hover:border-[#00ffab] cursor-pointer flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-[#dae2fd] truncate">{t.title}</span>
                  <span className="text-[10px] font-mono text-[#00ffab]">
                    {t.startTime || t.dueTime} - {t.endTime || '10:00'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
