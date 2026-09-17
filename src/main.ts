import './style.css';
import {
  AudioManager,
  BUTTON_SOUND_LABELS,
  type AudioSettings,
  type ButtonSound,
} from './audio';

type Screen = 'menu' | 'difficulty' | 'play' | 'tests' | 'settings';
type Difficulty = 'easy' | 'normal' | 'hard' | 'impossible';
type BattleMenu = 'skill' | 'magic' | null;
type BattleResult = 'win' | 'lose' | null;
type BattleLogType = 'system' | 'player' | 'enemy' | 'miss' | 'heal' | 'item' | 'victory' | 'defeat';
type BattleAction = 'attack' | 'skill-menu' | 'magic-menu' | 'double-strike' | 'heal' | 'item' | 'close-menu';
type Settings = AudioSettings;

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;
const MAX_HEALTH = 10;
const LOG_LIMIT = 8;

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 38,
  buttonSoundVolume: 62,
  buttonSound: 'rune',
};

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

interface BattleLogEntry {
  text: string;
  type: BattleLogType;
}

interface BattleState {
  playerHealth: number;
  skeletonHealth: number;
  herbCount: number;
  doubleStrikeCooldown: number;
  healCooldown: number;
  openMenu: BattleMenu;
  result: BattleResult;
  log: BattleLogEntry[];
}

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Не найден корневой элемент приложения.');
}

const app = appElement;
const settings: Settings = { ...DEFAULT_SETTINGS };
const audioManager = new AudioManager(settings);
let activeScreen: Screen = 'menu';
let selectedDifficulty: Difficulty | null = null;
let battleState = createBattleState();

function createBattleState(): BattleState {
  return {
    playerHealth: MAX_HEALTH,
    skeletonHealth: MAX_HEALTH,
    herbCount: 1,
    doubleStrikeCooldown: 0,
    healCooldown: 0,
    openMenu: null,
    result: null,
    log: [
      { type: 'system', text: 'Бой начался. Ваш ход.' },
      { type: 'system', text: 'Скелет 1 Ур. поднимает оружие.' },
    ],
  };
}

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

function isBattleAction(value: unknown): value is BattleAction {
  return (
    value === 'attack' ||
    value === 'skill-menu' ||
    value === 'magic-menu' ||
    value === 'double-strike' ||
    value === 'heal' ||
    value === 'item' ||
    value === 'close-menu'
  );
}

function applySettings(): void {
  audioManager.setSettings(settings);
}

