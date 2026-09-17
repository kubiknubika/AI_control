import './style.css';
import {
  AudioManager,
  BUTTON_SOUND_LABELS,
  type AudioSettings,
  type ButtonSound,
} from './audio';

type Screen = 'menu' | 'play' | 'tests' | 'difficulty' | 'testBattle' | 'test2' | 'test3' | 'settings';
type Difficulty = 'easy' | 'normal' | 'hard' | 'impossible';
type Test2Faction = 'knights' | 'demons';
type Test3Terrain = 'grass' | 'tree' | 'gold' | 'stone' | 'water' | 'rock';
type Test3Resource = 'gold' | 'wood' | 'stone' | 'food';
type Test3BuildingType = 'townHall' | 'goldMine' | 'sawmill' | 'quarry' | 'house' | 'warehouse' | 'barracks' | 'shipyard' | 'fishingYard';
type Test3WorkerStatus = 'idle' | 'building' | 'working';
type Test3FleetAction = 'ship' | 'fishingBoat';
type Test2AttackMode = 'melee' | 'range';
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
const HIT_CHANCE = 0.95;
const TEST2_MELEE_RANGE = 1;
const TEST2_RANGE_ATTACK_DISTANCE = 3;
const TEST2_HEAL_PER_KNIGHT = 10;
const TEST2_XP_PER_DEMON = 25;
const TEST2_GOLD_PER_DEMON = 12;
const TEST2_STEP_DELAY = 320;
const TEST2_ATTACK_WINDUP = 520;
const TEST2_ATTACK_IMPACT_DELAY = 110;
const TEST2_HEALTH_ANIMATION_DELAY = 360;
const TEST2_COUNTER_ATTACK_DELAY = 720;
const TEST2_NEXT_TURN_DELAY = 720;
const TEST3_WIDTH = 14;
const TEST3_HEIGHT = 9;
const TEST3_TICK_DELAY = 1000;
const TEST3_INITIAL_GOLD = 900;
const TEST3_INITIAL_WOOD = 700;
const TEST3_INITIAL_STONE = 260;
const TEST3_INITIAL_FOOD = 120;
const TEST3_INITIAL_WORKERS = 3;
const TEST3_MAX_BUILDING_LEVEL = 3;
const TEST3_ARMY_RECRUIT_GOLD = 80;
const TEST3_ARMY_RECRUIT_WOOD = 50;
const TEST3_ARMY_RECRUIT_STONE = 20;
const TEST3_IDLE_WORKER_GOLD = 1;
const TEST3_IDLE_WORKER_WOOD = 3;
const TEST3_IDLE_WORKER_STONE = 1;
const TEST3_TOWN_HALL_GOLD = 4;
const TEST3_TOWN_HALL_WOOD = 4;
const TEST3_TOWN_HALL_STONE = 1;
const TEST3_FISHING_BOAT_FOOD = 8;
const TEST3_FOOD_PER_PERSON = 1;
const TEST3_FOOD_SHORTAGE_PRODUCTION_MULTIPLIER = 0.5;
const TEST3_SHIP_GOLD = 160;
const TEST3_SHIP_WOOD = 260;
const TEST3_SHIP_STONE = 100;
const TEST3_FISHING_BOAT_GOLD = 80;
const TEST3_FISHING_BOAT_WOOD = 140;
const TEST3_FISHING_BOAT_STONE = 50;

interface Test3Tile {
  kind: Test3Terrain;
}

interface Test3Worker {
  id: string;
  label: string;
  status: Test3WorkerStatus;
  buildingId: string | null;
  previousBuildingId: string | null;
}

interface Test3Building {
  id: string;
  type: Test3BuildingType;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  progress: number;
  complete: boolean;
  workerId: string | null;
  upgrading: boolean;
  upgradeProgress: number;
  upgradeWorkerId: string | null;
}

interface Test3Army {
  soldiers: number;
  capacity: number;
}

interface Test3Fleet {
  ships: number;
  shipCapacity: number;
  fishingBoats: number;
  fishingCapacity: number;
}

interface Test3BuildingDefinition {
  label: string;
  description: string;
  goldCost: number;
  woodCost: number;
  stoneCost?: number;
  width: number;
  height: number;
  buildTime: number;
  target: 'grass' | 'tree' | 'gold' | 'stone' | 'water';
  requiresTownHall?: boolean;
  requiresWarehouse?: boolean;
  requiresWorker: boolean;
  maxCount?: number;
  production?: Test3Resource;
  productionAmount?: number;
  workerCapIncrease?: number;
  storageIncrease?: number;
  shipCapacityIncrease?: number;
  fishingCapacityIncrease?: number;
}

interface Test3State {
  tiles: Test3Tile[];
  resources: {
    gold: number;
    wood: number;
    stone: number;
    food: number;
  };
  resourceCap: number;
  workers: Test3Worker[];
  workerCap: number;
  army: Test3Army;
  fleet: Test3Fleet;
  buildings: Test3Building[];
  selectedBuildingType: Test3BuildingType | null;
  selectedBuildingId: string | null;
  hoveredTile: { x: number; y: number } | null;
  elapsed: number;
  log: string[];
  resourceLimitNotified: Record<Test3Resource, boolean>;
}

const TEST3_BUILDING_DEFINITIONS: Record<Test3BuildingType, Test3BuildingDefinition> = {
  townHall: {
    label: 'Ратуша',
    description: 'Городской центр: +3 места для жителей, базовый доход и доступ к продвинутым зданиям.',
    goldCost: 500,
    woodCost: 250,
    stoneCost: 150,
    width: 2,
    height: 2,
    buildTime: 7,
    target: 'grass',
    requiresWorker: true,
    maxCount: 1,
    workerCapIncrease: 3,
  },
  goldMine: {
    label: 'Золотой рудник',
    description: 'Ставится на золотой жиле. Рабочий добывает золото каждые 2 секунды.',
    goldCost: 160,
    woodCost: 80,
    stoneCost: 40,
    width: 1,
    height: 1,
    buildTime: 4,
    target: 'gold',
    requiresWorker: true,
    production: 'gold',
    productionAmount: 28,
  },
  sawmill: {
    label: 'Лесопилка',
    description: 'Ставится на дереве. Рабочий превращает лес в древесину.',
    goldCost: 100,
    woodCost: 160,
    stoneCost: 30,
    width: 1,
    height: 1,
    buildTime: 4,
    target: 'tree',
    requiresWorker: true,
    production: 'wood',
    productionAmount: 24,
  },
  house: {
    label: 'Дом',
    description: 'Жильё поселенцев: +2 места и один новый рабочий после завершения.',
    goldCost: 100,
    woodCost: 120,
    stoneCost: 25,
    width: 1,
    height: 1,
    buildTime: 3,
    target: 'grass',
    requiresTownHall: true,
    requiresWorker: true,
    workerCapIncrease: 2,
  },
  warehouse: {
    label: 'Склад',
    description: 'Запас ресурсов поселения увеличивается на 500.',
    goldCost: 220,
    woodCost: 180,
    stoneCost: 100,
    width: 1,
    height: 1,
    buildTime: 4,
    target: 'grass',
    requiresTownHall: true,
    requiresWorker: true,
    storageIncrease: 500,
  },
  barracks: {
    label: 'Казарма',
    description: 'Военный двор: открывает вербовку мечников и увеличивает армию.',
    goldCost: 260,
    woodCost: 220,
    stoneCost: 120,
    width: 2,
    height: 1,
    buildTime: 5,
    target: 'grass',
    requiresTownHall: true,
    requiresWorker: true,
  },
  quarry: {
    label: 'Каменоломня',
    description: 'Ставится на каменной жиле. Добывает строительный камень для продвинутых зданий.',
    goldCost: 130,
    woodCost: 110,
    stoneCost: 35,
    width: 1,
    height: 1,
    buildTime: 4,
    target: 'stone',
    requiresWorker: true,
    production: 'stone',
    productionAmount: 20,
  },
  shipyard: {
    label: 'Верфь',
    description: 'Строит корабли и открывает морскую логистику.',
    goldCost: 360,
    woodCost: 300,
    stoneCost: 180,
    width: 2,
    height: 1,
    buildTime: 6,
    target: 'water',
    requiresTownHall: true,
    requiresWarehouse: true,
    requiresWorker: true,
    shipCapacityIncrease: 2,
  },
  fishingYard: {
    label: 'Рыболовная верфь',
    description: 'Строит рыбацкие лодки и снабжает поселение едой.',
    goldCost: 280,
    woodCost: 240,
    stoneCost: 120,
    width: 2,
    height: 1,
    buildTime: 5,
    target: 'water',
    requiresTownHall: true,
    requiresWarehouse: true,
    requiresWorker: true,
    production: 'food',
    productionAmount: 12,
    fishingCapacityIncrease: 3,
  },
};

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
  attackMode: Test2AttackMode;
  maxActionPoints: number;
  actionPoints: number;
  x: number;
  y: number;
  hasAttacked: boolean;
  abilityUsed: boolean;
}

interface Test2Summary {
  knightsLost: number;
  demonsKilled: number;
  experience: number;
  gold: number;
}

interface Test2DeathAnimation {
  faction: Test2Faction;
  x: number;
  y: number;
}

interface Test2HealthAnimation {
  faction: Test2Faction;
  from: number;
  to: number;
  damage: number;
}

interface Test2AttackAnimation {
  attacker: Test2Faction;
  target: Test2Faction;
  phase: 'windup' | 'impact' | 'counter';
}

interface Test2CasualtyAnimation {
  faction: Test2Faction;
  fromCount: number;
  toCount: number;
}

interface Test2State {
  stacks: Record<Test2Faction, Test2Stack>;
  schedule: Test2Faction[];
  scheduleIndex: number;
  cycle: number;
  selected: Test2Faction | null;
  hovered: Test2Faction | null;
  result: 'win' | 'lose' | null;
  aiBusy: boolean;
  aiAnimation: 'move' | 'attack' | null;
  playerBusy: boolean;
  playerAnimation: 'move' | 'attack' | null;
  deathAnimation: Test2DeathAnimation | null;
  healthAnimation: Test2HealthAnimation | null;
  attackAnimation: Test2AttackAnimation | null;
  casualtyAnimation: Test2CasualtyAnimation | null;
  summary: Test2Summary | null;
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
let test3State = createTest3State();
let test3Timer: number | null = null;

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
    attackMode: 'melee',
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
    attackMode: 'melee',
    maxActionPoints: 4,
    actionPoints: 0,
    x: 10,
    y: 3,
    hasAttacked: false,
    abilityUsed: false,
  };

  const stacks = { knights, demons };
  const schedule = createTest2Schedule(stacks);

  return {
    stacks,
    schedule,
    scheduleIndex: 0,
    cycle: 1,
    selected: 'knights',
    hovered: null,
    result: null,
    aiBusy: false,
    aiAnimation: null,
    playerBusy: false,
    playerAnimation: null,
    deathAnimation: null,
    healthAnimation: null,
    attackAnimation: null,
    casualtyAnimation: null,
    summary: null,
    log: [
      `Инициатива: Рыцари ${knights.initiative}, Демоны ${demons.initiative}.`,
      'Рыцари ходят первыми. Выберите клетку или действие.',
    ],
  };
}

function createTest3State(): Test3State {
  const tiles: Test3Tile[] = Array.from(
    { length: TEST3_WIDTH * TEST3_HEIGHT },
    () => ({ kind: 'grass' as Test3Terrain }),
  );
  const setTerrain = (kind: Test3Terrain, positions: Array<[number, number]>): void => {
    positions.forEach(([x, y]) => {
      tiles[y * TEST3_WIDTH + x] = { kind };
    });
  };

  setTerrain('water', [[0, 0], [1, 0], [0, 1], [13, 7], [12, 8], [13, 8]]);
  setTerrain('rock', [[6, 0], [7, 0], [6, 1], [8, 7], [9, 7], [8, 8]]);
  setTerrain('stone', [[6, 3], [7, 3], [6, 4], [7, 4]]);
  setTerrain('tree', [
    [2, 1], [3, 1], [2, 2], [3, 2], [4, 2],
    [11, 1], [12, 1], [11, 2], [12, 2],
    [2, 6], [3, 6], [2, 7], [3, 7], [4, 7],
  ]);
  setTerrain('gold', [[10, 5], [11, 5], [10, 6], [11, 6]]);

  const workers: Test3Worker[] = Array.from({ length: TEST3_INITIAL_WORKERS }, (_, index) => ({
    id: `worker-${index + 1}`,
    label: `Рабочий ${index + 1}`,
    status: 'idle',
    buildingId: null,
    previousBuildingId: null,
  }));

  return {
    tiles,
    resources: {
      gold: TEST3_INITIAL_GOLD,
      wood: TEST3_INITIAL_WOOD,
      stone: TEST3_INITIAL_STONE,
      food: TEST3_INITIAL_FOOD,
    },
    resourceCap: 1000,
    workers,
    workerCap: TEST3_INITIAL_WORKERS,
    army: {
      soldiers: 0,
      capacity: 0,
    },
    fleet: {
      ships: 0,
      shipCapacity: 0,
      fishingBoats: 0,
      fishingCapacity: 0,
    },
    buildings: [],
    selectedBuildingType: null,
    selectedBuildingId: null,
    hoveredTile: null,
    elapsed: 0,
    log: [
      'Поселение готово. Выберите постройку в нижней панели.',
      'Рудник ставится только на золото, лесопилка — прямо на деревья.',
      'Свободные рабочие собирают аварийный доход, поэтому поселение не окажется без ресурсов.'
    ],
    resourceLimitNotified: {
      gold: false,
      wood: false,
      stone: false,
      food: false,
    },
  };
}

