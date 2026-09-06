import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Check,
  X,
  BellRing,
  Bell,
  Clock,
  Trash2,
  Edit3,
} from 'lucide-react';
import { AppState, Habit } from '../types';
import { storage } from '../lib/storage';
import { notificationService } from '../lib/notificationService';
import { EmptyState } from './EmptyState';

interface HabitsModuleProps {
  state: AppState;
}

export const HabitsModule: React.FC<HabitsModuleProps> = ({ state }) => {
  const isRu = state.language === 'ru';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; habit: string; done: boolean } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [color, setColor] = useState('#4edea3');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [permissionStatus, setPermissionStatus] = useState(notificationService.getPermissionStatus());

  useEffect(() => {
    const unsub = notificationService.onPermissionChange((status) => {
      setPermissionStatus(status);
    });
    return () => unsub();
  }, []);

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

  const openCreateModal = () => {
    setEditingHabit(null);
    setName('');
    setCategory('Productivity');
    setColor('#4edea3');
    setReminderEnabled(false);
    setReminderTime('09:00');
    setIsModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setCategory(habit.category);
    setColor(habit.color || '#4edea3');
    setReminderEnabled(!!habit.reminderEnabled);
    setReminderTime(habit.reminderTime || '09:00');
    setIsModalOpen(true);
  };

  const handleToggleReminder = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    if (enabled && notificationService.getPermissionStatus() !== 'granted') {
      const res = await notificationService.requestPermission();
      setPermissionStatus(res);
    }
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingHabit) {
      storage.updateHabit(editingHabit.id, {
        name: name.trim(),
        category,
        color,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
      });
    } else {
      storage.addHabit({
        name: name.trim(),
        category,
        frequency: 'daily',
        targetCount: 1,
        color,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm(isRu ? 'Удалить эту привычку?' : 'Delete this habit?')) {
      storage.deleteHabit(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#e5a93c] mb-1">
            <Flame className="w-4 h-4 text-[#e5a93c]" />
            {isRu ? 'РИТМ И ПРИВЫЧКИ' : 'HABIT & RHYTHM TELEMETRY'}
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            {isRu ? 'Ежедневные Привычки' : 'Daily Habits & Rhythm'}
          </h2>
          <p className="text-xs text-[#bbcabf] font-sans mt-1">
            {isRu
              ? 'Формируйте дисциплину и получайте офлайн-напоминания со звуком каждый день.'
              : 'Maintain momentum across cognitive, physical, and systems habits with offline reminders.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#4edea3]/20"
          >
            <Plus className="w-4 h-4" />
            {isRu ? 'Новая привычка' : 'New Habit'}
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
            {cat === 'all' ? (isRu ? 'Все' : 'All') : cat}
          </button>
        ))}
      </div>

      {/* Habits Grid */}
      <div className="space-y-4">
        {filteredHabits.length === 0 ? (
          <div className="rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] overflow-hidden">
            <EmptyState
              icon={Flame}
              title={selectedCategory === 'all' ? (isRu ? 'Привычек пока нет' : 'No Habits Yet') : (isRu ? 'В этой категории нет привычек' : 'No habits in this category')}
              description={
                isRu
                  ? 'Формируйте полезные микро-ритуалы и отслеживайте непрерывный стрейк каждый день.'
                  : 'Build steady routines and track your daily consistency streak.'
              }
              actionLabel={isRu ? 'Создать первую привычку' : 'Create Habit'}
              onAction={openCreateModal}
              accentColor="emerald"
            />
          </div>
        ) : (
          filteredHabits.map((habit) => {
          const isDoneToday = !!habit.logs[todayStr];
          return (
            <div
              key={habit.id}
              className="p-5 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4 shadow-sm hover:border-[#3c4a42] transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => storage.toggleHabitLog(habit.id, todayStr)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 ${
                      isDoneToday
                        ? 'bg-[#4edea3] text-[#003824] border-[#4edea3] shadow-md shadow-[#4edea3]/20 scale-105'
                        : 'bg-[#0b1326] border-[#222a3d] text-transparent hover:border-[#4edea3]'
                    }`}
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#dae2fd] truncate">{habit.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b1326] text-[#89ceff] border border-[#222a3d]">
                        {habit.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#e5a93c] flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#e5a93c]" />
                        {habit.streak} {isRu ? 'дн. стрейк' : 'day streak'}
                      </span>
                      <span className="text-[11px] font-mono text-[#86948a]">
                        {isRu ? 'Рекорд:' : 'Best:'} {habit.bestStreak}d
                      </span>

                      {habit.reminderEnabled && habit.reminderTime && (
                        <span
                          title={`Ежедневное напоминание в ${habit.reminderTime}`}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ffab]/10 border border-[#00ffab]/30 text-[#00ffab] flex items-center gap-1"
                        >
                          <BellRing className="w-3 h-3 text-[#00ffab] animate-pulse" />
                          <span>{habit.reminderTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-[#86948a]">
                    {isDoneToday ? (
                      <span className="text-[#4edea3] font-bold">{isRu ? 'Выполнено сегодня' : 'Verified Today'}</span>
                    ) : (
                      <span>{isRu ? 'Ожидает' : 'Pending'}</span>
                    )}
                  </div>
                  <button
                    onClick={() => openEditModal(habit)}
                    className="p-1.5 rounded-lg text-[#86948a] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-1.5 rounded-lg text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#222a3d] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 28-Day Heatmap Strip */}
              <div className="space-y-1.5 pt-2 border-t border-[#222a3d]/50">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#86948a]">
                  <span>{isRu ? 'История активности за 28 дней' : '28 Days Activity Trail'}</span>
                  <span>{isRu ? 'Сегодня' : 'Today'}</span>
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
        }))}
      </div>

      {/* Heatmap Tooltip overlay */}
      {hoveredCell && (
        <div className="fixed bottom-6 right-6 p-3 rounded-xl bg-[#16171A] border border-[#10B981]/40 shadow-xl text-xs font-mono z-40">
          <div className="text-[#10B981] font-bold">{hoveredCell.habit}</div>
          <div className="text-[#bbcabf]">{hoveredCell.date} • {hoveredCell.done ? (isRu ? 'Выполнено' : 'Completed') : (isRu ? 'Пропущено' : 'Missed')}</div>
          <div className="text-[10px] text-[#86948a] mt-1">{isRu ? 'Нажмите на ячейку для переключения' : 'Click square to toggle'}</div>
        </div>
      )}

      {/* Habit Create / Edit Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 animate-modal-float max-h-[90vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden" />

            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#e5a93c]" />
                {editingHabit ? (isRu ? 'Редактировать привычку' : 'Edit Habit') : (isRu ? 'Создать привычку' : 'Create New Habit')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd] p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'НАЗВАНИЕ ПРИВЫЧКИ *' : 'HABIT NAME *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRu ? 'Например: 45м Глубокая работа...' : 'e.g. 90m Deep Focus...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'КАТЕГОРИЯ' : 'CATEGORY'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                >
                  <option value="Productivity">{isRu ? 'Продуктивность' : 'Productivity'}</option>
                  <option value="Mind">{isRu ? 'Разум & Фокус' : 'Mind'}</option>
                  <option value="Body">{isRu ? 'Тело & Спорт' : 'Body'}</option>
                  <option value="Health">{isRu ? 'Здоровье' : 'Health'}</option>
                  <option value="Craft">{isRu ? 'Навыки & Творчество' : 'Craft'}</option>
                </select>
              </div>

              {/* Push & Sound Reminder */}
              <div className="bg-[#0b1326]/80 border border-[#222a3d] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#4edea3]/10 text-[#4edea3]">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#dae2fd] flex items-center gap-1.5">
                        {isRu ? 'Ежедневное Push-напоминание' : 'Daily Push Reminder'}
                        {permissionStatus === 'granted' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#4edea3]/20 text-[#4edea3]">
                            {isRu ? 'Офлайн' : 'Offline'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#e5a93c]/20 text-[#e5a93c]">
                            {isRu ? 'Требуется доступ' : 'Permission needed'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#86948a]">
                        {isRu
                          ? 'Звуковое оповещение в выбранное время каждый день'
                          : 'Audio chime at scheduled time every day'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => handleToggleReminder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#222a3d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4edea3]"></div>
                  </label>
                </div>

                {reminderEnabled && (
                  <div className="pt-2 border-t border-[#222a3d]/60 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-mono text-[#86948a] block mb-1.5">
                        {isRu ? 'БЫСТРЫЕ ПРЕСЕТЫ ВРЕМЕНИ' : 'TIME PRESETS'}
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { time: '08:00', label: isRu ? '08:00 Утро' : '08:00 AM' },
                          { time: '13:00', label: isRu ? '13:00 День' : '01:00 PM' },
                          { time: '19:00', label: isRu ? '19:00 Вечер' : '07:00 PM' },
                          { time: '21:30', label: isRu ? '21:30 Сон' : '09:30 PM' },
                        ].map((p) => (
                          <button
                            key={p.time}
                            type="button"
                            onClick={() => setReminderTime(p.time)}
                            className={`py-1 px-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                              reminderTime === p.time
                                ? 'bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3] font-bold'
                                : 'bg-[#131b2e] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-[#86948a] mb-1">
                        {isRu ? 'ВРЕМЯ НАПОМИНАНИЯ' : 'EXACT TIME'}
                      </label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4edea3]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d] min-h-[44px] flex items-center justify-center"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-mono text-xs font-semibold rounded-xl shadow-md shadow-[#4edea3]/20 transition-all min-h-[44px] flex items-center justify-center"
                >
                  {editingHabit ? (isRu ? 'Сохранить' : 'Save Changes') : (isRu ? 'Создать привычку' : 'Create Habit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
