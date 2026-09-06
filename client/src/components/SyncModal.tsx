import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Download,
  Upload,
  Database,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  ArrowDownCircle,
  Trash2,
  Code2,
} from 'lucide-react';
import { AppState } from '../types';
import { syncService, SyncState, ZENITH_TABLE_SQL } from '../lib/supabaseSync';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';

interface SyncModalProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ state, isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState<boolean>(false);
  const [config, setConfig] = useState(syncService.getConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe((s, time, err, tableMissing) => {
      setSyncState(s);
      setLastSyncTime(time);
      setErrorDetail(err);
      setIsTableMissing(tableMissing);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    syncService.saveConfig(config);
    sound.playClick();
    setTimeout(() => {
      setIsSaving(false);
      handleManualSync();
    }, 300);
  };

  const handleTestConnection = async () => {
    sound.playClick();
    setIsTesting(true);
    setSyncMessage('Проверка подключения к Supabase...');
    const res = await syncService.testConnection();
    setIsTesting(false);
    setSyncMessage(res.message);
    if (res.success) {
      sound.playComplete();
    } else {
      sound.playPop();
    }
  };

  const handleManualSync = async () => {
    sound.playClick();
    setSyncMessage('Выполняется синхронизация...');
    const res = await syncService.syncNow(state);
    setSyncMessage(res.message);
    if (res.success) {
      sound.playComplete();
    } else {
      sound.playPop();
    }
  };

  const handlePullRemoteState = async () => {
    sound.playClick();
    setIsPulling(true);
    setSyncMessage('Загрузка данных из облака Supabase...');
    const res = await syncService.pullRemoteState();
    setIsPulling(false);
    if (res.success && res.data) {
      storage.importState(res.data);
      setSyncMessage('Данные успешно загружены и применены!');
      sound.playComplete();
    } else {
      setSyncMessage(res.message);
      sound.playPop();
    }
  };

  const handleClearSupabase = () => {
    sound.playPop();
    syncService.clearConfig();
    setConfig({ url: '', anonKey: '', autoSync: true });
    setSyncMessage('Настройки Supabase сброшены. Приложение работает в чистом офлайн-режиме (IndexedDB).');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(ZENITH_TABLE_SQL);
    setCopiedSql(true);
    sound.playClick();
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadBackup = () => {
    sound.playPop();
    syncService.downloadBackupFile(state);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.data && parsed.data.tasks) {
          storage.importState(parsed.data);
          setSyncMessage('Данные успешно восстановлены из резервной копии!');
          sound.playComplete();
        } else {
          setSyncMessage('Неверный формат резервной копии');
        }
      } catch (err) {
        setSyncMessage('Ошибка чтения файла бэкапа');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="w-full max-w-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden p-6 space-y-5 max-h-[92vh] overflow-y-auto animate-modal-float">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00ffab]/10 text-[#00ffab] flex items-center justify-center border border-[#00ffab]/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Синхронизация и Данные (Offline-First)
              </h3>
              <p className="text-xs text-[#86948a] font-mono">
                Локальный движок IndexedDB (Dexie.js) + Supabase Cloud
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#86948a] hover:text-[#dae2fd]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Sync Status Badge */}
        <div className="p-4 rounded-xl bg-[#0b1326] border border-[#222a3d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                syncState === 'synced'
                  ? 'bg-[#00ffab] shadow-[0_0_8px_#00ffab]'
                  : syncState === 'syncing'
                  ? 'bg-[#00e5ff] animate-ping'
                  : syncState === 'offline'
                  ? 'bg-[#e5a93c]'
                  : 'bg-[#ffb4ab]'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-[#dae2fd] font-display">
                {syncState === 'synced' && '🟢 Синхронизировано (Локально & Облако)'}
                {syncState === 'syncing' && '🔵 Синхронизация данных...'}
                {syncState === 'offline' && '🟡 Офлайн режим (IndexedDB активен)'}
                {syncState === 'error' && (isTableMissing ? '⚠️ Требуется создание таблицы в Supabase' : '🔴 Ошибка соединения')}
              </div>
              <div className="text-[11px] font-mono text-[#86948a]">
                Последняя синхронизация: {lastSyncTime || 'Только что'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.url && (
              <button
                type="button"
                onClick={handlePullRemoteState}
                disabled={isPulling}
                title="Загрузить снимок из Supabase"
                className="px-2.5 py-1.5 bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] rounded-xl text-xs font-mono text-[#89ceff] flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownCircle className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Загрузить</span>
              </button>
            )}

            <button
              onClick={handleManualSync}
              className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] rounded-xl text-xs font-mono text-[#dae2fd] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin text-[#00e5ff]' : ''}`} />
              Синхронизировать
            </button>
          </div>
        </div>

        {/* Sync message alert */}
        {syncMessage && (
          <div className={`p-3 rounded-xl border text-xs font-mono ${
            syncMessage.includes('успешно') || syncMessage.includes('готово')
              ? 'bg-[#00ffab]/10 border-[#00ffab]/30 text-[#00ffab]'
              : syncMessage.includes('отсутствует') || syncMessage.includes('Ошибка') || syncMessage.includes('не найдена')
              ? 'bg-[#ffb4ab]/10 border-[#ffb4ab]/30 text-[#ffb4ab]'
              : 'bg-[#171f33] border-[#222a3d] text-[#00e5ff]'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Table Missing Resolution Banner */}
        {(isTableMissing || (errorDetail && errorDetail.includes('zenith_user_state'))) && (
          <div className="p-4 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#ffb4ab] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#ffb4ab]">
                  В вашей базе данных Supabase ещё не создана таблица `zenith_user_state`
                </div>
                <div className="text-[11px] text-[#dae2fd] leading-relaxed">
                  PostgREST не может найти таблицу. Чтобы создать её за 10 секунд, скопируйте готовый SQL-запрос и запустите в панели Supabase.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-[#00ffab] text-[#003824] font-mono text-xs font-bold flex items-center gap-1.5 hover:bg-[#00ffab]/90 transition-all shadow-md shadow-[#00ffab]/20"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'SQL Скопирован!' : 'Скопировать SQL для Supabase'}
              </button>

              <button
                type="button"
                onClick={() => setShowSqlCode(!showSqlCode)}
                className="px-3 py-1.5 rounded-lg bg-[#171f33] border border-[#222a3d] text-xs font-mono text-[#dae2fd] hover:bg-[#222a3d] flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5 text-[#00e5ff]" />
                {showSqlCode ? 'Скрыть код' : 'Показать SQL'}
              </button>
            </div>

            {showSqlCode && (
              <div className="relative mt-2">
                <pre className="p-3 rounded-lg bg-[#060e20] border border-[#222a3d] text-[11px] font-mono text-[#00ffab] overflow-x-auto leading-tight">
                  {ZENITH_TABLE_SQL}
                </pre>
              </div>
            )}

            <div className="text-[11px] text-[#86948a] font-mono">
              Инструкция: <strong>Supabase Dashboard</strong> → выберите проект → вкладка <strong>SQL Editor</strong> → вставьте и нажмите <strong>Run</strong>.
            </div>
          </div>
        )}

        {/* Local Storage Health */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-[#86948a] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#00e5ff]" />
            ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (INDEXEDDB / DEXIE)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-center">
              <div className="text-sm font-bold text-[#00ffab] font-mono">{state.tasks.length}</div>
              <div className="text-[9px] font-mono text-[#86948a]">Задач</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-center">
              <div className="text-sm font-bold text-[#e5a93c] font-mono">{state.habits.length}</div>
              <div className="text-[9px] font-mono text-[#86948a]">Привычек</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-center">
              <div className="text-sm font-bold text-[#00e5ff] font-mono">{state.books.length}</div>
              <div className="text-[9px] font-mono text-[#86948a]">Книг</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-center">
              <div className="text-sm font-bold text-[#d0bcff] font-mono">{state.notes.length}</div>
              <div className="text-[9px] font-mono text-[#86948a]">Заметок</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-center">
              <div className="text-sm font-bold text-[#89ceff] font-mono">{state.projects.length}</div>
              <div className="text-[9px] font-mono text-[#86948a]">Проектов</div>
            </div>
          </div>
        </div>

        {/* Supabase Connection Form */}
        <form onSubmit={handleSaveConfig} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-[#86948a] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00ffab]" />
              ПАРАМЕТРЫ SUPABASE (ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ)
            </div>
            {config.url && (
              <button
                type="button"
                onClick={handleClearSupabase}
                className="text-[10px] font-mono text-[#ffb4ab] hover:underline flex items-center gap-1"
                title="Отключить Supabase и остаться на IndexedDB"
              >
                <Trash2 className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#86948a] mb-1">SUPABASE URL</label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-project.supabase.co"
              className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00e5ff] font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#86948a] mb-1">SUPABASE ANON KEY</label>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJh..."
              className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00e5ff] font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config.url}
              className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] border border-[#222a3d] text-xs font-mono text-[#00e5ff] rounded-xl transition-colors disabled:opacity-50"
            >
              {isTesting ? 'Проверка...' : '⚡ Тест соединения'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#00ffab] text-[#003824] font-mono text-xs font-bold rounded-xl hover:bg-[#00ffab]/90 transition-all shadow-md shadow-[#00ffab]/20"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить и Синхронизировать'}
            </button>
          </div>
        </form>

        {/* Backup & Export Buttons */}
        <div className="pt-3 border-t border-[#222a3d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-1.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] text-xs font-mono text-[#dae2fd] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#00ffab]" />
              Экспорт JSON
            </button>

            <label className="px-3 py-1.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] border border-[#222a3d] text-xs font-mono text-[#dae2fd] flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#00e5ff]" />
              Импорт JSON
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#171f33] text-xs font-mono text-[#dae2fd] hover:bg-[#222a3d]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

