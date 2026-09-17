export type ButtonSound = 'soft' | 'arcane' | 'stone' | 'metal' | 'rune';
export type MusicTrack = 'ourMountain' | 'gameMenu' | 'mystery';

export const BUTTON_SOUND_LABELS: Record<ButtonSound, string> = {
  soft: 'Мягкий',
  arcane: 'Магический',
  stone: 'Каменный',
  metal: 'Металлический',
  rune: 'Рунический',
};

export interface MusicTrackInfo {
  label: string;
  source: string;
  credit: string;
}

export const MUSIC_TRACKS: Record<MusicTrack, MusicTrackInfo> = {
  ourMountain: {
    label: 'Our Mountain — RPG',
    source: 'https://soundimage.org/wp-content/uploads/2024/01/Our-Mountain_v003.wav',
    credit: 'Eric Matyas / Soundimage.org',
  },
  gameMenu: {
    label: 'Game Menu — Mystery',
    source: 'https://soundimage.org/wp-content/uploads/2024/01/Game-Menu.wav',
    credit: 'Eric Matyas / Soundimage.org',
  },
  mystery: {
    label: 'Mystery Exploration — CC0',
    source: 'https://opengameart.org/sites/default/files/mystery%20exploration.mp3',
    credit: 'PolygonDan / OpenGameArt.org',
  },
};

export interface AudioSettings {
  musicVolume: number;
  buttonSoundVolume: number;
  buttonSound: ButtonSound;
  musicTrack: MusicTrack;
}

const BUTTON_SOUND_FILES: Record<ButtonSound, string> = {
  soft: '/audio/button-soft.wav',
  arcane: '/audio/button-arcane.wav',
  stone: '/audio/button-stone.wav',
  metal: '/audio/button-metal.wav',
  rune: '/audio/button-rune.wav',
};

const MAX_MIX_VOLUME = 0.62;

export class AudioManager {
  private music: HTMLAudioElement;
  private readonly buttonSounds: Record<ButtonSound, HTMLAudioElement>;
  private settings: AudioSettings;

  public constructor(settings: AudioSettings) {
    this.settings = { ...settings };
    this.music = createMusic(settings.musicTrack);
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
    const trackChanged = this.settings.musicTrack !== settings.musicTrack;
    const soundChanged = this.settings.buttonSound !== settings.buttonSound;
    const wasPlaying = !this.music.paused;

    this.settings = { ...settings };

    if (trackChanged) {
      this.stopMusic();
      this.music = createMusic(settings.musicTrack);
    }

    this.applyVolumes();

    if (this.settings.musicVolume <= 0) {
      this.stopMusic();
    } else if (trackChanged && wasPlaying) {
      this.startMusic();
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

function createMusic(track: MusicTrack): HTMLAudioElement {
  const audio = new Audio(MUSIC_TRACKS[track].source);
  audio.loop = true;
  audio.preload = 'metadata';
  return audio;
}
