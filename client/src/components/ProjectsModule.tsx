import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Layers,
  X,
  MoreVertical,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  Rocket,
  Cpu,
  Globe,
  Code,
  Sparkles,
  BookOpen,
  Shield,
  Zap,
  Compass,
  Briefcase,
  AlertTriangle,
  ArrowLeft,
  Check,
  Search,
  ListTodo,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { AppState, Project, ProjectObjective, Task } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { EmptyState } from './EmptyState';

interface ProjectsModuleProps {
  state: AppState;
  onNavigate?: (view: AppState['activeView']) => void;
}

// Visual Icons Registry
const PROJECT_ICONS = [
  { id: 'target', label: 'Цель', icon: Target },
  { id: 'rocket', label: 'Ракета', icon: Rocket },
  { id: 'cpu', label: 'Система', icon: Cpu },
  { id: 'layers', label: 'Слои', icon: Layers },
  { id: 'code', label: 'Разработка', icon: Code },
  { id: 'globe', label: 'Продукт', icon: Globe },
  { id: 'sparkles', label: 'Инновация', icon: Sparkles },
  { id: 'book', label: 'Знания', icon: BookOpen },
  { id: 'shield', label: 'Безопасность', icon: Shield },
  { id: 'zap', label: 'Энергия', icon: Zap },
  { id: 'compass', label: 'Стратегия', icon: Compass },
  { id: 'briefcase', label: 'Бизнес', icon: Briefcase },
];

