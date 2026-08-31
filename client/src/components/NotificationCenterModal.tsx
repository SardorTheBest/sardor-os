import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  Flame,
  Radio,
} from 'lucide-react';
import { AppState, ScheduledReminder } from '../types';
import { notificationService } from '../lib/notificationService';
import { sound } from '../lib/sound';
import { storage } from '../lib/storage';

interface NotificationCenterModalProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppState['activeView'], targetId?: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  state,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const isRu = state.language === 'ru';
  const [permission, setPermission] = useState(notificationService.getPermissionStatus());
  const [isSoundOn, setIsSoundOn] = useState(notificationService.isSoundEnabled());
  const [upcomingReminders, setUpcomingReminders] = useState<ScheduledReminder[]>([]);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(notificationService.getPermissionStatus());
      setIsSoundOn(notificationService.isSoundEnabled());
      loadUpcoming();
    }
  }, [isOpen]);

  const loadUpcoming = async () => {
    const list = await notificationService.getUpcomingReminders();
    setUpcomingReminders(list);
  };

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    sound.playClick();
    const res = await notificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      sound.playComplete();
      setTestStatus(isRu ? 'Разрешение получено!' : 'Permission granted!');
    }
  };

  const handleToggleSound = () => {
    const next = notificationService.toggleSound();
    setIsSoundOn(next);
  };

  const handleTestChime = () => {
    sound.playNotificationChime();
  };

  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    setTestStatus(null);
    sound.playClick();

    const ok = await notificationService.sendTestNotification();
    setIsSendingTest(false);

    if (ok) {
      setTestStatus(isRu ? 'Push-уведомление успешно отправлено!' : 'Push notification sent successfully!');
    } else {
      setTestStatus(isRu ? 'Пожалуйста, разрешите уведомления в браузере.' : 'Please allow notifications in browser.');
    }
    setPermission(notificationService.getPermissionStatus());
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#0b1326]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                {isRu ? 'Уведомления и Офлайн-напоминания' : 'Offline Notifications & Chimes'}
              </h3>
              <p className="text-xs text-[#86948a] font-sans">
                {isRu
                  ? 'Автономная работа 100% без внешних серверов и без интернета'
                  : '100% autonomous local alarms via Service Worker & Web Audio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86948a] hover:text-[#dae2fd] hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Permission Status Banner */}
          <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222a3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-[#86948a] uppercase tracking-wider mb-1">
                {isRu ? 'СТАТУС СИСТЕМНЫХ PUSH-УВЕДОМЛЕНИЙ' : 'SYSTEM PUSH PERMISSION'}
              </div>
              <div className="flex items-center gap-2">
                {permission === 'granted' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#00ffab]">
                    <CheckCircle2 className="w-4 h-4 text-[#00ffab]" />
                    {isRu ? 'Разрешено • Активно офлайн' : 'Granted • Offline Active'}
                  </span>
                ) : permission === 'denied' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#ffb4ab]">
                    <AlertCircle className="w-4 h-4 text-[#ffb4ab]" />
                    {isRu ? 'Заблокировано в браузере' : 'Denied in Browser Settings'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#e5a93c]">
                    <Radio className="w-4 h-4 text-[#e5a93c] animate-pulse" />
                    {isRu ? 'Ожидает подтверждения' : 'Permission Not Requested Yet'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#86948a] mt-1">
                {permission === 'granted'
                  ? isRu
                    ? 'Браузер покажет баннер даже если приложение свернуто.'
                    : 'Browser will show desktop notifications even when minimized.'
                  : isRu
                  ? 'Требуется разовое разрешение для показа уведомлений поверх окон.'
                  : 'Single-click grant required to display native desktop banners.'}
              </p>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-[#00ffab] hover:bg-[#00e5ff] text-[#003824] font-semibold text-xs font-mono rounded-xl transition-all shadow-md shadow-[#00ffab]/20 flex-shrink-0"
              >
                {isRu ? 'Включить Push' : 'Enable Push'}
              </button>
            )}
          </div>

          {/* Audio & Sound Feedback Card */}
          <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222a3d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#00e5ff]/10 text-[#00e5ff]">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#dae2fd]">
                    {isRu ? 'Звуковое оповещение (Web Audio Chime)' : 'Notification Audio Chime'}
                  </div>
                  <p className="text-[11px] text-[#86948a]">
                    {isRu
                      ? 'Чистый 4-тональный гармонический звон при срабатывании'
                      : '4-tone celestial harmonic audio upon reminder trigger'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestChime}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[#0b1326] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors"
                >
                  {isRu ? 'Звук' : 'Test Audio'}
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSoundOn}
                    onChange={handleToggleSound}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#222a3d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00ffab]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Test Push & Audio Trigger */}
          <div className="p-4 rounded-xl bg-[#131b2e] border border-[#222a3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#dae2fd] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00ffab]" />
                {isRu ? 'Проверка системы оповещений' : 'Test Alert & Push'}
              </div>
              <p className="text-[11px] text-[#86948a] mt-0.5">
                {isRu
                  ? 'Отправит тестовое Push-уведомление со звуковым звоном и вибрацией'
                  : 'Sends an instant native notification with audio chime'}
              </p>
              {testStatus && (
                <div className="text-[11px] font-mono text-[#00ffab] mt-1.5 animate-fadeIn">
                  {testStatus}
                </div>
              )}
            </div>

            <button
              onClick={handleSendTestPush}
              disabled={isSendingTest}
              className="px-4 py-2 bg-[#171f33] hover:bg-[#1f2a44] border border-[#00ffab]/40 text-[#00ffab] font-semibold text-xs font-mono rounded-xl transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <Bell className="w-4 h-4" />
              {isSendingTest ? (isRu ? 'Отправка...' : 'Sending...') : isRu ? 'Проверить Push' : 'Send Test'}
            </button>
          </div>

          {/* Scheduled Active Reminders Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#86948a] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00ffab]" />
                {isRu ? 'ЗАПЛАНИРОВАННЫЕ НАПОМИНАНИЯ' : 'SCHEDULED UPCOMING REMINDERS'} ({upcomingReminders.length})
              </div>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#131b2e]/40 border border-[#222a3d]/40 text-center space-y-2">
                <Bell className="w-6 h-6 text-[#86948a] mx-auto opacity-50" />
                <div className="text-xs text-[#86948a]">
                  {isRu
                    ? 'Нет активных запланированных напоминаний. Добавьте напоминание к любой задаче или привычке!'
                    : 'No scheduled reminders queued. Enable reminders on any task or habit!'}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {upcomingReminders.map((rem) => {
                  const dateStr = new Date(rem.scheduledTime).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={rem.id}
                      onClick={() => {
                        onClose();
                        onNavigate(rem.type === 'habit' ? 'habits' : 'tasks', rem.targetId);
                      }}
                      className="p-3 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] hover:border-[#00ffab]/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-lg flex-shrink-0 ${
                            rem.type === 'habit'
                              ? 'bg-[#e5a93c]/10 text-[#e5a93c]'
                              : 'bg-[#00ffab]/10 text-[#00ffab]'
                          }`}
                        >
                          {rem.type === 'habit' ? (
                            <Flame className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#dae2fd] truncate group-hover:text-[#00ffab]">
                            {rem.title}
                          </div>
                          <div className="text-[10px] text-[#86948a] truncate">
                            {rem.body}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-[#00ffab] bg-[#0b1326] px-2 py-1 rounded border border-[#222a3d] flex-shrink-0">
                        {dateStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b] flex items-center justify-between bg-[#0b1326]/80 text-[11px] text-[#86948a]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00ffab]" />
            <span>{isRu ? 'Service Worker PWA активен' : 'Service Worker PWA active'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#171f33] hover:bg-[#1e293b] text-xs font-mono text-[#dae2fd] transition-colors"
          >
            {isRu ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
