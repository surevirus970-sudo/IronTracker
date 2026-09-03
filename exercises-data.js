// IronTrack - Справочник упражнений, шаблоны и Ранговая система Dota 2

// Ранги Dota 2
const DOTA_RANKS = [
  { id: 'herald', name: 'Рекрут', minMmr: 0, maxMmr: 769, color: '#9e7149', bg: '#2b1d14', icon: '🥉' },
  { id: 'guardian', name: 'Страж', minMmr: 770, maxMmr: 1539, color: '#8fa0a8', bg: '#1d272d', icon: '🥈' },
  { id: 'crusader', name: 'Рыцарь', minMmr: 1540, maxMmr: 2309, color: '#4a829e', bg: '#152431', icon: '⚔️' },
  { id: 'archon', name: 'Герой', minMmr: 2310, maxMmr: 3079, color: '#e5b842', bg: '#332912', icon: '🛡️' },
  { id: 'legend', name: 'Легенда', minMmr: 3080, maxMmr: 3849, color: '#00e5d8', bg: '#0b2b2b', icon: '🦅' },
  { id: 'ancient', name: 'Властелин', minMmr: 3850, maxMmr: 4619, color: '#c084fc', bg: '#29143d', icon: '👑' },
  { id: 'divine', name: 'Божество', minMmr: 4620, maxMmr: 5419, color: '#fbbf24', bg: '#382507', icon: '🌟' },
  { id: 'immortal', name: 'Титан', minMmr: 5420, maxMmr: 10000, color: '#f87171', bg: '#3b1212', icon: '🏆' }
];

