// Screen Wake Lock API service to prevent display sleep in StandBy / Deep Work modes

class ScreenLockService {
  private wakeLockSentinel: any = null;
  private isRequested: boolean = false;
  private listeners: Array<(isActive: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (this.isRequested && document.visibilityState === 'visible') {
          await this.requestWakeLock();
        }
      });
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'wakeLock' in navigator;
  }

  public isActive(): boolean {
    return !!this.wakeLockSentinel && !this.wakeLockSentinel.released;
  }

  public async requestWakeLock(): Promise<boolean> {
    if (!this.isSupported()) return false;
    this.isRequested = true;

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
        this.notifyListeners(false);
      });

      this.notifyListeners(true);
      return true;
    } catch (err) {
      console.warn('Screen WakeLock request failed:', err);
      this.wakeLockSentinel = null;
      this.notifyListeners(false);
      return false;
    }
  }

  public async releaseWakeLock(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (err) {
        // Ignored
      }
      this.wakeLockSentinel = null;
      this.notifyListeners(false);
    }
  }

  public subscribe(callback: (isActive: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.isActive());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(isActive: boolean) {
    this.listeners.forEach((cb) => cb(isActive));
  }
}

export const screenLock = new ScreenLockService();