function render(screen: Screen): void {
  activeScreen = screen;

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
    renderBattle();
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
                <small>Громкость звуков кнопок и боя</small>
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
              aria-label="Громкость звуков кнопок и боя"
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

function renderBattle(): void {
  const playerHealthPercent = healthPercent(battleState.playerHealth);
  const skeletonHealthPercent = healthPercent(battleState.skeletonHealth);
  const actionDisabled = battleState.result !== null ? ' disabled' : '';
  const doubleDisabled = battleState.doubleStrikeCooldown > 0 || battleState.result !== null ? ' disabled' : '';
  const healDisabled = battleState.healCooldown > 0 || battleState.result !== null ? ' disabled' : '';
  const itemDisabled = battleState.herbCount <= 0 || battleState.result !== null ? ' disabled' : '';
  const difficultyLabel = selectedDifficulty ? difficultyOptions[selectedDifficulty].label : 'Средний';
  const logMarkup = battleState.log
    .slice(-LOG_LIMIT)
    .map((entry) => `<li class="battle-log-entry" data-log-type="${entry.type}">${entry.text}</li>`)
    .join('');
  const resultMarkup = battleState.result
    ? `<p class="battle-result" data-result="${battleState.result}">
        ${battleState.result === 'win' ? 'Победа! Скелет повержен.' : 'Поражение. Скелет одолел вас.'}
      </p>`
    : '';

  app.innerHTML = `
    <main class="battle-screen" aria-labelledby="battle-title">
      <section class="battle-card">
        <header class="battle-header">
          <div>
            <p class="eyebrow">Тест 1 · Бой 1 на 1 · ${difficultyLabel}</p>
            <h1 id="battle-title">Схватка в замковом коридоре</h1>
          </div>
          <span class="battle-turn-label">Ваш ход</span>
        </header>

        <section class="battle-scene" aria-label="Коридор замка и противник">
          <div class="battle-enemy-status">
            <div class="battle-health-heading">
              <strong>Скелет 1 Ур.</strong>
              <output>${battleState.skeletonHealth}/${MAX_HEALTH}</output>
            </div>
            <div class="battle-health-bar" role="progressbar" aria-label="Здоровье скелета" aria-valuemin="0" aria-valuemax="${MAX_HEALTH}" aria-valuenow="${battleState.skeletonHealth}">
              <span class="battle-health-fill" style="width: ${skeletonHealthPercent}%"></span>
            </div>
          </div>
          <img class="skeleton-sprite" src="/assets/skeleton-warrior.png" alt="Скелет в доспехах" />
        </section>

        <section class="battle-player-status" aria-label="Ваше здоровье">
          <div class="battle-health-heading">
            <strong>Вы</strong>
            <output>${battleState.playerHealth}/${MAX_HEALTH}</output>
          </div>
          <div class="battle-health-bar" role="progressbar" aria-label="Ваше здоровье" aria-valuemin="0" aria-valuemax="${MAX_HEALTH}" aria-valuenow="${battleState.playerHealth}">
            <span class="battle-health-fill" style="width: ${playerHealthPercent}%"></span>
          </div>
        </section>

        <div class="battle-lower">
          <section class="battle-actions" aria-label="Действия">
            <button class="battle-action battle-action-attack" type="button" data-battle-action="attack"${actionDisabled}>
              <strong>Атаковать</strong>
              <small>Урон 1–2 · шанс 95%</small>
            </button>
            <button class="battle-action" type="button" data-battle-action="skill-menu"${actionDisabled}>
              <strong>Умение</strong>
              <small>Открыть список умений</small>
            </button>
            <button class="battle-action" type="button" data-battle-action="magic-menu"${actionDisabled}>
              <strong>Магия</strong>
              <small>Открыть список заклинаний</small>
            </button>
            <button class="battle-action" type="button" data-battle-action="item"${itemDisabled}>
              <strong>Предмет</strong>
              <small>Лечебная трава · ${battleState.herbCount} шт.</small>
            </button>
            <button class="battle-action battle-action-run" type="button" disabled>
              <strong>Бежать</strong>
              <small>Недоступно в этом тесте</small>
            </button>
          </section>

          <section class="battle-log-panel" aria-labelledby="battle-log-title">
            <div class="battle-log-heading">
              <h2 id="battle-log-title">Журнал боя</h2>
              <span>Ход за ходом</span>
            </div>
            <ol class="battle-log" aria-live="polite">
              ${logMarkup}
            </ol>
            ${resultMarkup}
          </section>
        </div>

        ${renderBattleDialog(doubleDisabled, healDisabled)}

        <button class="menu-button menu-button-secondary battle-menu-button" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderBattleDialog(doubleDisabled: string, healDisabled: string): string {
  if (!battleState.openMenu) {
    return '';
  }

  if (battleState.openMenu === 'skill') {
    return `
      <div class="battle-dialog-backdrop" data-close-battle-menu>
        <section class="battle-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-dialog-title">
          <button class="battle-dialog-close" type="button" data-battle-action="close-menu" aria-label="Закрыть">×</button>
          <p class="eyebrow">Умение</p>
          <h2 id="skill-dialog-title">Выберите умение</h2>
          <button class="battle-dialog-option" type="button" data-battle-action="double-strike"${doubleDisabled}>
            <strong>Двойной удар</strong>
            <small>Две атаки · урон 1–2 каждая · шанс 95%</small>
            <span>${battleState.doubleStrikeCooldown > 0 ? `Перезарядка: ${battleState.doubleStrikeCooldown} ход.` : 'Готово'}</span>
          </button>
        </section>
      </div>
    `;
  }

  return `
    <div class="battle-dialog-backdrop" data-close-battle-menu>
      <section class="battle-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-dialog-title">
        <button class="battle-dialog-close" type="button" data-battle-action="close-menu" aria-label="Закрыть">×</button>
        <p class="eyebrow">Магия</p>
        <h2 id="magic-dialog-title">Выберите заклинание</h2>
        <button class="battle-dialog-option" type="button" data-battle-action="heal"${healDisabled}>
          <strong>Лечение</strong>
          <small>Восстанавливает 5 здоровья</small>
          <span>${battleState.healCooldown > 0 ? `Перезарядка: ${battleState.healCooldown} ход.` : 'Готово'}</span>
        </button>
      </section>
    </div>
  `;
}

function healthPercent(value: number): number {
  return Math.max(0, Math.min(100, (value / MAX_HEALTH) * 100));
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addBattleLog(type: BattleLogType, text: string): void {
  battleState.log.push({ type, text });
  battleState.log = battleState.log.slice(-LOG_LIMIT);
}

function advanceCooldowns(): void {
  battleState.doubleStrikeCooldown = Math.max(0, battleState.doubleStrikeCooldown - 1);
  battleState.healCooldown = Math.max(0, battleState.healCooldown - 1);
}

function resolvePlayerStrike(label: string, playSound: boolean): boolean {
  if (Math.random() >= 0.95) {
    addBattleLog('miss', `${label}: промах.`);
    if (playSound) {
      audioManager.playBattleSound('miss');
    }
    return false;
  }

  const damage = randomInteger(1, 2);
  battleState.skeletonHealth = Math.max(0, battleState.skeletonHealth - damage);
  addBattleLog('player', `${label}: ${damage} урона скелету.`);

  if (playSound) {
    audioManager.playBattleSound('hit');
  }

  return true;
}

function enemyTurn(): void {
  if (battleState.skeletonHealth <= 0 || battleState.result) {
    finishBattle('win');
    return;
  }

  if (Math.random() >= 0.95) {
    addBattleLog('miss', 'Скелет атакует: промах.');
    audioManager.playBattleSound('miss');
  } else {
    const damage = randomInteger(2, 4);
    battleState.playerHealth = Math.max(0, battleState.playerHealth - damage);
    addBattleLog('enemy', `Скелет наносит ${damage} урона.`);
    audioManager.playBattleSound('hit');
  }

  if (battleState.playerHealth <= 0) {
    finishBattle('lose');
    return;
  }

  addBattleLog('system', 'Ваш ход.');
}

function finishBattle(result: Exclude<BattleResult, null>): void {
  if (battleState.result) {
    return;
  }

  battleState.result = result;
  battleState.openMenu = null;
  addBattleLog(result === 'win' ? 'victory' : 'defeat', result === 'win' ? 'Победа! Скелет повержен.' : 'Поражение. Вы потеряли сознание.');
}

function handleBattleAction(action: BattleAction): void {
  if (action === 'close-menu') {
    battleState.openMenu = null;
    render('play');
    return;
  }

  if (action === 'skill-menu') {
    if (!battleState.result) {
      battleState.openMenu = 'skill';
      render('play');
    }
    return;
  }

  if (action === 'magic-menu') {
    if (!battleState.result) {
      battleState.openMenu = 'magic';
      render('play');
    }
    return;
  }

  if (battleState.result) {
    return;
  }

  battleState.openMenu = null;

  if (action === 'attack') {
    advanceCooldowns();
    resolvePlayerStrike('Атака', true);
    enemyTurn();
  } else if (action === 'double-strike') {
    if (battleState.doubleStrikeCooldown > 0) {
      return;
    }

    advanceCooldowns();
    battleState.doubleStrikeCooldown = 5;
    audioManager.playBattleSound('double');
    resolvePlayerStrike('Двойной удар — первый удар', false);
    if (battleState.skeletonHealth > 0) {
      resolvePlayerStrike('Двойной удар — второй удар', false);
    }
    enemyTurn();
  } else if (action === 'heal') {
    if (battleState.healCooldown > 0) {
      return;
    }

    advanceCooldowns();
    battleState.healCooldown = 5;
    const healed = Math.min(5, MAX_HEALTH - battleState.playerHealth);
    battleState.playerHealth += healed;
    addBattleLog('heal', healed > 0 ? `Лечение восстанавливает ${healed} здоровья.` : 'Лечение: здоровье уже полное.');
    audioManager.playBattleSound('magic');
    enemyTurn();
  } else if (action === 'item') {
    if (battleState.herbCount <= 0) {
      return;
    }

    advanceCooldowns();
    battleState.herbCount = 0;
    const healed = Math.min(3, MAX_HEALTH - battleState.playerHealth);
    battleState.playerHealth += healed;
    addBattleLog('item', healed > 0 ? `Лечебная трава восстанавливает ${healed} здоровья.` : 'Лечебная трава: здоровье уже полное.');
    audioManager.playBattleSound('item');
    enemyTurn();
  }

  render('play');
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

  if (settings.musicVolume > 0 && activeScreen !== 'play') {
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

  if (clickedElement.matches('[data-close-battle-menu]')) {
    battleState.openMenu = null;
    render('play');
    return;
  }

  const button = clickedElement.closest<HTMLButtonElement>('button');

  if (!button || !app.contains(button)) {
    return;
  }

  audioManager.playButtonSound();

  if (isDifficulty(button.dataset.difficulty)) {
    selectedDifficulty = button.dataset.difficulty;
    battleState = createBattleState();
    audioManager.startBattleMusic();
    render('play');
    return;
  }

  const battleAction = button.dataset.battleAction;

  if (isBattleAction(battleAction)) {
    handleBattleAction(battleAction);
    return;
  }

  const nextScreen = button.dataset.screen as Screen | undefined;

  if (nextScreen) {
    if (nextScreen === 'menu' || nextScreen === 'difficulty' || nextScreen === 'settings' || nextScreen === 'tests') {
      audioManager.startMusic();
    }
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
    audioManager.playButtonSound();
  }
});

window.addEventListener('pointerdown', () => {
  if (activeScreen !== 'play') {
    audioManager.startMusic();
  }
}, { passive: true });
window.addEventListener('keydown', () => {
  if (activeScreen !== 'play') {
    audioManager.startMusic();
  }
});

applySettings();
render('menu');
