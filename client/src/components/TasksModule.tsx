import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  Tag as TagIcon,
  AlertCircle,
  SlidersHorizontal,
  X,
  Palette,
  Check,
  Bell,
  BellRing,
  Volume2,
} from 'lucide-react';
import { AppState, Priority, Tag, Task } from '../types';
import { storage } from '../lib/storage';
import { notificationService } from '../lib/notificationService';
import { TaskProductivityChart } from './TaskProductivityChart';

interface TasksModuleProps {
  state: AppState;
}

export const TasksModule: React.FC<TasksModuleProps> = ({ state }) => {
  const isRu = state.language === 'ru';
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskTagId, setTaskTagId] = useState<string>('');

  // Reminder states
  const [taskReminderEnabled, setTaskReminderEnabled] = useState(false);
  const [taskReminderDateTime, setTaskReminderDateTime] = useState('');
  const [taskReminderPreset, setTaskReminderPreset] = useState<'exact' | '15m' | '1h' | '1d'>('exact');
  const [permissionStatus, setPermissionStatus] = useState(notificationService.getPermissionStatus());

  useEffect(() => {
    const unsub = notificationService.onPermissionChange((status) => {
      setPermissionStatus(status);
    });
    return () => unsub();
  }, []);

  // Tag Form states
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4edea3');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = useMemo(() => {
    return state.tasks.filter((task) => {
      // Filter tab
      if (filterMode === 'today' && task.dueDate !== todayStr) return false;
      if (filterMode === 'upcoming' && (!task.dueDate || task.dueDate <= todayStr)) return false;
      if (filterMode === 'completed' && !task.isCompleted) return false;
      if (filterMode !== 'completed' && task.isCompleted && filterMode === 'today') return true;

      // Tag filter
      if (selectedTagId !== 'all' && task.tagId !== selectedTagId) return false;

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    }).sort((a, b) => {
      // Completed at bottom
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      // Due dates first
      if (a.dueDate && b.dueDate) {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [state.tasks, filterMode, selectedTagId, searchQuery, todayStr]);

  const computeReminderDateTime = (dateStr: string, timeStr: string, preset: 'exact' | '15m' | '1h' | '1d'): string => {
    if (!dateStr) return '';
    const t = timeStr || '12:00';
    const [h, m] = t.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, isNaN(h) ? 12 : h, isNaN(m) ? 0 : m, 0);

    if (preset === '15m') d.setMinutes(d.getMinutes() - 15);
    else if (preset === '1h') d.setHours(d.getHours() - 1);
    else if (preset === '1d') d.setDate(d.getDate() - 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateModal = (presetDate?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    const d = presetDate || todayStr;
    setTaskDueDate(d);
    setTaskDueTime('12:00');
    setTaskStartTime('12:00');
    setTaskEndTime('13:00');
    setTaskPriority('medium');
    setTaskTagId(state.tags[0]?.id || '');
    setTaskReminderEnabled(false);
    setTaskReminderPreset('exact');
    setTaskReminderDateTime(computeReminderDateTime(d, '12:00', 'exact'));
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskDueDate(task.dueDate || '');
    setTaskDueTime(task.dueTime || task.startTime || '');
    setTaskStartTime(task.startTime || task.dueTime || '');
    setTaskEndTime(task.endTime || '');
    setTaskPriority(task.priority);
    setTaskTagId(task.tagId || '');
    setTaskReminderEnabled(!!task.reminderEnabled);
    setTaskReminderPreset(task.reminderPreset || 'exact');
    setTaskReminderDateTime(
      task.reminderDateTime ||
        (task.dueDate ? computeReminderDateTime(task.dueDate, task.startTime || task.dueTime || '12:00', task.reminderPreset || 'exact') : '')
    );
    setIsCreateModalOpen(true);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    setTaskReminderEnabled(enabled);
    if (enabled) {
      if (notificationService.getPermissionStatus() !== 'granted') {
        const res = await notificationService.requestPermission();
        setPermissionStatus(res);
      }
      if (!taskReminderDateTime && taskDueDate) {
        setTaskReminderDateTime(computeReminderDateTime(taskDueDate, taskStartTime || taskDueTime || '12:00', taskReminderPreset));
      }
    }
  };

  const handleSelectPreset = (preset: 'exact' | '15m' | '1h' | '1d') => {
    setTaskReminderPreset(preset);
    if (taskDueDate) {
      setTaskReminderDateTime(computeReminderDateTime(taskDueDate, taskStartTime || taskDueTime || '12:00', preset));
    }
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const start = taskStartTime || taskDueTime || undefined;
    const end = taskEndTime || undefined;

    const reminderData = taskReminderEnabled
      ? {
          reminderEnabled: true,
          reminderDateTime: taskReminderDateTime || (taskDueDate ? computeReminderDateTime(taskDueDate, start || '12:00', taskReminderPreset) : undefined),
          reminderPreset: taskReminderPreset,
          reminderFired: false,
        }
      : {
          reminderEnabled: false,
          reminderDateTime: undefined,
          reminderPreset: undefined,
          reminderFired: false,
        };

    if (editingTask) {
      storage.updateTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        dueTime: start,
        startTime: start,
        endTime: end,
        priority: taskPriority,
        tagId: taskTagId || undefined,
        ...reminderData,
      });
    } else {
      storage.addTask({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        dueTime: start,
        startTime: start,
        endTime: end,
        priority: taskPriority,
        tagId: taskTagId || undefined,
        isCompleted: false,
        ...reminderData,
      });
    }
    setIsCreateModalOpen(false);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    storage.addTag(newTagName.trim(), newTagColor);
    setNewTagName('');
  };

  const getTag = (tagId?: string) => state.tags.find((t) => t.id === tagId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-[#4edea3]" />
            {isRu ? 'Управление Задачами' : 'Task Management'}
          </h2>
          <p className="text-xs text-[#86948a] font-mono mt-1">
            {isRu
              ? `LOCAL-FIRST ДВИЖОК • ${state.tasks.filter((t) => !t.isCompleted).length} АКТИВНЫХ ЗАДАЧ`
              : `LOCAL-FIRST TASK ENGINE • ${state.tasks.filter((t) => !t.isCompleted).length} ACTIVE TASKS`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTagManagerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] text-[#bbcabf] hover:text-[#dae2fd] text-xs font-mono border border-[#222a3d] flex items-center gap-1.5 transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#89ceff]" />
            {isRu ? 'Теги / Категории' : 'Tags'}
          </button>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#4edea3]/20"
          >
            <Plus className="w-4 h-4" />
            {isRu ? 'Новая задача' : 'New Task'}
          </button>
        </div>
      </div>

      {/* Task Productivity Analytics (Recharts 30-day Trends) */}
      <TaskProductivityChart tasks={state.tasks} language={state.language} />

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0b1326] p-1 rounded-xl border border-[#222a3d] overflow-x-auto">
          {[
            { id: 'all', label: isRu ? 'Все' : 'All' },
            { id: 'today', label: isRu ? 'Сегодня' : 'Today' },
            { id: 'upcoming', label: isRu ? 'Предстоящие' : 'Upcoming' },
            { id: 'completed', label: isRu ? 'Завершённые' : 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-[#171f33] text-[#4edea3] font-semibold shadow-sm border border-[#4edea3]/30'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Tag Select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRu ? 'Поиск задач...' : 'Search tasks...'}
              className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#4edea3]"
            />
          </div>

          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
          >
            <option value="all">{isRu ? 'Все теги' : 'All Tags'}</option>
            {state.tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List Rendering */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#131b2e]/50 border border-dashed border-[#222a3d] space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#86948a] mx-auto opacity-50" />
            <p className="text-sm text-[#86948a]">
              {isRu ? 'Задачи по указанным критериям не найдены.' : 'No tasks found matching criteria.'}
            </p>
            <button
              onClick={() => openCreateModal()}
              className="text-xs font-mono text-[#4edea3] hover:underline inline-block"
            >
              + {isRu ? 'Создать новую задачу' : 'Create a new task'}
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const tag = getTag(task.tagId);
            return (
              <div
                key={task.id}
                className={`group flex items-start sm:items-center justify-between p-4 rounded-2xl border transition-all duration-150 gap-3 ${
                  task.isCompleted
                    ? 'bg-[#0b1326]/40 border-[#222a3d]/40 opacity-60'
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
                      {task.dueDate && (
                        <span className="text-[11px] font-mono text-[#86948a] flex items-center gap-1 bg-[#0b1326] px-2 py-0.5 rounded border border-[#222a3d]">
                          <Calendar className="w-3 h-3 text-[#89ceff]" />
                          {task.dueDate} {task.dueTime && `@ ${task.dueTime}`}
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

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
            );
          })
        )}
      </div>

      {/* Task Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                {editingTask
                  ? isRu
                    ? 'Редактировать задачу'
                    : 'Edit Task'
                  : isRu
                  ? 'Новая задача'
                  : 'Create New Task'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'НАЗВАНИЕ *' : 'TITLE *'}
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={isRu ? 'Название задачи...' : 'Task title...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ОПИСАНИЕ' : 'DESCRIPTION'}
                </label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={isRu ? 'Дополнительные детали или контекст...' : 'Optional details or context...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ДАТА' : 'DUE DATE'}
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-2.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'НАЧАЛО' : 'START'}
                  </label>
                  <input
                    type="time"
                    value={taskStartTime || taskDueTime}
                    onChange={(e) => {
                      setTaskStartTime(e.target.value);
                      setTaskDueTime(e.target.value);
                    }}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-2.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'КОНЕЦ' : 'END'}
                  </label>
                  <input
                    type="time"
                    value={taskEndTime}
                    onChange={(e) => setTaskEndTime(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-2.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ПРИОРИТЕТ' : 'PRIORITY'}
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="low">{isRu ? 'Низкий' : 'Low'}</option>
                    <option value="medium">{isRu ? 'Средний' : 'Medium'}</option>
                    <option value="high">{isRu ? 'Высокий' : 'High'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'ТЕГ' : 'TAG'}
                  </label>
                  <select
                    value={taskTagId}
                    onChange={(e) => setTaskTagId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="">{isRu ? 'Без тега' : 'No Tag'}</option>
                    {state.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Offline Push Notifications & Sound Reminder */}
              <div className="bg-[#0b1326]/80 border border-[#222a3d] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#4edea3]/10 text-[#4edea3]">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#dae2fd] flex items-center gap-1.5">
                        {isRu ? 'Напоминание со звуком (Push)' : 'Sound & Push Reminder'}
                        {permissionStatus === 'granted' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#4edea3]/20 text-[#4edea3]">
                            {isRu ? 'Доступно офлайн' : 'Offline ready'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#e5a93c]/20 text-[#e5a93c]">
                            {isRu ? 'Требуется разрешение' : 'Permission needed'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#86948a]">
                        {isRu
                          ? 'Сработает со звуком даже в фоне или без интернета'
                          : 'Triggers with celestial chime even in background'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskReminderEnabled}
                      onChange={(e) => handleToggleReminder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#222a3d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4edea3]"></div>
                  </label>
                </div>

                {taskReminderEnabled && (
                  <div className="pt-2 border-t border-[#222a3d]/60 space-y-2.5">
                    {/* Presets */}
                    <div>
                      <span className="text-[10px] font-mono text-[#86948a] block mb-1.5">
                        {isRu ? 'БЫСТРЫЙ ВЫБОР ВРЕМЕНИ' : 'QUICK TIMING PRESET'}
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'exact', label: isRu ? 'В момент' : 'Exact' },
                          { id: '15m', label: isRu ? 'За 15м' : '15m before' },
                          { id: '1h', label: isRu ? 'За 1ч' : '1h before' },
                          { id: '1d', label: isRu ? 'За 1д' : '1d before' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPreset(p.id as any)}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                              taskReminderPreset === p.id
                                ? 'bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3] font-bold'
                                : 'bg-[#131b2e] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Exact Date & Time */}
                    <div>
                      <label className="block text-[10px] font-mono text-[#86948a] mb-1">
                        {isRu ? 'ТОЧНОЕ ВРЕМЯ НАПОМИНАНИЯ' : 'EXACT REMINDER DATETIME'}
                      </label>
                      <input
                        type="datetime-local"
                        value={taskReminderDateTime}
                        onChange={(e) => setTaskReminderDateTime(e.target.value)}
                        className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d] transition-colors"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#4edea3] hover:bg-[#10b981] text-[#003824] transition-colors shadow-md shadow-[#4edea3]/20"
                >
                  {editingTask
                    ? isRu
                      ? 'Сохранить изменения'
                      : 'Save Changes'
                    : isRu
                    ? 'Создать задачу'
                    : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {isTagManagerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[#89ceff]" />
                Manage Categories & Tags
              </h3>
              <button
                onClick={() => setIsTagManagerOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Tag Form */}
            <form onSubmit={handleCreateTag} className="flex gap-2 items-center">
              <input
                type="text"
                required
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag label..."
                className="flex-1 bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-9 h-9 rounded-xl bg-[#0b1326] border border-[#222a3d] cursor-pointer p-0.5"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#4edea3] text-[#003824] font-mono text-xs font-semibold rounded-xl"
              >
                Add
              </button>
            </form>

            {/* Existing Tags List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {state.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-xs font-semibold text-[#dae2fd]">{tag.name}</span>
                  </div>
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => storage.updateTag(tag.id, { color: e.target.value })}
                    className="w-6 h-6 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
