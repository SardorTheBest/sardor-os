import { Habit, ScheduledReminder, Task } from '../types';
import { db } from './db';
import { sound } from './sound';

const REMINDERS_LOCAL_STORAGE_KEY = 'zenith_scheduled_reminders_v1';
const NOTIFICATION_SOUND_KEY = 'zenith_notification_sound_enabled';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

class NotificationService {
  private activeTimers: Map<string, number> = new Map();
  private navigationListeners: Array<(targetView: string, targetId?: string) => void> = [];
  private permissionListeners: Array<(status: NotificationPermissionStatus) => void> = [];
  private soundEnabled: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem(NOTIFICATION_SOUND_KEY);
      this.soundEnabled = savedSound !== 'false';
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Listen for Service Worker messages (e.g., when notification is clicked)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data && data.type === 'NOTIFICATION_CLICKED') {
          this.handleNotificationClick(data.targetView || 'tasks', data.targetId);
        } else if (data && data.type === 'REMINDER_TRIGGERED') {
          // Play sound when SW triggers reminder while tab is open
          if (this.soundEnabled) {
            sound.playNotificationChime();
          }
        }
      });
    }

    // Check periodically for upcoming reminders in background interval
    setInterval(() => {
      this.checkDueReminders();
    }, 15000);
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermissionStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationPermissionStatus;
  }

  public isPermissionGranted(): boolean {
    return this.getPermissionStatus() === 'granted';
  }

  public async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      this.notifyPermissionChanged(result as NotificationPermissionStatus);
      return result as NotificationPermissionStatus;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return this.getPermissionStatus();
    }
  }

  public onPermissionChange(callback: (status: NotificationPermissionStatus) => void): () => void {
    this.permissionListeners.push(callback);
    return () => {
      this.permissionListeners = this.permissionListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyPermissionChanged(status: NotificationPermissionStatus) {
    this.permissionListeners.forEach((cb) => cb(status));
  }

  public onNotificationNavigate(callback: (targetView: string, targetId?: string) => void): () => void {
    this.navigationListeners.push(callback);
    return () => {
      this.navigationListeners = this.navigationListeners.filter((cb) => cb !== callback);
    };
  }

  public handleNotificationClick(targetView: string, targetId?: string) {
    sound.playClick();
    this.navigationListeners.forEach((cb) => cb(targetView, targetId));
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleSound(enabled?: boolean): boolean {
    this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
    localStorage.setItem(NOTIFICATION_SOUND_KEY, String(this.soundEnabled));
    if (this.soundEnabled) {
      sound.playNotificationChime();
    }
    return this.soundEnabled;
  }

  // --- Calculate Reminder Timestamp helper ---
  public calculateTaskReminderTime(task: Task): number | null {
    if (task.isCompleted || !task.reminderEnabled) return null;

    // Explicit custom datetime
    if (task.reminderDateTime) {
      const parsed = new Date(task.reminderDateTime).getTime();
      if (!isNaN(parsed) && parsed > Date.now() - 60000) {
        return parsed;
      }
    }

    // Calculate relative from task dueDate + startTime/dueTime
    if (task.dueDate) {
      const timeStr = task.startTime || task.dueTime || '09:00';
      const [h, m] = timeStr.split(':').map(Number);
      const [year, month, day] = task.dueDate.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day, h || 9, m || 0, 0);
      let targetTime = eventDate.getTime();

      if (task.reminderPreset === '15m') {
        targetTime -= 15 * 60 * 1000;
      } else if (task.reminderPreset === '1h') {
        targetTime -= 60 * 60 * 1000;
      } else if (task.reminderPreset === '1d') {
        targetTime -= 24 * 60 * 60 * 1000;
      }

      if (!isNaN(targetTime) && targetTime > Date.now() - 60000) {
        return targetTime;
      }
    }

    return null;
  }

  public calculateHabitReminderTime(habit: Habit): number | null {
    if (!habit.reminderEnabled || !habit.reminderTime) return null;
    const [h, m] = habit.reminderTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;

    const now = new Date();
    const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

    // If time for today has already passed, schedule for tomorrow
    if (scheduled.getTime() <= now.getTime() - 60000) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.getTime();
  }

  // --- Sync & Schedule Reminders ---
  public async syncAllReminders(tasks: Task[], habits: Habit[]) {
    try {
      const now = Date.now();
      const remindersToSchedule: ScheduledReminder[] = [];

      // 1. Tasks
      for (const task of tasks) {
        if (task.isCompleted || !task.reminderEnabled || task.reminderFired) continue;
        const scheduledTime = this.calculateTaskReminderTime(task);
        if (scheduledTime && scheduledTime > now - 30000) {
          remindersToSchedule.push({
            id: `rem-task-${task.id}`,
            targetId: task.id,
            type: 'task',
            title: `[Задача] ${task.title}`,
            body: task.description || (task.dueDate ? `Дедлайн: ${task.dueDate} ${task.dueTime || ''}` : 'Пора выполнить задачу'),
            scheduledTime,
            dueDateStr: task.dueDate,
            dueTimeStr: task.dueTime || task.startTime,
            fired: false,
            createdAt: new Date().toISOString(),
            tag: `task-${task.id}`,
          });
        }
      }

      // 2. Habits
      for (const habit of habits) {
        if (!habit.reminderEnabled || !habit.reminderTime) continue;
        const scheduledTime = this.calculateHabitReminderTime(habit);
        if (scheduledTime && scheduledTime > now - 30000) {
          remindersToSchedule.push({
            id: `rem-habit-${habit.id}`,
            targetId: habit.id,
            type: 'habit',
            title: `[Привычка] ${habit.name}`,
            body: `Текущий стрейк: ${habit.streak} дн. Пора зафиксировать прогресс`,
            scheduledTime,
            dueTimeStr: habit.reminderTime,
            fired: false,
            createdAt: new Date().toISOString(),
            tag: `habit-${habit.id}`,
          });
        }
      }

      // Persist to Dexie & localStorage
      await db.reminders.clear();
      if (remindersToSchedule.length > 0) {
        await db.reminders.bulkPut(remindersToSchedule);
      }
      localStorage.setItem(REMINDERS_LOCAL_STORAGE_KEY, JSON.stringify(remindersToSchedule));

      // Clear existing in-memory timers
      this.activeTimers.forEach((timerId) => clearTimeout(timerId));
      this.activeTimers.clear();

      // Schedule in-memory timers for active window session
      remindersToSchedule.forEach((rem) => {
        const delay = rem.scheduledTime - Date.now();
        if (delay <= 2147483647 && delay > 0) {
          const timerId = window.setTimeout(() => {
            this.triggerReminder(rem);
          }, delay);
          this.activeTimers.set(rem.id, timerId);
        }
      });

      // Notify Service Worker for background offline execution
      this.syncWithServiceWorker(remindersToSchedule);
    } catch (err) {
      console.warn('Error syncing reminders:', err);
    }
  }

  private syncWithServiceWorker(reminders: ScheduledReminder[]) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_REMINDERS',
        reminders,
      });
    }
  }

  private async checkDueReminders() {
    try {
      const now = Date.now();
      const allReminders = await db.reminders.toArray();
      const due = allReminders.filter((r) => !r.fired && r.scheduledTime <= now && r.scheduledTime >= now - 120000);

      for (const rem of due) {
        await this.triggerReminder(rem);
      }
    } catch (e) {
      // Ignore background check error
    }
  }

  public async triggerReminder(reminder: ScheduledReminder) {
    // Mark as fired in DB
    reminder.fired = true;
    await db.reminders.put(reminder);

    // Play notification sound
    if (this.soundEnabled) {
      sound.playNotificationChime();
    }

    // Trigger vibration on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Show native system push notification
    await this.showNativeNotification(reminder.title, {
      body: reminder.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: reminder.tag || reminder.id,
      data: {
        targetView: reminder.type === 'habit' ? 'habits' : 'tasks',
        targetId: reminder.targetId,
      },
    });
  }

  public async showNativeNotification(title: string, options: NotificationOptions = {}) {
    if (!this.isSupported() || this.getPermissionStatus() !== 'granted') {
      return;
    }

    try {
      // Try Service Worker registration first (standard for PWA & mobile background notifications)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.showNotification) {
          const swOptions: any = {
            ...options,
            icon: options.icon || '/icon-192.svg',
            badge: options.badge || '/icon-192.svg',
            vibrate: [200, 100, 200],
          };
          await registration.showNotification(title, swOptions);
          return;
        }
      }

      // Standard desktop fallback
      const notification = new Notification(title, {
        ...options,
        icon: options.icon || '/icon-192.svg',
      });

      notification.onclick = () => {
        window.focus();
        const data = (options as any).data;
        if (data && data.targetView) {
          this.handleNotificationClick(data.targetView, data.targetId);
        }
        notification.close();
      };
    } catch (err) {
      console.warn('Native notification failed to show:', err);
    }
  }

  // --- Test Notification ---
  public async sendTestNotification(): Promise<boolean> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    if (this.soundEnabled) {
      sound.playNotificationChime();
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    await this.showNativeNotification('[Zenith OS] Проверка уведомлений', {
      body: 'Звук и Push-уведомления успешно подключены и работают автономно в офлайн-режиме.',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'test-notification',
      data: { targetView: 'dashboard' },
    });

    return true;
  }

  public async getUpcomingReminders(): Promise<ScheduledReminder[]> {
    try {
      const reminders = await db.reminders.toArray();
      const now = Date.now();
      return reminders
        .filter((r) => !r.fired && r.scheduledTime >= now - 60000)
        .sort((a, b) => a.scheduledTime - b.scheduledTime);
    } catch {
      return [];
    }
  }
}

export const notificationService = new NotificationService();
