import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import { AppState } from '../types';

export type SyncState = 'synced' | 'offline' | 'syncing' | 'error';

export const ZENITH_TABLE_SQL = `-- SQL для создания таблицы синхронизации Zenith Personal OS в Supabase
-- Выполните этот скрипт в панели Supabase: SQL Editor -> New query -> Run

CREATE TABLE IF NOT EXISTS public.zenith_user_state (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Включение Row Level Security (RLS)
ALTER TABLE public.zenith_user_state ENABLE ROW LEVEL SECURITY;

-- Создание политики открытого доступа для anon/authenticated клиентов
DROP POLICY IF EXISTS "Zenith OS full access" ON public.zenith_user_state;
CREATE POLICY "Zenith OS full access" 
  ON public.zenith_user_state 
  FOR ALL 
  TO public, anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- Индекс по дате для быстродействия
CREATE INDEX IF NOT EXISTS idx_zenith_user_state_updated ON public.zenith_user_state(updated_at DESC);
`;

interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

class SupabaseSyncService {
  private client: SupabaseClient | null = null;
  private syncState: SyncState = 'offline';
  private lastSyncTime: string | null = null;
  private lastErrorDetail: string | null = null;
  private isTableMissing: boolean = false;
  private listeners: Array<(state: SyncState, lastTime: string | null, errorDetail: string | null, isTableMissing: boolean) => void> = [];

