// IronTrack - Справочник упражнений и базовые программы

const DEFAULT_EXERCISES = [
  // --- ГРУДЬ ---
  {
    id: 'chest_bench_press',
    name: 'Жим штанги лежа',
    muscleGroup: 'Грудь',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 120,
    instructions: 'Классический жим штанги от груди на горизонтальной скамье.'
  },
  {
    id: 'chest_incline_db_press',
    name: 'Жим гантелей на наклонной скамье',
    muscleGroup: 'Грудь',
    category: 'Базовое',
    equipment: 'Гантели',
    defaultRestSec: 90,
    instructions: 'Угол скамьи 30-45 градусов, фокус на верхнюю часть груди.'
  },
  {
    id: 'chest_dips',
    name: 'Отжимания на брусьях (на грудь)',
    muscleGroup: 'Грудь',
    category: 'Базовое',
    equipment: 'Собственный вес',
    defaultRestSec: 90,
    instructions: 'Небольшой наклон корпуса вперед, локти разведены шире.'
  },
  {
    id: 'chest_cable_crossover',
    name: 'Сведение рук в кроссовере',
    muscleGroup: 'Грудь',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    defaultRestSec: 60,
    instructions: 'Пиковое сокращение грудных мышц в конечной точке.'
  },
  {
    id: 'chest_hammer_press',
    name: 'Жим в тренажере Хаммер',
    muscleGroup: 'Грудь',
    category: 'Базовое',
    equipment: 'Тренажер',
    defaultRestSec: 90,
    instructions: 'Безопасная альтернатива жиму со свободным весом.'
  },
  {
    id: 'chest_db_flyes',
    name: 'Разводка гантелей лежа',
    muscleGroup: 'Грудь',
    category: 'Изолирующее',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Растяжка грудных мышц, локти слегка согнуты.'
  },
  {
    id: 'chest_pushups',
    name: 'Отжимания от пола',
    muscleGroup: 'Грудь',
    category: 'Базовое',
    equipment: 'Собственный вес',
    defaultRestSec: 60,
    instructions: 'Классические отжимания в планке.'
  },

  // --- СПИНА ---
  {
    id: 'back_deadlift',
    name: 'Становая тяга (классическая)',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 180,
    instructions: 'Фундаментальное упражнение на разгибатели спины, ноги и хват.'
  },
  {
    id: 'back_pullups',
    name: 'Подтягивания широким хватом',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Собственный вес',
    defaultRestSec: 120,
    instructions: 'Тяга к подбородку/груди за счет широчайших мышц.'
  },
  {
    id: 'back_barbell_row',
    name: 'Тяга штанги в наклоне',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 90,
    instructions: 'Спина прямая, тяга к поясу силой широчайших.'
  },
  {
    id: 'back_lat_pulldown',
    name: 'Тяга верхнего блока к груди',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Блочный тренажер',
    defaultRestSec: 75,
    instructions: 'Отличная альтернатива или дополнение к подтягиваниям.'
  },
  {
    id: 'back_seated_cable_row',
    name: 'Горизонтальная тяга блока к поясу',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Блочный тренажер',
    defaultRestSec: 75,
    instructions: 'Сведение лопаток в конечной точке движения.'
  },
  {
    id: 'back_one_arm_db_row',
    name: 'Тяга гантели к поясу в упоре',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Тяга гантели одной рукой с упором на скамью.'
  },
  {
    id: 'back_tbar_row',
    name: 'Тяга Т-грифа',
    muscleGroup: 'Спина',
    category: 'Базовое',
    equipment: 'Тренажер',
    defaultRestSec: 90,
    instructions: 'Мощная проработка толщины спины.'
  },
  {
    id: 'back_hyperextension',
    name: 'Гиперэкстензия',
    muscleGroup: 'Спина',
    category: 'Изолирующее',
    equipment: 'Собственный вес',
    defaultRestSec: 60,
    instructions: 'Укрепление поясничных разгибателей.'
  },

  // --- НОГИ (КВАДРИЦЕПСЫ И ЯГОДИЦЫ) ---
  {
    id: 'legs_barbell_squat',
    name: 'Приседания со штангой',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 150,
    instructions: 'Базовые приседания с параллелью или глубже.'
  },
  {
    id: 'legs_leg_press',
    name: 'Жим ногами в тренажере',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Тренажер',
    defaultRestSec: 120,
    instructions: 'Платформа под 45 градусов, колени не вставлять в замок.'
  },
  {
    id: 'legs_romanian_deadlift',
    name: 'Румынская тяга (на прямых ногах)',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 90,
    instructions: 'Акцент на бицепс бедра и ягодичные мышцы.'
  },
  {
    id: 'legs_leg_extension',
    name: 'Разгибания ног в тренажере',
    muscleGroup: 'Ноги',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    defaultRestSec: 60,
    instructions: 'Изоляция квадрицепса.'
  },
  {
    id: 'legs_leg_curl',
    name: 'Сгибания ног лежа/сидя',
    muscleGroup: 'Ноги',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    defaultRestSec: 60,
    instructions: 'Изоляция бицепса бедра.'
  },
  {
    id: 'legs_lunges',
    name: 'Выпады с гантелями',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Гантели',
    defaultRestSec: 75,
    instructions: 'Шаговые или статические выпады.'
  },
  {
    id: 'legs_hack_squat',
    name: 'Гакк-приседания',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Тренажер',
    defaultRestSec: 100,
    instructions: 'Приседания с фиксацией спины в направляющих.'
  },
  {
    id: 'legs_hip_thrust',
    name: 'Ягодичный мостик со штангой',
    muscleGroup: 'Ноги',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 90,
    instructions: 'Фокус на мощное сокращение ягодиц в верхней точке.'
  },
  {
    id: 'legs_calf_raise',
    name: 'Подъем на носки стоя/сидя',
    muscleGroup: 'Икры',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    defaultRestSec: 60,
    instructions: 'Полная амплитуда с растяжением внизу и паузой вверху.'
  },

  // --- ПЛЕЧИ (ДЕЛЬТЫ) ---
  {
    id: 'shoulders_military_press',
    name: 'Армейский жим стоя',
    muscleGroup: 'Плечи',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 120,
    instructions: 'Жим штанги с груди стоя вверх над головой.'
  },
  {
    id: 'shoulders_seated_db_press',
    name: 'Жим гантелей сидя',
    muscleGroup: 'Плечи',
    category: 'Базовое',
    equipment: 'Гантели',
    defaultRestSec: 90,
    instructions: 'Классический жим гантелей вверх с нейтральным или прямым хватом.'
  },
  {
    id: 'shoulders_lateral_raises',
    name: 'Махи гантелями в стороны',
    muscleGroup: 'Плечи',
    category: 'Изолирующее',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Изоляция средней дельты, локти чуть выше запястий.'
  },
  {
    id: 'shoulders_face_pulls',
    name: 'Тяга каната к лицу (Face Pull)',
    muscleGroup: 'Плечи',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    defaultRestSec: 60,
    instructions: 'Здоровье плечевых суставов и задняя дельта.'
  },
  {
    id: 'shoulders_rear_delt_flyes',
    name: 'Разводка на заднюю дельту в тренажере',
    muscleGroup: 'Плечи',
    category: 'Изолирующее',
    equipment: 'Тренажер',
    defaultRestSec: 60,
    instructions: 'Обратная бабочка (пэк-дек).'
  },

  // --- РУКИ (БИЦЕПС И ТРИЦЕПС) ---
  {
    id: 'arms_barbell_curl',
    name: 'Подъем штанги на бицепс',
    muscleGroup: 'Бицепс',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 75,
    instructions: 'Чистая техника без раскачки корпусом.'
  },
  {
    id: 'arms_dumbbell_hammer_curl',
    name: 'Молотковые сгибания с гантелями',
    muscleGroup: 'Бицепс',
    category: 'Базовое',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Нейтральный хват (ладони смотрят друг на друга).'
  },
  {
    id: 'arms_incline_db_curl',
    name: 'Сгибания с гантелями на наклонной скамье',
    muscleGroup: 'Бицепс',
    category: 'Изолирующее',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Сильное растяжение длинной головки бицепса.'
  },
  {
    id: 'arms_scott_curl',
    name: 'Сгибания на скамье Скотта',
    muscleGroup: 'Бицепс',
    category: 'Изолирующее',
    equipment: 'Штанга',
    defaultRestSec: 60,
    instructions: 'Строгая изоляция бицепса.'
  },
  {
    id: 'arms_close_grip_bench',
    name: 'Жим лежа узким хватом',
    muscleGroup: 'Трицепс',
    category: 'Базовое',
    equipment: 'Штанга',
    defaultRestSec: 90,
    instructions: 'Хват на ширине плеч, локти ближе к корпусу.'
  },
  {
    id: 'arms_cable_pushdown',
    name: 'Разгибания на трицепс на блоке',
    muscleGroup: 'Трицепс',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    defaultRestSec: 60,
    instructions: 'Локти зафиксированы у корпуса.'
  },
  {
    id: 'arms_skullcrusher',
    name: 'Французский жим лежа',
    muscleGroup: 'Трицепс',
    category: 'Изолирующее',
    equipment: 'Штанга',
    defaultRestSec: 75,
    instructions: 'Опускание штанги ко лбу или за голову.'
  },
  {
    id: 'arms_overhead_db_extension',
    name: 'Разгибание из-за головы с гантелью',
    muscleGroup: 'Трицепс',
    category: 'Изолирующее',
    equipment: 'Гантели',
    defaultRestSec: 60,
    instructions: 'Глубокое растяжение длинной головки трицепса.'
  },

  // --- ПРЕСС И КОР ---
  {
    id: 'core_hanging_leg_raise',
    name: 'Подъем ног в висе на турнике',
    muscleGroup: 'Пресс',
    category: 'Базовое',
    equipment: 'Собственный вес',
    defaultRestSec: 60,
    instructions: 'Подъем коленей или прямых ног без раскачки.'
  },
  {
    id: 'core_cable_crunch',
    name: 'Скручивания на блоке (Молитва)',
    muscleGroup: 'Пресс',
    category: 'Изолирующее',
    equipment: 'Блочный тренажер',
    defaultRestSec: 60,
    instructions: 'Скручивание корпуса с отягощением стоя на коленях.'
  },
  {
    id: 'core_plank',
    name: 'Планка',
    muscleGroup: 'Пресс',
    category: 'Изолирующее',
    equipment: 'Собственный вес',
    defaultRestSec: 60,
    instructions: 'Статическое удержание прямого положения тела.'
  },
  {
    id: 'core_ab_wheel',
    name: 'Прокатка с роликом для пресса',
    muscleGroup: 'Пресс',
    category: 'Базовое',
    equipment: 'Собственный вес',
    defaultRestSec: 60,
    instructions: 'Мощная работа на глубокие мышцы кора.'
  }
];

