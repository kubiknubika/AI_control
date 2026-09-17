export type ButtonSound = 'soft' | 'arcane' | 'stone' | 'metal' | 'rune';
export type BattleSound = 'hit' | 'double' | 'magic' | 'item' | 'miss';

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
export const BATTLE_MUSIC_SOURCE =
  'https://soundimage.org/wp-content/uploads/2020/06/Preparing-for-Battle.mp3';

const BUTTON_SOUND_FILES: Record<ButtonSound, string> = {
  soft: '/audio/button-soft.wav',
  arcane: '/audio/button-arcane.wav',
  stone: '/audio/button-stone.wav',
  metal: '/audio/button-metal.wav',
  rune: '/audio/button-rune.wav',
};

const BATTLE_SOUND_FILES: Record<BattleSound, string> = {
  hit: '/audio/battle-hit.wav',
  double: '/audio/battle-double.wav',
  magic: '/audio/battle-magic.wav',
  item: '/audio/battle-item.wav',
  miss: '/audio/battle-miss.wav',
};

const MAX_MIX_VOLUME = 0.62;
const MAX_BATTLE_VOLUME = 0.85;

type MusicMode = 'menu' | 'battle';

export class AudioManager {
  private readonly music: Record<MusicMode, HTMLAudioElement>;
  private readonly buttonSounds: Record<ButtonSound, HTMLAudioElement>;
  private readonly battleSounds: Record<BattleSound, HTMLAudioElement>;
  private settings: AudioSettings;
  private activeMusic: MusicMode = 'menu';

  public constructor(settings: AudioSettings) {
    this.settings = { ...settings };
    this.music = {
      menu: createMusic(MENU_MUSIC_SOURCE),
      battle: createMusic(BATTLE_MUSIC_SOURCE),
    };
    this.buttonSounds = {
      soft: createAudio(BUTTON_SOUND_FILES.soft),
      arcane: createAudio(BUTTON_SOUND_FILES.arcane),
      stone: createAudio(BUTTON_SOUND_FILES.stone),
      metal: createAudio(BUTTON_SOUND_FILES.metal),
      rune: createAudio(BUTTON_SOUND_FILES.rune),
    };
    this.battleSounds = {
      hit: createAudio(BATTLE_SOUND_FILES.hit),
      double: createAudio(BATTLE_SOUND_FILES.double),
      magic: createAudio(BATTLE_SOUND_FILES.magic),
      item: createAudio(BATTLE_SOUND_FILES.item),
      miss: createAudio(BATTLE_SOUND_FILES.miss),
    };
    this.applyVolumes();
  }

  public setSettings(settings: AudioSettings): void {
    const soundChanged = this.settings.buttonSound !== settings.buttonSound;

    this.settings = { ...settings };
    this.applyVolumes();

    if (this.settings.musicVolume <= 0) {
      this.stopAllMusic();
    }

    if (soundChanged) {
      this.stopButtonSounds();
    }
  }

  public startMusic(): void {
    this.playMusic('menu');
  }

  public startBattleMusic(): void {
    this.playMusic('battle');
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

  public playBattleSound(soundName: BattleSound): void {
    if (this.settings.buttonSoundVolume <= 0) {
      return;
    }

    const sound = this.battleSounds[soundName];
    sound.pause();
    sound.currentTime = 0;
    sound.volume = (this.settings.buttonSoundVolume / 100) * MAX_BATTLE_VOLUME;
    void sound.play().catch(() => {
      // Ошибка воспроизведения не должна ломать ход боя.
    });
  }

  private playMusic(mode: MusicMode): void {
    if (this.settings.musicVolume <= 0) {
      return;
    }

    const nextMusic = this.music[mode];

    if (this.activeMusic !== mode) {
      this.music[this.activeMusic].pause();
      this.music[this.activeMusic].currentTime = 0;
      this.activeMusic = mode;
    }

    if (nextMusic.paused) {
      void nextMusic.play().catch(() => {
        // Браузер может ждать явного действия пользователя или загрузки внешнего файла.
      });
    }
  }

  private applyVolumes(): void {
    const volume = (this.settings.musicVolume / 100) * MAX_MIX_VOLUME;
    this.music.menu.volume = volume;
    this.music.battle.volume = volume;
  }

  private stopAllMusic(): void {
    Object.values(this.music).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
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

function createMusic(source: string): HTMLAudioElement {
  const audio = new Audio(source);
  audio.loop = true;
  audio.preload = 'auto';
  return audio;
}
