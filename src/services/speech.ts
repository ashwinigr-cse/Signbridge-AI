/**
 * Speech Service wrapping the Web Speech API (speechSynthesis)
 * Provides rate, pitch, voice selection, deduplication, and immediate cancellation.
 */

class SpeechService {
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private minIntervalMs: number = 1800; // Anti-repetition cooldown

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  public speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      voiceName?: string;
      force?: boolean;
    } = {}
  ): boolean {
    if (!this.isSupported() || !text || !text.trim()) return false;

    const cleanText = text.trim();
    const now = Date.now();

    // Prevent repeated audio playback for the same prediction unless forced
    if (
      !options.force &&
      cleanText.toLowerCase() === this.lastSpokenText.toLowerCase() &&
      now - this.lastSpokenTime < this.minIntervalMs
    ) {
      return false;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      if (options.voiceName && options.voiceName !== 'default') {
        const voices = this.getVoices();
        const selected = voices.find((v) => v.name === options.voiceName);
        if (selected) {
          utterance.voice = selected;
        }
      }

      this.lastSpokenText = cleanText;
      this.lastSpokenTime = now;

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      return false;
    }
  }

  public stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }
}

export const speechService = new SpeechService();
