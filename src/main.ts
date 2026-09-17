import './style.css';
import {
  AudioManager,
  BUTTON_SOUND_LABELS,
  type AudioSettings,
  type ButtonSound,
} from './audio';

type Screen = 'menu' | 'play' | 'tests' | 'difficulty' | 'testBattle' | 'test2' | 'settings';
type Difficulty = 'easy' | 'normal' | 'hard' | 'impossible';
type Test2Faction = 'knights' | 'demons';
type BattleMenu = 'skill' | 'magic' | null;
type BattleResult = 'win' | 'lose' | null;
type BattleAnimation =
  | 'player-attack'
  | 'player-double'
  | 'skeleton-hit'
  | 'skeleton-dodge'
  | 'enemy-attack'
  | 'player-hit'
  | 'player-dodge'
  | 'player-cast'
  | 'player-heal'
  | 'player-item'
  | null;
type BattleLogType = 'system' | 'player' | 'enemy' | 'miss' | 'heal' | 'item' | 'victory' | 'defeat';
type BattleAction = 'attack' | 'skill-menu' | 'magic-menu' | 'double-strike' | 'heal' | 'item' | 'close-menu';
type Settings = AudioSettings;

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;
const MAX_HEALTH = 10;
const BASE_ENEMY_HEALTH = 10;
const BASE_ENEMY_DAMAGE = { min: 2, max: 4 };
const LOG_LIMIT = 8;
const TEST2_WIDTH = 12;
const TEST2_HEIGHT = 6;
const TEST2_SCHEDULE: Test2Faction[] = [
  'knights',
  'demons',
  'knights',
  'demons',
  'knights',
  'demons',
  'knights',
  'demons',
  'knights',
];
const HIT_CHANCE = 0.95;

const DEFAULT_SETTINGS: Settings = {
  musicVolume: 38,
  buttonSoundVolume: 62,
  buttonSound: 'rune',
};

const difficultyOptions: Record<Difficulty, { label: string; description: string; enemyMultiplier: number }> = {
  easy: {
    label: 'Легкий',
    description: 'Враги слабее в 2 раза',
    enemyMultiplier: 0.5,
  },
  normal: {
    label: 'Средний',
    description: 'Базовый вариант',
    enemyMultiplier: 1,
  },
  hard: {
    label: 'Тяжелый',
    description: 'Враги сильнее в 2 раза',
    enemyMultiplier: 2,
  },
  impossible: {
    label: 'Невозможный',
    description: 'Враги сильнее в 4 раза',
    enemyMultiplier: 4,
  },
};

interface BattleLogEntry {
  text: string;
  type: BattleLogType;
}

interface BattleState {
  playerHealth: number;
  skeletonHealth: number;
  skeletonMaxHealth: number;
  herbCount: number;
  doubleStrikeCooldown: number;
  healCooldown: number;
  openMenu: BattleMenu;
  result: BattleResult;
  animation: BattleAnimation;
  busy: boolean;
  log: BattleLogEntry[];
}

interface Test2Stack {
  id: Test2Faction;
  label: string;
  shortLabel: string;
  count: number;
  maxCount: number;
  unitHealth: number;
  maxHealth: number;
  health: number;
  damage: number;
  defense: number;
  initiative: number;
  maxActionPoints: number;
  actionPoints: number;
  x: number;
  y: number;
  hasAttacked: boolean;
  abilityUsed: boolean;
}

