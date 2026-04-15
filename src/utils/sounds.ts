// This is a placeholder for the sounds utility.
// Since we don't have the actual sound files, we'll mock the functions.

class SoundManager {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
      }
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.5) {
    try {
      this.init();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Smooth envelope to prevent "ticking" or "pops"
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Failed to play tone", e);
    }
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.4);
  }

  playSuccess() {
    this.init();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.3), i * 100);
    });
  }

  playSelect() {
    this.playTone(600, 'sine', 0.15, 0.4);
  }

  playBack() {
    this.playTone(400, 'sine', 0.1, 0.4);
  }

  playReset() {
    this.playTone(300, 'sine', 0.2, 0.4);
  }
}

export const sounds = new SoundManager();

export const safeVibrate = (pattern: number | number[]) => {
  try {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn("Vibrate failed", e);
  }
};
