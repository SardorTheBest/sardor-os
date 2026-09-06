// Tactile Haptics & Confetti Celebration Engine for Zenith OS
import confetti from 'canvas-confetti';

class HapticsEngine {
  /**
   * Triggers light tactile micro-vibration (e.g. for button taps, list toggles)
   */
  public light(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Ignored on unsupported devices
      }
    }
  }

  /**
   * Triggers medium tactile vibration (e.g. for card creation, swipe)
   */
  public medium(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Triggers success pattern vibration
   */
  public success(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 40, 45]);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Triggers warning alert vibration pattern
   */
  public warning(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 60, 50]);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Triggers intense milestone celebration haptic pattern
   */
  public celebrate(): void {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 80, 50, 150]);
      } catch (e) {
        // Ignored
      }
    }
  }
}

export const haptics = new HapticsEngine();

/**
 * High-aesthetic confetti explosion with Zenith palette (emerald, neon cyan, warm amber, violet)
 */
export function fireCelebrationConfetti(
  preset: 'tasks_all_done' | 'project_complete' | 'book_finished' | 'milestone' | 'zen_pomodoro' = 'tasks_all_done'
): void {
  haptics.celebrate();

  if (typeof window === 'undefined') return;

  const count = preset === 'project_complete' ? 120 : 80;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  const zenithColors = ['#00ffab', '#00e5ff', '#e5a93c', '#d0bcff', '#ffffff'];

  fire(0.25, {
    spread: 30,
    startVelocity: 55,
    colors: zenithColors,
  });
  fire(0.2, {
    spread: 60,
    colors: zenithColors,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: zenithColors,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: zenithColors,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: zenithColors,
  });
}
