import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  Zap,
  BarChart2,
  LineChart as LineChartIcon,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
} from 'lucide-react';
import { Task } from '../types';

interface TaskProductivityChartProps {
  tasks: Task[];
  language?: 'ru' | 'en';
}

interface DayData {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. "15 авг" or "Aug 15"
  fullFormattedDate: string; // e.g. "15 августа 2026"
  completedCount: number;
  totalDueCount: number;
  completedTasks: Task[];
}

export const TaskProductivityChart: React.FC<TaskProductivityChartProps> = ({
  tasks,
  language = 'ru',
}) => {
  const isRu = language === 'ru';
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate date series for selected time range
  const chartData = useMemo(() => {
    const data: DayData[] = [];
    const now = new Date();

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      // Format display date
      const displayDate = d.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });

      const fullFormattedDate = d.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Find completed tasks matching this date
      // A task is considered completed on this date if:
      // 1. updatedAt or dueDate starts with this dateKey and isCompleted is true,
      // OR fallback matching dueDate
      const completedOnThisDay = tasks.filter((t) => {
        if (!t.isCompleted) return false;
        if (t.updatedAt && t.updatedAt.startsWith(dateKey)) return true;
        if (t.dueDate === dateKey) return true;
        return false;
      });

      const totalDueOnThisDay = tasks.filter((t) => t.dueDate === dateKey).length;

      data.push({
        dateKey,
        displayDate,
        fullFormattedDate,
        completedCount: completedOnThisDay.length,
        totalDueCount: Math.max(totalDueOnThisDay, completedOnThisDay.length),
        completedTasks: completedOnThisDay,
      });
    }

    return data;
  }, [tasks, timeRange, isRu]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCompletedInRange = chartData.reduce((acc, d) => acc + d.completedCount, 0);
    const avgPerDay = (totalCompletedInRange / timeRange).toFixed(1);

    // Peak day
    let peakCount = 0;
    let peakDayName = isRu ? 'Нет данных' : 'No data';
    chartData.forEach((d) => {
      if (d.completedCount > peakCount) {
        peakCount = d.completedCount;
        peakDayName = `${d.displayDate} (${d.completedCount} ${isRu ? 'задач' : 'tasks'})`;
      }
    });

    // Total tasks created / total completed overall
    const allCompletedCount = tasks.filter((t) => t.isCompleted).length;
    const completionRate =
      tasks.length > 0 ? Math.round((allCompletedCount / tasks.length) * 100) : 0;

    return {
      totalCompletedInRange,
      avgPerDay,
      peakDayName: peakCount > 0 ? peakDayName : isRu ? '0 задач' : '0 tasks',
      peakCount,
      completionRate,
    };
  }, [chartData, timeRange, tasks, isRu]);

  // Custom Tooltip Component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayData = payload[0].payload;
      return (
        <div className="bg-[#0b1326]/95 backdrop-blur-md border border-[#222a3d] p-3.5 rounded-xl shadow-2xl space-y-2 max-w-xs z-50">
          <div className="flex items-center justify-between border-b border-[#222a3d] pb-1.5 gap-4">
            <span className="text-xs font-mono font-bold text-[#dae2fd]">
              {data.fullFormattedDate}
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#00ffab]/10 text-[#00ffab] border border-[#00ffab]/30">
              {data.completedCount} {isRu ? 'выполнено' : 'completed'}
            </span>
          </div>

          {data.completedTasks.length === 0 ? (
            <p className="text-[11px] text-[#86948a] italic">
              {isRu ? 'Задач в этот день не завершено' : 'No tasks completed on this day'}
            </p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <span className="text-[10px] font-mono text-[#86948a] uppercase block">
                {isRu ? 'Завершённые задачи:' : 'Completed items:'}
              </span>
              {data.completedTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 text-xs text-[#dae2fd] truncate"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#00ffab] flex-shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
              {data.completedTasks.length > 5 && (
                <span className="text-[10px] font-mono text-[#86948a]">
                  +{data.completedTasks.length - 5} {isRu ? 'ещё' : 'more'}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-[#131b2e] via-[#101828] to-[#131b2e] border border-[#222a3d] shadow-lg space-y-5">
      {/* Header with Title, Controls, and Collapse Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222a3d]/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 flex items-center justify-center text-[#00ffab]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                {isRu ? 'Аналитика Продуктивности' : 'Productivity Trends'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#00ffab]/10 text-[#00ffab] text-[10px] font-mono border border-[#00ffab]/30">
                Recharts Live
              </span>
            </div>
            <p className="text-xs text-[#86948a]">
              {isRu
                ? 'Динамика выполнения задач и ритм продуктивности'
                : 'Task completion trajectory over time'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Time range selector */}
          <div className="flex items-center bg-[#0b1326] p-1 rounded-xl border border-[#222a3d]">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  timeRange === days
                    ? 'bg-[#171f33] text-[#00ffab] font-bold border border-[#00ffab]/30 shadow-sm'
                    : 'text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                {days} {isRu ? 'дней' : 'days'}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-[#0b1326] p-1 rounded-xl border border-[#222a3d]">
            <button
              onClick={() => setChartType('area')}
              title={isRu ? 'Линейный график' : 'Area Chart'}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'area'
                  ? 'bg-[#171f33] text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              title={isRu ? 'Столбчатый график' : 'Bar Chart'}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'bar'
                  ? 'bg-[#171f33] text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-[#0b1326] text-[#86948a] hover:text-[#dae2fd] border border-[#222a3d] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Top 4 KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1: Total Completed */}
            <div className="p-3.5 rounded-xl bg-[#0b1326]/90 border border-[#222a3d] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#86948a] font-mono">
                <span>{isRu ? `Выполнено (${timeRange}д)` : `Completed (${timeRange}d)`}</span>
                <CheckCircle2 className="w-4 h-4 text-[#00ffab]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#dae2fd]">
                {metrics.totalCompletedInRange}
              </div>
              <div className="text-[10px] text-[#86948a]">
                {isRu ? 'закрытых задач в окне' : 'completed in window'}
              </div>
            </div>

            {/* Metric 2: Avg Per Day */}
            <div className="p-3.5 rounded-xl bg-[#0b1326]/90 border border-[#222a3d] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#86948a] font-mono">
                <span>{isRu ? 'Темп в день' : 'Daily Average'}</span>
                <Activity className="w-4 h-4 text-[#00e5ff]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#00e5ff]">
                {metrics.avgPerDay}
              </div>
              <div className="text-[10px] text-[#86948a]">
                {isRu ? 'задач / сутки' : 'tasks / day'}
              </div>
            </div>

            {/* Metric 3: Peak Day */}
            <div className="p-3.5 rounded-xl bg-[#0b1326]/90 border border-[#222a3d] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#86948a] font-mono">
                <span>{isRu ? 'Пиковый день' : 'Peak Day'}</span>
                <Award className="w-4 h-4 text-[#e5a93c]" />
              </div>
              <div className="text-sm font-bold font-mono text-[#e5a93c] truncate">
                {metrics.peakDayName}
              </div>
              <div className="text-[10px] text-[#86948a]">
                {isRu ? 'максимум за период' : 'highest velocity'}
              </div>
            </div>

            {/* Metric 4: Overall Completion Rate */}
            <div className="p-3.5 rounded-xl bg-[#0b1326]/90 border border-[#222a3d] space-y-1">
              <div className="flex items-center justify-between text-xs text-[#86948a] font-mono">
                <span>{isRu ? 'Общий % успеха' : 'Completion Rate'}</span>
                <Zap className="w-4 h-4 text-[#ff70a6]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#ff70a6]">
                {metrics.completionRate}%
              </div>
              <div className="text-[10px] text-[#86948a]">
                {isRu ? 'доля решённых задач' : 'of all logged tasks'}
              </div>
            </div>
          </div>

          {/* Main Recharts Container */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffab" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222a3d" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#86948a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#222a3d' }}
                    interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
                  />
                  <YAxis
                    stroke="#86948a"
                    fontSize={10}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#222a3d' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completedCount"
                    stroke="#00ffab"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#areaGradient)"
                    dot={{ r: 3, fill: '#00ffab', stroke: '#0b1326', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#00e5ff', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222a3d" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#86948a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#222a3d' }}
                    interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
                  />
                  <YAxis
                    stroke="#86948a"
                    fontSize={10}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#222a3d' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="completedCount"
                    fill="#00ffab"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