  constructor() {
    this.lastSyncTime = localStorage.getItem('zenith_last_sync');
    this.initClient();

    // Listen to online/offline network events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      this.syncState = navigator.onLine ? (this.client ? 'synced' : 'offline') : 'offline';
    }
  }

  public getConfig(): SupabaseConfig {
    const savedUrl = localStorage.getItem('zenith_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
    const savedKey = localStorage.getItem('zenith_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const autoSync = localStorage.getItem('zenith_supabase_autosync') !== 'false';
    return { url: savedUrl, anonKey: savedKey, autoSync };
  }

  public saveConfig(config: Partial<SupabaseConfig>) {
    if (config.url !== undefined) localStorage.setItem('zenith_supabase_url', config.url.trim());
    if (config.anonKey !== undefined) localStorage.setItem('zenith_supabase_key', config.anonKey.trim());
    if (config.autoSync !== undefined) localStorage.setItem('zenith_supabase_autosync', String(config.autoSync));
    this.initClient();
  }

  public clearConfig() {
    localStorage.removeItem('zenith_supabase_url');
    localStorage.removeItem('zenith_supabase_key');
    localStorage.removeItem('zenith_supabase_autosync');
    this.client = null;
    this.isTableMissing = false;
    this.lastErrorDetail = null;
    this.setSyncState(navigator.onLine ? 'synced' : 'offline');
  }

  public initClient() {
    const { url, anonKey } = this.getConfig();
    if (url && anonKey) {
      try {
        this.client = createClient(url, anonKey);
        this.setSyncState(navigator.onLine ? 'synced' : 'offline');
      } catch (err: any) {
        console.warn('Supabase initialization failed:', err);
        this.client = null;
        this.lastErrorDetail = err?.message || 'Неверный URL или ключ Supabase';
        this.setSyncState('error');
      }
    } else {
      this.client = null;
      this.lastErrorDetail = null;
      this.isTableMissing = false;
      this.setSyncState(navigator.onLine ? 'synced' : 'offline');
    }
  }

  private setSyncState(state: SyncState, errorDetail: string | null = null, tableMissing: boolean = false) {
    this.syncState = state;
    if (errorDetail !== undefined) this.lastErrorDetail = errorDetail;
    this.isTableMissing = tableMissing;
    this.notify();
  }

  public subscribe(fn: (state: SyncState, lastTime: string | null, errorDetail: string | null, isTableMissing: boolean) => void) {
    this.listeners.push(fn);
    fn(this.syncState, this.lastSyncTime, this.lastErrorDetail, this.isTableMissing);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.syncState, this.lastSyncTime, this.lastErrorDetail, this.isTableMissing));
  }

  private handleNetworkChange(isOnline: boolean) {
    if (!isOnline) {
      this.setSyncState('offline');
    } else {
      if (this.client) {
        this.syncNow();
      } else {
        this.setSyncState('synced');
      }
    }
  }

  /**
   * Tests Supabase connectivity and checks if zenith_user_state table exists.
   */
  public async testConnection(): Promise<{ success: boolean; message: string; isTableMissing?: boolean }> {
    const { url, anonKey } = this.getConfig();
    if (!url || !anonKey) {
      return { success: true, message: 'Локальный режим активен (IndexedDB/Dexie без облака).' };
    }

    if (!this.client) {
      this.initClient();
    }

    if (!this.client) {
      return { success: false, message: 'Не удалось инициализировать клиент Supabase.' };
    }

    try {
      // Test query table
      const { data, error } = await this.client
        .from('zenith_user_state')
        .select('user_id, updated_at')
        .limit(1);

      if (error) {
        const errMsg = error.message || '';
        const isMissing =
          errMsg.includes('zenith_user_state') ||
          errMsg.includes('schema cache') ||
          errMsg.includes('relation') ||
          (error as any).code === 'PGRST204' ||
          (error as any).code === 'PGRST200' ||
          (error as any).code === '42P01';

        if (isMissing) {
          this.setSyncState('error', errMsg, true);
          return {
            success: false,
            isTableMissing: true,
            message: "Таблица 'zenith_user_state' отсутствует в вашей базе Supabase. Скопируйте и выполните SQL-скрипт ниже в Supabase SQL Editor.",
          };
        }

        this.setSyncState('error', errMsg, false);
        return { success: false, message: `Ошибка Supabase: ${errMsg}` };
      }

      this.isTableMissing = false;
      this.lastErrorDetail = null;
      this.setSyncState('synced');
      return { success: true, message: 'Подключение к Supabase успешно! Таблица найдена и готова к работе.' };
    } catch (err: any) {
      this.setSyncState('error', err.message, false);
      return { success: false, message: `Ошибка соединения: ${err.message}` };
    }
  }

  /**
   * Pulls latest state snapshot from Supabase if available.
   */
  public async pullRemoteState(): Promise<{ success: boolean; data?: AppState; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Supabase не настроен' };
    }

    try {
      const { data, error } = await this.client
        .from('zenith_user_state')
        .select('payload, updated_at')
        .eq('user_id', 'sardor_personal')
        .maybeSingle();

      if (error) {
        const isMissing =
          error.message?.includes('zenith_user_state') ||
          error.message?.includes('schema cache') ||
          (error as any).code === 'PGRST204';
        if (isMissing) {
          this.setSyncState('error', error.message, true);
          return {
            success: false,
            message: "Таблица 'zenith_user_state' не создана в Supabase. Создайте её через SQL Editor.",
          };
        }
        throw error;
      }

      if (data && data.payload) {
        this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('zenith_last_sync', this.lastSyncTime);
        this.setSyncState('synced');
        return { success: true, data: data.payload as AppState, message: 'Данные успешно загружены из Supabase' };
      }

      return { success: true, message: 'Облачная копия пуста. Будет загружено текущее локальное состояние.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Ошибка загрузки данных из облака' };
    }
  }

  public async syncNow(currentState?: AppState): Promise<{ success: boolean; message: string; isTableMissing?: boolean }> {
    if (!navigator.onLine) {
      this.setSyncState('offline');
      return { success: false, message: 'Офлайн режим (нет подключения к интернету)' };
    }

    if (!this.client) {
      // Local Dexie persistence is active
      this.setSyncState('synced');
      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem('zenith_last_sync', this.lastSyncTime);
      this.notify();
      return { success: true, message: 'Локальная база IndexedDB обновлена' };
    }

    this.setSyncState('syncing');

    try {
      if (currentState) {
        // Upsert state snapshot to Supabase 'zenith_user_state' table
        const { error } = await this.client.from('zenith_user_state').upsert(
          {
            user_id: 'sardor_personal',
            payload: currentState,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          const errMsg = error.message || '';
          const isMissing =
            errMsg.includes('zenith_user_state') ||
            errMsg.includes('schema cache') ||
            errMsg.includes('relation') ||
            (error as any).code === 'PGRST204' ||
            (error as any).code === 'PGRST200' ||
            (error as any).code === '42P01';

          if (isMissing) {
            this.setSyncState('error', errMsg, true);
            return {
              success: false,
              isTableMissing: true,
              message: "Таблица 'zenith_user_state' отсутствует в Supabase. Создайте её в SQL Editor (нажмите 'Скопировать SQL' ниже).",
            };
          }

          throw error;
        }
      }

      this.isTableMissing = false;
      this.lastErrorDetail = null;
      this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem('zenith_last_sync', this.lastSyncTime);
      this.setSyncState('synced');
      return { success: true, message: 'Синхронизация с Supabase выполнена успешно' };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      const errMsg = err?.message || 'Ошибка синхронизации с облаком';
      const isMissing =
        errMsg.includes('zenith_user_state') ||
        errMsg.includes('schema cache') ||
        errMsg.includes('relation');

      this.setSyncState('error', errMsg, isMissing);
      return {
        success: false,
        isTableMissing: isMissing,
        message: isMissing
          ? "Таблица 'zenith_user_state' отсутствует в вашей схеме Supabase. Скопируйте SQL скрипт создания ниже."
          : errMsg,
      };
    }
  }

  public queueRecord(tableName: string, actionOrRecord?: any, record?: any) {
    if (this.client && this.getConfig().autoSync) {
      // Trigger background sync if connected
      this.syncNow().catch(() => {});
    }
  }

  public exportBackupJSON(state: AppState): string {
    return JSON.stringify(
      {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        user: 'Sardor',
        data: state,
      },
      null,
      2
    );
  }

  public downloadBackupFile(state: AppState) {
    const json = this.exportBackupJSON(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenith_backup_sardor_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const syncService = new SupabaseSyncService();
