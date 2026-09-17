export type ButtonSound = 'soft' | 'arcane' | 'stone' | 'metal' | 'chime';

export const BUTTON_SOUND_LABELS: Record<ButtonSound, string> = {
  soft: 'Мягкий',
  arcane: 'Магический',
  stone: 'Каменный',
  metal: 'Металлический',
  chime: 'Колокольчик',
};

export interface AudioSettings {
  musicEnabled: boolean;
  buttonSoundsEnabled: boolean;
  buttonSound: ButtonSound;
}

const BUTTON_SOUND_FILES: Record<ButtonSound, string> = {
  soft: '/audio/button-soft.wav',
  arcane: '/audio/button-arcane.wav',
  stone: '/audio/button-stone.wav',
  metal: '/audio/button-metal.wav',
  chime: '/audio/button-chime.wav',
};

export class AudioManager {
  private readonly music: HTMLAudioElement;
  private settings: AudioSettings;

  public constructor(settings: AudioSettings) {
    this.music = new Audio('/audio/menu-music.wav');
    this.music.loop = true;
    this.music.preload = 'auto';
    this.music.volume = 0.28;
    this.settings = settings;
  }

  public setSettings(settings: AudioSettings): void {
    this.settings = settings;

    if (!settings.musicEnabled) {
      this.stopMusic();
    }
  }

  public startMusic(): void {
    if (!this.settings.musicEnabled || !this.music.paused) {
      return;
    }

    void this.music.play().catch(() => {
      // Браузер может ждать явного действия пользователя для запуска аудио.
    });
  }

  public playButtonSound(): void {
    if (!this.settings.buttonSoundsEnabled) {
      return;
    }

    const sound = new Audio(BUTTON_SOUND_FILES[this.settings.buttonSound]);
    sound.preload = 'auto';
    sound.volume = 0.42;
    void sound.play().catch(() => {
      // Ошибка воспроизведения не должна ломать навигацию меню.
    });
  }

  private stopMusic(): void {
    this.music.pause();
    this.music.currentTime = 0;
  }
}
