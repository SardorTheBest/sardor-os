import React, { useState } from 'react';
import {
  Activity,
  Flame,
  Plus,
  Check,
  Award,
  TrendingUp,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { AppState, Habit } from '../types';
import { storage } from '../lib/storage';

interface HabitsModuleProps {
  state: AppState;
}

export const HabitsModule: React.FC<HabitsModuleProps> = ({ state }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isNewHabitModalOpen, setIsNewHabitModalOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; habit: string; done: boolean } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [color, setColor] = useState('#4edea3');

  const todayStr = new Date().toISOString().split('T')[0];

  // Generate last 28 days for heatmap grid
  const pastDays = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
    };
  });

  const categories = ['all', ...Array.from(new Set(state.habits.map((h) => h.category)))];

  const filteredHabits = state.habits.filter((h) => {
    if (selectedCategory !== 'all' && h.category !== selectedCategory) return false;
    return true;
  });

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    storage.addHabit({
      name: name.trim(),
      category,
      frequency: 'daily',
      targetCount: 1,
      color,
    });
    setName('');
    setIsNewHabitModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#e5a93c] mb-1">
            <Flame className="w-4 h-4 text-[#e5a93c]" />
            HABIT & RHYTHM TELEMETRY
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            Daily Habits & Rhythm
          </h2>
          <p className="text-xs text-[#bbcabf] font-sans mt-1">
            Maintain momentum across cognitive, physical, and systems habits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewHabitModalOpen(true)}
            className="px-4 py-2 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#4edea3]/20"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-[#171f33] text-[#4edea3] font-semibold border border-[#4edea3]/30 shadow-sm'
                : 'bg-[#131b2e] text-[#86948a] hover:text-[#dae2fd] border border-[#222a3d]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Habits Grid */}
      <div className="space-y-4">
        {filteredHabits.map((habit) => {
          const isDoneToday = !!habit.logs[todayStr];
          return (
            <div
              key={habit.id}
              className="p-5 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4 shadow-sm hover:border-[#3c4a42] transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => storage.toggleHabitLog(habit.id, todayStr)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isDoneToday
                        ? 'bg-[#4edea3] text-[#003824] border-[#4edea3] shadow-md shadow-[#4edea3]/20 scale-105'
                        : 'bg-[#0b1326] border-[#222a3d] text-transparent hover:border-[#4edea3]'
                    }`}
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </button>

                  <div>
                    <h3 className="text-sm font-bold text-[#dae2fd]">{habit.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b1326] text-[#89ceff] border border-[#222a3d]">
                        {habit.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#e5a93c] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#e5a93c]" />
                        {habit.streak} day streak
                      </span>
                      <span className="text-[11px] font-mono text-[#86948a]">
                        Best: {habit.bestStreak}d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono text-[#86948a]">
                  Status: {isDoneToday ? <span className="text-[#4edea3] font-bold">Verified Today</span> : 'Pending'}
                </div>
              </div>

              {/* 28-Day Heatmap Strip */}
              <div className="space-y-1.5 pt-2 border-t border-[#222a3d]/50">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#86948a]">
                  <span>28 Days Activity Trail</span>
                  <span>Today</span>
                </div>

                <div className="grid grid-cols-28 gap-1">
                  {pastDays.map((day) => {
                    const done = !!habit.logs[day.dateStr];
                    const isToday = day.dateStr === todayStr;
                    return (
                      <button
                        key={day.dateStr}
                        onMouseEnter={() =>
                          setHoveredCell({
                            date: day.dateStr,
                            habit: habit.name,
                            done,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => storage.toggleHabitLog(habit.id, day.dateStr)}
                        className={`h-7 rounded transition-all relative ${
                          done
                            ? 'bg-[#4edea3] shadow-[0_0_4px_#4edea3]'
                            : 'bg-[#0b1326] hover:bg-[#1b2332]'
                        } ${isToday ? 'border border-[#dae2fd]' : 'border border-[#222a3d]/40'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap Tooltip overlay */}
      {hoveredCell && (
        <div className="fixed bottom-6 right-6 p-3 rounded-xl bg-[#171f33] border border-[#4edea3]/40 shadow-xl text-xs font-mono z-40">
          <div className="text-[#4edea3] font-bold">{hoveredCell.habit}</div>
          <div className="text-[#bbcabf]">{hoveredCell.date} • {hoveredCell.done ? 'Completed' : 'Missed'}</div>
          <div className="text-[10px] text-[#86948a] mt-1">Click square to toggle</div>
        </div>
      )}

      {/* New Habit Modal */}
      {isNewHabitModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Create New Habit
              </h3>
              <button
                onClick={() => setIsNewHabitModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  HABIT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 90m Deep Focus..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                >
                  <option value="Productivity">Productivity</option>
                  <option value="Mind">Mind</option>
                  <option value="Body">Body</option>
                  <option value="Health">Health</option>
                  <option value="Craft">Craft</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsNewHabitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4edea3] text-[#003824] font-mono text-xs font-semibold rounded-xl shadow-md shadow-[#4edea3]/20"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