function test3TileAt(x: number, y: number): Test3Tile | null {
  if (x < 0 || x >= TEST3_WIDTH || y < 0 || y >= TEST3_HEIGHT) {
    return null;
  }
  return test3State.tiles[y * TEST3_WIDTH + x] ?? null;
}

function test3BuildingAt(x: number, y: number): Test3Building | null {
  return test3State.buildings.find((building) => (
    x >= building.x
    && x < building.x + building.width
    && y >= building.y
    && y < building.y + building.height
  )) ?? null;
}

function test3HasTownHall(): boolean {
  return test3State.buildings.some((building) => building.type === 'townHall' && building.complete);
}

function test3HasWarehouse(): boolean {
  return test3State.buildings.some((building) => building.type === 'warehouse' && building.complete);
}

function test3IdleWorker(): Test3Worker | null {
  return test3State.workers.find((worker) => worker.status === 'idle') ?? null;
}

function test3BuilderCandidate(): Test3Worker | null {
  return test3IdleWorker() ?? test3State.workers.find((worker) => worker.status === 'working') ?? null;
}

function test3TakeBuilder(preferredBuildingId?: string): Test3Worker | null {
  const preferredWorker = preferredBuildingId
    ? test3State.workers.find((candidate) => candidate.status === 'working' && candidate.buildingId === preferredBuildingId) ?? null
    : null;
  const worker = preferredWorker ?? test3BuilderCandidate();
  if (!worker) {
    return null;
  }
  if (worker.status === 'working' && worker.buildingId) {
    const oldBuilding = test3State.buildings.find((building) => building.id === worker.buildingId);
    if (oldBuilding) {
      oldBuilding.workerId = null;
      worker.previousBuildingId = oldBuilding.id;
      test3AddLog(`${worker.label} снят с объекта ${TEST3_BUILDING_DEFINITIONS[oldBuilding.type].label}. Добыча временно остановлена.`);
    }
  } else {
    worker.previousBuildingId = null;
  }
  worker.status = 'building';
  worker.buildingId = null;
  return worker;
}

function test3BuildingCount(type: Test3BuildingType): number {
  return test3State.buildings.filter((building) => building.type === type).length;
}

function test3ResourceLabel(resource: Test3Resource): string {
  if (resource === 'gold') {
    return 'золота';
  }
  if (resource === 'wood') {
    return 'древесины';
  }
  if (resource === 'stone') {
    return 'камня';
  }
  return 'еды';
}

function test3BuildAvailability(type: Test3BuildingType): { available: boolean; reason: string } {
  const definition = TEST3_BUILDING_DEFINITIONS[type];
  if (definition.maxCount !== undefined && test3BuildingCount(type) >= definition.maxCount) {
    return { available: false, reason: 'Уже построено' };
  }
  if (definition.requiresTownHall && !test3HasTownHall()) {
    return { available: false, reason: 'Сначала постройте ратушу' };
  }
  if (definition.requiresWarehouse && !test3HasWarehouse()) {
    return { available: false, reason: 'Нужен готовый склад' };
  }
  if (test3State.resources.gold < definition.goldCost) {
    return { available: false, reason: `Нужно ${definition.goldCost} золота` };
  }
  if (test3State.resources.wood < definition.woodCost) {
    return { available: false, reason: `Нужно ${definition.woodCost} древесины` };
  }
  if ((definition.stoneCost ?? 0) > test3State.resources.stone) {
    return { available: false, reason: `Нужно ${definition.stoneCost ?? 0} камня` };
  }
  if (definition.requiresWorker && !test3BuilderCandidate()) {
    return { available: false, reason: 'Нет рабочих' };
  }
  return { available: true, reason: 'Готово к размещению' };
}

function test3CanPlace(type: Test3BuildingType, x: number, y: number): { valid: boolean; reason: string } {
  const definition = TEST3_BUILDING_DEFINITIONS[type];
  const availability = test3BuildAvailability(type);
  if (!availability.available) {
    return { valid: false, reason: availability.reason };
  }
  if (x < 0 || y < 0 || x + definition.width > TEST3_WIDTH || y + definition.height > TEST3_HEIGHT) {
    return { valid: false, reason: 'Постройка не помещается у края карты' };
  }

  for (let tileY = y; tileY < y + definition.height; tileY += 1) {
    for (let tileX = x; tileX < x + definition.width; tileX += 1) {
      const tile = test3TileAt(tileX, tileY);
      if (!tile || tile.kind !== definition.target) {
        const targetLabel = definition.target === 'grass'
          ? 'свободная трава'
          : definition.target === 'tree'
            ? 'дерево'
            : definition.target === 'gold'
              ? 'золотая жила'
              : definition.target === 'stone'
                ? 'каменная жила'
                : 'вода';
        return { valid: false, reason: `Нужна клетка: ${targetLabel}` };
      }
      if (test3BuildingAt(tileX, tileY)) {
        return { valid: false, reason: 'Клетка уже занята' };
      }
    }
  }

  return { valid: true, reason: 'Можно строить' };
}

function test3PreviewAnchor(type: Test3BuildingType, x: number, y: number): { x: number; y: number } {
  const definition = TEST3_BUILDING_DEFINITIONS[type];
  const anchorX = Math.max(0, Math.min(TEST3_WIDTH - definition.width, x));
  const anchorY = Math.max(0, Math.min(TEST3_HEIGHT - definition.height, y));
  return { x: anchorX, y: anchorY };
}

function test3UpgradeCosts(building: Test3Building): { gold: number; wood: number; stone: number; time: number } {
  const definition = TEST3_BUILDING_DEFINITIONS[building.type];
  const multiplier = building.level;
  const scale = 0.7 + multiplier * 0.25;
  return {
    gold: Math.round(definition.goldCost * scale),
    wood: Math.round(definition.woodCost * scale),
    stone: Math.round((definition.stoneCost ?? 0) * scale),
    time: 3 + multiplier,
  };
}

function test3UpgradeAvailability(building: Test3Building): { available: boolean; reason: string } {
  if (!building.complete) {
    return { available: false, reason: 'Сначала завершите строительство' };
  }
  if (building.upgrading) {
    return { available: false, reason: 'Улучшение уже идёт' };
  }
  if (building.level >= TEST3_MAX_BUILDING_LEVEL) {
    return { available: false, reason: 'Максимальный уровень' };
  }
  const costs = test3UpgradeCosts(building);
  if (test3State.resources.gold < costs.gold) {
    return { available: false, reason: `Нужно ${costs.gold} золота` };
  }
  if (test3State.resources.wood < costs.wood) {
    return { available: false, reason: `Нужно ${costs.wood} древесины` };
  }
  if (test3State.resources.stone < costs.stone) {
    return { available: false, reason: `Нужно ${costs.stone} камня` };
  }
  if (!test3BuilderCandidate()) {
    return { available: false, reason: 'Нет рабочих для улучшения' };
  }
  return { available: true, reason: `Улучшить до ${building.level + 1} уровня` };
}

function test3ProductionAmount(building: Test3Building): number {
  const definition = TEST3_BUILDING_DEFINITIONS[building.type];
  const levelAmount = (definition.productionAmount ?? 0) * (1 + (building.level - 1) * 0.5);
  const foodMultiplier = test3State.resources.food <= 0 ? TEST3_FOOD_SHORTAGE_PRODUCTION_MULTIPLIER : 1;
  return Math.round(levelAmount * foodMultiplier);
}

function test3AddResource(resource: Test3Resource, amount: number): number {
  const before = test3State.resources[resource];
  const after = Math.min(test3State.resourceCap, before + amount);
  test3State.resources[resource] = after;
  if (after < test3State.resourceCap) {
    test3State.resourceLimitNotified[resource] = false;
  } else if (before < test3State.resourceCap && !test3State.resourceLimitNotified[resource]) {
    test3State.resourceLimitNotified[resource] = true;
    test3AddLog(`Лимит ресурса достигнут: ${test3ResourceLabel(resource)}.`);
    audioManager.playSettlementSound('limit');
  }
  return after - before;
}

function test3ConsumeFood(amount: number): void {
  if (amount <= 0) {
    return;
  }
  test3State.resources.food = Math.max(0, test3State.resources.food - amount);
  test3State.resourceLimitNotified.food = false;
}

function test3SpendResources(costs: { gold: number; wood: number; stone: number }): void {
  test3State.resources.gold -= costs.gold;
  test3State.resources.wood -= costs.wood;
  test3State.resources.stone -= costs.stone;
  test3State.resourceLimitNotified.gold = false;
  test3State.resourceLimitNotified.wood = false;
  test3State.resourceLimitNotified.stone = false;
}

function test3RestoreWorker(worker: Test3Worker): boolean {
  const previousBuilding = worker.previousBuildingId
    ? test3State.buildings.find((building) => building.id === worker.previousBuildingId) ?? null
    : null;
  if (previousBuilding) {
    const definition = TEST3_BUILDING_DEFINITIONS[previousBuilding.type];
    if (previousBuilding.complete && !previousBuilding.upgrading && definition.production && !previousBuilding.workerId) {
      previousBuilding.workerId = worker.id;
      worker.status = 'working';
      worker.buildingId = previousBuilding.id;
      worker.previousBuildingId = null;
      test3AddLog(`${worker.label} вернулся к работе в ${definition.label}.`);
      return true;
    }
  }
  worker.status = 'idle';
  worker.buildingId = null;
  worker.previousBuildingId = null;
  return false;
}

function test3AddLog(text: string): void {
  test3State.log.push(text);
  test3State.log = test3State.log.slice(-7);
}

function test3PlaceBuilding(x: number, y: number): void {
  const type = test3State.selectedBuildingType;
  if (!type) {
    return;
  }
  const definition = TEST3_BUILDING_DEFINITIONS[type];
  const anchor = test3PreviewAnchor(type, x, y);
  const placement = test3CanPlace(type, anchor.x, anchor.y);
  if (!placement.valid) {
    test3AddLog(`${definition.label}: ${placement.reason}.`);
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }

  const worker = test3TakeBuilder();
  if (!worker) {
    test3AddLog('Нет рабочего для строительства.');
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }

  test3SpendResources({
    gold: definition.goldCost,
    wood: definition.woodCost,
    stone: definition.stoneCost ?? 0,
  });
  const building: Test3Building = {
    id: `building-${Date.now()}-${test3State.buildings.length}`,
    type,
    x: anchor.x,
    y: anchor.y,
    width: definition.width,
    height: definition.height,
    level: 1,
    progress: 0,
    complete: false,
    workerId: worker.id,
    upgrading: false,
    upgradeProgress: 0,
    upgradeWorkerId: null,
  };
  test3State.buildings.push(building);
  worker.status = 'building';
  worker.buildingId = building.id;
  test3State.selectedBuildingType = null;
  test3State.hoveredTile = null;
  test3State.selectedBuildingId = building.id;
  test3AddLog(`Начато строительство: ${definition.label}. Рабочий занят на ${definition.buildTime} сек.`);
  audioManager.playSettlementSound('place');
  render('test3');
}

function test3CompleteBuilding(building: Test3Building): void {
  const definition = TEST3_BUILDING_DEFINITIONS[building.type];
  building.complete = true;
  building.progress = 1;
  const worker = building.workerId ? test3State.workers.find((candidate) => candidate.id === building.workerId) : null;

  if (definition.production && worker) {
    worker.status = 'working';
    worker.buildingId = building.id;
    worker.previousBuildingId = null;
  } else if (worker) {
    building.workerId = null;
    test3RestoreWorker(worker);
  }

  if (definition.workerCapIncrease) {
    test3State.workerCap += definition.workerCapIncrease;
    if (test3State.workers.length < test3State.workerCap) {
      const workerNumber = test3State.workers.length + 1;
      test3State.workers.push({
        id: `worker-${workerNumber}`,
        label: `Рабочий ${workerNumber}`,
        status: 'idle',
        buildingId: null,
        previousBuildingId: null,
      });
      test3AddLog(`${definition.label} завершена. Новый рабочий прибыл в поселение.`);
    } else {
      test3AddLog(`${definition.label} завершена. Лимит рабочих увеличен.`);
    }
  } else if (definition.storageIncrease) {
    test3State.resourceCap += definition.storageIncrease;
    test3AddLog(`${definition.label} завершён. Вместимость ресурсов: ${test3State.resourceCap}.`);
  } else if (definition.production) {
    test3AddLog(`${definition.label} запущен. Добыча: +${test3ProductionAmount(building)} ${test3ResourceLabel(definition.production)} каждые 2 сек.`);
  } else if (building.type === 'barracks') {
    test3State.army.capacity += 4;
    test3AddLog(`${definition.label} завершена. Вместимость армии: ${test3State.army.capacity}.`);
  } else {
    test3AddLog(`${definition.label} завершена.`);
  }
  if (definition.shipCapacityIncrease) {
    test3State.fleet.shipCapacity += definition.shipCapacityIncrease;
    test3AddLog(`Вместимость флота: ${test3State.fleet.shipCapacity}.`);
  }
  if (definition.fishingCapacityIncrease) {
    test3State.fleet.fishingCapacity += definition.fishingCapacityIncrease;
    test3AddLog(`Вместимость рыбацкого флота: ${test3State.fleet.fishingCapacity}.`);
  }
  audioManager.playSettlementSound('complete');
}

