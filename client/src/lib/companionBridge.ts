// Companion Device Bridge for P2P Realtime WebRTC Sync via PeerJS
// Enables zero-server, direct P2P data synchronization & remote task control between PC and Mobile devices

import Peer, { DataConnection } from 'peerjs';
import { Task, Priority } from '../types';
import { storage } from './storage';
import { sound } from './sound';

export type CompanionTransport = 'webrtc' | 'broadcast' | 'none';

export interface CompanionMessage {
  id: string;
  type:
    | 'PING'
    | 'PONG'
    | 'SYNC_STATE'
    | 'SYNC_TASKS'
    | 'TASK_TOGGLE'
    | 'TASK_CREATE'
    | 'TASK_DELETE'
    | 'TASK_UPDATE'
    | 'CONTROL_ACTION'
    | 'NOTE_DROP'
    | 'TIMER_UPDATE';
  senderDeviceId: string;
  senderDeviceName: string;
  senderPeerId?: string;
  timestamp: number;
  rtt?: number;
  payload?: any;
}

export type CompanionConnectionStatus = 'disconnected' | 'connecting' | 'pairing' | 'connected' | 'error';

export interface CompanionDeviceInfo {
  id: string;
  name: string;
  peerId?: string;
  role: 'host' | 'companion';
  lastSeen: number;
  transport: CompanionTransport;
  latencyMs?: number;
}

export interface PeerLogEntry {
  id: string;
  timestamp: number;
  direction: 'in' | 'out' | 'system';
  type: string;
  summary: string;
}

class CompanionBridgeService {
  private deviceId: string;
  private sessionId: string;
  private peer: Peer | null = null;
  private peerConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private status: CompanionConnectionStatus = 'disconnected';
  private pairedDevice: CompanionDeviceInfo | null = null;
  private transport: CompanionTransport = 'none';
  private latencyMs: number = 0;
  private logs: PeerLogEntry[] = [];

  private messageListeners: Array<(msg: CompanionMessage) => void> = [];
  private statusListeners: Array<(
    status: CompanionConnectionStatus,
    device: CompanionDeviceInfo | null,
    transport: CompanionTransport,
    latency: number
  ) => void> = [];
  private logListeners: Array<(logs: PeerLogEntry[]) => void> = [];

  private pingInterval: any = null;
  private isHost: boolean = true;
  private reconnectTimer: any = null;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.sessionId = this.getOrCreateSessionId();
    this.initBroadcastChannel();
    this.initPeerJS();
    this.checkUrlPairingParams();
    this.startHeartbeat();
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'srv-node';
    let id = localStorage.getItem('zenith_device_id');
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('zenith_device_id', id);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ZENITH';
    let session = localStorage.getItem('zenith_pairing_session');
    if (!session) {
      session = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('zenith_pairing_session', session);
    }
    return session;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getPeerId(): string {
    return this.peer?.id || this.generateHostPeerId(this.sessionId);
  }

  private generateHostPeerId(session: string): string {
    return `zenith-os-host-${session.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }

  private generateCompanionPeerId(session: string): string {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `zenith-os-comp-${session.toLowerCase().replace(/[^a-z0-9]/g, '')}-${randomSuffix}`;
  }

  public getPairingUrl(): string {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?pair=${this.sessionId}&hostPeer=${encodeURIComponent(this.getPeerId())}&role=companion`;
  }