// Встроенные популярные программы / шаблоны сплитов
const DEFAULT_TEMPLATES = [
  {
    id: 'template_push',
    name: 'Жим / Push (Грудь, Плечи, Трицепс)',
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
    description: 'Тренировка тяговых мышц для широкой и рельефной спины.',
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
    name: 'Ноги / Legs (Квадрицепс, Бицепс бедра, Икры, Пресс)',
    description: 'Фундаментальный день ног для силы и баланса пропорций.',
    exercises: [
      { exerciseId: 'legs_barbell_squat', targetSets: 4, targetReps: 8 },
      { exerciseId: 'legs_romanian_deadlift', targetSets: 3, targetReps: 10 },
      { exerciseId: 'legs_leg_press', targetSets: 3, targetReps: 12 },
      { exerciseId: 'legs_leg_curl', targetSets: 3, targetReps: 12 },
      { exerciseId: 'legs_calf_raise', targetSets: 4, targetReps: 15 },
      { exerciseId: 'core_hanging_leg_raise', targetSets: 3, targetReps: 15 }
    ]
  },
  {
    id: 'template_fullbody',
    name: 'Full Body (Все тело за 1 тренировку)',
    description: 'Оптимально для занятий 2-3 раза в неделю.',
    exercises: [
      { exerciseId: 'legs_barbell_squat', targetSets: 3, targetReps: 8 },
      { exerciseId: 'chest_bench_press', targetSets: 3, targetReps: 8 },
      { exerciseId: 'back_lat_pulldown', targetSets: 3, targetReps: 10 },
      { exerciseId: 'shoulders_seated_db_press', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_barbell_curl', targetSets: 2, targetReps: 12 },
      { exerciseId: 'arms_cable_pushdown', targetSets: 2, targetReps: 12 },
      { exerciseId: 'core_cable_crunch', targetSets: 3, targetReps: 15 }
    ]
  },
  {
    id: 'template_upper',
    name: 'Верх тела (Upper Body)',
    description: 'Грудь, спина, плечи и руки в один сбалансированный день.',
    exercises: [
      { exerciseId: 'chest_bench_press', targetSets: 4, targetReps: 8 },
      { exerciseId: 'back_barbell_row', targetSets: 4, targetReps: 8 },
      { exerciseId: 'shoulders_military_press', targetSets: 3, targetReps: 8 },
      { exerciseId: 'back_lat_pulldown', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_close_grip_bench', targetSets: 3, targetReps: 10 },
      { exerciseId: 'arms_incline_db_curl', targetSets: 3, targetReps: 12 }
    ]
  }
];
