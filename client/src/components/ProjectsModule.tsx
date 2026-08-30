import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { AppState, Project } from '../types';
import { storage } from '../lib/storage';

interface ProjectsModuleProps {
  state: AppState;
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({ state }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quarter, setQuarter] = useState('Q3 2026');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    storage.addProject({
      title: title.trim(),
      description: description.trim(),
      progress: 0,
      status: 'in_progress',
      quarter: quarter || 'Q3 2026',
      color: '#4edea3',
      objectives: [
        { id: 'm1', title: 'Phase 1: Architecture & Foundations', completed: false },
        { id: 'm2', title: 'Phase 2: Core Feature Implementation', completed: false },
        { id: 'm3', title: 'Phase 3: Testing & Polish', completed: false },
      ],
    });
    setTitle('');
    setDescription('');
    setQuarter('Q3 2026');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff] mb-1">
            <Target className="w-4 h-4" />
            OBJECTIVES & KEY INITIATIVES
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            Projects & Roadmaps
          </h2>
          <p className="text-xs text-[#bbcabf] font-sans mt-1">
            Track multi-phase initiatives, milestones, and high-impact trajectories.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#89ceff] hover:bg-[#89ceff]/90 text-[#001e2f] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#89ceff]/20"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {state.projects.map((project) => (
          <div
            key={project.id}
            className="p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4 hover:border-[#3c4a42] transition-colors shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#89ceff]/10 text-[#89ceff] border border-[#89ceff]/30">
                  {project.status.replace('_', ' ')} • {project.quarter}
                </span>
                <h3 className="text-base font-bold text-[#dae2fd] font-display mt-2">
                  {project.title}
                </h3>
              </div>
              <span className="text-sm font-mono font-bold text-[#4edea3]">
                {project.progress}%
              </span>
            </div>

            <p className="text-xs text-[#bbcabf] leading-relaxed">
              {project.description}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#0b1326] h-2 rounded-full overflow-hidden border border-[#222a3d]">
              <div
                className="bg-gradient-to-r from-[#89ceff] to-[#4edea3] h-full rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>

            {/* Milestones / Objectives */}
            <div className="space-y-2 pt-2 border-t border-[#222a3d]/50">
              <div className="text-[11px] font-mono text-[#86948a] uppercase">
                Objectives ({project.objectives.filter((m) => m.completed).length}/{project.objectives.length})
              </div>
              <div className="space-y-1.5">
                {project.objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0b1326]/60 border border-[#222a3d]"
                  >
                    <button
                      onClick={() => storage.toggleObjective(project.id, obj.id)}
                      className="text-[#86948a] hover:text-[#4edea3]"
                    >
                      {obj.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#86948a]" />
                      )}
                    </button>
                    <span
                      className={`text-xs ${
                        obj.completed ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                      }`}
                    >
                      {obj.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Project Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Create New Project
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  PROJECT TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Zenith OS 2.0"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core objectives and scope..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  QUARTER / TARGET
                </label>
                <input
                  type="text"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  placeholder="e.g. Q3 2026"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#89ceff] text-[#001e2f] font-mono text-xs font-semibold rounded-xl"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