// SVG-медали Dota 2 рангов
const DOTA_MEDAL_SVGS = {
  herald: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#2b1d14" stroke="#9e7149" stroke-width="2.5"/><path d="M16 16L24 10L32 16L28 32L24 38L20 32Z" fill="#9e7149" stroke="#d49b6a" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#d49b6a"/></svg>`,
  guardian: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#1d272d" stroke="#8fa0a8" stroke-width="2.5"/><path d="M24 8L36 14V26C36 33 24 40 24 40C24 40 12 33 12 26V14L24 8Z" fill="#4d616c" stroke="#b0c4de" stroke-width="1.5"/><path d="M24 16V32M16 24H32" stroke="#e2e8f0" stroke-width="2"/></svg>`,
  crusader: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#152431" stroke="#4a829e" stroke-width="2.5"/><path d="M14 14L34 34M34 14L14 34" stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round"/><path d="M24 9V39" stroke="#93c5fd" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="5" fill="#3b82f6"/></svg>`,
  archon: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#332912" stroke="#e5b842" stroke-width="2.5"/><path d="M24 6L38 16L32 38L24 42L16 38L10 16Z" fill="#b45309" stroke="#fbbf24" stroke-width="2"/><path d="M24 14L30 20L24 34L18 20Z" fill="#fde047"/><circle cx="24" cy="24" r="3" fill="#fff"/></svg>`,
  legend: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#0b2b2b" stroke="#00e5d8" stroke-width="2.5"/><path d="M24 6L40 24L24 42L8 24Z" fill="#0f766e" stroke="#2dd4bf" stroke-width="2"/><path d="M24 12L34 24L24 36L14 24Z" fill="#14b8a6" stroke="#5eead4" stroke-width="1.5"/><circle cx="24" cy="24" r="4" fill="#ccfbf1"/></svg>`,
  ancient: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#29143d" stroke="#c084fc" stroke-width="2.5"/><path d="M12 18L18 36H30L36 18L28 24L24 10L20 24Z" fill="#7e22ce" stroke="#c084fc" stroke-width="2"/><circle cx="24" cy="25" r="4" fill="#f3e8ff"/></svg>`,
  divine: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#382507" stroke="#fbbf24" stroke-width="2.5"/><path d="M24 4L28 18L42 20L31 30L34 44L24 36L14 44L17 30L6 20L20 18Z" fill="#d97706" stroke="#fde047" stroke-width="2"/><circle cx="24" cy="24" r="6" fill="#fff" opacity="0.9"/></svg>`,
  immortal: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="21" fill="#3b1212" stroke="#ef4444" stroke-width="3"/><path d="M24 4L38 14V30L24 44L10 30V14Z" fill="#991b1b" stroke="#f87171" stroke-width="2"/><path d="M24 12L32 18V28L24 36L16 28V18Z" fill="#ef4444"/><circle cx="24" cy="23" r="4" fill="#fef08a"/></svg>`
};

// Функция определения ранга по очкам MMR
function getDotaRankByMmr(mmr) {
  const safeMmr = Math.max(0, Math.round(mmr || 0));
  let rankObj = DOTA_RANKS[0];

  for (let i = 0; i < DOTA_RANKS.length; i++) {
    if (safeMmr >= DOTA_RANKS[i].minMmr) {
      rankObj = DOTA_RANKS[i];
    }
  }

  // Для Титана нет деления на звезды
  if (rankObj.id === 'immortal') {
    return {
      ...rankObj,
      stars: 0,
      starText: 'Титан',
      fullName: 'Титан',
      percentToNext: 100,
      mmr: safeMmr,
      svg: DOTA_MEDAL_SVGS.immortal
    };
  }

  // Расчет звезд от 1 до 5
  const range = rankObj.maxMmr - rankObj.minMmr + 1;
  const progressInRank = safeMmr - rankObj.minMmr;
  const starStep = range / 5;
  const stars = Math.min(5, Math.max(1, Math.floor(progressInRank / starStep) + 1));
  const percentToNext = Math.min(100, Math.round(((progressInRank % starStep) / starStep) * 100));

  return {
    ...rankObj,
    stars: stars,
    starText: '⭐'.repeat(stars),
    fullName: `${rankObj.name} ${stars}`,
    percentToNext: percentToNext,
    mmr: safeMmr,
    svg: DOTA_MEDAL_SVGS[rankObj.id]
  };
}

// 6 основных осей прокачки героя (Dota Radar Pentagon)
const MUSCLE_AXES = [
  { id: 'chest', name: 'Грудь', icon: '🛡️', role: 'Атака / Push' },
  { id: 'back', name: 'Спина', icon: '⚔️', role: 'Тяга / Pull' },
  { id: 'legs', name: 'Ноги', icon: '🦿', role: 'База / Стойкость' },
  { id: 'shoulders', name: 'Плечи', icon: '🦅', role: 'Размах / Броня' },
  { id: 'arms', name: 'Руки', icon: '💪', role: 'Мощь / Оружие' },
  { id: 'core', name: 'Кор / Пресс', icon: '⚡', role: 'Живучесть' }
];

// Справочник упражнений с базовым калибровочным весом (Archon Weight - 2500 MMR)
const DEFAULT_EXERCISES = [
  // --- ГРУДЬ ---
  {
    id: 'chest_bench_press',
    name: 'Жим штанги лежа',
    muscleGroup: 'Грудь',
    axis: 'chest',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 80, // 80 кг = 2500 MMR (Герой)
    defaultRestSec: 120
  },
  {
    id: 'chest_incline_db_press',
    name: 'Жим гантелей на наклонной скамье',
    muscleGroup: 'Грудь',
    axis: 'chest',
    category: 'Базовое',
    equipment: 'Гантели',
    archonWeight: 30, // по 30 кг
    defaultRestSec: 90
  },
  {
    id: 'chest_dips',
    name: 'Отжимания на брусьях (на грудь)',
    muscleGroup: 'Грудь',
    axis: 'chest',
    category: 'Базовое',
    equipment: 'Собственный вес',
    archonWeight: 20, // +20 кг доп. веса
    defaultRestSec: 90
  },
  {
    id: 'chest_cable_crossover',
    name: 'Сведение рук в кроссовере',
    muscleGroup: 'Грудь',
    axis: 'chest',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    archonWeight: 25,
    defaultRestSec: 60
  },
  {
    id: 'chest_pushups',
    name: 'Отжимания от пола',
    muscleGroup: 'Грудь',
    axis: 'chest',
    category: 'Базовое',
    equipment: 'Собственный вес',
    archonWeight: 35, // 35 повторений
    defaultRestSec: 60
  },

  // --- СПИНА ---
  {
    id: 'back_deadlift',
    name: 'Становая тяга (классическая)',
    muscleGroup: 'Спина',
    axis: 'back',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 120, // 120 кг = 2500 MMR
    defaultRestSec: 180
  },
  {
    id: 'back_pullups',
    name: 'Подтягивания на турнике',
    muscleGroup: 'Спина',
    axis: 'back',
    category: 'Базовое',
    equipment: 'Собственный вес',
    archonWeight: 15, // +15 кг на поясе
    defaultRestSec: 120
  },
  {
    id: 'back_barbell_row',
    name: 'Тяга штанги в наклоне',
    muscleGroup: 'Спина',
    axis: 'back',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 70,
    defaultRestSec: 90
  },
  {
    id: 'back_lat_pulldown',
    name: 'Тяга верхнего блока к груди',
    muscleGroup: 'Спина',
    axis: 'back',
    category: 'Базовое',
    equipment: 'Блочный тренажер',
    archonWeight: 65,
    defaultRestSec: 75
  },
  {
    id: 'back_seated_cable_row',
    name: 'Горизонтальная тяга блока к поясу',
    muscleGroup: 'Спина',
    axis: 'back',
    category: 'Базовое',
    equipment: 'Блочный тренажер',
    archonWeight: 65,
    defaultRestSec: 75
  },

  // --- НОГИ ---
  {
    id: 'legs_barbell_squat',
    name: 'Приседания со штангой',
    muscleGroup: 'Ноги',
    axis: 'legs',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 100, // 100 кг = 2500 MMR
    defaultRestSec: 150
  },
  {
    id: 'legs_leg_press',
    name: 'Жим ногами в платформе',
    muscleGroup: 'Ноги',
    axis: 'legs',
    category: 'Базовое',
    equipment: 'Тренажер',
    archonWeight: 180,
    defaultRestSec: 120
  },
  {
    id: 'legs_romanian_deadlift',
    name: 'Румынская тяга (на прямых ногах)',
    muscleGroup: 'Ноги',
    axis: 'legs',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 85,
    defaultRestSec: 90
  },
  {
    id: 'legs_leg_extension',
    name: 'Разгибания ног в тренажере',
    muscleGroup: 'Ноги',
    axis: 'legs',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    archonWeight: 60,
    defaultRestSec: 60
  },
  {
    id: 'legs_leg_curl',
    name: 'Сгибания ног лежа/сидя',
    muscleGroup: 'Ноги',
    axis: 'legs',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    archonWeight: 45,
    defaultRestSec: 60
  },

  // --- ПЛЕЧИ ---
  {
    id: 'shoulders_military_press',
    name: 'Армейский жим стоя (overhead press)',
    muscleGroup: 'Плечи',
    axis: 'shoulders',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 50, // 50 кг = 2500 MMR
    defaultRestSec: 120
  },
  {
    id: 'shoulders_seated_db_press',
    name: 'Жим гантелей сидя',
    muscleGroup: 'Плечи',
    axis: 'shoulders',
    category: 'Базовое',
    equipment: 'Гантели',
    archonWeight: 22,
    defaultRestSec: 90
  },
  {
    id: 'shoulders_lateral_raises',
    name: 'Махи гантелями в стороны',
    muscleGroup: 'Плечи',
    axis: 'shoulders',
    category: 'Изолирующее',
    equipment: 'Гантели',
    archonWeight: 12,
    defaultRestSec: 60
  },
  {
    id: 'shoulders_face_pulls',
    name: 'Тяга каната к лицу (Face Pull)',
    muscleGroup: 'Плечи',
    axis: 'shoulders',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    archonWeight: 35,
    defaultRestSec: 60
  },

  // --- РУКИ (БИЦЕПС И ТРИЦЕПС) ---
  {
    id: 'arms_barbell_curl',
    name: 'Подъем штанги на бицепс',
    muscleGroup: 'Руки',
    axis: 'arms',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 35, // 35 кг = 2500 MMR
    defaultRestSec: 75
  },
  {
    id: 'arms_dumbbell_hammer_curl',
    name: 'Молотковые сгибания с гантелями',
    muscleGroup: 'Руки',
    axis: 'arms',
    category: 'Базовое',
    equipment: 'Гантели',
    archonWeight: 16,
    defaultRestSec: 60
  },
  {
    id: 'arms_close_grip_bench',
    name: 'Жим лежа узким хватом',
    muscleGroup: 'Руки',
    axis: 'arms',
    category: 'Базовое',
    equipment: 'Штанга',
    archonWeight: 70,
    defaultRestSec: 90
  },
  {
    id: 'arms_cable_pushdown',
    name: 'Разгибания на трицепс на блоке',
    muscleGroup: 'Руки',
    axis: 'arms',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    archonWeight: 30,
    defaultRestSec: 60
  },

  // --- КОР И ПРЕСС ---
  {
    id: 'core_hanging_leg_raise',
    name: 'Подъем ног в висе на турнике',
    muscleGroup: 'Кор / Пресс',
    axis: 'core',
    category: 'Базовое',
    equipment: 'Собственный вес',
    archonWeight: 15,
    defaultRestSec: 60
  },
  {
    id: 'core_cable_crunch',
    name: 'Скручивания на блоке (Молитва)',
    muscleGroup: 'Кор / Пресс',
    axis: 'core',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    archonWeight: 45,
    defaultRestSec: 60
  },
  {
    id: 'core_plank',
    name: 'Планка на время (сек)',
    muscleGroup: 'Кор / Пресс',
    axis: 'core',
    category: 'Изолирующее',
    equipment: 'Собственный вес',
    archonWeight: 90, // 90 сек
    defaultRestSec: 60
  }
];

// 5 популярных тренировочных программ
const DEFAULT_TEMPLATES = [
  {
    id: 'template_push',
    name: 'Жим / Push (Грудь, Плечи, Трицепс)',
    badge: 'Катка на победу',
    description: 'Интенсивная тренировка всех толкающих мышечных групп.',
    exercises: [
      { exerciseId: 'chest_bench_press', targetSets: 4, targetReps: 8 },
      { exerciseId: 'chest_incline_db_press', targetSets: 3, targetReps: 10 },
      { exerciseId: 'shoulders_seated_db_press', targetSets: 3, targetReps: 10 },
      { exerciseId: 'shoulders_lateral_raises', targetSets: 4, targetReps: 12 },
      { exerciseId: 'arms_cable_pushdown', targetSets: 3, targetReps: 12 },
      { exerciseId: 'chest_dips', targetSets: 3, targetReps: 10 }
    ]
  },
  {
    id: 'template_pull',
    name: 'Тяга / Pull (Спина, Бицепс, Задняя дельта)',
    badge: 'Кач широчайших',
    description: 'Тренировка тяговых мышц для широкой спины.',
    exercises: [
      { exerciseId: 'back_deadlift', targetSets: 3, targetReps: 6 },
      { exerciseId: 'back_pullups', targetSets: 4, targetReps: 8 },
      { exerciseId: 'back_barbell_row', targetSets: 3, targetReps: 8 },
      { exerciseId: 'shoulders_face_pulls', targetSets: 4, targetReps: 15 },
      { exerciseId: 'arms_barbell_curl', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_dumbbell_hammer_curl', targetSets: 3, targetReps: 12 }
    ]
  },
  {
    id: 'template_legs',
    name: 'Ноги / Legs (Квадрицепс, Бицепс бедра, Кор)',
    badge: 'День ног',
    description: 'Фундаментальный день ног для железной стойки героя.',
    exercises: [
      { exerciseId: 'legs_barbell_squat', targetSets: 4, targetReps: 8 },
      { exerciseId: 'legs_romanian_deadlift', targetSets: 3, targetReps: 10 },
      { exerciseId: 'legs_leg_press', targetSets: 3, targetReps: 12 },
      { exerciseId: 'legs_leg_curl', targetSets: 3, targetReps: 12 },
      { exerciseId: 'core_hanging_leg_raise', targetSets: 3, targetReps: 15 }
    ]
  },
  {
    id: 'template_fullbody',
    name: 'Full Body (Все тело за 1 катку)',
    badge: 'Универсал',
    description: 'Сбалансированная прокачка всех осей характеристик героя.',
    exercises: [
      { exerciseId: 'legs_barbell_squat', targetSets: 3, targetReps: 8 },
      { exerciseId: 'chest_bench_press', targetSets: 3, targetReps: 8 },
      { exerciseId: 'back_lat_pulldown', targetSets: 3, targetReps: 10 },
      { exerciseId: 'shoulders_seated_db_press', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_barbell_curl', targetSets: 2, targetReps: 12 },
      { exerciseId: 'core_cable_crunch', targetSets: 3, targetReps: 15 }
    ]
  },
  {
    id: 'template_upper',
    name: 'Верх тела (Upper Body)',
    badge: 'Сила торса',
    description: 'Грудь, спина, плечи и руки в один день.',
    exercises: [
      { exerciseId: 'chest_bench_press', targetSets: 4, targetReps: 8 },
      { exerciseId: 'back_barbell_row', targetSets: 4, targetReps: 8 },
      { exerciseId: 'shoulders_military_press', targetSets: 3, targetReps: 8 },
      { exerciseId: 'back_lat_pulldown', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_close_grip_bench', targetSets: 3, targetReps: 10 }
    ]
  }
];
