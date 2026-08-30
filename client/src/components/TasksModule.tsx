import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { AppState, Priority, Tag, Task } from '../types';
import { storage } from '../lib/storage';

interface TasksModuleProps {
  state: AppState;
}

export const TasksModule: React.FC<TasksModuleProps> = ({ state }) => {
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
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskTagId, setTaskTagId] = useState<string>('');

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

  const openCreateModal = (presetDate?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate(presetDate || todayStr);
    setTaskDueTime('12:00');
    setTaskPriority('medium');
    setTaskTagId(state.tags[0]?.id || '');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskDueDate(task.dueDate || '');
    setTaskDueTime(task.dueTime || '');
    setTaskPriority(task.priority);
    setTaskTagId(task.tagId || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      storage.updateTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        dueTime: taskDueTime || undefined,
        priority: taskPriority,
        tagId: taskTagId || undefined,
      });
    } else {
      storage.addTask({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        dueDate: taskDueDate || undefined,
        dueTime: taskDueTime || undefined,
        priority: taskPriority,
        tagId: taskTagId || undefined,
        isCompleted: false,
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
            Task Management
          </h2>
          <p className="text-xs text-[#86948a] font-mono mt-1">
            LOCAL-FIRST TASK ENGINE • {state.tasks.filter((t) => !t.isCompleted).length} ACTIVE TASKS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTagManagerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] text-[#bbcabf] hover:text-[#dae2fd] text-xs font-mono border border-[#222a3d] flex items-center gap-1.5 transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#89ceff]" />
            Tags
          </button>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#4edea3]/20"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0b1326] p-1 rounded-xl border border-[#222a3d] overflow-x-auto">
          {(['all', 'today', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterMode(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                filterMode === tab
                  ? 'bg-[#171f33] text-[#4edea3] font-semibold shadow-sm border border-[#4edea3]/30'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              {tab}
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
              placeholder="Search tasks..."
              className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#4edea3]"
            />
          </div>

          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
          >
            <option value="all">All Tags</option>
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
            <p className="text-sm text-[#86948a]">No tasks found matching criteria.</p>
            <button
              onClick={() => openCreateModal()}
              className="text-xs font-mono text-[#4edea3] hover:underline inline-block"
            >
              + Create a new task
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
                        {task.priority}
                      </span>
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
                {editingTask ? 'Edit Task' : 'Create New Task'}
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
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-sm text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Optional details or context..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    DUE DATE
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    DUE TIME
                  </label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    PRIORITY
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    TAG
                  </label>
                  <select
                    value={taskTagId}
                    onChange={(e) => setTaskTagId(e.target.value)}
                    className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="">No Tag</option>
                    {state.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#4edea3] hover:bg-[#10b981] text-[#003824] transition-colors shadow-md shadow-[#4edea3]/20"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
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
