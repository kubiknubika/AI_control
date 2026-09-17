import './style.css';
import {
  AudioManager,
  BUTTON_SOUND_LABELS,
  type AudioSettings,
  type ButtonSound,
} from './audio';

type Screen = 'menu' | 'play' | 'tests' | 'settings';

interface Settings extends AudioSettings {
  backgroundAnimation: boolean;
  backgroundBlurEnabled: boolean;
  blurStrength: number;
}

const MIN_BLUR = 0;
const MAX_BLUR = 18;

const DEFAULT_SETTINGS: Settings = {
  musicEnabled: true,
  buttonSoundsEnabled: true,
  buttonSound: 'soft',
  backgroundAnimation: true,
  backgroundBlurEnabled: false,
  blurStrength: 8,
};

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Не найден корневой элемент приложения.');
}

const app = appElement;
const settings = loadSettings();
const audioManager = new AudioManager(settings);

const placeholderScreens: Record<Exclude<Screen, 'menu' | 'settings'>, { title: string; text: string }> = {
  play: {
    title: 'Игра',
    text: 'Игровой экран пока не добавлен.',
  },
  tests: {
    title: 'Тесты',
    text: 'Раздел тестов пока пуст.',
  },
};

function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

function isButtonSound(value: unknown): value is ButtonSound {
  return typeof value === 'string' && value in BUTTON_SOUND_LABELS;
}

function clampBlur(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SETTINGS.blurStrength;
  }

  return Math.min(MAX_BLUR, Math.max(MIN_BLUR, Math.round(numericValue)));
}

function applySettings(): void {
  document.body.classList.toggle('background-animation', settings.backgroundAnimation);
  document.documentElement.style.setProperty(
    '--background-blur',
    `${settings.backgroundBlurEnabled ? settings.blurStrength : 0}px`,
  );
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
            <button class="menu-button" type="button" data-screen="play">Играть</button>
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

  const placeholder = placeholderScreens[screen];

  app.innerHTML = `
    <main class="screen" aria-labelledby="placeholder-title">
      <section class="menu-card placeholder-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="placeholder-title">${placeholder.title}</h1>
        <p class="placeholder-text">${placeholder.text}</p>
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
          <label class="setting-row" for="music-enabled">
            <span class="setting-copy">
              <strong>Музыка меню</strong>
              <small>Фоновая музыка RPG-меню</small>
            </span>
            <input
              class="setting-checkbox"
              id="music-enabled"
              type="checkbox"
              data-setting="musicEnabled"
              ${settings.musicEnabled ? 'checked' : ''}
            />
          </label>

          <label class="setting-row" for="button-sounds-enabled">
            <span class="setting-copy">
              <strong>Звуки кнопок</strong>
              <small>Включить или отключить все звуки интерфейса</small>
            </span>
            <input
              class="setting-checkbox"
              id="button-sounds-enabled"
              type="checkbox"
              data-setting="buttonSoundsEnabled"
              ${settings.buttonSoundsEnabled ? 'checked' : ''}
            />
          </label>

          <label class="setting-row" for="button-sound">
            <span class="setting-copy">
              <strong>Звук кнопок</strong>
              <small>Выберите один из пяти вариантов</small>
            </span>
            <select class="setting-select" id="button-sound" data-setting="buttonSound">
              ${soundOptions}
            </select>
          </label>

          <label class="setting-row" for="background-animation">
            <span class="setting-copy">
              <strong>Анимация фона</strong>
              <small>Плавное движение изображения из стороны в сторону</small>
            </span>
            <input
              class="setting-checkbox"
              id="background-animation"
              type="checkbox"
              data-setting="backgroundAnimation"
              ${settings.backgroundAnimation ? 'checked' : ''}
            />
          </label>

          <label class="setting-row" for="background-blur">
            <span class="setting-copy">
              <strong>Размытие фона</strong>
              <small>Добавляет мягкий blur к фоновой иллюстрации</small>
            </span>
            <input
              class="setting-checkbox"
              id="background-blur"
              type="checkbox"
              data-setting="backgroundBlurEnabled"
              ${settings.backgroundBlurEnabled ? 'checked' : ''}
            />
          </label>

          <div class="setting-range-row">
            <div class="setting-range-heading">
              <span class="setting-copy">
                <strong>Сила размытия</strong>
                <small>Можно менять независимо от включения blur</small>
              </span>
              <output id="blur-output" for="blur-strength">${settings.blurStrength}px</output>
            </div>
            <input
              class="setting-range"
              id="blur-strength"
              type="range"
              min="${MIN_BLUR}"
              max="${MAX_BLUR}"
              step="1"
              value="${settings.blurStrength}"
              data-setting="blurStrength"
            />
          </div>
        </div>

        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

app.addEventListener('click', (event: MouseEvent) => {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  audioManager.startMusic();
  audioManager.playButtonSound();

  const nextScreen = target.dataset.screen as Screen | undefined;

  if (nextScreen) {
    render(nextScreen);
  }
});

app.addEventListener('input', (event: Event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.dataset.setting !== 'blurStrength') {
    return;
  }

  settings.blurStrength = clampBlur(target.value);
  applySettings();

  const output = document.querySelector<HTMLOutputElement>('#blur-output');

  if (output) {
    output.value = `${settings.blurStrength}px`;
    output.textContent = `${settings.blurStrength}px`;
  }
});

app.addEventListener('change', (event: Event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement) {
    switch (target.dataset.setting) {
      case 'musicEnabled':
        settings.musicEnabled = target.checked;
        break;
      case 'buttonSoundsEnabled':
        settings.buttonSoundsEnabled = target.checked;
        break;
      case 'backgroundAnimation':
        settings.backgroundAnimation = target.checked;
        break;
      case 'backgroundBlurEnabled':
        settings.backgroundBlurEnabled = target.checked;
        break;
      default:
        return;
    }
  } else if (target instanceof HTMLSelectElement && target.dataset.setting === 'buttonSound') {
    if (!isButtonSound(target.value)) {
      return;
    }

    settings.buttonSound = target.value;
  } else {
    return;
  }

  applySettings();

  if (settings.musicEnabled) {
    audioManager.startMusic();
  }

  if (target instanceof HTMLInputElement && target.dataset.setting === 'backgroundBlurEnabled') {
    render('settings');
  }
});

window.addEventListener('pointerdown', () => audioManager.startMusic(), { passive: true });
window.addEventListener('keydown', () => audioManager.startMusic());

applySettings();
render('menu');