function test3CompleteUpgrade(building: Test3Building): void {
  const definition = TEST3_BUILDING_DEFINITIONS[building.type];
  building.level += 1;
  building.upgrading = false;
  building.upgradeProgress = 0;
  const worker = building.upgradeWorkerId
    ? test3State.workers.find((candidate) => candidate.id === building.upgradeWorkerId) ?? null
    : null;
  building.upgradeWorkerId = null;

  if (definition.production && worker) {
    worker.status = 'working';
    worker.buildingId = building.id;
    worker.previousBuildingId = null;
    building.workerId = worker.id;
  } else if (worker) {
    building.workerId = null;
    test3RestoreWorker(worker);
  }

  if (definition.workerCapIncrease) {
    test3State.workerCap += Math.max(1, Math.round(definition.workerCapIncrease / 2));
  }
  if (definition.storageIncrease) {
    test3State.resourceCap += Math.round(definition.storageIncrease / 2);
  }
  if (building.type === 'barracks') {
    test3State.army.capacity += 2;
  }
  if (definition.shipCapacityIncrease) {
    test3State.fleet.shipCapacity += Math.max(1, Math.round(definition.shipCapacityIncrease / 2));
  }
  if (definition.fishingCapacityIncrease) {
    test3State.fleet.fishingCapacity += Math.max(1, Math.round(definition.fishingCapacityIncrease / 2));
  }
  test3AddLog(`${definition.label} улучшена до ${building.level} уровня.`);
  audioManager.playSettlementSound('upgrade');
}

function test3StartUpgrade(building: Test3Building): void {
  const availability = test3UpgradeAvailability(building);
  if (!availability.available) {
    test3AddLog(`${TEST3_BUILDING_DEFINITIONS[building.type].label}: ${availability.reason}.`);
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }
  const costs = test3UpgradeCosts(building);
  const worker = test3TakeBuilder(building.id);
  if (!worker) {
    test3AddLog('Нет рабочего для улучшения.');
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }
  test3SpendResources(costs);
  building.upgrading = true;
  building.upgradeProgress = 0;
  building.upgradeWorkerId = worker.id;
  building.workerId = null;
  worker.buildingId = building.id;
  test3State.selectedBuildingId = building.id;
  test3AddLog(`Начато улучшение ${TEST3_BUILDING_DEFINITIONS[building.type].label} до ${building.level + 1} уровня.`);
  audioManager.playSettlementSound('upgrade');
  render('test3');
}

function test3RecruitArmy(buildingId: string): void {
  const building = test3State.buildings.find((candidate) => candidate.id === buildingId);
  if (!building || building.type !== 'barracks' || !building.complete || building.upgrading) {
    audioManager.playSettlementSound('blocked');
    return;
  }
  if (test3State.army.soldiers >= test3State.army.capacity) {
    test3AddLog('Казармы заполнены: улучшите казарму или постройте ещё одну.');
    audioManager.playSettlementSound('limit');
    render('test3');
    return;
  }
  if (test3State.resources.gold < TEST3_ARMY_RECRUIT_GOLD || test3State.resources.wood < TEST3_ARMY_RECRUIT_WOOD || test3State.resources.stone < TEST3_ARMY_RECRUIT_STONE) {
    test3AddLog(`Для вербовки нужны ${TEST3_ARMY_RECRUIT_GOLD} золота, ${TEST3_ARMY_RECRUIT_WOOD} древесины и ${TEST3_ARMY_RECRUIT_STONE} камня.`);
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }
  test3SpendResources({
    gold: TEST3_ARMY_RECRUIT_GOLD,
    wood: TEST3_ARMY_RECRUIT_WOOD,
    stone: TEST3_ARMY_RECRUIT_STONE,
  });
  test3State.army.soldiers += 1;
  test3AddLog(`В казарме завербован мечник. Армия: ${test3State.army.soldiers}/${test3State.army.capacity}.`);
  audioManager.playSettlementSound('recruit');
  render('test3');
}

function test3BuildFleet(buildingId: string, action: Test3FleetAction): void {
  const building = test3State.buildings.find((candidate) => candidate.id === buildingId);
  if (!building || !building.complete || building.upgrading) {
    audioManager.playSettlementSound('blocked');
    return;
  }
  const isFishing = action === 'fishingBoat';
  if (isFishing && building.type !== 'fishingYard') {
    audioManager.playSettlementSound('blocked');
    return;
  }
  if (!isFishing && building.type !== 'shipyard') {
    audioManager.playSettlementSound('blocked');
    return;
  }
  const capacity = isFishing ? test3State.fleet.fishingCapacity : test3State.fleet.shipCapacity;
  const current = isFishing ? test3State.fleet.fishingBoats : test3State.fleet.ships;
  if (current >= capacity) {
    test3AddLog(isFishing ? 'Рыболовная верфь заполнена.' : 'Верфь заполнена.');
    audioManager.playSettlementSound('limit');
    render('test3');
    return;
  }
  const costs = isFishing
    ? { gold: TEST3_FISHING_BOAT_GOLD, wood: TEST3_FISHING_BOAT_WOOD, stone: TEST3_FISHING_BOAT_STONE }
    : { gold: TEST3_SHIP_GOLD, wood: TEST3_SHIP_WOOD, stone: TEST3_SHIP_STONE };
  if (test3State.resources.gold < costs.gold || test3State.resources.wood < costs.wood || test3State.resources.stone < costs.stone) {
    test3AddLog(isFishing ? 'Не хватает ресурсов для рыбацкой лодки.' : 'Не хватает ресурсов для корабля.');
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }
  test3SpendResources(costs);
  if (isFishing) {
    test3State.fleet.fishingBoats += 1;
    test3AddLog(`Рыбацкая лодка готова: ${test3State.fleet.fishingBoats}/${test3State.fleet.fishingCapacity}.`);
  } else {
    test3State.fleet.ships += 1;
    test3AddLog(`Корабль готов: ${test3State.fleet.ships}/${test3State.fleet.shipCapacity}.`);
  }
  audioManager.playSettlementSound('ship');
  render('test3');
}

function test3DemolishBuilding(): void {
  const buildingId = test3State.selectedBuildingId;
  if (!buildingId) {
    return;
  }
  const buildingIndex = test3State.buildings.findIndex((building) => building.id === buildingId);
  const building = buildingIndex >= 0 ? test3State.buildings[buildingIndex] : null;
  if (!building) {
    return;
  }
  if (building.type === 'townHall' && test3State.buildings.some((candidate) => (
    candidate.id !== building.id
    && ['house', 'warehouse', 'barracks'].includes(candidate.type)
  ))) {
    test3AddLog('Ратушу нельзя снести, пока работают дома, склад или казарма.');
    audioManager.playSettlementSound('blocked');
    render('test3');
    return;
  }

  const workerIds = [building.workerId, building.upgradeWorkerId].filter((workerId): workerId is string => workerId !== null);
  const definition = TEST3_BUILDING_DEFINITIONS[building.type];
  test3State.buildings.splice(buildingIndex, 1);
  workerIds.forEach((workerId) => {
    const worker = test3State.workers.find((candidate) => candidate.id === workerId);
    if (worker) {
      worker.status = 'idle';
      worker.buildingId = null;
      test3RestoreWorker(worker);
    }
  });
  const refundGold = Math.floor(definition.goldCost * 0.5);
  const refundWood = Math.floor(definition.woodCost * 0.5);
  const refundStone = Math.floor((definition.stoneCost ?? 0) * 0.5);
  test3AddResource('gold', refundGold);
  test3AddResource('wood', refundWood);
  test3AddResource('stone', refundStone);
  if (building.complete && definition.workerCapIncrease) {
    const capReduction = definition.workerCapIncrease + Math.max(0, building.level - 1) * Math.max(1, Math.round(definition.workerCapIncrease / 2));
    test3State.workerCap = Math.max(test3State.workers.length, test3State.workerCap - capReduction);
  }
  if (building.complete && definition.storageIncrease) {
    const storageReduction = definition.storageIncrease + Math.max(0, building.level - 1) * Math.round(definition.storageIncrease / 2);
    test3State.resourceCap = Math.max(
      1000,
      test3State.resourceCap - storageReduction,
      test3State.resources.gold,
      test3State.resources.wood,
      test3State.resources.stone,
      test3State.resources.food,
    );
  }
  if (building.complete && building.type === 'barracks') {
    test3State.army.capacity = Math.max(0, test3State.army.capacity - (building.level === 1 ? 4 : 4 + (building.level - 1) * 2));
    test3State.army.soldiers = Math.min(test3State.army.soldiers, test3State.army.capacity);
  }
  if (building.complete && building.type === 'shipyard') {
    test3State.fleet.shipCapacity = Math.max(0, test3State.fleet.shipCapacity - (building.level === 1 ? 2 : 2 + building.level - 1));
    test3State.fleet.ships = Math.min(test3State.fleet.ships, test3State.fleet.shipCapacity);
  }
  if (building.complete && building.type === 'fishingYard') {
    test3State.fleet.fishingCapacity = Math.max(0, test3State.fleet.fishingCapacity - (building.level === 1 ? 3 : 3 + building.level - 1));
    test3State.fleet.fishingBoats = Math.min(test3State.fleet.fishingBoats, test3State.fleet.fishingCapacity);
  }
  test3State.selectedBuildingId = null;
  test3AddLog(`${definition.label} снесена. Возвращено ${refundGold} золота, ${refundWood} древесины и ${refundStone} камня.`);
  audioManager.playSettlementSound('demolish');
  render('test3');
}

function test3Tick(): void {
  if (activeScreen !== 'test3') {
    return;
  }

  test3State.elapsed += 1;
  const population = test3State.workers.length + test3State.army.soldiers;
  const foodConsumption = population * TEST3_FOOD_PER_PERSON;
  test3ConsumeFood(foodConsumption);
  const income: Record<Test3Resource, number> = { gold: 0, wood: 0, stone: 0, food: -foodConsumption };
  const addIncome = (resource: Test3Resource, amount: number): void => {
    income[resource] += test3AddResource(resource, amount);
  };
  const idleWorkers = test3State.workers.filter((worker) => worker.status === 'idle').length;
  const completedTownHalls = test3State.buildings.filter((building) => building.complete && building.type === 'townHall').length;
  addIncome('gold', idleWorkers * TEST3_IDLE_WORKER_GOLD + completedTownHalls * TEST3_TOWN_HALL_GOLD);
  addIncome('wood', idleWorkers * TEST3_IDLE_WORKER_WOOD + completedTownHalls * TEST3_TOWN_HALL_WOOD);
  addIncome('stone', idleWorkers * TEST3_IDLE_WORKER_STONE + completedTownHalls * TEST3_TOWN_HALL_STONE);

  test3State.buildings.forEach((building) => {
    const definition = TEST3_BUILDING_DEFINITIONS[building.type];
    if (!building.complete) {
      if (!building.workerId) {
        return;
      }
      building.progress = Math.min(1, building.progress + 1 / definition.buildTime);
      if (building.progress >= 1) {
        test3CompleteBuilding(building);
      }
      return;
    }

    if (building.upgrading) {
      if (!building.upgradeWorkerId) {
        return;
      }
      const upgradeCosts = test3UpgradeCosts(building);
      building.upgradeProgress = Math.min(1, building.upgradeProgress + 1 / upgradeCosts.time);
      if (building.upgradeProgress >= 1) {
        test3CompleteUpgrade(building);
      }
      return;
    }

    if (!definition.production || !building.workerId) {
      return;
    }
    const worker = test3State.workers.find((candidate) => candidate.id === building.workerId);
    if (!worker || worker.status !== 'working') {
      return;
    }
    addIncome(definition.production, test3ProductionAmount(building) / 2);
  });

  if (test3State.fleet.fishingBoats > 0) {
    addIncome('food', test3State.fleet.fishingBoats * TEST3_FISHING_BOAT_FOOD / 2);
  }

  if (test3State.elapsed % 4 === 0 && Object.values(income).some((amount) => amount > 0)) {
    const incomeParts = (Object.keys(income) as Test3Resource[])
      .filter((resource) => income[resource] > 0)
      .map((resource) => `+${Math.round(income[resource])} ${test3ResourceLabel(resource)}`);
    test3AddLog(`Добыча: ${incomeParts.join(', ')}.`);
    audioManager.playSettlementSound('resource');
  }
  render('test3');
}

function startTest3Loop(): void {
  if (test3Timer !== null) {
    window.clearInterval(test3Timer);
  }
  test3Timer = window.setInterval(test3Tick, TEST3_TICK_DELAY);
}

function stopTest3Loop(): void {
  if (test3Timer !== null) {
    window.clearInterval(test3Timer);
    test3Timer = null;
  }
}

function selectTest3Building(type: Test3BuildingType): void {
  const availability = test3BuildAvailability(type);
  if (!availability.available) {
    test3AddLog(`${TEST3_BUILDING_DEFINITIONS[type].label}: ${availability.reason}.`);
    audioManager.playSettlementSound('blocked');
    test3State.selectedBuildingType = null;
    render('test3');
    return;
  }
  test3State.selectedBuildingId = null;
  test3State.hoveredTile = null;
  test3State.selectedBuildingType = test3State.selectedBuildingType === type ? null : type;
  if (test3State.selectedBuildingType) {
    test3AddLog(`Режим строительства: ${TEST3_BUILDING_DEFINITIONS[type].label}. Зелёные клетки подходят, красные — нет.`);
    audioManager.playSettlementSound('ui');
  }
  render('test3');
}

function handleTest3Tile(x: number, y: number): void {
  if (test3State.selectedBuildingType) {
    test3PlaceBuilding(x, y);
    return;
  }
  const building = test3BuildingAt(x, y);
  test3State.selectedBuildingId = building?.id ?? null;
  audioManager.playSettlementSound('ui');
  render('test3');
}

