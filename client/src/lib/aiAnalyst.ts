import { AppState, Book, Habit, Task } from '../types';

export interface AIInsightReport {
  overallScore: number; // 0 - 100
  burnoutRisk: 'Low' | 'Moderate' | 'Elevated';
  habitStreakIndex: number; // %
  taskClearanceRate: number; // %
  deepWorkHoursEstimated: number;
  readingVelocityPagesPerDay: number;
  executiveBriefing: string;
  smartRecommendations: Array<{
    id: string;
    type: 'habit' | 'task' | 'reading' | 'focus';
    title: string;
    description: string;
    actionLabel?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  bookProjections: Array<{
    bookId: string;
    title: string;
    remainingPages: number;
    daysToFinish: number;
    targetCompletionDate: string;
  }>;
}

export class AIProductivityAnalyst {
  public generateReport(state: AppState): AIInsightReport {
    const today = new Date().toISOString().split('T')[0];

    // 1. Task metrics
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter((t) => t.isCompleted).length;
    const taskClearanceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const highPriorityPending = state.tasks.filter((t) => !t.isCompleted && t.priority === 'high').length;

    // 2. Habit metrics
    const habitCount = state.habits.length;
    const habitsDoneToday = state.habits.filter((h) => !!h.logs[today]).length;
    const avgStreak = habitCount > 0
      ? Math.round(state.habits.reduce((acc, h) => acc + h.streak, 0) / habitCount)
      : 0;
    const habitStreakIndex = habitCount > 0 ? Math.min(100, Math.round((avgStreak / 21) * 100)) : 0;

    // 3. Reading metrics & projections
    const activeBooks = state.books.filter((b) => b.status === 'reading');
    const estimatedPagesPerDay = 25; // baseline

    const bookProjections = activeBooks.map((book) => {
      const remaining = Math.max(0, book.totalPages - book.currentPage);
      const days = Math.ceil(remaining / estimatedPagesPerDay);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      return {
        bookId: book.id,
        title: book.title,
        remainingPages: remaining,
        daysToFinish: days,
        targetCompletionDate: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });

    // 4. Productivity Score & Burnout Risk
    let score = Math.round(taskClearanceRate * 0.45 + habitStreakIndex * 0.4 + (activeBooks.length > 0 ? 15 : 5));
    score = Math.min(100, Math.max(20, score));

    const burnoutRisk: 'Low' | 'Moderate' | 'Elevated' =
      highPriorityPending > 4 ? 'Elevated' : highPriorityPending >= 2 ? 'Moderate' : 'Low';

    // 5. Smart Recommendations
    const smartRecommendations: AIInsightReport['smartRecommendations'] = [];

    if (highPriorityPending > 0) {
      smartRecommendations.push({
        id: 'rec-1',
        type: 'task',
        title: 'Deep Work Block for High-Priority Tasks',
        description: `You have ${highPriorityPending} high-impact initiatives pending. Block a 90-minute uninterrupted window this morning to clear cognitive bottlenecks.`,
        actionLabel: 'Schedule Deep Work',
        priority: 'high',
      });
    }

    if (habitsDoneToday < habitCount) {
      const remainingHabits = state.habits.filter((h) => !h.logs[today]);
      if (remainingHabits.length > 0) {
        smartRecommendations.push({
          id: 'rec-2',
          type: 'habit',
          title: `Habit Momentum: ${remainingHabits[0].name}`,
          description: `Maintain your active ${remainingHabits[0].streak}-day streak by checking off "${remainingHabits[0].name}" before evening shutdown.`,
          actionLabel: 'Check In Habit',
          priority: 'medium',
        });
      }
    }

    if (activeBooks.length > 0) {
      const primaryBook = activeBooks[0];
      smartRecommendations.push({
        id: 'rec-3',
        type: 'reading',
        title: `Reading Sprint: ${primaryBook.title}`,
        description: `At current pace (25 pages/day), you will complete this book in ${bookProjections[0]?.daysToFinish || 10} days. A 20-minute session today adds 15 pages.`,
        actionLabel: 'Start Reading Timer',
        priority: 'low',
      });
    }

    const executiveBriefing = `Executive Summary for Sardor: Systems operating smoothly at ${score}% efficiency. With ${completedTasks} of ${totalTasks} tasks verified and an average habit continuity of ${avgStreak} days, your cognitive momentum is high. Focus your next cycle on clearing top-priority tasks before moving into deep reading mode.`;

    return {
      overallScore: score,
      burnoutRisk,
      habitStreakIndex,
      taskClearanceRate,
      deepWorkHoursEstimated: Math.round((completedTasks * 0.75 + habitsDoneToday * 0.25) * 10) / 10,
      readingVelocityPagesPerDay: estimatedPagesPerDay,
      executiveBriefing,
      smartRecommendations,
      bookProjections,
    };
  }

  public askAssistant(query: string, state: AppState): string {
    const q = query.toLowerCase().trim();

    if (q.includes('task') || q.includes('задач') || q.includes('делать') || q.includes('plan')) {
      const pending = state.tasks.filter((t) => !t.isCompleted);
      const high = pending.filter((t) => t.priority === 'high');
      if (high.length > 0) {
        return `🎯 **Рекомендация по задачам для Sardor:**\n\nСначала сосредоточьтесь на задачах с высоким приоритетом:\n${high.map((t) => `• **${t.title}** (${t.dueTime || 'сегодня'})`).join('\n')}\n\nОстальные ${pending.length - high.length} задач можно распределить на послеполуденные слоты.`;
      }
      return `У вас сейчас ${pending.length} активных задач. Рекомендую запустить режим фокуса (Focus Orbit) и закрыть 2 ключевые задачи подряд.`;
    }

    if (q.includes('book') || q.includes('книг') || q.includes('reading') || q.includes('чита')) {
      const active = state.books.find((b) => b.status === 'reading');
      if (active) {
        const left = active.totalPages - active.currentPage;
        const days = Math.ceil(left / 25);
        return `📖 **Анализ чтения (${active.title}):**\n\nВы прочитали ${active.currentPage} из ${active.totalPages} страниц (${Math.round((active.currentPage / active.totalPages) * 100)}%).\nОсталось ${left} страниц. При темпе 25 страниц в день книга будет завершена через **${days} дней**.\nРекомендую запустить 25-минутную сессию прямо сейчас в Book Vault.`;
      }
      return `В вашем Reading Vault ${state.books.length} книг. Добавьте новую книгу или возобновите чтение из библиотеки.`;
    }

    if (q.includes('habit') || q.includes('привыч') || q.includes('streak')) {
      const today = new Date().toISOString().split('T')[0];
      const done = state.habits.filter((h) => !!h.logs[today]).length;
      return `🔥 **Статус привычек:**\n\nСегодня выполнено **${done} из ${state.habits.length}** привычек.\nЛидер по стрейку: **${state.habits[0]?.name || 'Deep Focus'}** (${state.habits[0]?.streak || 0} дней подряд).\nНе прерывайте цепочку!`;
    }

    if (q.includes('burnout') || q.includes('выгоран') || q.includes('устал') || q.includes('stress')) {
      return `🧘 **Анализ когнитивной нагрузки:**\n\nРекомендуется сделать перерыв на 15 минут, выпить воды и выполнить вечернюю растяжку. Zenith OS оптимизирован для баланса продуктивности и восстановления.`;
    }

    // Default synthesized intelligence response
    return `⚡ **Zenith AI Intelligence Advisor (Sardor):**\n\nСистема функционирует в оптимальном режиме. Вся локальная база IndexedDB синхронизирована. Готов помочь спланировать тайм-блоки в календаре, проанализировать скорость чтения или структурировать заметки в базе знаний.`;
  }
}

export const aiAnalyst = new AIProductivityAnalyst();
