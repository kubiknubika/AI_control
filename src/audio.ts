export type ButtonSound = 'soft' | 'arcane' | 'stone' | 'metal' | 'chime';

export const BUTTON_SOUND_LABELS: Record<ButtonSound, string> = {
  soft: 'Мягкий',
  arcane: 'Магический',
  stone: 'Каменный',
  metal: 'Металлический',
  chime: 'Колокольчик',
};

export interface AudioSettings {
  musicVolume: number;
  buttonSoundVolume: number;
  buttonSound: ButtonSound;
}

const BUTTON_SOUND_FILES: Record<ButtonSound, string> = {
  soft: '/audio/button-soft.wav',
  arcane: '/audio/button-arcane.wav',
  stone: '/audio/button-stone.wav',
  metal: '/audio/button-metal.wav',
  chime: '/audio/button-chime.wav',
};

const MAX_MIX_VOLUME = 0.62;

export class AudioManager {
  private readonly music: HTMLAudioElement;
  private readonly buttonSounds: Record<ButtonSound, HTMLAudioElement>;
  private settings: AudioSettings;

  public constructor(settings: AudioSettings) {
    this.music = new Audio('/audio/menu-music.wav');
    this.music.loop = true;
    this.music.preload = 'auto';
    this.buttonSounds = {
      soft: createAudio(BUTTON_SOUND_FILES.soft),
      arcane: createAudio(BUTTON_SOUND_FILES.arcane),
      stone: createAudio(BUTTON_SOUND_FILES.stone),
      metal: createAudio(BUTTON_SOUND_FILES.metal),
      chime: createAudio(BUTTON_SOUND_FILES.chime),
    };
    this.settings = { ...settings };
    this.applyVolumes();
  }

  public setSettings(settings: AudioSettings): void {
    const soundChanged = this.settings.buttonSound !== settings.buttonSound;
    this.settings = { ...settings };
    this.applyVolumes();

    if (this.settings.musicVolume <= 0) {
      this.stopMusic();
    }

    if (soundChanged) {
      this.stopButtonSounds();
    }
  }

  public startMusic(): void {
    if (this.settings.musicVolume <= 0 || !this.music.paused) {
      return;
    }

    void this.music.play().catch(() => {
      // Браузер может ждать явного действия пользователя для запуска аудио.
    });
  }

  public playButtonSound(): void {
    if (this.settings.buttonSoundVolume <= 0) {
      return;
    }

    const sound = this.buttonSounds[this.settings.buttonSound];
    sound.pause();
    sound.currentTime = 0;
    sound.volume = (this.settings.buttonSoundVolume / 100) * MAX_MIX_VOLUME;
    void sound.play().catch(() => {
      // Ошибка воспроизведения не должна ломать навигацию меню.
    });
  }

  private applyVolumes(): void {
    this.music.volume = (this.settings.musicVolume / 100) * MAX_MIX_VOLUME;
  }

  private stopMusic(): void {
    this.music.pause();
    this.music.currentTime = 0;
  }

  private stopButtonSounds(): void {
    Object.values(this.buttonSounds).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
}

function createAudio(source: string): HTMLAudioElement {
  const audio = new Audio(source);
  audio.preload = 'auto';
  return audio;
}