const COLOR_PALETTE = [
  { id: '#4edea3', name: 'Emerald', bg: '#4edea3' },
  { id: '#89ceff', name: 'Cyan Sky', bg: '#89ceff' },
  { id: '#00ffab', name: 'Neon Mint', bg: '#00ffab' },
  { id: '#00e5ff', name: 'Electric Blue', bg: '#00e5ff' },
  { id: '#d0bcff', name: 'Lavender', bg: '#d0bcff' },
  { id: '#ffb4ab', name: 'Coral Red', bg: '#ffb4ab' },
  { id: '#f6b26b', name: 'Amber Gold', bg: '#f6b26b' },
  { id: '#ff80bf', name: 'Magenta', bg: '#ff80bf' },
];

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({ state, onNavigate }) => {
  const isRu = state.language === 'ru';

  // Navigation / View State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formQuarter, setFormQuarter] = useState('Q3 2026');
  const [formColor, setFormColor] = useState('#4edea3');
  const [formIcon, setFormIcon] = useState('target');
  const [formStatus, setFormStatus] = useState<Project['status']>('in_progress');

  // Quick inputs
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [newLinkedTaskTitle, setNewLinkedTaskTitle] = useState('');

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close menus when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuProjectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProject = useMemo(() => {
    return state.projects.find((p) => p.id === selectedProjectId) || null;
  }, [state.projects, selectedProjectId]);

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return state.projects.filter((project) => {
      // Tab filter
      if (filterTab === 'archived') {
        if (project.status !== 'archived' && !project.isArchived) return false;
      } else {
        // Exclude archived from other tabs unless explicitly in archived tab
        if (project.status === 'archived' || project.isArchived) return false;

        if (filterTab === 'in_progress' && project.status !== 'in_progress' && project.status !== 'planned') {
          return false;
        }
        if (filterTab === 'completed' && project.status !== 'completed') {
          return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = project.title.toLowerCase().includes(q);
        const matchDesc = project.description.toLowerCase().includes(q);
        const matchQuarter = project.quarter.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchQuarter) return false;
      }

      return true;
    });
  }, [state.projects, filterTab, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const total = state.projects.filter((p) => p.status !== 'archived' && !p.isArchived).length;
    const inProgress = state.projects.filter(
      (p) => (p.status === 'in_progress' || p.status === 'planned') && !p.isArchived
    ).length;
    const completed = state.projects.filter((p) => p.status === 'completed' && !p.isArchived).length;
    const archived = state.projects.filter((p) => p.status === 'archived' || p.isArchived).length;
    return { total, inProgress, completed, archived };
  }, [state.projects]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormDescription('');
    setFormQuarter('Q3 2026');
    setFormColor('#4edea3');
    setFormIcon('target');
    setFormStatus('in_progress');
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDescription(project.description);
    setFormQuarter(project.quarter);
    setFormColor(project.color || '#4edea3');
    setFormIcon(project.icon || 'target');
    setFormStatus(project.status || 'in_progress');
    setActiveMenuProjectId(null);
    setIsEditModalOpen(true);
  };

  // Save Project (Create or Update)
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingProject) {
      storage.updateProject(editingProject.id, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        quarter: formQuarter.trim() || 'Q3 2026',
        color: formColor,
        icon: formIcon,
        status: formStatus,
        isArchived: formStatus === 'archived',
      });
      showToast(isRu ? 'Проект успешно обновлен' : 'Project updated successfully');
    } else {
      const created = storage.addProject({
        title: formTitle.trim(),
        description: formDescription.trim(),
        progress: 0,
        status: formStatus,
        quarter: formQuarter.trim() || 'Q3 2026',
        color: formColor,
        icon: formIcon,
        isArchived: formStatus === 'archived',
        objectives: [
          { id: `obj-1`, title: 'Этап 1: Исследование и архитектура', completed: false },
          { id: `obj-2`, title: 'Этап 2: Разработка и тестирование', completed: false },
          { id: `obj-3`, title: 'Этап 3: Релиз и оптимизация', completed: false },
        ],
      });
      setSelectedProjectId(created.id);
      showToast(isRu ? 'Новый проект создан' : 'New project created');
    }

    setIsEditModalOpen(false);
  };

  // Toggle Archive
  const handleToggleArchive = (project: Project) => {
    setActiveMenuProjectId(null);
    const updated = storage.toggleArchiveProject(project.id);
    if (updated) {
      const isArchived = updated.status === 'archived';
      showToast(
        isArchived
          ? (isRu ? `Проект «${project.title}» перемещен в архив` : `Project "${project.title}" archived`)
          : (isRu ? `Проект «${project.title}» восстановлен из архива` : `Project "${project.title}" restored`)
      );
    }
  };

  // Request Delete Project (opens modal)
  const handleRequestDelete = (project: Project) => {
    setActiveMenuProjectId(null);
    setProjectToDelete(project);
  };

  // Confirm Delete Project
  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const projectTitle = projectToDelete.title;
    const { deletedTasksCount } = storage.deleteProject(projectToDelete.id);
    
    sound.playComplete();
    showToast(
      isRu
        ? `Проект «${projectTitle}» и ${deletedTasksCount} связанных задач удалены из Dexie & Supabase`
        : `Project "${projectTitle}" and ${deletedTasksCount} linked tasks deleted`
    );

    if (selectedProjectId === projectToDelete.id) {
      setSelectedProjectId(null);
    }
    setProjectToDelete(null);
  };

  // Add Objective to selected project
  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newObjectiveTitle.trim()) return;
    storage.addObjective(selectedProject.id, newObjectiveTitle.trim());
    setNewObjectiveTitle('');
  };

  // Add Linked Task to selected project
  const handleAddLinkedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newLinkedTaskTitle.trim()) return;
    storage.addTask({
      title: newLinkedTaskTitle.trim(),
      priority: 'medium',
      isCompleted: false,
      projectId: selectedProject.id,
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '12:00',
    });
    setNewLinkedTaskTitle('');
    showToast(isRu ? 'Задача привязана к проекту' : 'Task linked to project');
  };

  // Helper to render project icon
  const renderProjectIcon = (iconId?: string, className: string = 'w-5 h-5') => {
    const item = PROJECT_ICONS.find((i) => i.id === iconId) || PROJECT_ICONS[0];
    const IconComp = item.icon;
    return <IconComp className={className} />;
  };

  // Linked tasks for selected project
  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return state.tasks.filter((t) => t.projectId === selectedProject.id);
  }, [state.tasks, selectedProject]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-[#131d33] border border-[#00ffab]/40 text-[#dae2fd] shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-fade-in backdrop-blur-md">
          <Check className="w-4 h-4 text-[#00ffab]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===================== 1. DETAILED PROJECT VIEW ===================== */}
      {selectedProject ? (
        <div className="space-y-6 animate-fade-in">
          {/* Top Breadcrumb & Header */}
          <div className="p-5 md:p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="px-3 py-1.5 rounded-xl bg-[#1e293b]/70 hover:bg-[#1e293b] text-[#bbcabf] hover:text-[#dae2fd] text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isRu ? 'Все проекты' : 'All Projects'}</span>
              </button>

              {/* Action Menu (...) in Header */}
              <div className="relative" ref={activeMenuProjectId === selectedProject.id ? menuRef : null}>
                <button
                  onClick={() =>
                    setActiveMenuProjectId(
                      activeMenuProjectId === selectedProject.id ? null : selectedProject.id
                    )
                  }
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[#bbcabf] hover:text-[#dae2fd] transition-all"
                  title={isRu ? 'Действия' : 'Actions'}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {activeMenuProjectId === selectedProject.id && (
                  <div className="absolute right-0 top-10 w-52 bg-[#131d33] border border-[#222f46] rounded-xl shadow-2xl z-30 py-1 overflow-hidden animate-fade-in">
                    <button
                      onClick={() => handleOpenEditModal(selectedProject)}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-[#dae2fd] hover:bg-[#1e293b] flex items-center gap-2 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#89ceff]" />
                      <span>{isRu ? 'Редактировать проект' : 'Edit Project'}</span>
                    </button>
                    <button
                      onClick={() => handleToggleArchive(selectedProject)}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-[#dae2fd] hover:bg-[#1e293b] flex items-center gap-2 transition-colors"
                    >
                      {selectedProject.status === 'archived' || selectedProject.isArchived ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-[#4edea3]" />
                          <span>{isRu ? 'Разархивировать' : 'Unarchive Project'}</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-[#f6b26b]" />
                          <span>{isRu ? 'В архив' : 'Archive Project'}</span>
                        </>
                      )}
                    </button>
                    <div className="h-px bg-[#222f46] my-1" />
                    <button
                      onClick={() => handleRequestDelete(selectedProject)}
                      className="w-full px-3.5 py-2.5 text-left text-xs text-[#ffb4ab] hover:bg-[#93000a]/20 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#ffb4ab]" />
                      <span>{isRu ? 'Удалить проект' : 'Delete Project'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Project Title and Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{
                    backgroundColor: `${selectedProject.color || '#4edea3'}20`,
                    borderColor: `${selectedProject.color || '#4edea3'}40`,
                    borderWidth: 1,
                    color: selectedProject.color || '#4edea3',
                  }}
                >
                  {renderProjectIcon(selectedProject.icon, 'w-6 h-6')}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${selectedProject.color || '#4edea3'}15`,
                        color: selectedProject.color || '#4edea3',
                        borderColor: `${selectedProject.color || '#4edea3'}30`,
                      }}
                    >
                      {selectedProject.quarter}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        selectedProject.status === 'completed'
                          ? 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30'
                          : selectedProject.status === 'archived' || selectedProject.isArchived
                          ? 'bg-[#f6b26b]/15 text-[#f6b26b] border-[#f6b26b]/30'
                          : 'bg-[#89ceff]/15 text-[#89ceff] border-[#89ceff]/30'
                      }`}
                    >
                      {selectedProject.status === 'archived' || selectedProject.isArchived
                        ? (isRu ? 'В архиве' : 'Archived')
                        : selectedProject.status === 'completed'
                        ? (isRu ? 'Завершен' : 'Completed')
                        : (isRu ? 'В работе' : 'In Progress')}
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-[#dae2fd] font-display mt-1">
                    {selectedProject.title}
                  </h1>
                </div>
              </div>

              {/* Progress Metric */}
              <div className="flex items-center gap-3 bg-[#131d33] px-4 py-2.5 rounded-xl border border-[#222f46]">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#86948a] uppercase">
                    {isRu ? 'Общий прогресс' : 'Overall Progress'}
                  </div>
                  <div
                    className="text-lg font-bold font-mono"
                    style={{ color: selectedProject.color || '#4edea3' }}
                  >
                    {selectedProject.progress}%
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedProject.description && (
              <p className="text-xs md:text-sm text-[#bbcabf] leading-relaxed pt-1">
                {selectedProject.description}
              </p>
            )}

            {/* Progress Bar */}
            <div className="w-full bg-[#0b1220] h-2.5 rounded-full overflow-hidden border border-[#1e293b]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${selectedProject.progress}%`,
                  backgroundColor: selectedProject.color || '#4edea3',
                }}
              />
            </div>
          </div>

          {/* Grid with Objectives & Linked Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Objectives Section */}
            <div className="p-5 md:p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff]">
                  <Target className="w-4 h-4" />
                  <span>
                    {isRu ? 'КЛЮЧЕВЫЕ ЭТАПЫ / ЦЕЛИ' : 'KEY OBJECTIVES'} (
                    {selectedProject.objectives.filter((o) => o.completed).length}/
                    {selectedProject.objectives.length})
                  </span>
                </div>
              </div>

              {/* Objectives List */}
              <div className="space-y-2">
                {selectedProject.objectives.length === 0 ? (
                  <p className="text-xs text-[#86948a] italic py-3 text-center">
                    {isRu ? 'Нет добавленных этапов' : 'No objectives added yet'}
                  </p>
                ) : (
                  selectedProject.objectives.map((obj) => (
                    <div
                      key={obj.id}
                      className="group flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#131d33]/80 border border-[#1e293b] hover:border-[#2b3a53] transition-colors"
                    >
                      <button
                        onClick={() => storage.toggleObjective(selectedProject.id, obj.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        {obj.completed ? (
                          <CheckCircle2
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: selectedProject.color || '#4edea3' }}
                          />
                        ) : (
                          <Circle className="w-4 h-4 text-[#86948a] flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            obj.completed ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                          }`}
                        >
                          {obj.title}
                        </span>
                      </button>

                      <button
                        onClick={() => storage.deleteObjective(selectedProject.id, obj.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#86948a] hover:text-[#ffb4ab] transition-opacity"
                        title={isRu ? 'Удалить этап' : 'Delete Objective'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Objective Form */}
              <form onSubmit={handleAddObjective} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newObjectiveTitle}
                  onChange={(e) => setNewObjectiveTitle(e.target.value)}
                  placeholder={isRu ? 'Добавить новый этап проекта...' : 'Add new objective...'}
                  className="flex-1 bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
                <button
                  type="submit"
                  disabled={!newObjectiveTitle.trim()}
                  className="px-3.5 py-2 bg-[#89ceff] hover:bg-[#89ceff]/90 text-[#001e2f] font-mono text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRu ? 'Добавить' : 'Add'}</span>
                </button>
              </form>
            </div>

            {/* Linked Tasks Section */}
            <div className="p-5 md:p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00ffab]">
                  <ListTodo className="w-4 h-4" />
                  <span>
                    {isRu ? 'СВЯЗАННЫЕ ЗАДАЧИ' : 'LINKED TASKS'} ({projectTasks.length})
                  </span>
                </div>
              </div>

              {/* Linked Tasks List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {projectTasks.length === 0 ? (
                  <p className="text-xs text-[#86948a] italic py-3 text-center">
                    {isRu ? 'К этому проекту пока не привязаны задачи' : 'No tasks linked to this project'}
                  </p>
                ) : (
                  projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#131d33]/80 border border-[#1e293b] hover:border-[#2b3a53] transition-colors"
                    >
                      <button
                        onClick={() => storage.toggleTask(task.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00ffab] flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#86948a] flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            task.isCompleted ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                          }`}
                        >
                          {task.title}
                        </span>
                      </button>

                      {task.dueDate && (
                        <span className="text-[10px] font-mono text-[#86948a] flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {task.dueDate}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Linked Task Form */}
              <form onSubmit={handleAddLinkedTask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newLinkedTaskTitle}
                  onChange={(e) => setNewLinkedTaskTitle(e.target.value)}
                  placeholder={isRu ? 'Новая задача для проекта...' : 'New task for this project...'}
                  className="flex-1 bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
                <button
                  type="submit"
                  disabled={!newLinkedTaskTitle.trim()}
                  className="px-3.5 py-2 bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-mono text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRu ? 'Создать' : 'Create'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* ===================== 2. PROJECTS LIST / GRID ===================== */
        <div className="space-y-6">
          {/* Main Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff] mb-1">
                <Target className="w-4 h-4" />
                <span>{isRu ? 'СТРАТЕГИЧЕСКИЕ ИНИЦИАТИВЫ' : 'OBJECTIVES & KEY ROADMAPS'}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#dae2fd] font-display">
                {isRu ? 'Управление проектами' : 'Projects & Initiatives'}
              </h2>
              <p className="text-xs text-[#bbcabf] font-sans mt-1">
                {isRu
                  ? 'Контроль долгосрочных целей, вех развития и связанных задач с синхронизацией.'
                  : 'Track multi-phase initiatives, milestones, and high-impact trajectories.'}
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-[#89ceff] to-[#4edea3] hover:opacity-95 text-[#001e2f] font-bold text-xs font-mono rounded-xl flex items-center gap-2 transition-all shadow-md shadow-[#89ceff]/20 self-start sm:self-auto min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>{isRu ? 'Новый проект' : 'New Project'}</span>
            </button>
          </div>

          {/* Search & Tabs Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-2xl border border-[#1e293b]">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'all'
                    ? 'bg-[#1e293b] text-[#dae2fd] font-bold border border-[#334155]'
                    : 'text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                <span>{isRu ? 'Все' : 'All'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#131d33]">
                  {tabCounts.total}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'in_progress'
                    ? 'bg-[#89ceff]/20 text-[#89ceff] font-bold border border-[#89ceff]/40'
                    : 'text-[#86948a] hover:text-[#89ceff]'
                }`}
              >
                <span>{isRu ? 'В работе' : 'In Progress'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#131d33]">
                  {tabCounts.inProgress}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'completed'
                    ? 'bg-[#4edea3]/20 text-[#4edea3] font-bold border border-[#4edea3]/40'
                    : 'text-[#86948a] hover:text-[#4edea3]'
                }`}
              >
                <span>{isRu ? 'Завершенные' : 'Completed'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#131d33]">
                  {tabCounts.completed}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('archived')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'archived'
                    ? 'bg-[#f6b26b]/20 text-[#f6b26b] font-bold border border-[#f6b26b]/40'
                    : 'text-[#86948a] hover:text-[#f6b26b]'
                }`}
              >
                <span>{isRu ? 'В архиве' : 'Archived'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#131d33]">
                  {tabCounts.archived}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] md:w-64">
              <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRu ? 'Поиск проектов...' : 'Search projects...'}
                className="w-full bg-[#131d33] border border-[#1e293b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86948a] hover:text-[#dae2fd]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] overflow-hidden">
              <EmptyState
                icon={Target}
                title={
                  filterTab === 'archived'
                    ? (isRu ? 'Архив проектов пуст' : 'No Archived Projects')
                    : searchQuery
                    ? (isRu ? 'Проекты не найдены' : 'No Projects Found')
                    : (isRu ? 'Проекты не созданы' : 'No Projects Yet')
                }
                description={
                  filterTab === 'archived'
                    ? (isRu ? 'В архивной папке пока нет завершенных или отложенных проектов.' : 'No archived projects found.')
                    : (isRu ? 'Создайте стратегический проект для декомпозиции целей, этапов и задач.' : 'Create your first strategic project to organize milestones and objectives.')
                }
                actionLabel={filterTab !== 'archived' ? (isRu ? 'Создать проект' : 'Create Project') : undefined}
                onAction={filterTab !== 'archived' ? handleOpenCreateModal : undefined}
                accentColor="cyan"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredProjects.map((project) => {
                const projectLinkedTasks = state.tasks.filter((t) => t.projectId === project.id);
                const completedObjectives = project.objectives.filter((o) => o.completed).length;

                return (
                  <div
                    key={project.id}
                    className="relative p-5 md:p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] transition-all space-y-4 shadow-lg group flex flex-col justify-between"
                  >
                    {/* Card Header & 3-Dots Action Menu */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{
                              backgroundColor: `${project.color || '#4edea3'}20`,
                              borderColor: `${project.color || '#4edea3'}40`,
                              borderWidth: 1,
                              color: project.color || '#4edea3',
                            }}
                          >
                            {renderProjectIcon(project.icon, 'w-5 h-5')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="text-[9px] font-mono uppercase px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: `${project.color || '#4edea3'}15`,
                                  color: project.color || '#4edea3',
                                  borderColor: `${project.color || '#4edea3'}30`,
                                }}
                              >
                                {project.quarter}
                              </span>
                              {project.status === 'archived' || project.isArchived ? (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#f6b26b]/15 text-[#f6b26b] border border-[#f6b26b]/30">
                                  {isRu ? 'В архиве' : 'Archived'}
                                </span>
                              ) : null}
                            </div>
                            <h3
                              onClick={() => setSelectedProjectId(project.id)}
                              className="text-base font-bold text-[#dae2fd] font-display mt-1 truncate hover:text-[#89ceff] cursor-pointer transition-colors"
                              title={project.title}
                            >
                              {project.title}
                            </h3>
                          </div>
                        </div>

                        {/* 3-Dots Menu Button */}
                        <div className="relative" ref={activeMenuProjectId === project.id ? menuRef : null}>
                          <button
                            onClick={() =>
                              setActiveMenuProjectId(
                                activeMenuProjectId === project.id ? null : project.id
                              )
                            }
                            className="p-1.5 rounded-lg bg-[#131d33] hover:bg-[#1e293b] text-[#bbcabf] hover:text-[#dae2fd] transition-colors"
                            title={isRu ? 'Действия' : 'Actions'}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuProjectId === project.id && (
                            <div className="absolute right-0 top-8 w-48 bg-[#131d33] border border-[#222f46] rounded-xl shadow-2xl z-30 py-1 overflow-hidden animate-fade-in">
                              <button
                                onClick={() => handleOpenEditModal(project)}
                                className="w-full px-3 py-2 text-left text-xs text-[#dae2fd] hover:bg-[#1e293b] flex items-center gap-2 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#89ceff]" />
                                <span>{isRu ? 'Редактировать' : 'Edit Project'}</span>
                              </button>
                              <button
                                onClick={() => handleToggleArchive(project)}
                                className="w-full px-3 py-2 text-left text-xs text-[#dae2fd] hover:bg-[#1e293b] flex items-center gap-2 transition-colors"
                              >
                                {project.status === 'archived' || project.isArchived ? (
                                  <>
                                    <ArchiveRestore className="w-3.5 h-3.5 text-[#4edea3]" />
                                    <span>{isRu ? 'Разархивировать' : 'Unarchive'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5 text-[#f6b26b]" />
                                    <span>{isRu ? 'В архив' : 'Archive'}</span>
                                  </>
                                )}
                              </button>
                              <div className="h-px bg-[#222f46] my-1" />
                              <button
                                onClick={() => handleRequestDelete(project)}
                                className="w-full px-3 py-2 text-left text-xs text-[#ffb4ab] hover:bg-[#93000a]/20 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#ffb4ab]" />
                                <span>{isRu ? 'Удалить проект' : 'Delete Project'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#bbcabf] line-clamp-2 mt-3 leading-relaxed">
                        {project.description || (isRu ? 'Без описания' : 'No description')}
                      </p>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#86948a]">
                          {isRu ? 'Прогресс' : 'Progress'}
                        </span>
                        <span
                          className="font-bold"
                          style={{ color: project.color || '#4edea3' }}
                        >
                          {project.progress}%
                        </span>
                      </div>

                      <div className="w-full bg-[#0b1220] h-2 rounded-full overflow-hidden border border-[#1e293b]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor: project.color || '#4edea3',
                          }}
                        />
                      </div>

                      {/* Footer Info & Details Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/70 text-[11px] font-mono text-[#86948a]">
                        <div className="flex items-center gap-3">
                          <span>
                            🎯 {completedObjectives}/{project.objectives.length} {isRu ? 'этапов' : 'goals'}
                          </span>
                          <span>
                            📋 {projectLinkedTasks.length} {isRu ? 'задач' : 'tasks'}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedProjectId(project.id)}
                          className="text-[#89ceff] hover:text-[#dae2fd] flex items-center gap-1 transition-colors"
                        >
                          <span>{isRu ? 'Открыть' : 'Workspace'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== 3. CREATE / EDIT PROJECT MODAL ===================== */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-xl p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-modal-float pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                <Target className="w-4 h-4 text-[#89ceff]" />
                {editingProject
                  ? (isRu ? 'Редактировать проект' : 'Edit Project Settings')
                  : (isRu ? 'Создать новый проект' : 'Create New Project')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd] p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'НАЗВАНИЕ ПРОЕКТА *' : 'PROJECT TITLE *'}
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Zing OS 2.0"
                  className="w-full bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ОПИСАНИЕ И КЛЮЧЕВАЯ ЦЕЛЬ' : 'DESCRIPTION & IMPACT'}
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={isRu ? 'Архитектурные цели, стек и результаты...' : 'Core objectives and scope...'}
                  className="w-full bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              {/* Quarter & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'КВАРТАЛ / СРОК' : 'TARGET / QUARTER'}
                  </label>
                  <input
                    type="text"
                    value={formQuarter}
                    onChange={(e) => setFormQuarter(e.target.value)}
                    placeholder="e.g. Q3 2026"
                    className="w-full bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#86948a] mb-1">
                    {isRu ? 'СТАТУС' : 'STATUS'}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Project['status'])}
                    className="w-full bg-[#131d33] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                  >
                    <option value="in_progress">{isRu ? 'В процессе (In Progress)' : 'In Progress'}</option>
                    <option value="planned">{isRu ? 'Запланирован (Planned)' : 'Planned'}</option>
                    <option value="completed">{isRu ? 'Завершен (Completed)' : 'Completed'}</option>
                    <option value="archived">{isRu ? 'В архиве (Archived)' : 'Archived'}</option>
                  </select>
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  {isRu ? 'ИКОНКА ПРОЕКТА' : 'PROJECT ICON'}
                </label>
                <div className="grid grid-cols-6 gap-2 bg-[#131d33] p-2.5 rounded-xl border border-[#1e293b]">
                  {PROJECT_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setFormIcon(item.id)}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#1e293b] text-[#00ffab] ring-1 ring-[#00ffab]'
                            : 'text-[#86948a] hover:text-[#dae2fd] hover:bg-[#1e293b]/50'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  {isRu ? 'АКЦЕНТНЫЙ ЦВЕТ' : 'ACCENT COLOR'}
                </label>
                <div className="flex flex-wrap gap-2.5 bg-[#131d33] p-2.5 rounded-xl border border-[#1e293b]">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setFormColor(c.id)}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                        formColor === c.id ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#131d33]' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.bg }}
                      title={c.name}
                    >
                      {formColor === c.id && <Check className="w-3.5 h-3.5 text-[#001e2f] stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#1e293b] transition-colors"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#89ceff] to-[#4edea3] text-[#001e2f] font-mono text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  {editingProject
                    ? (isRu ? 'Сохранить изменения' : 'Save Changes')
                    : (isRu ? 'Создать проект' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== 4. CONFIRM DELETE MODAL ===================== */}
      {projectToDelete && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
          onClick={() => setProjectToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-[#16171A] border border-[#ffb4ab]/40 rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 animate-modal-float pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center gap-3 text-[#ffb4ab]">
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#ffb4ab]" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-[#ffb4ab]">
                  {isRu ? 'Удалить проект?' : 'Delete Project?'}
                </h3>
                <span className="text-[10px] font-mono text-[#ffb4ab]/80 uppercase">
                  {isRu ? 'Необратимое действие' : 'Destructive Action'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131d33] border border-[#1e293b] text-xs text-[#dae2fd] space-y-2">
              <p>
                {isRu ? (
                  <>
                    Вы уверены, что хотите удалить проект{' '}
                    <strong className="text-[#ffb4ab]">«{projectToDelete.title}»</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete project{' '}
                    <strong className="text-[#ffb4ab]">"{projectToDelete.title}"</strong>?
                  </>
                )}
              </p>
              <p className="text-[11px] text-[#bbcabf]">
                {isRu
                  ? `Все связанные задачи (${
                      state.tasks.filter((t) => t.projectId === projectToDelete.id).length
                    } шт.) и этапы будут безвозвратно удалены из локального хранилища Dexie.js и облачной синхронизации Supabase.`
                  : `All ${
                      state.tasks.filter((t) => t.projectId === projectToDelete.id).length
                    } associated tasks and objectives will be permanently deleted from Dexie.js and Supabase.`}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-mono text-[#bbcabf] hover:bg-[#1e293b] transition-colors min-h-[44px] flex items-center justify-center"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#ba1a1a]/30 transition-all min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isRu ? 'Удалить проект и задачи' : 'Delete Project & Tasks'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