interface Test2State {
  stacks: Record<Test2Faction, Test2Stack>;
  scheduleIndex: number;
  cycle: number;
  selected: Test2Faction | null;
  result: 'win' | 'lose' | null;
  log: string[];
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
let test2State = createTest2State();

function getSelectedDifficulty(): Difficulty {
  return selectedDifficulty ?? 'normal';
}

function getEnemyProfile(): { maxHealth: number; damageMin: number; damageMax: number } {
  const multiplier = difficultyOptions[getSelectedDifficulty()].enemyMultiplier;
  return {
    maxHealth: Math.max(1, Math.round(BASE_ENEMY_HEALTH * multiplier)),
    damageMin: Math.max(1, Math.round(BASE_ENEMY_DAMAGE.min * multiplier)),
    damageMax: Math.max(1, Math.round(BASE_ENEMY_DAMAGE.max * multiplier)),
  };
}

function createBattleState(): BattleState {
  const enemy = getEnemyProfile();
  const difficulty = difficultyOptions[getSelectedDifficulty()];

  return {
    playerHealth: MAX_HEALTH,
    skeletonHealth: enemy.maxHealth,
    skeletonMaxHealth: enemy.maxHealth,
    herbCount: 1,
    doubleStrikeCooldown: 0,
    healCooldown: 0,
    openMenu: null,
    result: null,
    animation: null,
    busy: false,
    log: [
      { type: 'system', text: `Сложность: ${difficulty.label}.` },
      { type: 'system', text: `Скелет: ${enemy.maxHealth} HP, урон ${enemy.damageMin}–${enemy.damageMax}.` },
      { type: 'system', text: 'Бой начался. Ваш ход.' },
      { type: 'system', text: 'Скелет 1 Ур. поднимает оружие.' },
    ],
  };
}

function createTest2State(): Test2State {
  const knights: Test2Stack = {
    id: 'knights',
    label: 'Рыцари',
    shortLabel: 'Рыцари',
    count: 10,
    maxCount: 10,
    unitHealth: 40,
    maxHealth: 10 * 40,
    health: 10 * 40,
    damage: 10,
    defense: 3,
    initiative: 5,
    maxActionPoints: 4,
    actionPoints: 4,
    x: 1,
    y: 2,
    hasAttacked: false,
    abilityUsed: false,
  };
  const demons: Test2Stack = {
    id: 'demons',
    label: 'Демоны',
    shortLabel: 'Демоны',
    count: 4,
    maxCount: 4,
    unitHealth: 65,
    maxHealth: 4 * 65,
    health: 4 * 65,
    damage: 15,
    defense: 6,
    initiative: 4,
    maxActionPoints: 4,
    actionPoints: 0,
    x: 10,
    y: 3,
    hasAttacked: false,
    abilityUsed: false,
  };

  return {
    stacks: { knights, demons },
    scheduleIndex: 0,
    cycle: 1,
    selected: 'knights',
    result: null,
    log: [
      'Инициатива: Рыцари 5, Демоны 4.',
      'Рыцари ходят первыми. Выберите клетку или действие.',
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

  if (screen === 'tests') {
    renderTests();
    return;
  }

  if (screen === 'difficulty') {
    renderDifficulty();
    return;
  }

  if (screen === 'testBattle') {
    renderBattle();
    return;
  }

  if (screen === 'test2') {
    renderTest2();
    return;
  }

  renderPlayPlaceholder();
}

function renderPlayPlaceholder(): void {
  app.innerHTML = `
    <main class="screen" aria-labelledby="play-title">
      <section class="menu-card placeholder-card">
        <p class="eyebrow">Прототип</p>
        <h1 id="play-title">Игра</h1>
        <p class="placeholder-text">Игровой экран пока не добавлен.</p>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderTests(): void {
  app.innerHTML = `
    <main class="screen" aria-labelledby="tests-title">
      <section class="menu-card tests-card">
        <p class="eyebrow">Проверка механик</p>
        <h1 id="tests-title">Тесты</h1>
        <div class="test-list">
          <button class="test-option" type="button" data-screen="difficulty">
            <strong>Тест 1 · Бой 1 на 1</strong>
            <small>Схватка со скелетом в коридоре замка</small>
          </button>
          <button class="test-option test-option-tactical" type="button" data-screen="test2">
            <strong>Тест 2 · Гексовое поле 12×6</strong>
            <small>Рыцари против демонов · порядок инициативы и очки действий</small>
          </button>
        </div>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function renderTest2(): void {
  const currentFaction = TEST2_SCHEDULE[test2State.scheduleIndex];
  const currentStack = test2State.stacks[currentFaction];
  const selectedStack = test2State.selected ? test2State.stacks[test2State.selected] : null;
  const reachableCells = new Set<string>();

  if (currentFaction === 'knights' && selectedStack?.id === 'knights' && selectedStack.count > 0) {
    for (let y = 0; y < TEST2_HEIGHT; y += 1) {
      for (let x = 0; x < TEST2_WIDTH; x += 1) {
        const occupant = test2StackAt(x, y);
        if (!occupant && test2Distance(selectedStack.x, selectedStack.y, x, y) <= selectedStack.actionPoints) {
          reachableCells.add(test2HexKey(x, y));
        }
      }
    }
  }

  const boardRows = Array.from({ length: TEST2_HEIGHT }, (_, y) => `
    <div class="hex-row" role="row">
      ${Array.from({ length: TEST2_WIDTH }, (_, x) => {
        const stack = test2StackAt(x, y);
        const cellKey = test2HexKey(x, y);
        const classes = [
          'hex-cell',
          reachableCells.has(cellKey) ? 'is-reachable' : '',
          stack && stack.id === 'knights' ? 'is-knights' : '',
          stack && stack.id === 'demons' ? 'is-demons' : '',
          stack && test2State.selected === stack.id ? 'is-selected' : '',
        ].filter(Boolean).join(' ');
        const stackMarkup = stack
          ? `<span class="hex-unit" data-test2-unit="${stack.id}">
              <strong>${stack.shortLabel}</strong>
              <small>×${stack.count}</small>
            </span>`
          : '';

        return `<button class="${classes}" type="button" data-hex-x="${x}" data-hex-y="${y}" aria-label="Клетка ${x + 1}, ${y + 1}">${stackMarkup}</button>`;
      }).join('')}
    </div>
  `).join('');

  const orderMarkup = TEST2_SCHEDULE.map((faction, index) => {
    const ordinal = TEST2_SCHEDULE.slice(0, index + 1).filter((item) => item === faction).length;
    const current = index === test2State.scheduleIndex ? ' is-current' : '';
    return `<span class="test2-order-item ${faction}${current}">${faction === 'knights' ? 'Рыцари' : 'Демоны'} ${ordinal}</span>`;
  }).join('');
  const actionDisabled = currentFaction !== 'knights' || test2State.result !== null ? ' disabled' : '';
  const attackDisabled = actionDisabled || currentStack.hasAttacked || currentStack.actionPoints < 1 || !test2CanAttack('knights') ? ' disabled' : '';
  const healDisabled = actionDisabled || currentStack.abilityUsed || currentStack.actionPoints < 1 ? ' disabled' : '';
  const resultMarkup = test2State.result
    ? `<div class="test2-result ${test2State.result}">${test2State.result === 'win' ? 'Победа! Демоны разбиты.' : 'Поражение. Рыцари уничтожены.'}</div>`
    : '';
  const logMarkup = test2State.log.slice(-7).map((entry) => `<li>${entry}</li>`).join('');

  app.innerHTML = `
    <main class="test2-screen" aria-labelledby="test2-title">
      <section class="test2-card">
        <header class="test2-header">
          <div>
            <p class="eyebrow">Тест 2 · Тактический бой</p>
            <h1 id="test2-title">Рыцари против демонов</h1>
          </div>
          <div class="test2-turn-badge">
            <span>Цикл ${test2State.cycle}</span>
            <strong>${currentStack.label}</strong>
            <small>Инициатива ${currentStack.initiative}</small>
          </div>
        </header>

        <section class="test2-order-panel" aria-label="Порядок действий">
          <div class="test2-panel-heading">
            <strong>Порядок действий</strong>
            <span>Рыцари получают 5 ходов, демоны — 4</span>
          </div>
          <div class="test2-order-list">${orderMarkup}</div>
        </section>

        <div class="test2-layout">
          <section class="hex-board-panel" aria-label="Гексовое поле 12 на 6">
            <div class="hex-board-meta">
              <strong>Поле 12×6</strong>
              <span>Синие — ваши · красные — ИИ</span>
            </div>
            <div class="hex-board" role="grid">
              ${boardRows}
            </div>
            <p class="hex-help">Выберите Рыцарей и нажмите на подсвеченную клетку. Перемещение стоит 1 очко действия за клетку.</p>
          </section>

          <aside class="test2-sidebar">
            ${renderTest2StackCard(test2State.stacks.knights, 'player')}
            ${renderTest2StackCard(test2State.stacks.demons, 'ai')}

            <section class="test2-actions-panel">
              <div class="test2-ap-line">
                <span>Очки действий</span>
                <strong>${currentStack.actionPoints}/${currentStack.maxActionPoints}</strong>
              </div>
              <button class="test2-action test2-action-attack" type="button" data-test2-action="attack"${attackDisabled}>
                <strong>Атаковать</strong>
                <small>Соседняя клетка · 1 ОД</small>
              </button>
              <button class="test2-action" type="button" data-test2-action="heal"${healDisabled}>
                <strong>Исцелить отряд</strong>
                <small>10 HP × число рыцарей · 1 ОД</small>
              </button>
              <button class="test2-action test2-action-end" type="button" data-test2-action="end"${actionDisabled}>
                <strong>Закончить ход</strong>
                <small>Передать инициативу</small>
              </button>
            </section>

            <section class="test2-log-panel" aria-labelledby="test2-log-title">
              <h2 id="test2-log-title">Журнал</h2>
              <ol>${logMarkup}</ol>
            </section>
          </aside>
        </div>

        ${resultMarkup}

        <button class="menu-button menu-button-secondary test2-back-button" type="button" data-screen="tests">
          К списку тестов
        </button>
      </section>
    </main>
  `;
}

function renderTest2StackCard(stack: Test2Stack, side: 'player' | 'ai'): string {
  const current = TEST2_SCHEDULE[test2State.scheduleIndex] === stack.id ? ' is-active' : '';
  const healthPercentValue = Math.max(0, Math.min(100, (stack.health / stack.maxHealth) * 100));

  return `
    <section class="test2-army-card ${side}${current}">
      <div class="test2-army-heading">
        <strong>${stack.label}</strong>
        <span>×${stack.count}</span>
      </div>
      <div class="test2-army-health">
        <span style="width: ${healthPercentValue}%"></span>
      </div>
      <div class="test2-army-health-label">Отряд: ${Math.max(0, Math.round(stack.health))}/${stack.maxHealth} HP</div>
      <div class="test2-stat-grid">
        <span>HP бойца <b>${stack.unitHealth}</b></span>
        <span>Урон <b>${stack.damage}</b></span>
        <span>Защита <b>${stack.defense}</b></span>
        <span>Инициатива <b>${stack.initiative}</b></span>
        <span>ОД <b>${stack.maxActionPoints}</b></span>
      </div>
    </section>
  `;
}

function test2HexKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function test2StackAt(x: number, y: number): Test2Stack | null {
  const stack = Object.values(test2State.stacks).find((candidate) => candidate.count > 0 && candidate.x === x && candidate.y === y);
  return stack ?? null;
}

function test2Neighbors(x: number, y: number): Array<[number, number]> {
  const directions = y % 2 === 0
    ? [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];

  return directions
    .map(([dx, dy]) => [x + dx, y + dy] as [number, number])
    .filter(([nextX, nextY]) => nextX >= 0 && nextX < TEST2_WIDTH && nextY >= 0 && nextY < TEST2_HEIGHT);
}

function test2Distance(startX: number, startY: number, targetX: number, targetY: number): number {
  if (startX === targetX && startY === targetY) {
    return 0;
  }

  const queue: Array<[number, number, number]> = [[startX, startY, 0]];
  const visited = new Set<string>([test2HexKey(startX, startY)]);

  while (queue.length > 0) {
    const [x, y, distance] = queue.shift() as [number, number, number];

    for (const [nextX, nextY] of test2Neighbors(x, y)) {
      const key = test2HexKey(nextX, nextY);
      if (visited.has(key)) {
        continue;
      }
      if (nextX === targetX && nextY === targetY) {
        return distance + 1;
      }
      visited.add(key);
      queue.push([nextX, nextY, distance + 1]);
    }
  }

  return Number.POSITIVE_INFINITY;
}

function test2LivingCount(stack: Test2Stack): number {
  return stack.health > 0 ? Math.ceil(stack.health / stack.unitHealth) : 0;
}

function syncTest2Count(stack: Test2Stack): void {
  stack.count = test2LivingCount(stack);
}

function test2CanAttack(attackerId: Test2Faction): boolean {
  const attacker = test2State.stacks[attackerId];
  const targetId: Test2Faction = attackerId === 'knights' ? 'demons' : 'knights';
  const target = test2State.stacks[targetId];

  return attacker.count > 0 && target.count > 0 && test2Distance(attacker.x, attacker.y, target.x, target.y) === 1;
}

function test2AddLog(text: string): void {
  test2State.log.push(text);
  test2State.log = test2State.log.slice(-8);
}

function resetTest2Turn(stack: Test2Stack): void {
  stack.actionPoints = stack.maxActionPoints;
  stack.hasAttacked = false;
  stack.abilityUsed = false;
}

function test2Attack(attackerId: Test2Faction): void {
  const attacker = test2State.stacks[attackerId];
  const targetId: Test2Faction = attackerId === 'knights' ? 'demons' : 'knights';
  const target = test2State.stacks[targetId];

  if (attacker.actionPoints < 1 || attacker.hasAttacked || !test2CanAttack(attackerId)) {
    test2AddLog('Атака невозможна: цель должна быть на соседней клетке.');
    return;
  }

  const damagePerUnit = Math.max(1, attacker.damage - target.defense);
  const damage = damagePerUnit * attacker.count;
  target.health = Math.max(0, target.health - damage);
  syncTest2Count(target);
  attacker.actionPoints -= 1;
  attacker.hasAttacked = true;
  audioManager.playBattleSound('hit');
  test2AddLog(`${attacker.label} атакуют: ${damage} урона. ${target.label} осталось: ${target.count}.`);

  if (target.count <= 0) {
    test2State.result = attackerId === 'knights' ? 'win' : 'lose';
    audioManager.playBattleSound(attackerId === 'knights' ? 'victory' : 'defeat');
    test2AddLog(attackerId === 'knights' ? 'Победа! Демоны разбиты.' : 'Поражение. Рыцари уничтожены.');
  }
}

function test2Heal(): void {
  const knights = test2State.stacks.knights;
  if (knights.abilityUsed || knights.actionPoints < 1 || knights.count <= 0) {
    return;
  }

  const amount = 10 * knights.count;
  const healed = Math.min(amount, knights.maxHealth - knights.health);
  knights.health += healed;
  knights.actionPoints -= 1;
  knights.abilityUsed = true;
  audioManager.playBattleSound('magic');
  test2AddLog(`Исцеление отряда: +${healed} HP (${knights.count} рыцарей × 10).`);
}

function performTest2AiTurn(): void {
  const demons = test2State.stacks.demons;
  const knights = test2State.stacks.knights;

  if (demons.count <= 0 || knights.count <= 0) {
    return;
  }

  let moved = 0;
  while (demons.actionPoints > 0 && test2Distance(demons.x, demons.y, knights.x, knights.y) > 1) {
    const nextCell = test2Neighbors(demons.x, demons.y)
      .filter(([x, y]) => !test2StackAt(x, y))
      .sort((left, right) => test2Distance(left[0], left[1], knights.x, knights.y) - test2Distance(right[0], right[1], knights.x, knights.y))[0];

    if (!nextCell) {
      break;
    }

    demons.x = nextCell[0];
    demons.y = nextCell[1];
    demons.actionPoints -= 1;
    moved += 1;
  }

  if (moved > 0) {
    test2AddLog(`Демоны приближаются к рыцарям на ${moved} клеток.`);
  }

  if (test2CanAttack('demons') && demons.actionPoints > 0) {
    test2Attack('demons');
  } else {
    test2AddLog('Демоны не достают до рыцарей и заканчивают ход.');
  }
}

function advanceTest2Turn(): void {
  if (test2State.result) {
    return;
  }

  test2State.stacks.knights.actionPoints = 0;
  let attempts = 0;

  while (attempts < TEST2_SCHEDULE.length) {
    test2State.scheduleIndex = (test2State.scheduleIndex + 1) % TEST2_SCHEDULE.length;
    if (test2State.scheduleIndex === 0) {
      test2State.cycle += 1;
    }

    const faction = TEST2_SCHEDULE[test2State.scheduleIndex];
    const stack = test2State.stacks[faction];
    attempts += 1;

    if (stack.count <= 0) {
      continue;
    }

    resetTest2Turn(stack);

    if (faction === 'demons') {
      render('test2');
      performTest2AiTurn();
      if (test2State.result) {
        render('test2');
        return;
      }
      continue;
    }

    test2State.selected = 'knights';
    render('test2');
    return;
  }
}

function handleTest2Action(action: string): void {
  if (test2State.result || TEST2_SCHEDULE[test2State.scheduleIndex] !== 'knights') {
    return;
  }

  if (action === 'attack') {
    test2Attack('knights');
  } else if (action === 'heal') {
    test2Heal();
  } else if (action === 'end') {
    advanceTest2Turn();
    return;
  }

  render('test2');
}

function handleTest2Cell(x: number, y: number): void {
  if (test2State.result || TEST2_SCHEDULE[test2State.scheduleIndex] !== 'knights') {
    return;
  }

  const knights = test2State.stacks.knights;
  const occupant = test2StackAt(x, y);

  if (occupant?.id === 'knights') {
    test2State.selected = 'knights';
    render('test2');
    return;
  }

  if (occupant || test2State.selected !== 'knights') {
    return;
  }

  const distance = test2Distance(knights.x, knights.y, x, y);
  if (distance === 0 || distance > knights.actionPoints) {
    test2AddLog('Эта клетка находится дальше доступного перемещения.');
    render('test2');
    return;
  }

  knights.x = x;
  knights.y = y;
  knights.actionPoints -= distance;
  test2AddLog(`Рыцари переместились на ${distance} клетк${distance === 1 ? 'у' : 'и'}. Осталось ОД: ${knights.actionPoints}.`);
  render('test2');
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
        <p class="eyebrow">Тест 1 · Бой 1 на 1</p>
        <h1 id="difficulty-title">Сложность</h1>
        <div class="difficulty-list" aria-label="Выбор уровня сложности">
          ${options}
        </div>
        <button class="menu-button menu-button-secondary" type="button" data-screen="tests">
          К списку тестов
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
  const playerHealthPercent = healthPercent(battleState.playerHealth, MAX_HEALTH);
  const skeletonHealthPercent = healthPercent(battleState.skeletonHealth, battleState.skeletonMaxHealth);
  const actionDisabled = battleState.busy || battleState.result !== null ? ' disabled' : '';
  const doubleDisabled = battleState.busy || battleState.doubleStrikeCooldown > 0 || battleState.result !== null ? ' disabled' : '';
  const healDisabled = battleState.busy || battleState.healCooldown > 0 || battleState.result !== null ? ' disabled' : '';
  const itemDisabled = battleState.busy || battleState.herbCount <= 0 || battleState.result !== null ? ' disabled' : '';
  const difficultyLabel = selectedDifficulty ? difficultyOptions[selectedDifficulty].label : 'Средний';
  const turnLabel = battleState.busy
    ? battleState.animation === 'enemy-attack' || battleState.animation === 'player-hit' || battleState.animation === 'player-dodge'
      ? 'Ход скелета'
      : 'Действие'
    : battleState.result
      ? 'Бой окончен'
      : 'Ваш ход';
  const animationClass = battleState.animation ? ` is-${battleState.animation}` : '';
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
          <span class="battle-turn-label">${turnLabel}</span>
        </header>

        <div class="battle-status-strip">
          <div class="battle-enemy-status">
            <div class="battle-health-heading">
              <strong>Скелет 1 Ур.</strong>
              <output>${battleState.skeletonHealth}/${battleState.skeletonMaxHealth}</output>
            </div>
            <div class="battle-health-bar" role="progressbar" aria-label="Здоровье скелета" aria-valuemin="0" aria-valuemax="${battleState.skeletonMaxHealth}" aria-valuenow="${battleState.skeletonHealth}">
              <span class="battle-health-fill" style="width: ${skeletonHealthPercent}%"></span>
            </div>
          </div>
        </div>

        <section class="battle-scene${animationClass}" aria-label="Коридор замка и противники">
          <img class="player-sprite" src="/assets/player-adventurer.png" alt="Ваш герой" />
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
            </div>
            <ol class="battle-log" aria-live="polite">
              ${logMarkup}
            </ol>
            ${resultMarkup}
          </section>
        </div>

        ${renderBattleDialog(doubleDisabled, healDisabled)}

        <button class="menu-button menu-button-secondary battle-menu-button" type="button" data-screen="tests">
          К списку тестов
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

function healthPercent(value: number, maximum: number): number {
  return maximum > 0 ? Math.max(0, Math.min(100, (value / maximum) * 100)) : 0;
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollHit(): boolean {
  return Math.random() < HIT_CHANCE;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function addBattleLog(type: BattleLogType, text: string): void {
  battleState.log.push({ type, text });
  battleState.log = battleState.log.slice(-LOG_LIMIT);
}

function advanceCooldowns(): void {
  battleState.doubleStrikeCooldown = Math.max(0, battleState.doubleStrikeCooldown - 1);
  battleState.healCooldown = Math.max(0, battleState.healCooldown - 1);
}

function resolvePlayerStrike(label: string): boolean {
  if (!rollHit()) {
    addBattleLog('miss', `${label}: промах.`);
    return false;
  }

  const damage = randomInteger(1, 2);
  battleState.skeletonHealth = Math.max(0, battleState.skeletonHealth - damage);
  addBattleLog('player', `${label}: ${damage} урона скелету.`);
  return true;
}

function resolveEnemyStrike(): boolean {
  if (!rollHit()) {
    addBattleLog('miss', 'Скелет атакует: промах.');
    return false;
  }

  const enemy = getEnemyProfile();
  const damage = randomInteger(enemy.damageMin, enemy.damageMax);
  battleState.playerHealth = Math.max(0, battleState.playerHealth - damage);
  addBattleLog('enemy', `Скелет наносит ${damage} урона.`);
  return true;
}

function finishBattle(result: Exclude<BattleResult, null>): void {
  if (battleState.result) {
    return;
  }

  battleState.result = result;
  battleState.openMenu = null;
  audioManager.playBattleSound(result === 'win' ? 'victory' : 'defeat');
  addBattleLog(result === 'win' ? 'victory' : 'defeat', result === 'win' ? 'Победа! Скелет повержен.' : 'Поражение. Вы потеряли сознание.');
}

async function animateSingleStrike(label: string): Promise<void> {
  battleState.animation = 'player-attack';
  render('testBattle');
  await wait(520);

  const hit = resolvePlayerStrike(label);

  if (hit) {
    audioManager.playBattleSound('hit');
    battleState.animation = 'skeleton-hit';
  } else {
    audioManager.playBattleSound('miss');
    battleState.animation = 'skeleton-dodge';
  }

  render('testBattle');
  await wait(hit ? 460 : 340);
}

async function animateDoubleStrike(): Promise<void> {
  audioManager.playBattleSound('double');
  battleState.animation = 'player-double';
  render('testBattle');
  await wait(500);

  const firstHit = resolvePlayerStrike('Двойной удар — первый удар');
  battleState.animation = firstHit ? 'skeleton-hit' : 'skeleton-dodge';
  render('testBattle');
  await wait(firstHit ? 300 : 240);

  if (battleState.skeletonHealth <= 0) {
    return;
  }

  battleState.animation = 'player-double';
  render('testBattle');
  await wait(390);

  const secondHit = resolvePlayerStrike('Двойной удар — второй удар');
  battleState.animation = secondHit ? 'skeleton-hit' : 'skeleton-dodge';
  render('testBattle');
  await wait(secondHit ? 460 : 340);
}

async function animateEnemyTurn(): Promise<void> {
  if (battleState.skeletonHealth <= 0 || battleState.result) {
    finishBattle('win');
    return;
  }

  battleState.animation = 'enemy-attack';
  render('testBattle');
  await wait(560);

  const hit = resolveEnemyStrike();
  audioManager.playBattleSound(hit ? 'hit' : 'miss');
  battleState.animation = hit ? 'player-hit' : 'player-dodge';
  render('testBattle');
  await wait(hit ? 480 : 360);

  if (battleState.playerHealth <= 0) {
    finishBattle('lose');
    return;
  }

  addBattleLog('system', 'Ваш ход.');
}

async function animateHealing(kind: 'magic' | 'item'): Promise<void> {
  battleState.animation = kind === 'magic' ? 'player-cast' : 'player-item';
  audioManager.playBattleSound(kind === 'magic' ? 'magic' : 'item');
  render('testBattle');
  await wait(kind === 'magic' ? 620 : 480);

  const amount = kind === 'magic' ? 5 : 3;
  const healed = Math.min(amount, MAX_HEALTH - battleState.playerHealth);
  battleState.playerHealth += healed;
  addBattleLog(
    kind === 'magic' ? 'heal' : 'item',
    healed > 0
      ? `${kind === 'magic' ? 'Лечение' : 'Лечебная трава'} восстанавливает ${healed} здоровья.`
      : `${kind === 'magic' ? 'Лечение' : 'Лечебная трава'}: здоровье уже полное.`,
  );
  battleState.animation = kind === 'magic' ? 'player-heal' : 'player-item';
  render('testBattle');
  await wait(440);
}

async function handleBattleAction(action: BattleAction): Promise<void> {
  if (action === 'close-menu') {
    battleState.openMenu = null;
    render('testBattle');
    return;
  }

  if (action === 'skill-menu') {
    if (!battleState.result && !battleState.busy) {
      battleState.openMenu = 'skill';
      render('testBattle');
    }
    return;
  }

  if (action === 'magic-menu') {
    if (!battleState.result && !battleState.busy) {
      battleState.openMenu = 'magic';
      render('testBattle');
    }
    return;
  }

  if (battleState.result || battleState.busy) {
    return;
  }

  if (action === 'double-strike' && battleState.doubleStrikeCooldown > 0) {
    return;
  }

  if (action === 'heal' && battleState.healCooldown > 0) {
    return;
  }

  if (action === 'item' && battleState.herbCount <= 0) {
    return;
  }

  battleState.openMenu = null;
  battleState.busy = true;
  advanceCooldowns();
  render('testBattle');

  try {
    if (action === 'attack') {
      await animateSingleStrike('Атака');
    } else if (action === 'double-strike') {
      battleState.doubleStrikeCooldown = 5;
      await animateDoubleStrike();
    } else if (action === 'heal') {
      battleState.healCooldown = 5;
      await animateHealing('magic');
    } else if (action === 'item') {
      battleState.herbCount = 0;
      await animateHealing('item');
    }

    if (battleState.skeletonHealth <= 0) {
      finishBattle('win');
    } else if (battleState.playerHealth > 0) {
      await animateEnemyTurn();
    }
  } finally {
    battleState.busy = false;
    battleState.animation = null;
    render('testBattle');
  }
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

  if (settings.musicVolume > 0 && activeScreen !== 'testBattle' && activeScreen !== 'test2') {
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
    render('testBattle');
    return;
  }

  const button = clickedElement.closest<HTMLButtonElement>('button');

  if (!button || !app.contains(button)) {
    return;
  }

  audioManager.playButtonSound();

  const test2Unit = clickedElement.closest<HTMLElement>('[data-test2-unit]');
  if (test2Unit && app.contains(test2Unit) && (test2Unit.dataset.test2Unit === 'knights' || test2Unit.dataset.test2Unit === 'demons')) {
    test2State.selected = test2Unit.dataset.test2Unit;
    render('test2');
    return;
  }

  const test2Action = button.dataset.test2Action;
  if (activeScreen === 'test2' && test2Action) {
    handleTest2Action(test2Action);
    return;
  }

  if (activeScreen === 'test2' && button.dataset.hexX && button.dataset.hexY) {
    handleTest2Cell(Number(button.dataset.hexX), Number(button.dataset.hexY));
    return;
  }

  if (isDifficulty(button.dataset.difficulty)) {
    selectedDifficulty = button.dataset.difficulty;
    battleState = createBattleState();
    audioManager.startBattleMusic();
    render('testBattle');
    return;
  }

  const battleAction = button.dataset.battleAction;

  if (isBattleAction(battleAction)) {
    void handleBattleAction(battleAction);
    return;
  }

  const nextScreen = button.dataset.screen as Screen | undefined;

  if (nextScreen) {
    if (nextScreen === 'test2') {
      test2State = createTest2State();
      audioManager.startBattleMusic();
      render('test2');
      return;
    }

    if (nextScreen !== 'testBattle') {
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
  if (activeScreen !== 'testBattle' && activeScreen !== 'test2') {
    audioManager.startMusic();
  }
}, { passive: true });
window.addEventListener('keydown', () => {
  if (activeScreen !== 'testBattle' && activeScreen !== 'test2') {
    audioManager.startMusic();
  }
});

applySettings();
render('menu');
