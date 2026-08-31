import Dexie, { Table } from 'dexie';
import { AIChatThread, AppState, Book, Habit, Note, Project, ReadingSession, ScheduledReminder, Tag, Task, UserProfile } from '../types';

export interface SyncRecord {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export class ZenithDatabase extends Dexie {
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;
  habits!: Table<Habit, string>;
  books!: Table<Book, string>;
  readingSessions!: Table<ReadingSession, string>;
  notes!: Table<Note, string>;
  projects!: Table<Project, string>;
  aiThreads!: Table<AIChatThread, string>;
  reminders!: Table<ScheduledReminder, string>;
  userProfile!: Table<UserProfile & { id: string }, string>;
  syncQueue!: Table<SyncRecord, string>;

  constructor() {
    super('ZenithPersonalOS_DB');
    this.version(3).stores({
      tasks: 'id, dueDate, dueTime, priority, tagId, isCompleted, updatedAt, reminderEnabled, reminderDateTime',
      tags: 'id, name, color, updatedAt',
      habits: 'id, name, category, frequency, streak, reminderEnabled',
      books: 'id, title, author, status, rating',
      readingSessions: 'id, bookId, timestamp',
      notes: 'id, title, category, pinned, updatedAt',
      projects: 'id, title, status, quarter, progress',
      aiThreads: 'id, title, isPinned, createdAt, updatedAt',
      reminders: 'id, targetId, type, scheduledTime, fired',
      userProfile: 'id, name, focusMode',
      syncQueue: 'id, table, action, timestamp',
    });
  }
}

export const db = new ZenithDatabase();