  public getDeviceName(): string {
    if (typeof window === 'undefined') return 'Zenith Device';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      return navigator.platform ? `Mobile (${navigator.platform})` : 'Mobile Companion';
    }
    return 'Main Desktop Workstation';
  }

  public getStatus(): CompanionConnectionStatus {
    return this.status;
  }

  public getPairedDevice(): CompanionDeviceInfo | null {
    return this.pairedDevice;
  }

  public getTransport(): CompanionTransport {
    return this.transport;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public getLogs(): PeerLogEntry[] {
    return this.logs;
  }

  private log(direction: 'in' | 'out' | 'system', type: string, summary: string) {
    const entry: PeerLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      direction,
      type,
      summary,
    };
    this.logs = [entry, ...this.logs.slice(0, 30)];
    this.logListeners.forEach((cb) => cb(this.logs));
  }

  // --- BroadcastChannel for same-browser tab sync ---
  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      this.broadcastChannel = new BroadcastChannel(`zenith_bridge_${this.sessionId}`);
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data, 'broadcast');
      };
    } catch (e) {
      console.warn('[Bridge] BroadcastChannel fallback disabled:', e);
    }
  }

  // --- PeerJS WebRTC Direct P2P Initialization ---
  public initPeerJS(targetRole?: 'host' | 'companion') {
    if (typeof window === 'undefined') return;

    // Destroy existing peer if any
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // Ignored
      }
      this.peer = null;
    }

    const hostPeerId = this.generateHostPeerId(this.sessionId);
    const assignedPeerId = targetRole === 'companion' ? this.generateCompanionPeerId(this.sessionId) : hostPeerId;

    this.log('system', 'INIT_PEER', `Инициализация PeerJS (${assignedPeerId})...`);

    try {
      this.peer = new Peer(assignedPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        this.log('system', 'PEER_READY', `WebRTC узел активен: ${id}`);
        if (this.status === 'disconnected' || this.status === 'error') {
          this.setStatus('pairing', this.pairedDevice, this.transport);
        }

        // If we are a companion connecting to a host peer, initiate connection
        if (targetRole === 'companion' || (!this.isHost && hostPeerId)) {
          this.connectToPeerId(hostPeerId);
        }
      });

      // Handle incoming WebRTC data connection from remote peer
      this.peer.on('connection', (conn) => {
        this.log('system', 'INCOMING_CONN', `Входящее P2P соединение от ${conn.peer}`);
        this.setupDataConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        // If ID is taken and we are host, retry as companion or reconnect
        if (err?.type === 'unavailable-id') {
          this.log('system', 'PEER_CONFLICT', `ID ${assignedPeerId} занят. Переключение в режим Companion.`);
          if (this.isHost) {
            this.isHost = false;
            this.initPeerJS('companion');
            return;
          }
        }
        
        this.log('system', 'PEER_ERROR', `Ошибка WebRTC: ${err.message || err.type || err}`);
        console.warn('[PeerJS] Non-fatal WebRTC error:', err?.type || err?.message || err);

        // Schedule auto-reconnect on network/server connection errors
        if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err?.type)) {
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
                try {
                  this.peer.reconnect();
                } catch (e) {
                  this.initPeerJS(this.isHost ? 'host' : 'companion');
                }
              }
            }, 5000);
          }
        }
      });

      this.peer.on('disconnected', () => {
        this.log('system', 'PEER_DISCONNECTED', 'Сигнальный сервер PeerJS отключился, попытка переподключения...');
        try {
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        } catch (e) {
          // If reconnect fails immediately, schedule a delayed re-initialization
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.initPeerJS(this.isHost ? 'host' : 'companion');
            }, 5000);
          }
        }
      });
    } catch (err) {
      console.error('[PeerJS] Setup failed:', err);
      this.log('system', 'PEER_FAIL', `Сбой WebRTC инициализации: ${err}`);
    }
  }

  private setupDataConnection(conn: DataConnection) {
    this.peerConnection = conn;

    conn.on('open', () => {
      this.transport = 'webrtc';
      this.log('system', 'WEBRTC_OPEN', `Прямой WebRTC P2P DataChannel установлен с ${conn.peer}!`);

      this.setStatus('connected', {
        id: conn.peer,
        name: conn.metadata?.deviceName || 'Remote Peer Device',
        peerId: conn.peer,
        role: this.isHost ? 'companion' : 'host',
        lastSeen: Date.now(),
        transport: 'webrtc',
        latencyMs: this.latencyMs,
      }, 'webrtc');

      // Send initial handshakes and tasks snapshot
      this.sendMessage({
        type: 'PING',
        payload: { deviceName: this.getDeviceName(), isHost: this.isHost },
      });

      // If host, send full task list
      if (this.isHost) {
        this.sendTaskSync();
      }
    });

    conn.on('data', (data: any) => {
      this.handleIncomingMessage(data, 'webrtc');
    });

    conn.on('close', () => {
      this.log('system', 'WEBRTC_CLOSE', `P2P канал с ${conn.peer} закрыт`);
      if (this.peerConnection === conn) {
        this.peerConnection = null;
        this.setStatus('pairing', null, 'none');
      }
    });

    conn.on('error', (err) => {
      this.log('system', 'WEBRTC_ERROR', `Ошибка DataChannel: ${err}`);
    });
  }

  public connectToPeerId(targetPeerId: string) {
    if (!this.peer || this.peer.destroyed) {
      this.initPeerJS('companion');
    }

    this.log('out', 'CONNECTING', `Подключение к WebRTC узлу ${targetPeerId}...`);
    this.setStatus('connecting', null, 'webrtc');

    try {
      const conn = this.peer!.connect(targetPeerId, {
        reliable: true,
        metadata: {
          deviceName: this.getDeviceName(),
          deviceId: this.deviceId,
        },
      });

      this.setupDataConnection(conn);
    } catch (e) {
      this.log('system', 'CONNECT_FAIL', `Не удалось инициировать соединение: ${e}`);
    }
  }

  public regenerateSession(): string {
    this.sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('zenith_pairing_session', this.sessionId);
    this.isHost = true;

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        // Ignored
      }
      this.peerConnection = null;
    }

    this.initBroadcastChannel();
    this.initPeerJS('host');
    this.setStatus('pairing', null, 'none');
    this.log('system', 'NEW_SESSION', `Создана новая сессия: ${this.sessionId}`);
    return this.sessionId;
  }

  public connectToSession(targetSessionId: string, hostPeerId?: string): void {
    const cleanSession = targetSessionId.trim().toUpperCase();
    if (!cleanSession) return;
    this.sessionId = cleanSession;
    localStorage.setItem('zenith_pairing_session', this.sessionId);
    this.isHost = false;

    this.initBroadcastChannel();
    const targetPeer = hostPeerId || this.generateHostPeerId(cleanSession);
    this.initPeerJS('companion');

    setTimeout(() => {
      this.connectToPeerId(targetPeer);
    }, 600);

    this.setStatus('connecting', null, 'webrtc');
  }

  private checkUrlPairingParams() {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pairCode = urlParams.get('pair');
      const hostPeer = urlParams.get('hostPeer');
      const role = urlParams.get('role');

      if (pairCode) {
        this.log('system', 'URL_PAIR', `Обнаружен QR-параметр сопряжения: ${pairCode}`);
        this.sessionId = pairCode.toUpperCase();
        localStorage.setItem('zenith_pairing_session', this.sessionId);
        this.isHost = role !== 'companion';
        
        setTimeout(() => {
          this.connectToSession(pairCode, hostPeer || undefined);
        }, 300);

        // Clean URL query without refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      // Ignored
    }
  }

  private handleIncomingMessage(msg: CompanionMessage, transport: CompanionTransport) {
    if (!msg || msg.senderDeviceId === this.deviceId) return;

    const now = Date.now();
    let rtt = 0;
    if (msg.timestamp) {
      rtt = Math.max(1, now - msg.timestamp);
    }

    this.log(
      'in',
      msg.type,
      `Получено [${transport.toUpperCase()}]: ${msg.type} от ${msg.senderDeviceName} (${rtt}ms)`
    );

    // Update paired device info & latency
    this.latencyMs = rtt;
    this.transport = transport;
    this.pairedDevice = {
      id: msg.senderDeviceId,
      name: msg.senderDeviceName,
      peerId: msg.senderPeerId,
      role: msg.payload?.isHost ? 'host' : 'companion',
      lastSeen: now,
      transport,
      latencyMs: rtt,
    };
    this.setStatus('connected', this.pairedDevice, transport);

    // Process Message Types
    switch (msg.type) {
      case 'PING':
        this.sendMessage({
          type: 'PONG',
          timestamp: msg.timestamp, // Echo back timestamp for RTT calculation
          payload: { deviceName: this.getDeviceName(), isHost: this.isHost },
        });
        if (this.isHost) {
          this.sendTaskSync();
        }
        break;

      case 'PONG':
        if (msg.timestamp) {
          this.latencyMs = Math.round((Date.now() - msg.timestamp) / 2);
          if (this.pairedDevice) {
            this.pairedDevice.latencyMs = this.latencyMs;
          }
          this.notifyStatus();
        }
        break;

      case 'SYNC_TASKS':
        if (Array.isArray(msg.payload?.tasks)) {
          // If receiving synced tasks, we can inspect or sync
          this.log('in', 'TASKS_SYNCED', `Синхронизировано ${msg.payload.tasks.length} задач с хоста`);
        }
        break;

      case 'TASK_TOGGLE':
        if (msg.payload?.taskId) {
          this.log('in', 'REMOTE_TASK_TOGGLE', `Удаленное переключение задачи: ${msg.payload.taskId}`);
          const res = storage.toggleTask(msg.payload.taskId);
          if (res) {
            sound.playComplete();
            this.sendTaskSync();
          }
        }
        break;

      case 'TASK_CREATE':
        if (msg.payload?.task) {
          this.log('in', 'REMOTE_TASK_CREATE', `Удаленное создание задачи: "${msg.payload.task.title}"`);
          const created = storage.addTask(msg.payload.task);
          sound.playPop();
          this.sendTaskSync();
        }
        break;

      case 'TASK_DELETE':
        if (msg.payload?.taskId) {
          this.log('in', 'REMOTE_TASK_DELETE', `Удаленное удаление задачи: ${msg.payload.taskId}`);
          storage.deleteTask(msg.payload.taskId);
          sound.playClick();
          this.sendTaskSync();
        }
        break;

      case 'TASK_UPDATE':
        if (msg.payload?.taskId && msg.payload?.updates) {
          storage.updateTask(msg.payload.taskId, msg.payload.updates);
          this.sendTaskSync();
        }
        break;

      case 'CONTROL_ACTION':
        this.log('in', 'REMOTE_CONTROL', `Команда управления: ${msg.payload?.action}`);
        break;

      case 'NOTE_DROP':
        this.log('in', 'NOTE_AIRDROP', `Входящая заметка: "${msg.payload?.title}"`);
        break;
    }

    // Notify registered listeners
    this.messageListeners.forEach((l) => l(msg));
  }

  public sendMessage(partial: {
    type: CompanionMessage['type'];
    payload?: any;
    timestamp?: number;
  }): void {
    const msg: CompanionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: partial.type,
      senderDeviceId: this.deviceId,
      senderDeviceName: this.getDeviceName(),
      senderPeerId: this.getPeerId(),
      timestamp: partial.timestamp || Date.now(),
      payload: partial.payload,
    };

    let sentViaWebRTC = false;
    if (this.peerConnection && this.peerConnection.open) {
      try {
        this.peerConnection.send(msg);
        sentViaWebRTC = true;
        this.log('out', msg.type, `Отправлено [WebRTC P2P]: ${msg.type}`);
      } catch (e) {
        console.warn('[PeerJS] Failed to send over DataConnection:', e);
      }
    }

    // Also broadcast over BroadcastChannel for multi-tab fallback
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
        if (!sentViaWebRTC) {
          this.log('out', msg.type, `Отправлено [BroadcastChannel]: ${msg.type}`);
        }
      } catch (e) {
        // Ignored
      }
    }
  }

  // --- Remote Task Control Commands ---
  public sendTaskSync(): void {
    const allTasks = storage.getState().tasks;
    this.sendMessage({
      type: 'SYNC_TASKS',
      payload: {
        tasks: allTasks,
        timestamp: Date.now(),
      },
    });
  }

  public remoteToggleTask(taskId: string): void {
    this.sendMessage({
      type: 'TASK_TOGGLE',
      payload: { taskId },
    });
  }

  public remoteCreateTask(taskData: {
    title: string;
    priority?: Priority;
    dueDate?: string;
    dueTime?: string;
    description?: string;
    tagId?: string;
  }): void {
    this.sendMessage({
      type: 'TASK_CREATE',
      payload: {
        task: {
          title: taskData.title,
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
          dueTime: taskData.dueTime,
          description: taskData.description || 'Created via Mobile Remote Control',
          tagId: taskData.tagId,
          isCompleted: false,
        },
      },
    });
  }

  public remoteDeleteTask(taskId: string): void {
    this.sendMessage({
      type: 'TASK_DELETE',
      payload: { taskId },
    });
  }

  public remoteUpdateTaskPriority(taskId: string, priority: Priority): void {
    this.sendMessage({
      type: 'TASK_UPDATE',
      payload: { taskId, updates: { priority } },
    });
  }

  public sendControlAction(action: string, data?: any) {
    this.sendMessage({
      type: 'CONTROL_ACTION',
      payload: { action, data },
    });
  }

  public sendNoteDrop(title: string, content: string, tags: string[] = ['AirDrop']) {
    this.sendMessage({
      type: 'NOTE_DROP',
      payload: { title, content, tags },
    });
  }

  public sendTimerUpdate(timerData: {
    isRunning: boolean;
    timeLeft: number;
    totalTime: number;
    activeTaskTitle?: string;
    mode: 'pomodoro' | 'shortBreak' | 'longBreak';
  }) {
    this.sendMessage({
      type: 'TIMER_UPDATE',
      payload: timerData,
    });
  }

  private startHeartbeat() {
    if (typeof window === 'undefined') return;
    if (this.pingInterval) clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      if (this.status === 'connected') {
        this.sendMessage({
          type: 'PING',
          timestamp: Date.now(),
          payload: { heartbeat: true },
        });
      }
    }, 12000);
  }

  private setStatus(
    status: CompanionConnectionStatus,
    device: CompanionDeviceInfo | null,
    transport: CompanionTransport = 'none'
  ) {
    this.status = status;
    this.pairedDevice = device;
    this.transport = transport;
    this.notifyStatus();
  }

  private notifyStatus() {
    this.statusListeners.forEach((l) =>
      l(this.status, this.pairedDevice, this.transport, this.latencyMs)
    );
  }

  public onMessage(callback: (msg: CompanionMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChange(
    callback: (
      status: CompanionConnectionStatus,
      device: CompanionDeviceInfo | null,
      transport: CompanionTransport,
      latency: number
    ) => void
  ): () => void {
    this.statusListeners.push(callback);
    callback(this.status, this.pairedDevice, this.transport, this.latencyMs);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public onLogs(callback: (logs: PeerLogEntry[]) => void): () => void {
    this.logListeners.push(callback);
    callback(this.logs);
    return () => {
      this.logListeners = this.logListeners.filter((cb) => cb !== callback);
    };
  }
}

export const companionBridge = new CompanionBridgeService();
