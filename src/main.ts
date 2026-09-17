import './style.css';
import {
  AudioManager,
  BUTTON_SOUND_LABELS,
  type AudioSettings,
  type ButtonSound,
} from './audio';

type Screen = 'menu' | 'difficulty' | 'play' | 'tests' | 'settings';
type Difficulty = 'easy' | 'normal' | 'hard' | 'impossible';
type Settings = AudioSettings;

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 38,
  buttonSoundVolume: 62,
  buttonSound: 'rune',
};

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Не найден корневой элемент приложения.');
}

const app = appElement;
const settings: Settings = { ...DEFAULT_SETTINGS };
const audioManager = new AudioManager(settings);

const difficultyOptions: Record<Difficulty, { label: string; description: string }> = {
  easy: {
    label: 'Легкий',
    description: 'Враги слабее в 2 раза',
  },
  normal: {
    label: 'Средний',
    description: 'Базовый вариант',
  },
  hard: {
    label: 'Тяжелый',
    description: 'Враги сильнее в 2 раза',
  },
  impossible: {
    label: 'Невозможный',
    description: 'Враги сильнее в 4 раза',
  },
};

let selectedDifficulty: Difficulty | null = null;

function clampVolume(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_VOLUME;
  }

  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(numericValue)));
}

function isButtonSound(value: unknown): value is ButtonSound {
  return typeof value === 'string' && value in BUTTON_SOUND_LABELS;
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && value in difficultyOptions;
}

function applySettings(): void {
  audioManager.setSettings(settings);
}

function render(screen: Screen): void {
  if (screen === 'menu') {
    app.innerHTML = `
      <main class="screen" aria-labelledby="menu-title">
        <section class="menu-card">
          <p class="eyebrow">Прототип</p>
          <h1 id="menu-title">Главное меню</h1>
          <nav class="menu-actions" aria-label="Основные разделы">
            <button class="menu-button" type="button" data-screen="difficulty">Играть</button>
            <button class="menu-button" type="button" data-screen="tests">Тесты</button>
            <button class="menu-button" type="button" data-screen="settings">Настройки</button>
          </nav>
        </section>
      </main>
    `;
    return;
  }

  if (screen === 'settings') {
    renderSettings();
    return;
  }

  if (screen === 'difficulty') {
    renderDifficulty();
    return;
  }

  if (screen === 'play') {
    renderPlay();
    return;
  }

  app.innerHTML = `
    <main class="screen" aria-labelledby="placeholder-title">
      <section class="menu-card placeholder-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="placeholder-title">Тесты</h1>
        <p class="placeholder-text">Раздел тестов пока пуст.</p>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderDifficulty(): void {
  const options = Object.entries(difficultyOptions)
    .map(([value, option]) => `
      <button class="difficulty-option" type="button" data-difficulty="${value}">
        <strong>${option.label}</strong>
        <small>${option.description}</small>
      </button>
    `)
    .join('');

  app.innerHTML = `
    <main class="screen" aria-labelledby="difficulty-title">
      <section class="menu-card difficulty-card">
        <p class="eyebrow">Новая игра</p>
        <h1 id="difficulty-title">Сложность</h1>
        <div class="difficulty-list" aria-label="Выбор уровня сложности">
          ${options}
        </div>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderPlay(): void {
  const selected = selectedDifficulty ? difficultyOptions[selectedDifficulty] : null;
  const difficultyText = selected
    ? `Сложность: ${selected.label}. ${selected.description}.`
    : 'Сложность ещё не выбрана.';

  app.innerHTML = `
    <main class="screen" aria-labelledby="play-title">
      <section class="menu-card placeholder-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="play-title">Игра</h1>
        <p class="placeholder-text">${difficultyText}</p>
        <p class="placeholder-text">Игровой экран пока не добавлен.</p>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderSettings(): void {
  const soundOptions = Object.entries(BUTTON_SOUND_LABELS)
    .map(([value, label]) => {
      const selected = value === settings.buttonSound ? ' selected' : '';
      return `<option value="${value}"${selected}>${label}</option>`;
    })
    .join('');

  app.innerHTML = `
    <main class="screen" aria-labelledby="settings-title">
      <section class="menu-card settings-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="settings-title">Настройки</h1>

        <div class="settings-list">
          <div class="setting-range-row">
            <div class="setting-range-heading">
              <span class="setting-copy">
                <strong>Музыка</strong>
                <small>Громкость фоновой музыки</small>
              </span>
              <output for="music-volume">${settings.musicVolume}%</output>
            </div>
            <input
              class="setting-range"
              id="music-volume"
              type="range"
              min="${MIN_VOLUME}"
              max="${MAX_VOLUME}"
              step="1"
              value="${settings.musicVolume}"
              data-setting="musicVolume"
              aria-label="Громкость музыки"
            />
          </div>

          <div class="setting-range-row">
            <div class="setting-range-heading">
              <span class="setting-copy">
                <strong>Звуки</strong>
                <small>Громкость звуков кнопок</small>
              </span>
              <output for="button-sound-volume">${settings.buttonSoundVolume}%</output>
            </div>
            <input
              class="setting-range"
              id="button-sound-volume"
              type="range"
              min="${MIN_VOLUME}"
              max="${MAX_VOLUME}"
              step="1"
              value="${settings.buttonSoundVolume}"
              data-setting="buttonSoundVolume"
              aria-label="Громкость звуков кнопок"
            />
          </div>

          <label class="setting-row" for="button-sound">
            <span class="setting-copy">
              <strong>Звук кнопок</strong>
              <small>Пять вариантов интерфейсного SFX</small>
            </span>
            <select class="setting-select" id="button-sound" data-setting="buttonSound">
              ${soundOptions}
            </select>
          </label>
        </div>

        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function updateVolumeSetting(target: HTMLInputElement): void {
  const value = clampVolume(target.value);

  if (target.dataset.setting === 'musicVolume') {
    settings.musicVolume = value;
  } else if (target.dataset.setting === 'buttonSoundVolume') {
    settings.buttonSoundVolume = value;
  } else {
    return;
  }

  applySettings();

  if (settings.musicVolume > 0) {
    audioManager.startMusic();
  }

  const output = target.closest('.setting-range-row')?.querySelector('output');

  if (output) {
    output.textContent = `${value}%`;
  }
}

app.addEventListener('click', (event: MouseEvent) => {
  const clickedElement = event.target;

  if (!(clickedElement instanceof Element)) {
    return;
  }

  const button = clickedElement.closest<HTMLButtonElement>('button');

  if (!button || !app.contains(button)) {
    return;
  }

  audioManager.startMusic();
  audioManager.playButtonSound();

  if (isDifficulty(button.dataset.difficulty)) {
    selectedDifficulty = button.dataset.difficulty;
    render('play');
    return;
  }

  const nextScreen = button.dataset.screen as Screen | undefined;

  if (nextScreen) {
    render(nextScreen);
  }
});

app.addEventListener('input', (event: Event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.type === 'range') {
    updateVolumeSetting(target);
  }
});

app.addEventListener('change', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.dataset.setting === 'buttonSound' && isButtonSound(target.value)) {
    settings.buttonSound = target.value;
    applySettings();
    return;
  }
});

window.addEventListener('pointerdown', () => audioManager.startMusic(), { passive: true });
window.addEventListener('keydown', () => audioManager.startMusic());

applySettings();
render('menu');