function createTest2Schedule(stacks: Record<Test2Faction, Test2Stack>): Test2Faction[] {
  const factions: Test2Faction[] = ['knights', 'demons'];
  const remaining = factions.reduce<Record<Test2Faction, number>>((result, faction) => {
    result[faction] = stacks[faction].initiative;
    return result;
  }, { knights: 0, demons: 0 });
  const schedule: Test2Faction[] = [];

  while (factions.some((faction) => remaining[faction] > 0)) {
    factions
      .slice()
      .sort((left, right) => stacks[right].initiative - stacks[left].initiative)
      .forEach((faction) => {
        if (remaining[faction] > 0) {
          schedule.push(faction);
          remaining[faction] -= 1;
        }
      });
  }

  return schedule;
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

function isTest3BuildingType(value: unknown): value is Test3BuildingType {
  return typeof value === 'string' && value in TEST3_BUILDING_DEFINITIONS;
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

  if (screen !== 'test3') {
    stopTest3Loop();
  }

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

  if (screen === 'test3') {
    renderTest3();
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
          <button class="test-option test-option-building" type="button" data-screen="test3">
            <strong>Тест 3 · Поселение и строительство</strong>
            <small>Сетка скрыта до режима строительства · ресурсы, рабочие и добывающие здания</small>
          </button>
        </div>
        <button class="menu-button menu-button-secondary" type="button" data-screen="menu">
          В главное меню
        </button>
      </section>
    </main>
  `;
}

function test3FormatNumber(value: number): string {
  return Math.floor(value).toLocaleString('ru-RU');
}

function test3TerrainMarkup(kind: Test3Terrain): string {
  if (kind === 'tree') {
    return `<span class="test3-tree" aria-hidden="true"><i></i><b></b><em></em><small></small></span>`;
  }
  if (kind === 'gold') {
    return `<span class="test3-gold-deposit" aria-hidden="true"><i></i><b></b><em></em></span>`;
  }
  if (kind === 'stone') {
    return `<span class="test3-stone-deposit" aria-hidden="true"><i></i><b></b><em></em></span>`;
  }
  if (kind === 'water') {
    return `<span class="test3-water-mark" aria-hidden="true"><i></i><b></b></span>`;
  }
  if (kind === 'rock') {
    return `<span class="test3-rock" aria-hidden="true"><i></i><b></b></span>`;
  }
  return '<span class="test3-grass-mark" aria-hidden="true"></span>';
}

type Test3UiIcon = Test3Resource | 'workers' | 'army' | 'fleet';

function test3UiIcon(type: Test3UiIcon): string {
  const icons: Record<Test3UiIcon, string> = {
    gold: '<circle cx="16" cy="16" r="10"/><path d="m16 9 4 7-4 7-4-7 4-7Z"/>',
    wood: '<path class="test3-ui-wood-log" d="M8 8h16c3 0 5 3 5 8s-2 8-5 8H8c-3 0-5-3-5-8s2-8 5-8Z"/><ellipse class="test3-ui-wood-end" cx="8" cy="16" rx="5" ry="8"/><ellipse class="test3-ui-wood-ring" cx="8" cy="16" rx="2.5" ry="4.5"/><path d="M20 9v14"/>',
    stone: '<path d="M4 23 7 14l7-5 7 2 7 8-3 8H9L4 23Z"/><path d="m7 14 7 5 7-4M14 19l-2 8M21 15l4 4"/>',
    food: '<path d="M16 28V7M16 13 9 7M16 18l8-8M12 28V14M12 17l-6-6M20 28V13M20 17l6-6M9 7l-2-2M24 10l2-2"/>',
    workers: '<path d="M10 11c0-3 2-5 6-5s6 2 6 5M8 12h16M16 6V4M8 28c0-6 3-9 8-9s8 3 8 9M5 18l4 4M27 18l-4 4"/><circle cx="16" cy="12" r="4"/>',
    army: '<path d="M16 4 25 8v7c0 7-3 11-9 14-6-3-9-7-9-14V8l9-4Z"/><path d="m10 22 12-12M18 9l5 5M9 23l4-1"/>',
    fleet: '<path d="M4 22h24l-4 5H8l-4-5ZM9 22l3-12h7l4 12M16 10V4M16 5l8 5H16"/><path d="M3 28c3 2 5-2 8 0s5-2 8 0 5-2 10 0"/>',
  };
  return `<svg class="test3-ui-icon test3-ui-icon-${type}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${icons[type]}</svg>`;
}

function test3CostLabel(resource: Test3Resource, value: number): string {
  return `${test3UiIcon(resource)}${value}`;
}

function test3BuildingIcon(type: Test3BuildingType): string {
  const icons: Record<Test3BuildingType, string> = {
    townHall: '<path d="M4 28h24M7 28V14h18v14M4 14h24L16 7 4 14Z"/><path d="M16 7V3l5 2-5 2M10 18v10M16 18v10M22 18v10"/><circle cx="16" cy="13" r="2"/>',
    goldMine: '<path class="test3-icon-mine-dark" d="M5 28V17a11 11 0 0 1 22 0v11Z"/><path class="test3-icon-timber" d="M7 28V17a9 9 0 0 1 18 0v11M7 18h18M10 28V18M22 28V18"/><path d="M3 28h26M5 24h22"/><path class="test3-icon-cart" d="M9 19h14l-2 6H11l-2-6Z"/><circle class="test3-icon-cart-wheel" cx="12" cy="26" r="2"/><circle class="test3-icon-cart-wheel" cx="20" cy="26" r="2"/><path class="test3-icon-gold" d="m12 19 3-3 3 3 3-2 2 2-2 3h-8l-2-3Z"/>',
    sawmill: '<path d="M4 27h24M6 27v-7h10v7"/><path class="test3-icon-wood" d="M4 20h12v7H4z"/><circle cx="22" cy="16" r="7"/><circle cx="22" cy="16" r="2"/><path d="M22 9v5M22 18v5M15 16h5M24 16h5M17 11l3 3M24 18l3 3M27 11l-3 3M20 18l-3 3"/>',
    quarry: '<path class="test3-icon-stone" d="M5 17 10 9l8 2 6-4 4 8-2 11H7L5 17Z"/><path d="M8 22l4-3 3 4 4-3 4 2M18 5h10M21 5l-7 15"/>',
    house: '<path d="M22 14V7h4v7M21 7h6"/><path d="m4 15 12-10 12 10v13H4V15Z"/><path d="M13 28v-8h6v8M8 17h3v3H8zM21 17h3v3h-3zM9.5 17v3M8 18.5h3M22.5 17v3M21 18.5h3M18 24h1"/>',
    warehouse: '<path d="M3 12h26v16H3V12ZM3 12l5-6h16l5 6Z"/><path d="M6 16h13v12H6V16ZM6 20h13M12 16v12"/><path class="test3-icon-crate" d="M21 16h6v6h-6zM21 24h6v4h-6zM21 19h6M24 16v6M21 26h6M24 24v4"/>',
    barracks: '<path d="M3 28V14h26v14H3Z"/><path d="M3 14h6v-4h5v4h5v-4h5v4h6"/><path d="M7 18h4v5H7zM21 18h4v5h-4z"/><path class="test3-icon-shield" d="M16 16 22 19v4c0 3-3 5-6 7-3-2-6-4-6-7v-4l6-3Z"/><path d="M16 4v8M16 4h6l-3 3h3"/>',
    shipyard: '<path d="M3 28h26M5 25h22"/><path class="test3-icon-hull" d="M5 19h24l-5 8H10l-5-8Z"/><path class="test3-icon-timber" d="M9 19V7h2v12M10 8h17M13 19v6M18 19v6M23 19v6"/><path d="M16 19V5M16 6h8M24 6v5"/>',
    fishingYard: '<path class="test3-icon-fish" d="M4 18c5-7 12-7 18 0-6 7-13 7-18 0ZM21 18l7-5v10l-7-5Z"/><circle class="test3-icon-fish-eye" cx="10" cy="16" r="1"/>',
  };
  return `<svg class="test3-icon-svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${icons[type]}</svg>`;
}

function renderTest3(): void {
  if (test3Timer === null) {
    startTest3Loop();
  }

  const buildMode = test3State.selectedBuildingType !== null;
  const selectedDefinition = test3State.selectedBuildingType
    ? TEST3_BUILDING_DEFINITIONS[test3State.selectedBuildingType]
    : null;
  const selectedBuilding = test3State.selectedBuildingId
    ? test3State.buildings.find((building) => building.id === test3State.selectedBuildingId) ?? null
    : null;
  const completedBuildings = test3State.buildings.filter((building) => building.complete);
  const idleWorkers = test3State.workers.filter((worker) => worker.status === 'idle').length;
  const completedTownHalls = completedBuildings.filter((building) => building.type === 'townHall').length;
  const incomeGold = idleWorkers * TEST3_IDLE_WORKER_GOLD
    + completedTownHalls * TEST3_TOWN_HALL_GOLD
    + completedBuildings
      .filter((building) => building.type === 'goldMine' && building.workerId)
      .reduce((total, building) => total + test3ProductionAmount(building) / 2, 0);
  const incomeWood = idleWorkers * TEST3_IDLE_WORKER_WOOD
    + completedTownHalls * TEST3_TOWN_HALL_WOOD
    + completedBuildings
      .filter((building) => building.type === 'sawmill' && building.workerId)
      .reduce((total, building) => total + test3ProductionAmount(building) / 2, 0);
  const incomeStone = idleWorkers * TEST3_IDLE_WORKER_STONE
    + completedTownHalls * TEST3_TOWN_HALL_STONE
    + completedBuildings
      .filter((building) => building.type === 'quarry' && building.workerId)
      .reduce((total, building) => total + test3ProductionAmount(building) / 2, 0);
  const population = test3State.workers.length + test3State.army.soldiers;
  const foodShortage = test3State.resources.food <= 0;
  const incomeFood = test3State.fleet.fishingBoats * TEST3_FISHING_BOAT_FOOD / 2
    + completedBuildings
      .filter((building) => building.type === 'fishingYard' && building.workerId)
      .reduce((total, building) => total + test3ProductionAmount(building) / 2, 0)
    - population * TEST3_FOOD_PER_PERSON;
  const occupiedWorkers = test3State.workers.filter((worker) => worker.status !== 'idle').length;
  const previewAnchor = buildMode && test3State.hoveredTile && test3State.selectedBuildingType
    ? test3PreviewAnchor(test3State.selectedBuildingType, test3State.hoveredTile.x, test3State.hoveredTile.y)
    : null;
  const previewPlacement = previewAnchor && test3State.selectedBuildingType
    ? test3CanPlace(test3State.selectedBuildingType, previewAnchor.x, previewAnchor.y)
    : null;
  const mapTiles = Array.from({ length: TEST3_HEIGHT }, (_, y) => Array.from({ length: TEST3_WIDTH }, (_, x) => {
    const tile = test3TileAt(x, y) as Test3Tile;
    const building = test3BuildingAt(x, y);
    const isPreviewCell = Boolean(
      previewAnchor
      && test3State.selectedBuildingType
      && x >= previewAnchor.x
      && x < previewAnchor.x + TEST3_BUILDING_DEFINITIONS[test3State.selectedBuildingType].width
      && y >= previewAnchor.y
      && y < previewAnchor.y + TEST3_BUILDING_DEFINITIONS[test3State.selectedBuildingType].height,
    );
    const isPreviewAnchor = Boolean(isPreviewCell && previewAnchor && x === previewAnchor.x && y === previewAnchor.y);
    const classes = [
      'test3-tile',
      `is-${tile.kind}`,
      tile.kind === 'tree' || tile.kind === 'gold' || tile.kind === 'stone' ? 'is-resource-node' : '',
      building ? 'has-building' : '',
      isPreviewCell && previewPlacement?.valid ? 'is-build-valid' : '',
      isPreviewCell && previewPlacement && !previewPlacement.valid ? 'is-build-invalid' : '',
      isPreviewCell ? 'is-build-ghost' : '',
      isPreviewAnchor ? 'is-build-anchor' : '',
    ].filter(Boolean).join(' ');
    const terrainLabel = tile.kind === 'tree'
      ? 'Дерево'
      : tile.kind === 'gold'
        ? 'Золотая жила'
        : tile.kind === 'stone'
          ? 'Каменная жила'
          : tile.kind === 'water'
            ? 'Вода'
            : tile.kind === 'rock' ? 'Камни' : 'Трава';
    return `<button class="${classes}" type="button" data-test3-x="${x}" data-test3-y="${y}" aria-label="${terrainLabel}, клетка ${x + 1}, ${y + 1}">
      ${test3TerrainMarkup(tile.kind)}
    </button>`;
  })).flat().join('');

  const ghostValidityClass = previewPlacement?.valid ? ' is-valid' : ' is-invalid';
  const ghostMarkup = previewAnchor && test3State.selectedBuildingType && selectedDefinition && previewPlacement
    ? `<div class="test3-building test3-building-ghost${ghostValidityClass} test3-building-${test3State.selectedBuildingType}" style="left: calc(${(previewAnchor.x / TEST3_WIDTH) * 100}% + 2px); top: calc(${(previewAnchor.y / TEST3_HEIGHT) * 100}% + 2px); width: calc(${(selectedDefinition.width / TEST3_WIDTH) * 100}% - 4px); height: calc(${(selectedDefinition.height / TEST3_HEIGHT) * 100}% - 4px);" aria-hidden="true">
        <span class="test3-building-icon">${test3BuildingIcon(test3State.selectedBuildingType)}</span>
        <strong>${selectedDefinition.label}</strong>
        <small>${previewPlacement.valid ? `Предпросмотр ${selectedDefinition.width}×${selectedDefinition.height}` : previewPlacement.reason}</small>
      </div>`
    : '';
  const buildingMarkup = test3State.buildings.map((building) => {
    const definition = TEST3_BUILDING_DEFINITIONS[building.type];
    const activeWorkerId = building.upgrading ? building.upgradeWorkerId : building.workerId;
    const worker = activeWorkerId
      ? test3State.workers.find((candidate) => candidate.id === activeWorkerId) ?? null
      : null;
    const workerMarkup = worker && (!building.complete || building.upgrading || definition.production)
      ? `<span class="test3-building-worker ${worker.status === 'working' ? 'is-working' : ''}" title="${worker.label}">⚒</span>`
      : '';
    const selected = test3State.selectedBuildingId === building.id ? ' is-selected' : '';
    const progress = Math.round((building.upgrading ? building.upgradeProgress : building.progress) * 100);
    const statusText = !building.complete
      ? `Строительство ${progress}%`
      : building.upgrading
        ? `Улучшение до ${building.level + 1} ур. · ${progress}%`
        : definition.production
          ? `+${test3ProductionAmount(building)} / 2 сек · ур. ${building.level}`
          : building.type === 'townHall'
            ? '+3 места · базовый доход'
            : building.type === 'house'
              ? '+2 места · +1 житель'
              : building.type === 'warehouse'
                ? '+500 к лимиту ресурсов'
                : building.type === 'barracks'
                  ? `Армия: ${test3State.army.capacity} мест`
                  : building.type === 'shipyard'
                    ? `Флот: ${test3State.fleet.shipCapacity} мест`
                    : building.type === 'fishingYard'
                      ? `Рыбацкий флот: ${test3State.fleet.fishingCapacity} мест`
                      : `Готово · ур. ${building.level}`;
    return `<div class="test3-building test3-building-${building.type}${selected}${building.complete ? ' is-complete' : ' is-under-construction'}${building.upgrading ? ' is-upgrading' : ''}" style="left: calc(${(building.x / TEST3_WIDTH) * 100}% + 3px); top: calc(${(building.y / TEST3_HEIGHT) * 100}% + 3px); width: calc(${(building.width / TEST3_WIDTH) * 100}% - 6px); height: calc(${(building.height / TEST3_HEIGHT) * 100}% - 6px);" aria-label="${definition.label}">
      <span class="test3-building-icon">${test3BuildingIcon(building.type)}</span>
      <strong>${definition.label}</strong>
      <small>${statusText}</small>
      ${!building.complete || building.upgrading ? `<span class="test3-construction-bar"><i style="width: ${progress}%"></i></span>` : ''}
      ${workerMarkup}
    </div>`;
  }).join('');

  const selectedInfo = selectedDefinition
    ? `<div class="test3-selection-info is-build-mode">
        <span class="test3-selection-kicker">Режим строительства</span>
        <strong>${test3BuildingIcon(test3State.selectedBuildingType as Test3BuildingType)} ${selectedDefinition.label}</strong>
        <small>${selectedDefinition.description}</small>
        <span class="test3-selection-note">Щёлкните по подходящей клетке · Esc отменяет</span>
      </div>`
    : selectedBuilding
      ? (() => {
        const definition = TEST3_BUILDING_DEFINITIONS[selectedBuilding.type];
        const worker = selectedBuilding.workerId
          ? test3State.workers.find((candidate) => candidate.id === selectedBuilding.workerId)
          : selectedBuilding.upgradeWorkerId
            ? test3State.workers.find((candidate) => candidate.id === selectedBuilding.upgradeWorkerId)
            : null;
        const upgradeAvailability = test3UpgradeAvailability(selectedBuilding);
        const upgradeCosts = selectedBuilding.level < TEST3_MAX_BUILDING_LEVEL ? test3UpgradeCosts(selectedBuilding) : null;
        const upgradeMarkup = selectedBuilding.complete
          ? `<button class="test3-selection-action test3-upgrade-button" type="button" data-test3-upgrade="${selectedBuilding.id}"${upgradeAvailability.available ? '' : ' disabled'}>
              <strong>Улучшить до ${Math.min(TEST3_MAX_BUILDING_LEVEL, selectedBuilding.level + 1)} уровня</strong>
              <small>${upgradeCosts ? `${test3CostLabel('gold', upgradeCosts.gold)} · ${test3CostLabel('wood', upgradeCosts.wood)} · ${test3CostLabel('stone', upgradeCosts.stone)} · ${upgradeCosts.time} сек` : upgradeAvailability.reason}</small>
            </button>`
          : '';
        const recruitAvailable = selectedBuilding.type === 'barracks'
          && selectedBuilding.complete
          && !selectedBuilding.upgrading
          && test3State.army.soldiers < test3State.army.capacity
          && test3State.resources.gold >= TEST3_ARMY_RECRUIT_GOLD
          && test3State.resources.wood >= TEST3_ARMY_RECRUIT_WOOD
          && test3State.resources.stone >= TEST3_ARMY_RECRUIT_STONE;
        const recruitMarkup = selectedBuilding.type === 'barracks' && selectedBuilding.complete
          ? `<button class="test3-selection-action test3-recruit-button" type="button" data-test3-recruit="${selectedBuilding.id}"${recruitAvailable ? '' : ' disabled'}>
              <strong>Вербовать мечника</strong>
              <small>${test3CostLabel('gold', TEST3_ARMY_RECRUIT_GOLD)} · ${test3CostLabel('wood', TEST3_ARMY_RECRUIT_WOOD)} · ${test3CostLabel('stone', TEST3_ARMY_RECRUIT_STONE)} · ${test3State.army.soldiers}/${test3State.army.capacity}</small>
            </button>`
          : '';
        const shipAvailable = selectedBuilding.type === 'shipyard'
          && selectedBuilding.complete
          && !selectedBuilding.upgrading
          && test3State.fleet.ships < test3State.fleet.shipCapacity
          && test3State.resources.gold >= TEST3_SHIP_GOLD
          && test3State.resources.wood >= TEST3_SHIP_WOOD
          && test3State.resources.stone >= TEST3_SHIP_STONE;
        const fishingBoatAvailable = selectedBuilding.type === 'fishingYard'
          && selectedBuilding.complete
          && !selectedBuilding.upgrading
          && test3State.fleet.fishingBoats < test3State.fleet.fishingCapacity
          && test3State.resources.gold >= TEST3_FISHING_BOAT_GOLD
          && test3State.resources.wood >= TEST3_FISHING_BOAT_WOOD
          && test3State.resources.stone >= TEST3_FISHING_BOAT_STONE;
        const fleetMarkup = selectedBuilding.type === 'shipyard' && selectedBuilding.complete
          ? `<button class="test3-selection-action test3-ship-button" type="button" data-test3-fleet="ship" data-test3-fleet-building="${selectedBuilding.id}"${shipAvailable ? '' : ' disabled'}>
              <strong>Построить корабль</strong>
              <small>${test3CostLabel('gold', TEST3_SHIP_GOLD)} · ${test3CostLabel('wood', TEST3_SHIP_WOOD)} · ${test3CostLabel('stone', TEST3_SHIP_STONE)} · ${test3State.fleet.ships}/${test3State.fleet.shipCapacity}</small>
            </button>`
          : selectedBuilding.type === 'fishingYard' && selectedBuilding.complete
            ? `<button class="test3-selection-action test3-fishing-button" type="button" data-test3-fleet="fishingBoat" data-test3-fleet-building="${selectedBuilding.id}"${fishingBoatAvailable ? '' : ' disabled'}>
              <strong>Построить рыбацкую лодку</strong>
              <small>${test3CostLabel('gold', TEST3_FISHING_BOAT_GOLD)} · ${test3CostLabel('wood', TEST3_FISHING_BOAT_WOOD)} · ${test3CostLabel('stone', TEST3_FISHING_BOAT_STONE)} · ${test3State.fleet.fishingBoats}/${test3State.fleet.fishingCapacity}</small>
            </button>`
            : '';
        return `<div class="test3-selection-info">
          <span class="test3-selection-kicker">Выбрано поселение · уровень ${selectedBuilding.level}</span>
          <strong>${test3BuildingIcon(selectedBuilding.type)} ${definition.label}</strong>
          <small>${!selectedBuilding.complete
            ? `Строительство: ${Math.round(selectedBuilding.progress * 100)}%`
            : selectedBuilding.upgrading
              ? `Улучшение: ${Math.round(selectedBuilding.upgradeProgress * 100)}%`
              : definition.description}</small>
          <span class="test3-selection-note">${worker
            ? `${worker.label}: ${selectedBuilding.upgrading ? 'улучшает здание' : worker.status === 'working' ? 'добывает ресурс' : 'строит'}`
            : selectedBuilding.upgrading ? 'Рабочий улучшает здание' : 'Рабочий свободен после строительства'}</span>
          ${recruitMarkup}
          ${fleetMarkup}
          ${upgradeMarkup}
          <button class="test3-selection-action test3-demolish-button" type="button" data-test3-demolish="${selectedBuilding.id}">
            <strong>Снести здание</strong>
            <small>Вернётся 50% ресурсов</small>
          </button>
        </div>`;
      })()
      : `<div class="test3-selection-info">
          <span class="test3-selection-kicker">Совет управляющего</span>
          <strong>Сначала экономика, потом ратуша</strong>
          <small>Поставьте рудник на золотую жилу и лесопилку на дереве. Дом даёт +2 места и нового рабочего, ратуша даёт +3 места, базовый доход и открывает развитие. Каждый житель расходует 1 еды в секунду.</small>
          <span class="test3-selection-note">Еда не опускается ниже нуля: при нулевом запасе включается дебафф, и добыча падает на 50%.</span>
        </div>`;

  const buildingCards = (Object.keys(TEST3_BUILDING_DEFINITIONS) as Test3BuildingType[]).map((type) => {
    const definition = TEST3_BUILDING_DEFINITIONS[type];
    const availability = test3BuildAvailability(type);
    const active = test3State.selectedBuildingType === type ? ' is-active' : '';
    const disabled = availability.available ? '' : ' disabled';
    const targetLabel = definition.target === 'grass'
      ? 'свободная земля'
      : definition.target === 'tree'
        ? 'дерево'
        : definition.target === 'gold'
          ? 'золотая жила'
          : definition.target === 'stone'
            ? 'каменная жила'
            : 'вода';
    const stoneCostMarkup = (definition.stoneCost ?? 0) > 0
      ? `<b class="is-stone">${test3CostLabel('stone', definition.stoneCost ?? 0)}</b>`
      : '';
    return `<button class="test3-build-card test3-build-${type}${active}" type="button" data-test3-build="${type}"${disabled}>
      <span class="test3-build-card-icon">${test3BuildingIcon(type)}</span>
      <span class="test3-build-card-copy">
        <strong>${definition.label}</strong>
        <small>${definition.description}</small>
        <span class="test3-build-target">${targetLabel} · ${definition.width}×${definition.height} · ${definition.buildTime} сек</span>
      </span>
      <span class="test3-build-cost">
        <b class="is-gold">${test3CostLabel('gold', definition.goldCost)}</b>
        <b class="is-wood">${test3CostLabel('wood', definition.woodCost)}</b>
        ${stoneCostMarkup}
        <small>${availability.reason}</small>
      </span>
    </button>`;
  }).join('');
  const mapClass = buildMode ? ' is-build-mode' : '';
  const mapHint = buildMode
    ? `Размещение: <strong>${selectedDefinition?.label}</strong> · клетка под курсором — левый верхний угол участка ${selectedDefinition?.width}×${selectedDefinition?.height}`
    : 'Карта поселения · клеточная разметка скрыта';

  app.innerHTML = `
    <main class="test3-screen" aria-labelledby="test3-title">
      <section class="test3-card">
        <header class="test3-header">
          <div>
            <p class="eyebrow">Тест 3 · Экономика и строительство</p>
            <h1 id="test3-title">Пограничное поселение</h1>
            <p class="test3-subtitle">Развивайте добычу, распределяйте рабочих и превращайте пустую поляну в крепость.</p>
          </div>
          <div class="test3-time-badge">
            <span>Время поселения</span>
            <strong>${Math.floor(test3State.elapsed / 60).toString().padStart(2, '0')}:${(test3State.elapsed % 60).toString().padStart(2, '0')}</strong>
            <small>${buildMode ? 'Режим строительства' : 'Свободный обзор'}</small>
          </div>
        </header>

        <section class="test3-resource-bar" aria-label="Ресурсы поселения">
          <div class="test3-resource test3-resource-gold">
            <span class="test3-resource-icon">${test3UiIcon('gold')}</span>
            <span><small>Золото</small><strong>${test3FormatNumber(test3State.resources.gold)} <em>/ ${test3State.resourceCap}</em></strong></span>
            <b>+${Math.round(incomeGold)}/сек</b>
          </div>
          <div class="test3-resource test3-resource-wood">
            <span class="test3-resource-icon">${test3UiIcon('wood')}</span>
            <span><small>Древесина</small><strong>${test3FormatNumber(test3State.resources.wood)} <em>/ ${test3State.resourceCap}</em></strong></span>
            <b>+${Math.round(incomeWood)}/сек</b>
          </div>
          <div class="test3-resource test3-resource-stone">
            <span class="test3-resource-icon">${test3UiIcon('stone')}</span>
            <span><small>Камень</small><strong>${test3FormatNumber(test3State.resources.stone)} <em>/ ${test3State.resourceCap}</em></strong></span>
            <b>+${Math.round(incomeStone)}/сек</b>
          </div>
          <div class="test3-resource test3-resource-food${foodShortage ? ' is-starving' : ''}">
            <span class="test3-resource-icon">${test3UiIcon('food')}</span>
            <span><small>Еда</small><strong>${test3FormatNumber(test3State.resources.food)} <em>/ ${test3State.resourceCap}</em></strong></span>
            <b>${incomeFood >= 0 ? '+' : ''}${Math.round(incomeFood)}/сек · −${population} чел.${foodShortage ? ' · добыча −50%' : ''}</b>
          </div>
          <div class="test3-resource test3-resource-workers">
            <span class="test3-resource-icon">${test3UiIcon('workers')}</span>
            <span><small>Рабочие</small><strong>${test3State.workers.length} / ${test3State.workerCap}</strong></span>
            <b>${occupiedWorkers} занято</b>
          </div>
          <div class="test3-resource test3-resource-army">
            <span class="test3-resource-icon">${test3UiIcon('army')}</span>
            <span><small>Армия</small><strong>${test3State.army.soldiers} / ${test3State.army.capacity}</strong></span>
            <b>мечники</b>
          </div>
          <div class="test3-resource test3-resource-fleet">
            <span class="test3-resource-icon">${test3UiIcon('fleet')}</span>
            <span><small>Флот</small><strong>${test3State.fleet.ships + test3State.fleet.fishingBoats} / ${test3State.fleet.shipCapacity + test3State.fleet.fishingCapacity}</strong></span>
            <b>${test3State.fleet.fishingBoats} рыбацких</b>
          </div>
        </section>

        <div class="test3-layout">
          <section class="test3-map-panel" aria-label="Карта поселения">
            <div class="test3-map-heading">
              <div><strong>Карта поселения</strong><span>${mapHint}</span></div>
              ${buildMode ? '<button class="test3-cancel-button" type="button" data-test3-cancel>Отменить</button>' : ''}
            </div>
            <div class="test3-map-wrap${mapClass}">
              <div class="test3-map" style="--test3-columns: ${TEST3_WIDTH}; --test3-rows: ${TEST3_HEIGHT};">
                <div class="test3-map-tiles">
                  ${mapTiles}
                </div>
                ${ghostMarkup}
                ${buildingMarkup}
              </div>
              <div class="test3-map-legend"><span><i class="is-tree"></i> дерево</span><span><i class="is-gold"></i> золото</span><span><i class="is-stone"></i> камень</span><span><i class="is-water"></i> вода</span><span><i class="is-building"></i> постройка</span></div>
            </div>
          </section>
        </div>

        <section class="test3-build-panel" aria-labelledby="test3-build-title">
          <div class="test3-build-heading">
            <div><strong id="test3-build-title">Строительство и выбранное здание</strong><span>Выберите здание в меню или кликните по постройке на карте</span></div>
            <small>Для стройки: ${test3State.workers.filter((worker) => worker.status !== 'building').length} · добывающего рабочего можно переназначить</small>
          </div>
          ${selectedInfo}
          <div class="test3-build-menu">${buildingCards}</div>
        </section>

        <button class="menu-button menu-button-secondary test3-back-button" type="button" data-screen="tests">
          К списку тестов
        </button>
      </section>
    </main>
  `;
}

function renderTest2(): void {
  const currentFaction = test2State.schedule[test2State.scheduleIndex];
  const currentStack = test2State.stacks[currentFaction];
  const selectedStack = test2State.selected ? test2State.stacks[test2State.selected] : null;
  const hoveredStack = test2State.hovered ? test2State.stacks[test2State.hovered] : null;
  const reachableCells = new Set<string>();
  const hoverReachableCells = new Set<string>();
  const showHoverRange = Boolean(hoveredStack && !test2State.result && !test2State.aiBusy && !test2State.playerBusy);

  const addMovementCells = (stack: Test2Stack, availableActionPoints: number, targetSet: Set<string>): void => {
    const movementPoints = Math.min(3, availableActionPoints);
    if (stack.count <= 0 || movementPoints <= 0) {
      return;
    }

    for (let y = 0; y < TEST2_HEIGHT; y += 1) {
      for (let x = 0; x < TEST2_WIDTH; x += 1) {
        const occupant = test2StackAt(x, y);
        const path = !occupant ? test2FindPath(stack.x, stack.y, x, y) : null;
        if (path && path.length > 0 && path.length <= movementPoints) {
          targetSet.add(test2HexKey(x, y));
        }
      }
    }
  };

  if (currentFaction === 'knights' && selectedStack?.id === 'knights') {
    addMovementCells(selectedStack, selectedStack.actionPoints, reachableCells);
  }

  if (showHoverRange && hoveredStack) {
    const availableActionPoints = hoveredStack.id === currentFaction
      ? hoveredStack.actionPoints
      : hoveredStack.maxActionPoints;
    addMovementCells(hoveredStack, availableActionPoints, hoverReachableCells);
  }

  const boardMarkup = (() => {
    const hexWidth = Math.sqrt(3);
    const viewBoxWidth = hexWidth * (TEST2_WIDTH + 0.5);
    const viewBoxHeight = 1.5 * (TEST2_HEIGHT - 1) + 2;
    const cells = Array.from({ length: TEST2_HEIGHT }, (_, y) => Array.from({ length: TEST2_WIDTH }, (_, x) => {
      const liveStack = test2StackAt(x, y);
      const deathAnimation = test2State.deathAnimation?.x === x && test2State.deathAnimation.y === y
        ? test2State.deathAnimation
        : null;
      const stack = liveStack ?? (deathAnimation ? test2State.stacks[deathAnimation.faction] : null);
      const isDeath = Boolean(deathAnimation);
      const cellKey = test2HexKey(x, y);
      const classes = [
        'hex-svg-cell',
        !showHoverRange && reachableCells.has(cellKey) ? 'is-reachable' : '',
        showHoverRange && hoverReachableCells.has(cellKey) ? 'is-hover-reachable' : '',
        stack && stack.id === 'knights' ? 'is-knights' : '',
        stack && stack.id === 'demons' ? 'is-demons' : '',
        stack && test2State.selected === stack.id ? 'is-selected' : '',
        isDeath ? 'is-death' : '',
      ];
      const [centerX, centerY] = test2HexCenter(x, y);
      const attack = test2State.attackAnimation;
      let cellStyle = '';
      if (attack && stack?.id === attack.attacker) {
        const [attackerX, attackerY] = test2HexCenter(test2State.stacks[attack.attacker].x, test2State.stacks[attack.attacker].y);
        const [targetX, targetY] = test2HexCenter(test2State.stacks[attack.target].x, test2State.stacks[attack.target].y);
        const distance = Math.max(0.001, Math.hypot(targetX - attackerX, targetY - attackerY));
        classes.push('is-attack-attacker');
        cellStyle = ` style="--attack-x: ${((targetX - attackerX) / distance * 0.26).toFixed(3)}px; --attack-y: ${((targetY - attackerY) / distance * 0.26).toFixed(3)}px;"`;
      } else if (attack && stack?.id === attack.target) {
        const [attackerX, attackerY] = test2HexCenter(test2State.stacks[attack.attacker].x, test2State.stacks[attack.attacker].y);
        const [targetX, targetY] = test2HexCenter(test2State.stacks[attack.target].x, test2State.stacks[attack.target].y);
        const distance = Math.max(0.001, Math.hypot(targetX - attackerX, targetY - attackerY));
        classes.push('is-attack-target');
        cellStyle = ` style="--recoil-x: ${((attackerX - targetX) / distance * 0.1).toFixed(3)}px; --recoil-y: ${((attackerY - targetY) / distance * 0.1).toFixed(3)}px;"`;
      }
      const points = Array.from({ length: 6 }, (_, index) => {
        const angle = Math.PI / 6 + (Math.PI / 3) * index;
        return `${(centerX + Math.cos(angle)).toFixed(3)},${(centerY + Math.sin(angle)).toFixed(3)}`;
      }).join(' ');
      const modelMarkup = stack?.id === 'knights'
        ? `<g class="hex-svg-model hex-svg-knight-model" aria-hidden="true">
            <path class="knight-cape" d="M-.38 .54Q-.58 .25-.4-.08L-.18-.3 .28-.2 .43 .56Z"></path>
            <path class="knight-body" d="M-.27-.04Q-.32 .25-.24 .58H.24Q.32 .25 .27-.04Z"></path>
            <path class="knight-shield" d="M-.47-.08Q-.7 0-.64 .3Q-.58 .57-.4 .66Q-.22 .57-.2 .3V.01Z"></path>
            <path class="knight-sword" d="M.35 .36L.7-.57M.24 .18L.46 .3M.56-.62L.79-.5"></path>
            <path class="knight-helmet" d="M-.28-.47Q0-.75 .28-.47L.23-.2H-.23Z"></path>
            <path class="knight-visor" d="M-.23-.4H.25V-.3H-.22Z"></path>
            <circle class="knight-face" cx=".05" cy="-.29" r=".07"></circle>
          </g>`
        : `<g class="hex-svg-model hex-svg-demon-model" aria-hidden="true">
            <path class="demon-wings" d="M-.2-.08Q-.72-.5-.73 .35L-.28 .2M.2-.08Q.72-.5 .73 .35L.28 .2"></path>
            <path class="demon-body" d="M-.28-.02Q-.35 .28-.22 .61H.22Q.35 .28 .28-.02Q0-.16-.28-.02Z"></path>
            <path class="demon-head" d="M-.27-.42Q0-.67 .27-.42L.22-.16Q0-.05-.22-.16Z"></path>
            <path class="demon-horns" d="M-.2-.43Q-.38-.7-.42-.48M.2-.43Q.38-.7 .42-.48"></path>
            <circle class="demon-eye" cx="-.1" cy="-.31" r=".035"></circle>
            <circle class="demon-eye" cx=".1" cy="-.31" r=".035"></circle>
            <path class="demon-claws" d="M-.27 .05L-.58 .35M.27 .05L.58 .35"></path>
          </g>`;
      const casualtyAnimation = stack && test2State.casualtyAnimation?.faction === stack.id
        ? test2State.casualtyAnimation
        : null;
      const displayCount = stack
        ? Math.max(stack.count, casualtyAnimation?.fromCount ?? 0, 1)
        : 0;
      const formationRows = stack ? test2FormationRows(displayCount) : 1;
      const formationCount = stack ? Math.min(displayCount, formationRows * 3) : 0;
      const formationColumns = Math.max(1, Math.ceil(formationCount / formationRows));
      const casualtyCutoff = casualtyAnimation ? Math.min(casualtyAnimation.toCount, formationCount) : formationCount;
      const formationScale = test2FormationScale();
      const modelFormationMarkup = stack
        ? Array.from({ length: formationCount }, (_, index) => {
          const row = Math.floor(index / formationColumns);
          const column = index % formationColumns;
          const offsetX = (column - (formationColumns - 1) / 2) * 0.32;
          const offsetY = (row - (formationRows - 1) / 2) * 0.34;
          const casualtyMarkup = casualtyAnimation && index >= casualtyCutoff
            ? `<g class="hex-svg-casualty">${modelMarkup}</g>`
            : modelMarkup;
          return `<g transform="translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${formationScale})">${casualtyMarkup}</g>`;
        }).join('')
        : '';
      const countMarkup = !isDeath && stack
        ? `<g class="hex-svg-count" transform="translate(${centerX + 0.57} ${centerY - 0.55})" aria-label="${stack.count} бойцов">
            <circle r="0.23"></circle>
            <text x="0" y="0.06">${stack.count}</text>
          </g>`
        : '';
      const healthAnimation = stack && test2State.healthAnimation?.faction === stack.id
        ? test2State.healthAnimation
        : null;
      const healthTo = stack && stack.maxHealth > 0 ? Math.max(0, Math.min(1, stack.health / stack.maxHealth)) : 0;
      const healthFrom = healthAnimation && stack && stack.maxHealth > 0
        ? Math.max(0, Math.min(1, healthAnimation.from / stack.maxHealth))
        : healthTo;
      const divisionBase = stack
        ? Math.max(1, casualtyAnimation?.fromCount ?? (stack.count > 0 ? stack.count : healthAnimation ? Math.ceil(healthAnimation.from / stack.unitHealth) : 1))
        : 1;
      const divisionSize = test2HealthDivisionSize(divisionBase);
      const divisionCount = Math.max(1, Math.ceil(divisionBase / divisionSize));
      const healthTicks = Array.from({ length: Math.max(0, divisionCount - 1) }, (_, index) => {
        const position = centerX - 0.45 + 0.9 * ((index + 1) / divisionCount);
        return `<line x1="${position}" y1="${centerY - 0.9}" x2="${position}" y2="${centerY - 0.8}"></line>`;
      }).join('');
      const healthBarMarkup = stack
        ? `<g class="hex-svg-health" aria-label="Здоровье отряда ${Math.round(stack.health)} из ${stack.maxHealth}">
            <rect class="hex-svg-health-bg" x="${centerX - 0.45}" y="${centerY - 0.9}" width="0.9" height="0.1" rx="0.04"></rect>
            <rect class="hex-svg-health-fill${healthAnimation ? ' is-animating' : ''}" x="${centerX - 0.45}" y="${centerY - 0.9}" width="0.9" height="0.1" rx="0.04" style="--health-from: ${healthFrom}; --health-to: ${healthTo};"></rect>
            <g class="hex-svg-health-ticks">${healthTicks}</g>
          </g>`
        : '';
      const damageAnimation = stack && test2State.healthAnimation?.faction === stack.id && test2State.attackAnimation?.target === stack.id
        ? test2State.healthAnimation
        : null;
      const damageMarkup = damageAnimation
        ? `<text class="hex-damage-number" x="${centerX + 0.42}" y="${centerY - 0.5}">-${damageAnimation.damage}</text>`
        : '';
      const unitMarkup = stack
        ? `<g class="hex-svg-unit" data-test2-unit="${stack.id}">
            <ellipse class="hex-svg-unit-shadow" cx="${centerX}" cy="${centerY + 0.66}" rx="0.42" ry="0.1"></ellipse>
            <g transform="translate(${centerX} ${centerY})">${modelFormationMarkup}</g>
            ${countMarkup}
          </g>`
        : '';
      const tooltipMarkup = stack && !isDeath
        ? `<g class="hex-svg-tooltip" transform="translate(${Math.max(0, Math.min(viewBoxWidth - 5.9, centerX - 2.95))},0.12)">
            <rect width="5.9" height="2.15" rx="0.12"></rect>
            <text class="tooltip-title" x="0.2" y="0.38">${stack.label} ×${stack.count}</text>
            <text x="0.2" y="0.78">Здоровье отряда: ${Math.round(stack.health)}/${stack.maxHealth}</text>
            <text x="0.2" y="1.16">Здоровье бойца: ${stack.unitHealth}</text>
            <text x="0.2" y="1.54">Урон: ${stack.damage} · Защита: ${stack.defense}</text>
            <text x="0.2" y="1.92">Режим: ${stack.attackMode} · Иниц. ${stack.initiative} · ОД: ${stack.actionPoints}/${stack.maxActionPoints}</text>
          </g>`
        : '';

      return `<g class="${classes.filter(Boolean).join(' ')}"${cellStyle} data-hex-x="${x}" data-hex-y="${y}" role="gridcell" aria-label="Клетка ${x + 1}, ${y + 1}">
        <polygon points="${points}"></polygon>
        ${unitMarkup}
        ${healthBarMarkup}
        ${damageMarkup}
        ${tooltipMarkup}
      </g>`;
    }).join('')).join('');
    return `<div class="hex-board">
      <svg class="test2-hex-svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" role="grid" aria-label="Гексовое поле 12 на 6">
        ${cells}
      </svg>
    </div>`;
  })();

  const orderMarkup = test2State.schedule.map((faction, index) => {
    const ordinal = test2State.schedule.slice(0, index + 1).filter((item) => item === faction).length;
    const current = index === test2State.scheduleIndex ? ' is-current' : '';
    return `<span class="test2-order-item ${faction}${current}">${faction === 'knights' ? 'Рыцари' : 'Демоны'} ${ordinal}</span>`;
  }).join('');
  const actionDisabled = currentFaction !== 'knights'
    || test2State.result !== null
    || test2State.aiBusy
    || test2State.playerBusy
    ? ' disabled'
    : '';
  const animationClass = test2State.aiBusy && test2State.aiAnimation === 'move'
    ? ' is-ai-move'
    : test2State.playerBusy && test2State.playerAnimation === 'move'
      ? ' is-player-move'
      : '';
  const knights = test2State.stacks.knights;
  const healAmount = test2HealPreview();
  const healPreview = knights.abilityUsed ? '0/1 · +0 HP' : `+${healAmount} HP`;
  const healDisabled = actionDisabled || knights.abilityUsed || knights.actionPoints < 1 ? ' disabled' : '';
  const resultMarkup = test2State.result && test2State.summary
    ? `<div class="test2-result-overlay ${test2State.result}" role="status">
        <strong>${test2State.result === 'win' ? 'Победа!' : 'Поражение'}</strong>
        <span>${test2State.result === 'win' ? 'Демоны разбиты.' : 'Рыцари уничтожены.'}</span>
        <div class="test2-summary">
          <span><b>${test2State.summary.knightsLost}</b> потеряно рыцарей</span>
          <span><b>${test2State.summary.demonsKilled}</b> убито демонов</span>
          <span><b>+${test2State.summary.experience}</b> опыта командиру</span>
          <span><b>+${test2State.summary.gold}</b> золота командиру</span>
        </div>
      </div>`
    : '';
  const logMarkup = test2State.log.slice(-7).map((entry) => `<li>${entry}</li>`).join('');

  app.innerHTML = `
    <main class="test2-screen${animationClass}${test2State.result ? ' has-result' : ''}" aria-labelledby="test2-title">
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
            <span>Рыцари получают ${test2State.stacks.knights.initiative} ходов, демоны — ${test2State.stacks.demons.initiative}</span>
          </div>
          <div class="test2-order-list">${orderMarkup}</div>
        </section>

        <div class="test2-layout">
          <section class="hex-board-panel" aria-label="Гексовое поле 12 на 6">
            <div class="hex-board-meta">
              <strong>Поле 12×6</strong>
              <span>Синие — ваши · красные — ИИ · зелёные — ход · янтарные — маршрут</span>
            </div>
            ${boardMarkup}
            ${resultMarkup}
            <p class="hex-help">melee: соседняя клетка · перемещение до 3 ОД · удар 1 ОД.</p>
          </section>

          <div class="test2-bottom-layout">
            <section class="test2-actions-panel">
              <div class="test2-ap-line">
                <span>Очки действий</span>
                <strong>${currentStack.actionPoints}/${currentStack.maxActionPoints}</strong>
              </div>
              <button class="test2-action" type="button" data-test2-action="heal"${healDisabled} title="${healPreview}">
                <span class="test2-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" focusable="false">
                    <path d="M16 27.2 5.7 17.4C1.4 13.3 4.1 6 10 6c2.4 0 4.6 1.2 6 3.1C17.4 7.2 19.6 6 22 6c5.9 0 8.6 7.3 4.3 11.4Z"></path>
                    <path d="M16 11v8M12 15h8"></path>
                  </svg>
                </span>
                <span class="test2-action-copy">
                  <strong>Исцелить отряд</strong>
                  <small>+${healAmount} HP · ${knights.abilityUsed ? '0/1' : '1/1'}</small>
                </span>
                <span class="test2-hover-tooltip" role="tooltip">${healPreview}</span>
              </button>
            </section>

            <section class="test2-log-panel" aria-labelledby="test2-log-title">
              <h2 id="test2-log-title">Журнал</h2>
              <ol>${logMarkup}</ol>
            </section>
          </div>
        </div>

        <button class="menu-button menu-button-secondary test2-back-button" type="button" data-screen="tests">
          К списку тестов
        </button>
      </section>
    </main>
  `;
}

function test2HexKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function test2HexCenter(x: number, y: number): [number, number] {
  const hexWidth = Math.sqrt(3);
  return [hexWidth / 2 + x * hexWidth + (y % 2 === 1 ? hexWidth / 2 : 0), 1 + y * 1.5];
}

function test2FormationRows(count: number): number {
  const desiredRows = window.innerWidth < 560 ? 2 : window.innerWidth < 960 ? 3 : 4;
  return Math.max(1, Math.min(count, desiredRows));
}

function test2FormationScale(): number {
  if (window.innerWidth < 560) {
    return 0.22;
  }
  if (window.innerWidth < 960) {
    return 0.26;
  }
  return 0.3;
}

function test2HealthDivisionSize(count: number): number {
  if (count < 10) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(count));
  return count < magnitude * 5 ? magnitude / 2 : magnitude;
}

function test2StackAt(x: number, y: number): Test2Stack | null {
  const stack = Object.values(test2State.stacks).find((candidate) => candidate.count > 0 && candidate.x === x && candidate.y === y);
  return stack ?? null;
}

function test2Neighbors(x: number, y: number): Array<[number, number]> {
  const directions = y % 2 === 0
    ? [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]
    : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];

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

function test2FindPath(startX: number, startY: number, targetX: number, targetY: number): Array<[number, number]> | null {
  if (startX === targetX && startY === targetY) {
    return [];
  }

  const startKey = test2HexKey(startX, startY);
  const targetKey = test2HexKey(targetX, targetY);
  const queue: Array<[number, number]> = [[startX, startY]];
  const previous = new Map<string, [number, number] | null>([[startKey, null]]);

  while (queue.length > 0) {
    const [x, y] = queue.shift() as [number, number];

    for (const [nextX, nextY] of test2Neighbors(x, y)) {
      const key = test2HexKey(nextX, nextY);
      if (previous.has(key)) {
        continue;
      }

      const occupant = test2StackAt(nextX, nextY);
      if (occupant && key !== targetKey) {
        continue;
      }

      previous.set(key, [x, y]);
      if (key === targetKey) {
        const path: Array<[number, number]> = [];
        let current: [number, number] = [targetX, targetY];
        let currentKey = targetKey;

        while (currentKey !== startKey) {
          path.unshift(current);
          const parent = previous.get(currentKey);
          if (!parent) {
            return null;
          }
          current = parent;
          currentKey = test2HexKey(current[0], current[1]);
        }

        return path;
      }

      queue.push([nextX, nextY]);
    }
  }

  return null;
}

function test2FindMeleeApproachPath(attackerId: Test2Faction): Array<[number, number]> | null {
  const attacker = test2State.stacks[attackerId];
  const targetId: Test2Faction = attackerId === 'knights' ? 'demons' : 'knights';
  const target = test2State.stacks[targetId];

  const paths = test2Neighbors(target.x, target.y)
    .filter(([x, y]) => !test2StackAt(x, y))
    .map(([x, y]) => test2FindPath(attacker.x, attacker.y, x, y))
    .filter((path): path is Array<[number, number]> => path !== null)
    .sort((left, right) => left.length - right.length);

  return paths[0] ?? null;
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
  const distance = test2Distance(attacker.x, attacker.y, target.x, target.y);
  const allowedDistance = attacker.attackMode === 'melee' ? TEST2_MELEE_RANGE : TEST2_RANGE_ATTACK_DISTANCE;

  const inAttackRange = attacker.attackMode === 'melee'
    ? distance === TEST2_MELEE_RANGE
    : distance > 0 && distance <= allowedDistance;

  return attacker.count > 0 && target.count > 0 && inAttackRange;
}

async function animateTest2KnightMovement(path: Array<[number, number]>): Promise<void> {
  const knights = test2State.stacks.knights;
  test2State.playerBusy = true;
  test2State.playerAnimation = 'move';

  try {
    for (const [nextX, nextY] of path) {
      knights.x = nextX;
      knights.y = nextY;
      knights.actionPoints -= 1;
      test2AddLog(`Рыцари переместились. Осталось ОД: ${knights.actionPoints}.`);
      render('test2');
      await wait(TEST2_STEP_DELAY);
    }
  } finally {
    test2State.playerBusy = false;
    test2State.playerAnimation = null;
    render('test2');
  }
}

async function animateTest2KnightAttack(): Promise<void> {
  test2State.playerBusy = true;
  test2State.playerAnimation = 'attack';
  await test2Attack('knights', 360);
  test2State.playerBusy = false;
  test2State.playerAnimation = null;
  render('test2');
}

async function test2ApproachAndAttack(): Promise<boolean> {
  const knights = test2State.stacks.knights;
  const demons = test2State.stacks.demons;

  if (knights.count <= 0 || demons.count <= 0 || knights.hasAttacked || knights.actionPoints < 1) {
    test2AddLog('Атака невозможна: не хватает очков действий.');
    return false;
  }

  if (test2CanAttack('knights')) {
    await animateTest2KnightAttack();
    return true;
  }

  if (knights.attackMode !== 'melee') {
    test2AddLog(`Цель вне дальности: режим ${knights.attackMode}, максимум ${TEST2_RANGE_ATTACK_DISTANCE} клеток.`);
    return false;
  }

  const approachPath = test2FindMeleeApproachPath('knights');
  if (!approachPath) {
    test2AddLog('К соседней клетке нет свободного пути.');
    return false;
  }

  const attackCost = approachPath.length + 1;
  if (attackCost > knights.actionPoints) {
    const moveSteps = Math.min(3, knights.actionPoints, approachPath.length);
    if (moveSteps === 0) {
      test2AddLog('Для сближения не осталось ОД.');
      return false;
    }

    await animateTest2KnightMovement(approachPath.slice(0, moveSteps));
    test2AddLog(`Рыцари потратили ${moveSteps} ОД на сближение. Для удара нужна соседняя клетка и 1 ОД.`);
    render('test2');
    return true;
  }

  await animateTest2KnightMovement(approachPath);

  if (!test2CanAttack('knights')) {
    test2AddLog('Атака отменена: Демоны не на соседней клетке.');
    render('test2');
    return false;
  }

  await animateTest2KnightAttack();
  return true;
}

function test2AddLog(text: string): void {
  test2State.log.push(text);
  test2State.log = test2State.log.slice(-8);
}

function resetTest2Turn(stack: Test2Stack): void {
  stack.actionPoints = stack.maxActionPoints;
  stack.hasAttacked = false;
}

function finishTest2(result: 'win' | 'lose'): void {
  if (test2State.result) {
    return;
  }

  const defeatedFaction: Test2Faction = result === 'win' ? 'demons' : 'knights';
  const defeatedStack = test2State.stacks[defeatedFaction];
  const demonsKilled = test2State.stacks.demons.maxCount - test2State.stacks.demons.count;

  test2State.result = result;
  test2State.deathAnimation = {
    faction: defeatedFaction,
    x: defeatedStack.x,
    y: defeatedStack.y,
  };
  test2State.summary = {
    knightsLost: test2State.stacks.knights.maxCount - test2State.stacks.knights.count,
    demonsKilled,
    experience: demonsKilled * TEST2_XP_PER_DEMON,
    gold: demonsKilled * TEST2_GOLD_PER_DEMON,
  };
  audioManager.playBattleSound(result === 'win' ? 'victory' : 'defeat');
  test2AddLog(result === 'win' ? 'Победа! Демоны разбиты.' : 'Поражение. Рыцари уничтожены.');

  const deathAnimation = test2State.deathAnimation;
  window.setTimeout(() => {
    if (test2State.deathAnimation !== deathAnimation) {
      return;
    }
    test2State.deathAnimation = null;
    if (activeScreen === 'test2') {
      render('test2');
    }
  }, 760);
}

function test2ApplyDamage(attackerId: Test2Faction, isCounter = false): void {
  const attacker = test2State.stacks[attackerId];
  const targetId: Test2Faction = attackerId === 'knights' ? 'demons' : 'knights';
  const target = test2State.stacks[targetId];
  const previousHealth = target.health;
  const previousCount = target.count;
  const damagePerUnit = Math.max(1, attacker.damage - target.defense);
  const damage = damagePerUnit * attacker.count;

  target.health = Math.max(0, target.health - damage);
  syncTest2Count(target);
  test2State.healthAnimation = {
    faction: targetId,
    from: previousHealth,
    to: target.health,
    damage,
  };
  test2State.casualtyAnimation = target.count > 0 && target.count < previousCount
    ? { faction: targetId, fromCount: previousCount, toCount: target.count }
    : null;
  audioManager.playBattleSound('hit');
  test2AddLog(`${attacker.label} ${isCounter ? 'контратакуют' : 'атакуют'}: ${damage} урона. ${target.label} осталось: ${target.count}.`);

  if (target.count <= 0) {
    finishTest2(attackerId === 'knights' ? 'win' : 'lose');
  }
}

async function animateTest2AttackIndicator(
  attackerId: Test2Faction,
  targetId: Test2Faction,
  windupDelay: number,
  counter = false,
): Promise<void> {
  test2State.attackAnimation = {
    attacker: attackerId,
    target: targetId,
    phase: 'windup',
  };
  render('test2');
  await wait(windupDelay);
  if (test2State.result) {
    return;
  }
  test2State.attackAnimation.phase = counter ? 'counter' : 'impact';
  render('test2');
  await wait(TEST2_ATTACK_IMPACT_DELAY);
}

async function test2Attack(attackerId: Test2Faction, windupDelay = TEST2_ATTACK_WINDUP): Promise<boolean> {
  const attacker = test2State.stacks[attackerId];
  const targetId: Test2Faction = attackerId === 'knights' ? 'demons' : 'knights';
  const target = test2State.stacks[targetId];

  if (attacker.actionPoints < 1 || attacker.hasAttacked || !test2CanAttack(attackerId)) {
    test2AddLog(attacker.attackMode === 'melee'
      ? 'Атака невозможна: цель должна быть ровно на соседней клетке.'
      : `Атака невозможна: цель дальше ${TEST2_RANGE_ATTACK_DISTANCE} клеток.`);
    return false;
  }

  try {
    await animateTest2AttackIndicator(attackerId, targetId, windupDelay);
    if (test2State.result) {
      return false;
    }

    attacker.actionPoints -= 1;
    attacker.hasAttacked = true;
    test2ApplyDamage(attackerId);
    render('test2');
    await wait(TEST2_COUNTER_ATTACK_DELAY);

    if (target.count > 0 && test2CanAttack(targetId)) {
      test2State.healthAnimation = null;
      test2State.casualtyAnimation = null;
      await animateTest2AttackIndicator(targetId, attackerId, 300, true);
      if (!test2State.result) {
        test2ApplyDamage(targetId, true);
        render('test2');
        await wait(TEST2_HEALTH_ANIMATION_DELAY);
      }
    }

    return true;
  } finally {
    test2State.attackAnimation = null;
    test2State.healthAnimation = null;
    test2State.casualtyAnimation = null;
    render('test2');
  }
}

function test2HealPreview(): number {
  const knights = test2State.stacks.knights;
  if (test2State.result
    || test2State.aiBusy
    || test2State.playerBusy
    || test2State.schedule[test2State.scheduleIndex] !== 'knights'
    || knights.abilityUsed
    || knights.actionPoints < 1
    || knights.count <= 0) {
    return 0;
  }

  const amount = TEST2_HEAL_PER_KNIGHT * knights.count;
  const currentUnitCapacity = knights.count * knights.unitHealth;
  return Math.min(amount, Math.max(0, currentUnitCapacity - knights.health));
}

function test2Heal(): boolean {
  const knights = test2State.stacks.knights;
  const healed = test2HealPreview();
  if (test2State.result
    || test2State.aiBusy
    || test2State.playerBusy
    || test2State.schedule[test2State.scheduleIndex] !== 'knights'
    || knights.abilityUsed
    || knights.actionPoints < 1
    || knights.count <= 0) {
    return false;
  }

  knights.health += healed;
  knights.actionPoints -= 1;
  knights.abilityUsed = true;
  audioManager.playBattleSound('magic');
  test2AddLog(`Исцеление отряда: +${healed} HP (${knights.count} рыцарей × ${TEST2_HEAL_PER_KNIGHT}).`);
  return true;
}

async function performTest2AiTurn(): Promise<void> {
  const demons = test2State.stacks.demons;
  const knights = test2State.stacks.knights;

  if (demons.count <= 0 || knights.count <= 0) {
    return;
  }

  let moved = 0;
  const movementBudget = Math.min(3, Math.max(0, demons.actionPoints - 1));
  const approachPath = !test2CanAttack('demons') && demons.attackMode === 'melee'
    ? test2FindMeleeApproachPath('demons')
    : null;

  if (approachPath) {
    for (const [nextX, nextY] of approachPath.slice(0, movementBudget)) {
      demons.x = nextX;
      demons.y = nextY;
      demons.actionPoints -= 1;
      moved += 1;
      test2State.aiAnimation = 'move';
      test2AddLog(`Демоны переместились. Осталось ОД: ${demons.actionPoints}.`);
      render('test2');
      await wait(TEST2_STEP_DELAY);
    }
  }

  if (test2CanAttack('demons') && demons.actionPoints > 0) {
    test2State.aiAnimation = 'attack';
    await test2Attack('demons');
  } else if (moved > 0) {
    test2AddLog(`Демоны потратили ${moved} ОД на сближение.`);
  } else if (!test2CanAttack('demons')) {
    test2AddLog(approachPath
      ? 'Демонам не хватило ОД для выхода на соседнюю клетку.'
      : 'Демонам не удалось найти свободный путь к соседней клетке.');
  }
}

async function advanceTest2Turn(): Promise<void> {
  if (test2State.result || test2State.aiBusy || test2State.playerBusy) {
    return;
  }

  test2State.stacks.knights.actionPoints = 0;
  let attempts = 0;

  while (attempts < test2State.schedule.length) {
    test2State.scheduleIndex = (test2State.scheduleIndex + 1) % test2State.schedule.length;
    if (test2State.scheduleIndex === 0) {
      test2State.cycle += 1;
    }

    const faction = test2State.schedule[test2State.scheduleIndex];
    const stack = test2State.stacks[faction];
    attempts += 1;

    if (stack.count <= 0) {
      continue;
    }

    resetTest2Turn(stack);

    if (faction === 'demons') {
      test2State.aiBusy = true;
      test2State.aiAnimation = null;
      render('test2');
      await wait(TEST2_NEXT_TURN_DELAY);
      test2State.aiAnimation = 'move';
      render('test2');
      await performTest2AiTurn();
      test2State.aiBusy = false;
      test2State.aiAnimation = null;
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
  if (test2State.result
    || test2State.aiBusy
    || test2State.playerBusy
    || test2State.schedule[test2State.scheduleIndex] !== 'knights') {
    return;
  }

  if (action === 'heal' && test2Heal()) {
    void advanceTest2Turn();
    return;
  }

  render('test2');
}

async function handleTest2Cell(x: number, y: number): Promise<void> {
  if (test2State.result
    || test2State.aiBusy
    || test2State.playerBusy
    || test2State.schedule[test2State.scheduleIndex] !== 'knights') {
    return;
  }

  const knights = test2State.stacks.knights;
  const occupant = test2StackAt(x, y);

  if (occupant?.id === 'knights') {
    test2State.selected = 'knights';
    render('test2');
    return;
  }

  if (occupant?.id === 'demons') {
    const attacked = await test2ApproachAndAttack();
    if (attacked && !test2State.result) {
      await advanceTest2Turn();
    } else if (!attacked && !test2State.result) {
      render('test2');
    }
    return;
  }

  if (test2State.selected !== 'knights') {
    return;
  }

  const path = test2FindPath(knights.x, knights.y, x, y);
  const movementPoints = Math.min(3, knights.actionPoints);
  if (!path || path.length === 0 || path.length > movementPoints) {
    test2AddLog('Эта клетка находится дальше доступного перемещения.');
    render('test2');
    return;
  }

  await animateTest2KnightMovement(path);
  if (!test2State.result) {
    await advanceTest2Turn();
  }
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

app.addEventListener('pointermove', (event: PointerEvent) => {
  if (activeScreen !== 'test2' || test2State.result || test2State.aiBusy || test2State.playerBusy) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const cell = target.closest('[data-hex-x][data-hex-y]') as HTMLElement | null;
  const hoveredStack = cell
    ? test2StackAt(Number(cell.dataset.hexX), Number(cell.dataset.hexY))
    : null;
  const nextHovered = hoveredStack?.id ?? null;
  if (test2State.hovered === nextHovered) {
    return;
  }

  test2State.hovered = nextHovered;
  render('test2');
});

app.addEventListener('pointerleave', () => {
  if (activeScreen === 'test2' && test2State.hovered !== null) {
    test2State.hovered = null;
    render('test2');
  }
});

app.addEventListener('pointermove', (event: PointerEvent) => {
  if (activeScreen !== 'test3') {
    return;
  }
  const target = event.target;
  const cell = target instanceof Element
    ? target.closest('[data-test3-x][data-test3-y]') as HTMLElement | null
    : null;
  const nextHovered = cell
    ? { x: Number(cell.dataset.test3X), y: Number(cell.dataset.test3Y) }
    : null;
  const previous = test3State.hoveredTile;
  if (previous?.x === nextHovered?.x && previous?.y === nextHovered?.y) {
    return;
  }
  test3State.hoveredTile = nextHovered;
  render('test3');
});

app.addEventListener('pointerleave', () => {
  if (activeScreen === 'test3' && test3State.hoveredTile !== null) {
    test3State.hoveredTile = null;
    render('test3');
  }
});

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

  const test3Tile = clickedElement.closest('[data-test3-x][data-test3-y]') as HTMLElement | null;
  if (activeScreen === 'test3' && test3Tile && app.contains(test3Tile)) {
    audioManager.playButtonSound();
    handleTest3Tile(Number(test3Tile.dataset.test3X), Number(test3Tile.dataset.test3Y));
    return;
  }

  const hexCell = clickedElement.closest('[data-hex-x][data-hex-y]') as HTMLElement | null;
  if (activeScreen === 'test2' && hexCell && app.contains(hexCell)) {
    if (test2State.result || test2State.aiBusy || test2State.playerBusy) {
      return;
    }
    audioManager.playButtonSound();
    void handleTest2Cell(Number(hexCell.dataset.hexX), Number(hexCell.dataset.hexY));
    return;
  }

  const button = clickedElement.closest<HTMLButtonElement>('button');

  if (!button || !app.contains(button)) {
    return;
  }

  audioManager.playButtonSound();

  if (activeScreen === 'test3' && button.dataset.test3Cancel !== undefined) {
    test3State.selectedBuildingType = null;
    test3State.hoveredTile = null;
    render('test3');
    return;
  }

  const test3Build = button.dataset.test3Build;
  if (activeScreen === 'test3' && isTest3BuildingType(test3Build)) {
    selectTest3Building(test3Build);
    return;
  }

  if (activeScreen === 'test3' && button.dataset.test3Upgrade) {
    const building = test3State.buildings.find((candidate) => candidate.id === button.dataset.test3Upgrade);
    if (building) {
      test3StartUpgrade(building);
    }
    return;
  }

  if (activeScreen === 'test3' && button.dataset.test3Recruit) {
    test3RecruitArmy(button.dataset.test3Recruit);
    return;
  }

  if (activeScreen === 'test3' && button.dataset.test3Fleet && button.dataset.test3FleetBuilding) {
    test3BuildFleet(button.dataset.test3FleetBuilding, button.dataset.test3Fleet as Test3FleetAction);
    return;
  }

  if (activeScreen === 'test3' && button.dataset.test3Demolish) {
    if (test3State.selectedBuildingId === button.dataset.test3Demolish) {
      test3DemolishBuilding();
    }
    return;
  }

  const test2Action = button.dataset.test2Action;
  if (activeScreen === 'test2' && test2Action) {
    handleTest2Action(test2Action);
    return;
  }

  if (activeScreen === 'test2' && button.dataset.hexX && button.dataset.hexY) {
    void handleTest2Cell(Number(button.dataset.hexX), Number(button.dataset.hexY));
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

    if (nextScreen === 'test3') {
      test3State = createTest3State();
      audioManager.startBattleMusic();
      startTest3Loop();
      render('test3');
      return;
    }

    if (nextScreen !== 'testBattle') {
      audioManager.startMusic();
    }
    render(nextScreen);
  }
});

app.addEventListener('contextmenu', (event: MouseEvent) => {
  if (activeScreen !== 'test3' || test3State.selectedBuildingType === null) {
    return;
  }
  const target = event.target;
  if (target instanceof Element && target.closest('[data-test3-x][data-test3-y]')) {
    event.preventDefault();
    test3State.selectedBuildingType = null;
    test3State.hoveredTile = null;
    render('test3');
  }
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && activeScreen === 'test3' && test3State.selectedBuildingType !== null) {
    test3State.selectedBuildingType = null;
    test3State.hoveredTile = null;
    render('test3');
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
  if (activeScreen !== 'testBattle' && activeScreen !== 'test2' && activeScreen !== 'test3') {
    audioManager.startMusic();
  }
}, { passive: true });
window.addEventListener('keydown', () => {
  if (activeScreen !== 'testBattle' && activeScreen !== 'test2' && activeScreen !== 'test3') {
    audioManager.startMusic();
  }
});

let resizeTimer: number | null = null;
window.addEventListener('resize', () => {
  if (activeScreen !== 'test2' || test2State.aiBusy || test2State.playerBusy) {
    return;
  }

  if (resizeTimer !== null) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    resizeTimer = null;
    render('test2');
  }, 120);
});

applySettings();
render('menu');
