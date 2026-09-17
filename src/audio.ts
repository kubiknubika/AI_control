export type ButtonSound = 'soft' | 'arcane' | 'stone' | 'metal' | 'rune';

export const BUTTON_SOUND_LABELS: Record<ButtonSound, string> = {
  soft: 'Мягкий',
  arcane: 'Магический',
  stone: 'Каменный',
  metal: 'Металлический',
  rune: 'Рунический',
};

export interface AudioSettings {
  musicVolume: number;
  buttonSoundVolume: number;
  buttonSound: ButtonSound;
}

export const MENU_MUSIC_SOURCE =
  'https://soundimage.org/wp-content/uploads/2018/10/Our-Mountain_v003_Looping.mp3';

const BUTTON_SOUND_FILES: Record<ButtonSound, string> = {
  soft: '/audio/button-soft.wav',
  arcane: '/audio/button-arcane.wav',
  stone: '/audio/button-stone.wav',
  metal: '/audio/button-metal.wav',
  rune: '/audio/button-rune.wav',
};

const MAX_MIX_VOLUME = 0.62;

export class AudioManager {
  private readonly music: HTMLAudioElement;
  private readonly buttonSounds: Record<ButtonSound, HTMLAudioElement>;
  private settings: AudioSettings;

  public constructor(settings: AudioSettings) {
    this.settings = { ...settings };
    this.music = createMusic();
    this.buttonSounds = {
      soft: createAudio(BUTTON_SOUND_FILES.soft),
      arcane: createAudio(BUTTON_SOUND_FILES.arcane),
      stone: createAudio(BUTTON_SOUND_FILES.stone),
      metal: createAudio(BUTTON_SOUND_FILES.metal),
      rune: createAudio(BUTTON_SOUND_FILES.rune),
    };
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
      // Браузер может ждать явного действия пользователя или загрузки внешнего файла.
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

function createMusic(): HTMLAudioElement {
  const audio = new Audio(MENU_MUSIC_SOURCE);
  audio.loop = true;
  audio.preload = 'auto';
  return audio;
}
