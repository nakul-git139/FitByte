// Safe native module loading with fallback for non-native / web / testing environments
let NativeSpeech: any = null;
try {
  NativeSpeech = require('expo-speech');
} catch {
  NativeSpeech = null;
}

class SpeechServiceImpl {
  private isMuted: boolean = false;
  private currentSpeakingText: string | null = null;
  private isCurrentlySpeaking: boolean = false;
  private lastSpokenTime: number = 0;

  constructor() {}

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public async speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      language?: string;
      force?: boolean;
    }
  ): Promise<void> {
    if (this.isMuted || !text || text.trim() === '') {
      return;
    }

    const now = Date.now();

    // Prevent identical speech triggers within 1.5s
    if (this.currentSpeakingText === text && now - this.lastSpokenTime < 1500) {
      return;
    }

    if (!NativeSpeech || typeof NativeSpeech.speak !== 'function') {
      // Non-native fallback / mock
      this.currentSpeakingText = text;
      this.lastSpokenTime = now;
      return;
    }

    try {
      const isSpeakingNative = await NativeSpeech.isSpeakingAsync().catch(() => false);

      if (isSpeakingNative) {
        if (options?.force) {
          await NativeSpeech.stop();
        } else {
          return;
        }
      }

      this.currentSpeakingText = text;
      this.isCurrentlySpeaking = true;
      this.lastSpokenTime = now;

      NativeSpeech.speak(text, {
        rate: options?.rate ?? 1.05,
        pitch: options?.pitch ?? 1.0,
        language: options?.language ?? 'en-US',
        onDone: () => {
          this.isCurrentlySpeaking = false;
          this.currentSpeakingText = null;
        },
        onStopped: () => {
          this.isCurrentlySpeaking = false;
          this.currentSpeakingText = null;
        },
        onError: () => {
          this.isCurrentlySpeaking = false;
          this.currentSpeakingText = null;
        },
      });
    } catch {
      this.isCurrentlySpeaking = false;
      this.currentSpeakingText = null;
    }
  }

  public async stop(): Promise<void> {
    if (!NativeSpeech || typeof NativeSpeech.stop !== 'function') {
      this.isCurrentlySpeaking = false;
      this.currentSpeakingText = null;
      return;
    }

    try {
      await NativeSpeech.stop();
    } catch {
      // Ignore
    } finally {
      this.isCurrentlySpeaking = false;
      this.currentSpeakingText = null;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }
}

export const SpeechService = new SpeechServiceImpl();
