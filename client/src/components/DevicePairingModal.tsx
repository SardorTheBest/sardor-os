import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Laptop,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  X,
  Radio,
  Send,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Link2,
  Activity,
  ListTodo,
  Plus,
  Trash2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  Tag as TagIcon,
  Layers,
  CircleDot,
} from 'lucide-react';
import {
  companionBridge,
  CompanionConnectionStatus,
  CompanionDeviceInfo,
  CompanionTransport,
  PeerLogEntry,
} from '../lib/companionBridge';
import { sound } from '../lib/sound';
import { storage } from '../lib/storage';
import { AppState, Priority, Task } from '../types';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStandBy?: () => void;
  state?: AppState;
}

type ModalTab = 'pairing' | 'task_control' | 'focus_remote' | 'diagnostics';

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  onClose,
  onOpenStandBy,
  state: propState,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('pairing');
  const [sessionId, setSessionId] = useState<string>(companionBridge.getSessionId());
  const [peerId, setPeerId] = useState<string>(companionBridge.getPeerId());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [status, setStatus] = useState<CompanionConnectionStatus>(companionBridge.getStatus());
  const [pairedDevice, setPairedDevice] = useState<CompanionDeviceInfo | null>(
    companionBridge.getPairedDevice()
  );
  const [transport, setTransport] = useState<CompanionTransport>(companionBridge.getTransport());
  const [latency, setLatency] = useState<number>(companionBridge.getLatency());
  const [logs, setLogs] = useState<PeerLogEntry[]>(companionBridge.getLogs());
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPeerId, setCopiedPeerId] = useState<boolean>(false);

  // Quick remote task form state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [taskFilter, setTaskFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Quick remote note form state
  const [remoteNoteText, setRemoteNoteText] = useState<string>('');
  const [noteSentToast, setNoteSentToast] = useState<boolean>(false);

  // Local state fallback if propState not provided
  const [localTasks, setLocalTasks] = useState<Task[]>(
    propState?.tasks || storage.getState().tasks
  );

  // Sync state tasks
  useEffect(() => {
    if (propState?.tasks) {
      setLocalTasks(propState.tasks);
    } else {
      const unsub = storage.subscribe((s) => setLocalTasks(s.tasks));
      return () => unsub();
    }
  }, [propState?.tasks]);

  // Generate QR Code when modal opens or session changes
  useEffect(() => {
    if (!isOpen) return;

    const pairUrl = companionBridge.getPairingUrl();
    setSessionId(companionBridge.getSessionId());
    setPeerId(companionBridge.getPeerId());

    QRCode.toDataURL(pairUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#00ffab',
        light: '#0b1326',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, sessionId]);

  // Subscribe to companion status & logs
  useEffect(() => {
    const unsubStatus = companionBridge.onStatusChange((newStatus, device, trans, lat) => {
      setStatus(newStatus);
      setPairedDevice(device);
      setTransport(trans);
      setLatency(lat);
    });

    const unsubLogs = companionBridge.onLogs((newLogs) => {
      setLogs([...newLogs]);
    });

    return () => {
      unsubStatus();
      unsubLogs();
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyPairingLink = () => {
    sound.playClick();
    const url = companionBridge.getPairingUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPeerId = () => {
    sound.playClick();
    navigator.clipboard.writeText(peerId);
    setCopiedPeerId(true);
    setTimeout(() => setCopiedPeerId(false), 2000);
  };

  const handleRegenerate = () => {
    sound.playPop();
    const newSession = companionBridge.regenerateSession();
    setSessionId(newSession);
    setPeerId(companionBridge.getPeerId());
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    sound.playClick();
    companionBridge.connectToSession(manualCodeInput.trim());
    setManualCodeInput('');
  };

  const handleRemoteToggleTask = (taskId: string) => {
    sound.playClick();
    // 1. Send remote WebRTC command
    companionBridge.remoteToggleTask(taskId);
    // 2. Also toggle locally if running on host
    storage.toggleTask(taskId);
  };

  const handleRemoteCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    sound.playPop();

    const title = newTaskTitle.trim();
    // 1. Dispatch over WebRTC
    companionBridge.remoteCreateTask({
      title,
      priority: newTaskPriority,
      dueDate: new Date().toISOString().split('T')[0],
    });

    // 2. Add to local storage
    storage.addTask({
      title,
      priority: newTaskPriority,
      dueDate: new Date().toISOString().split('T')[0],
      isCompleted: false,
    });

    setNewTaskTitle('');
  };

  const handleRemoteDeleteTask = (taskId: string) => {
    sound.playClick();
    companionBridge.remoteDeleteTask(taskId);
    storage.deleteTask(taskId);
  };

  const handleRemoteTriggerTimer = () => {
    sound.playClick();
    companionBridge.sendControlAction('TOGGLE_TIMER');
  };

  const handleRemoteResetTimer = () => {
    sound.playPop();
    companionBridge.sendControlAction('RESET_TIMER');
  };

  const handleRemoteCompleteActiveTask = () => {
    sound.playComplete();
    companionBridge.sendControlAction('COMPLETE_TASK');
  };

  const handleSendRemoteNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteNoteText.trim()) return;

    sound.playPop();
    const text = remoteNoteText.trim();
    companionBridge.sendNoteDrop('P2P AirDrop Заметка', text, ['AirDrop', 'P2P']);
    storage.addNote({
      title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
      content: text,
      category: 'P2P AirDrop',
      tags: ['AirDrop', 'P2P'],
      pinned: false,
    });

    setRemoteNoteText('');
    setNoteSentToast(true);
    setTimeout(() => setNoteSentToast(false), 2500);
  };

  // Filter tasks for task control view
  const filteredTasks = localTasks.filter((t) => {
    if (taskFilter === 'pending') return !t.isCompleted;
    if (taskFilter === 'completed') return t.isCompleted;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop">
      <div className="relative w-full max-w-2xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-float">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#111214]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab] shadow-lg shadow-[#00ffab]/10">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#dae2fd] font-display">
                  Zenith P2P Link & Remote Control
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> PeerJS WebRTC
                </span>
              </div>
              <p className="text-xs text-[#86948a] font-sans mt-0.5">
                Прямой защищенный P2P канал между ПК и смартфоном для удаленного контроля задач
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-[#86948a] hover:text-[#dae2fd] hover:bg-[#172238] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 border-b border-[#1c283f] bg-[#0d1526]/50 overflow-x-auto">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('pairing');
            }}
            className={`pb-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'pairing'
                ? 'border-[#00ffab] text-[#00ffab]'
                : 'border-transparent text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Сопряжение (QR)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('task_control');
            }}
            className={`pb-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap relative ${
              activeTab === 'task_control'
                ? 'border-[#00ffab] text-[#00ffab]'
                : 'border-transparent text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Пульт задач</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#1c283f] text-[10px] text-[#dae2fd]">
              {localTasks.filter((t) => !t.isCompleted).length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('focus_remote');
            }}
            className={`pb-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'focus_remote'
                ? 'border-[#00ffab] text-[#00ffab]'
                : 'border-transparent text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Таймер & Фокус</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('diagnostics');
            }}
            className={`pb-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-[#00ffab] text-[#00ffab]'
                : 'border-transparent text-[#86948a] hover:text-[#dae2fd]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Телеметрия P2P</span>
            {latency > 0 && (
              <span className="text-[10px] font-mono text-[#00ffab]">{latency}ms</span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Live Peer Connection Bar */}
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e2a42] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                  status === 'connected'
                    ? 'bg-[#00ffab] shadow-lg shadow-[#00ffab]/50 animate-pulse'
                    : status === 'connecting' || status === 'pairing'
                    ? 'bg-[#e5a93c] animate-ping'
                    : 'bg-[#64748b]'
                }`}
              />
              <div>
                <div className="text-xs font-mono font-bold text-[#dae2fd] flex items-center gap-2">
                  {status === 'connected' ? (
                    <>
                      <span>WebRTC P2P Активен</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00ffab]/15 text-[#00ffab] border border-[#00ffab]/30">
                        {pairedDevice?.name || 'Второе устройство'}
                      </span>
                    </>
                  ) : status === 'connecting' ? (
                    'Установка P2P соединения...'
                  ) : (
                    'Ожидание подключения смартфона'
                  )}
                </div>
                <div className="text-[11px] text-[#86948a] font-mono flex items-center gap-2 mt-0.5">
                  <span>Сессия: <strong className="text-[#00ffab]">{sessionId}</strong></span>
                  {latency > 0 && (
                    <span>• Задержка: <strong className="text-[#00e5ff]">{latency} ms</strong></span>
                  )}
                  <span>• Транспорт: <strong className="text-[#d0bcff]">{transport.toUpperCase()}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleRegenerate}
                title="Сгенерировать новый код сессии"
                className="px-2.5 py-1.5 rounded-lg bg-[#172238] hover:bg-[#202d4a] text-[#86948a] hover:text-[#dae2fd] text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сбросить код</span>
              </button>
            </div>
          </div>

          {/* TAB 1: PAIRING & QR */}
          {activeTab === 'pairing' && (
            <div className="space-y-5">
              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#080d1a] border border-[#1e2a42] space-y-4">
                {qrDataUrl ? (
                  <div className="p-3 bg-[#0b1326] border-2 border-[#00ffab]/40 rounded-2xl shadow-xl shadow-[#00ffab]/5">
                    <img
                      src={qrDataUrl}
                      alt="Pairing QR Code"
                      className="w-44 h-44 sm:w-52 sm:h-52 rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-2xl bg-[#131b2e] animate-pulse flex items-center justify-center text-xs font-mono text-[#86948a]">
                    Генерация WebRTC QR...
                  </div>
                )}

                <div className="text-center space-y-1 max-w-sm">
                  <p className="text-xs font-bold text-[#dae2fd]">
                    Отсканируйте QR-код камерой смартфона
                  </p>
                  <p className="text-[11px] text-[#86948a]">
                    Откроется мобильный экран Zenith OS, который сразу подключится к текущему ПК напрямую через WebRTC DataChannel.
                  </p>
                </div>
              </div>

              {/* Manual Connect & Link Copy */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyPairingLink}
                    className="py-2.5 px-4 rounded-xl bg-[#131d30] hover:bg-[#1a2740] border border-[#22304d] text-xs font-mono text-[#dae2fd] flex items-center justify-center gap-2 transition-colors"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-[#00ffab]" />
                    ) : (
                      <Link2 className="w-4 h-4 text-[#00ffab]" />
                    )}
                    <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать P2P ссылку'}</span>
                  </button>

                  <button
                    onClick={handleCopyPeerId}
                    className="py-2.5 px-4 rounded-xl bg-[#131d30] hover:bg-[#1a2740] border border-[#22304d] text-xs font-mono text-[#dae2fd] flex items-center justify-center gap-2 transition-colors"
                  >
                    {copiedPeerId ? (
                      <Check className="w-4 h-4 text-[#00e5ff]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#00e5ff]" />
                    )}
                    <span>{copiedPeerId ? 'Peer ID скопирован' : 'Скопировать Peer ID'}</span>
                  </button>
                </div>

                {/* Enter Code From Another Device */}
                <form onSubmit={handleManualConnect} className="flex gap-2">
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                    placeholder="Или введите 6-значный код сессии с другого ПК/телефона..."
                    maxLength={10}
                    className="flex-1 bg-[#090f1d] border border-[#1e2a42] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#dae2fd] placeholder-[#55647a] focus:outline-none focus:border-[#00ffab]"
                  />
                  <button
                    type="submit"
                    disabled={!manualCodeInput.trim()}
                    className="px-4 py-2.5 bg-[#00ffab] hover:bg-[#00ffab]/90 disabled:opacity-40 text-[#003824] font-bold text-xs font-mono rounded-xl transition-all"
                  >
                    Связать P2P
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: REMOTE TASK CONTROL */}
          {activeTab === 'task_control' && (
            <div className="space-y-4">
              {/* Quick Add Task Remote Form */}
              <form
                onSubmit={handleRemoteCreateTask}
                className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e2a42] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#00ffab] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Быстро добавить задачу на удаленный ПК
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`px-2 py-0.5 rounded capitalize transition-all ${
                          newTaskPriority === p
                            ? 'bg-[#00ffab] text-[#003824] font-bold'
                            : 'bg-[#172238] text-[#86948a] hover:text-[#dae2fd]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Название задачи для мгновенной отправки по P2P..."
                    className="flex-1 bg-[#080d1a] border border-[#22304d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] placeholder-[#55647a] focus:outline-none focus:border-[#00ffab]"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="px-4 py-2 bg-[#00ffab] hover:bg-[#00ffab]/90 disabled:opacity-40 text-[#003824] font-bold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить</span>
                  </button>
                </div>
              </form>

              {/* Task List Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTaskFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      taskFilter === 'pending'
                        ? 'bg-[#00ffab]/20 text-[#00ffab] border border-[#00ffab]/40'
                        : 'text-[#86948a] hover:text-[#dae2fd]'
                    }`}
                  >
                    Активные ({localTasks.filter((t) => !t.isCompleted).length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      taskFilter === 'completed'
                        ? 'bg-[#00ffab]/20 text-[#00ffab] border border-[#00ffab]/40'
                        : 'text-[#86948a] hover:text-[#dae2fd]'
                    }`}
                  >
                    Выполненные ({localTasks.filter((t) => t.isCompleted).length})
                  </button>
                  <button
                    onClick={() => setTaskFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      taskFilter === 'all'
                        ? 'bg-[#00ffab]/20 text-[#00ffab] border border-[#00ffab]/40'
                        : 'text-[#86948a] hover:text-[#dae2fd]'
                    }`}
                  >
                    Все ({localTasks.length})
                  </button>
                </div>

                <button
                  onClick={() => companionBridge.sendTaskSync()}
                  className="px-2 py-1 rounded-lg bg-[#172238] hover:bg-[#202d4a] text-[11px] font-mono text-[#86948a] hover:text-[#dae2fd] flex items-center gap-1 transition-colors"
                  title="Принудительная P2P синхронизация"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Синхронизировать</span>
                </button>
              </div>

              {/* Task Items List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#080d1a] border border-[#1e2a42] text-xs font-mono text-[#86948a]">
                    Задач в этой категории нет
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        task.isCompleted
                          ? 'bg-[#0b1220]/60 border-[#1c283f] opacity-60'
                          : 'bg-[#0f172a] border-[#1e2a42] hover:border-[#00ffab]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleRemoteToggleTask(task.id)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                            task.isCompleted
                              ? 'bg-[#00ffab] border-[#00ffab] text-[#003824]'
                              : 'border-[#334155] hover:border-[#00ffab]'
                          }`}
                        >
                          {task.isCompleted && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-medium truncate ${
                              task.isCompleted ? 'line-through text-[#86948a]' : 'text-[#dae2fd]'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#86948a] mt-0.5">
                            {task.dueDate && <span>Срок: {task.dueDate}</span>}
                            {task.priority && (
                              <span
                                className={`px-1.5 py-0.2 rounded capitalize ${
                                  task.priority === 'high'
                                    ? 'bg-[#ff5555]/20 text-[#ff5555]'
                                    : task.priority === 'medium'
                                    ? 'bg-[#e5a93c]/20 text-[#e5a93c]'
                                    : 'bg-[#1e2a42] text-[#86948a]'
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoteDeleteTask(task.id)}
                          className="p-1.5 rounded-lg text-[#86948a] hover:text-[#ff5555] hover:bg-[#ff5555]/10 transition-colors"
                          title="Удалить задачу"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FOCUS REMOTE & AIRDROP */}
          {activeTab === 'focus_remote' && (
            <div className="space-y-4">
              {/* Pomodoro Remote Trigger */}
              <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1e2a42] space-y-3">
                <div className="text-xs font-mono font-bold text-[#00ffab] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Удаленное управление фокус-таймером на ПК
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleRemoteTriggerTimer}
                    className="p-3 rounded-xl bg-[#131d30] hover:bg-[#1b2842] border border-[#22304d] text-xs font-mono text-[#00e5ff] flex flex-col items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Старт / Пауза</span>
                  </button>

                  <button
                    onClick={handleRemoteResetTimer}
                    className="p-3 rounded-xl bg-[#131d30] hover:bg-[#1b2842] border border-[#22304d] text-xs font-mono text-[#86948a] hover:text-[#dae2fd] flex flex-col items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Сброс таймера</span>
                  </button>

                  <button
                    onClick={handleRemoteCompleteActiveTask}
                    className="p-3 rounded-xl bg-[#131d30] hover:bg-[#1b2842] border border-[#22304d] text-xs font-mono text-[#00ffab] flex flex-col items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Задача выполнена</span>
                  </button>
                </div>
              </div>

              {/* 1-Tap P2P AirDrop Notes */}
              <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1e2a42] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-[#d0bcff] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Прямой P2P AirDrop заметки на ПК
                  </div>
                  {noteSentToast && (
                    <span className="text-xs font-mono text-[#00ffab] flex items-center gap-1 animate-pulse">
                      <Check className="w-3.5 h-3.5" /> Заметка отправлена
                    </span>
                  )}
                </div>

                <form onSubmit={handleSendRemoteNote} className="space-y-2">
                  <textarea
                    value={remoteNoteText}
                    onChange={(e) => setRemoteNoteText(e.target.value)}
                    placeholder="Напишите текст, мысль или ссылку для мгновенной пересылки на связанное устройство..."
                    rows={3}
                    className="w-full bg-[#080d1a] border border-[#22304d] rounded-xl p-3 text-xs text-[#dae2fd] placeholder-[#55647a] focus:outline-none focus:border-[#00ffab]"
                  />
                  <button
                    type="submit"
                    disabled={!remoteNoteText.trim()}
                    className="w-full py-2.5 bg-[#00ffab] hover:bg-[#00ffab]/90 disabled:opacity-40 text-[#003824] font-bold text-xs font-mono rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Передать на ПК по WebRTC</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS & TELEMETRY */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e2a42]">
                  <div className="text-[10px] text-[#86948a] uppercase">Статус</div>
                  <div className="font-bold text-[#00ffab] capitalize mt-0.5">{status}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e2a42]">
                  <div className="text-[10px] text-[#86948a] uppercase">Пинг (RTT)</div>
                  <div className="font-bold text-[#00e5ff] mt-0.5">
                    {latency > 0 ? `${latency} ms` : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e2a42]">
                  <div className="text-[10px] text-[#86948a] uppercase">Протокол</div>
                  <div className="font-bold text-[#d0bcff] mt-0.5">
                    {transport === 'webrtc' ? 'PeerJS P2P' : transport.toUpperCase()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e2a42]">
                  <div className="text-[10px] text-[#86948a] uppercase">Шифрование</div>
                  <div className="font-bold text-[#4edea3] mt-0.5">DTLS / SRTP</div>
                </div>
              </div>

              {/* Log Stream */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#86948a] font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Журнал WebRTC пакетов</span>
                  <span>{logs.length} событий</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080d1a] border border-[#1e2a42] space-y-1.5 max-h-52 overflow-y-auto text-[11px]">
                  {logs.length === 0 ? (
                    <div className="text-[#55647a]">Журнал событий пуст</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[#dae2fd]">
                        <span className="text-[#55647a] flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span
                          className={`font-bold flex-shrink-0 ${
                            log.direction === 'in'
                              ? 'text-[#00e5ff]'
                              : log.direction === 'out'
                              ? 'text-[#00ffab]'
                              : 'text-[#e5a93c]'
                          }`}
                        >
                          [{log.direction.toUpperCase()}]
                        </span>
                        <span className="text-[#86948a] flex-shrink-0">{log.type}:</span>
                        <span className="text-[#dae2fd] break-all">{log.summary}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1c283f] bg-[#0f172a]/60 flex items-center justify-between">
          {onOpenStandBy && (
            <button
              onClick={() => {
                sound.playClick();
                onClose();
                onOpenStandBy();
              }}
              className="px-4 py-2 rounded-xl bg-[#131d30] hover:bg-[#1a2740] border border-[#22304d] text-xs font-mono text-[#00ffab] flex items-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Режим StandBy Desk</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="ml-auto px-5 py-2 rounded-xl bg-[#172238] hover:bg-[#202d4a] text-xs font-mono text-[#dae2fd] transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
