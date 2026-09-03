// IronTrack - Duolingo x Dota 2 Gym Logic
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API: Duolingo Chime + Dota Fanfares) ---
  class SoundEffects {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // Фирменный двойной дзинь Duolingo (успешный подход)
    playDuoSuccess() {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Нота 1: C5 (523 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Нота 2: G5 (784 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.09);
      gain2.gain.setValueAtTime(0.3, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.28);
    }

    // Звук таймера (3, 2, 1)
    playTick() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    // Финал таймера отдыха (Гонг)
    playTimerEnd() {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    }

    // Dota 2 Победные фанфары (+MMR / Ранг повышен)
    playVictoryHorn() {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0 },    // C5
        { f: 659.25, t: 0.15 }, // E5
        { f: 783.99, t: 0.3 },  // G5
        { f: 1046.50, t: 0.5 }  // C6 (торжественный аккорд)
      ];

      notes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.35, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.01, now + n.t + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + 0.45);
      });
    }
  }

  const sfx = new SoundEffects();

  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // --- ХРАНИЛИЩЕ И СОСТОЯНИЕ ---
  const STORAGE_KEYS = {
    EXERCISES: 'irontrack_exercises',
    TEMPLATES: 'irontrack_templates',
    WORKOUTS: 'irontrack_workouts',
    ACTIVE: 'irontrack_active_session',
    SETTINGS: 'irontrack_settings',
    EXERCISE_MMR: 'irontrack_exercise_mmr'
  };

  const state = {
    exercises: [],
    templates: [],
    workouts: [],
    activeWorkout: null,
    exerciseMmrMap: {}, // id -> bonus MMR earned from matches
    settings: {
      targetWorkoutsPerWeek: 4, // Недельная норма
      unit: 'kg',
      vibration: true,
      sound: true,
      autoTimer: true,
      wakeLock: true
    },
    restTimer: {
      running: false,
      endTime: 0,
      totalSec: 90,
      intervalId: null
    },
    wakeLockSentinel: null,
    currentTab: 'train'
  };

  // Инициализация
  function initStorage() {
    try {
      const savedEx = localStorage.getItem(STORAGE_KEYS.EXERCISES);
      state.exercises = savedEx ? JSON.parse(savedEx) : [...DEFAULT_EXERCISES];

      const savedTemp = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      state.templates = savedTemp ? JSON.parse(savedTemp) : [...DEFAULT_TEMPLATES];

      const savedWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      state.workouts = savedWorkouts ? JSON.parse(savedWorkouts) : [];

      const savedMmr = localStorage.getItem(STORAGE_KEYS.EXERCISE_MMR);
      state.exerciseMmrMap = savedMmr ? JSON.parse(savedMmr) : {};

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        state.settings = Object.assign(state.settings, JSON.parse(savedSettings));
      }

      const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE);
      if (savedActive) {
        state.activeWorkout = JSON.parse(savedActive);
      }
    } catch (err) {
      console.error('Storage init error:', err);
    }
  }

  function saveWorkouts() {
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(state.workouts));
  }
  function saveActiveWorkout() {
    if (state.activeWorkout) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE, JSON.stringify(state.activeWorkout));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE);
    }
  }
  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  }
  function saveExerciseMmr() {
    localStorage.setItem(STORAGE_KEYS.EXERCISE_MMR, JSON.stringify(state.exerciseMmrMap));
  }

  // --- 1RM & DOTA 2 MMR CALCULATIONS ---
  function calculate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30) * 10) / 10;
  }

  // Расчет MMR для отдельного упражнения
  function getExerciseMmr(exerciseId) {
    const exMeta = state.exercises.find(e => e.id === exerciseId);
    if (!exMeta) return 1000;

    let best1RM = 0;
    state.workouts.forEach(wo => {
      const found = wo.exercises.find(e => e.exerciseId === exerciseId);
      if (found && found.sets) {
        found.sets.forEach(s => {
          if (s.completed && s.weight > 0 && s.reps > 0) {
            const rm = calculate1RM(s.weight, s.reps);
            if (rm > best1RM) best1RM = rm;
          }
        });
      }
    });

    const bonus = state.exerciseMmrMap[exerciseId] || 0;

    if (best1RM <= 0) {
      // Базовый MMR Рекрута
      return Math.max(500, 800 + bonus);
    }

    const archonW = exMeta.archonWeight || 60;
    // 2500 MMR = Archon вес
    const baseMmr = (best1RM / archonW) * 2500;
    return Math.max(100, Math.round(baseMmr + bonus));
  }

  // Расчет MMR для мышечной оси (Грудь, Спина, Ноги, Плечи, Руки, Кор)
  function getAxisMmr(axisId) {
    const axisExercises = state.exercises.filter(e => e.axis === axisId);
    if (axisExercises.length === 0) return 1500;

    let total = 0;
    axisExercises.forEach(e => {
      total += getExerciseMmr(e.id);
    });
    return Math.round(total / axisExercises.length);
  }

  // Общий MMR героя (среднее по всем осям)
  function getOverallHeroMmr() {
    let sum = 0;
    MUSCLE_AXES.forEach(ax => {
      sum += getAxisMmr(ax.id);
    });
    return Math.round(sum / MUSCLE_AXES.length);
  }

  // Прошлые результаты подхода
  function getLastPerformance(exerciseId) {
    for (let i = state.workouts.length - 1; i >= 0; i--) {
      const wo = state.workouts[i];
      const exEntry = wo.exercises.find(e => e.exerciseId === exerciseId);
      if (exEntry && exEntry.sets) {
        const completed = exEntry.sets.filter(s => s.completed);
        if (completed.length > 0) return { date: wo.date, sets: completed };
      }
    }
    return null;
  }

  // Подсчет тренировок на текущей календарной неделе (Пн - Вс)
  function getWorkoutsThisWeekCount() {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Пн = 0, Вс = 6
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);

    let count = 0;
    state.workouts.forEach(wo => {
      const woDate = new Date(wo.date);
      if (woDate >= startOfWeek) {
        count++;
      }
    });
    return count;
  }

  // --- REST TIMER CONTROLLER ---
  function startRestTimer(seconds) {
    if (state.restTimer.intervalId) clearInterval(state.restTimer.intervalId);

    state.restTimer.running = true;
    state.restTimer.totalSec = seconds;
    state.restTimer.endTime = Date.now() + seconds * 1000;

    const timerBar = document.getElementById('rest-timer-bar');
    if (timerBar) timerBar.classList.add('active');
    updateRestTimerUI();

    state.restTimer.intervalId = setInterval(() => {
      const remainingMs = state.restTimer.endTime - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (remainingSec <= 0) {
        stopRestTimer();
        if (state.settings.sound) sfx.playTimerEnd();
        if (state.settings.vibration) vibrate([200, 100, 200, 100, 400]);
        showToast('⏰ Время отдыха вышло! Готов к следующему сету!');
      } else {
        if (remainingSec <= 3 && remainingSec >= 1 && state.settings.sound) {
          sfx.playTick();
        }
        updateRestTimerUI();
      }
    }, 250);
  }

  function adjustRestTimer(deltaSec) {
    if (!state.restTimer.running) {
      startRestTimer(Math.max(15, deltaSec));
      return;
    }
    state.restTimer.endTime += deltaSec * 1000;
    state.restTimer.totalSec += deltaSec;
    updateRestTimerUI();
  }

  function stopRestTimer() {
    if (state.restTimer.intervalId) {
      clearInterval(state.restTimer.intervalId);
      state.restTimer.intervalId = null;
    }
    state.restTimer.running = false;
    const timerBar = document.getElementById('rest-timer-bar');
    if (timerBar) timerBar.classList.remove('active');
  }

  function updateRestTimerUI() {
    const remainingMs = Math.max(0, state.restTimer.endTime - Date.now());
    const remainingSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const displayEl = document.getElementById('timer-display');
    if (displayEl) displayEl.textContent = timeStr;

    const progressEl = document.getElementById('timer-circle-progress');
    if (progressEl && state.restTimer.totalSec > 0) {
      const circumference = 2 * Math.PI * 18;
      const ratio = remainingSec / state.restTimer.totalSec;
      progressEl.style.strokeDashoffset = circumference * (1 - ratio);
    }
  }

  // --- ACTIVE WORKOUT (RANKED MATCH) ---
  let workoutDurationInterval = null;

  function startWorkout(template = null) {
    sfx.init();

    const newSession = {
      id: 'wo_' + Date.now(),
      name: template ? template.name : 'Рейтинговая тренировка',
      startTime: Date.now(),
      exercises: []
    };

    if (template && template.exercises) {
      template.exercises.forEach(item => {
        const lastLog = getLastPerformance(item.exerciseId);
        const sets = [];
        for (let i = 1; i <= item.targetSets; i++) {
          const prevSet = (lastLog && lastLog.sets[i - 1]) ? lastLog.sets[i - 1] : null;
          sets.push({
            type: 'normal',
            weight: prevSet ? prevSet.weight : '',
            reps: prevSet ? prevSet.reps : item.targetReps,
            completed: false,
            prev: prevSet ? `${prevSet.weight} кг × ${prevSet.reps}` : '-'
          });
        }
        newSession.exercises.push({
          exerciseId: item.exerciseId,
          notes: '',
          sets: sets
        });
      });
    }

    state.activeWorkout = newSession;
    saveActiveWorkout();
    renderActiveWorkout();

    const screen = document.getElementById('active-workout-screen');
    if (screen) screen.classList.add('active');

    startDurationTracker();
    vibrate([50, 50]);
  }

  function startDurationTracker() {
    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    updateDurationDisplay();
    workoutDurationInterval = setInterval(updateDurationDisplay, 1000);
  }

  function updateDurationDisplay() {
    if (!state.activeWorkout) return;
    const elapsed = Math.floor((Date.now() - state.activeWorkout.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const str = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    const timerEl = document.getElementById('active-workout-timer');
    if (timerEl) timerEl.textContent = str;
  }

  function toggleSet(exIdx, sIdx) {
    if (!state.activeWorkout) return;
    const set = state.activeWorkout.exercises[exIdx].sets[sIdx];
    set.completed = !set.completed;

    if (set.completed) {
      if (state.settings.sound) sfx.playDuoSuccess();
      if (state.settings.vibration) vibrate([40, 60, 40]);

      if (state.settings.autoTimer) {
        const exMeta = state.exercises.find(e => e.id === state.activeWorkout.exercises[exIdx].exerciseId);
        startRestTimer(exMeta ? exMeta.defaultRestSec : 90);
      }
    }

    saveActiveWorkout();
    renderActiveWorkout();
  }

  function finishWorkout() {
    if (!state.activeWorkout) return;

    let completedSetsCount = 0;
    let totalVolume = 0;
    let earnedMmr = 30; // Базовая победа в рейтинговой игре

    state.activeWorkout.exercises.forEach(ex => {
      let exHasCompleted = false;
      ex.sets.forEach(s => {
        if (s.completed) {
          completedSetsCount++;
          exHasCompleted = true;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          totalVolume += w * r;
        }
      });
      // Начисляем бонусный MMR за каждое выполненное упражнение
      if (exHasCompleted) {
        state.exerciseMmrMap[ex.exerciseId] = (state.exerciseMmrMap[ex.exerciseId] || 0) + 15;
      }
    });

    if (completedSetsCount === 0) {
      if (!confirm('Нет выполненных подходов. Всё равно завершить катку?')) return;
      earnedMmr = 0;
    }

    saveExerciseMmr();

    const durationSec = Math.floor((Date.now() - state.activeWorkout.startTime) / 1000);
    const finished = {
      id: state.activeWorkout.id,
      name: state.activeWorkout.name,
      date: new Date().toISOString(),
      durationSec: durationSec,
      totalVolume: Math.round(totalVolume),
      totalSets: completedSetsCount,
      earnedMmr: earnedMmr,
      exercises: state.activeWorkout.exercises
    };

    state.workouts.unshift(finished);
    saveWorkouts();

    state.activeWorkout = null;
    saveActiveWorkout();

    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    stopRestTimer();

    const screen = document.getElementById('active-workout-screen');
    if (screen) screen.classList.remove('active');

    // Торжественная победа!
    if (state.settings.sound) sfx.playVictoryHorn();
    showVictoryModal(finished);
    renderTopHeader();
    renderDashboard();
  }

  function cancelWorkout() {
    if (confirm('Покинуть катку? Прогресс тренировки не будет засчитан.')) {
      state.activeWorkout = null;
      saveActiveWorkout();
      if (workoutDurationInterval) clearInterval(workoutDurationInterval);
      stopRestTimer();
      const screen = document.getElementById('active-workout-screen');
      if (screen) screen.classList.remove('active');
      renderDashboard();
    }
  }

  // --- RENDERING VIEWS ---

  // 1. Верхний бар Duolingo (Цель недели, Опыт/Тоннаж, Медаль Dota)
  function renderTopHeader() {
    const weeklyCount = getWorkoutsThisWeekCount();
    const target = state.settings.targetWorkoutsPerWeek || 4;
    const heroMmr = getOverallHeroMmr();
    const rank = getDotaRankByMmr(heroMmr);

    // Счетчик тренировок в неделю
    const weekEl = document.getElementById('hdr-weekly-counter');
    if (weekEl) {
      weekEl.textContent = `${weeklyCount}/${target}`;
      const parent = weekEl.closest('.stat-pill');
      if (parent) {
        parent.classList.toggle('goal-reached', weeklyCount >= target);
      }
    }

    // Тоннаж в кристаллах
    let totalTonnage = 0;
    state.workouts.forEach(w => totalTonnage += w.totalVolume || 0);
    const tonEl = document.getElementById('hdr-total-tonnage');
    if (tonEl) {
      tonEl.textContent = totalTonnage > 1000 ? `${(totalTonnage/1000).toFixed(1)}т` : `${totalTonnage}кг`;
    }

    // Медаль Dota
    const rankEl = document.getElementById('hdr-rank-name');
    if (rankEl) {
      rankEl.textContent = rank.fullName;
      rankEl.style.color = rank.color;
    }
    const iconEl = document.getElementById('hdr-rank-icon');
    if (iconEl) {
      iconEl.innerHTML = rank.svg;
    }
  }

  // 2. Главная вкладка: Катка / Зал
  function renderDashboard() {
    renderTopHeader();

    // Недельный прогресс-бар Duolingo
    const weeklyCount = getWorkoutsThisWeekCount();
    const target = state.settings.targetWorkoutsPerWeek || 4;
    const percent = Math.min(100, Math.round((weeklyCount / target) * 100));

    const fillEl = document.getElementById('weekly-progress-fill');
    if (fillEl) fillEl.style.width = `${percent}%`;

    const txtEl = document.getElementById('weekly-progress-text');
    if (txtEl) {
      txtEl.textContent = weeklyCount >= target
        ? `🔥 Цель выполнена! (${weeklyCount}/${target})`
        : `🔥 ${weeklyCount} из ${target} тренировок на этой неделе`;
    }

    // Программы тренировок
    const tplList = document.getElementById('templates-grid');
    if (tplList) {
      let html = '';
      state.templates.forEach(t => {
        html += `
          <div class="duo-card" style="cursor: pointer;" onclick="IronTrack.startWorkoutById('${t.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 17px; font-weight: 900; color: #fff;">${t.name}</div>
              <span class="rank-pill" style="background: rgba(88, 204, 2, 0.15); color: var(--duo-green); border: 1px solid var(--duo-green);">
                ${t.exercises.length} упр.
              </span>
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">${t.description}</div>
            <button class="btn-duo btn-duo-green btn-duo-mini" style="width: 100%;">
              В БОЙ ➔
            </button>
          </div>
        `;
      });
      tplList.innerHTML = html;
    }
  }

  // 3. Вкладка «Герой / Мышцы» (Dota Radar Pentagon & Muscle ranks)
  function renderHeroTab() {
    const heroMmr = getOverallHeroMmr();
    const rank = getDotaRankByMmr(heroMmr);

    // Главная медаль профиля
    const medalSvgBox = document.getElementById('hero-main-medal-svg');
    if (medalSvgBox) medalSvgBox.innerHTML = rank.svg;

    const rankTitle = document.getElementById('hero-main-rank-title');
    if (rankTitle) {
      rankTitle.textContent = rank.fullName;
      rankTitle.style.color = rank.color;
    }

    const starsRow = document.getElementById('hero-main-stars');
    if (starsRow) starsRow.textContent = rank.starText;

    const mmrBadge = document.getElementById('hero-main-mmr');
    if (mmrBadge) mmrBadge.textContent = `${rank.mmr} MMR`;

    // Рисуем Dota Radar Pentagon
    drawDotaRadar();

    // Список осей мышц с их Dota рангами
    const listEl = document.getElementById('muscle-ranks-list');
    if (listEl) {
      let html = '';
      MUSCLE_AXES.forEach(ax => {
        const axMmr = getAxisMmr(ax.id);
        const axRank = getDotaRankByMmr(axMmr);
        html += `
          <div class="muscle-rank-item">
            <div class="muscle-left">
              <div class="muscle-icon-box">${ax.icon}</div>
              <div>
                <div class="muscle-title">${ax.name}</div>
                <div class="muscle-sub">${ax.role}</div>
              </div>
            </div>
            <div class="muscle-rank-right">
              <div class="rank-pill" style="background: ${axRank.bg}; color: ${axRank.color}; border: 1px solid ${axRank.color};">
                ${axRank.fullName} ${axRank.starText}
              </div>
              <div style="font-size: 13px; font-weight: 800; color: var(--duo-gold);">${axRank.mmr} MMR</div>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;
    }
  }

  // Отрисовка Radar Pentagon Canvas (Характеристики героя Dota)
  function drawDotaRadar() {
    const canvas = document.getElementById('dota-radar-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 280;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 95;
    const totalAxes = MUSCLE_AXES.length; // 6 осей

    ctx.clearRect(0, 0, size, size);

    // Паутина сетки (3 концентрических многоугольника)
    [0.33, 0.66, 1.0].forEach(level => {
      ctx.beginPath();
      for (let i = 0; i < totalAxes; i++) {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * (radius * level);
        const y = cy + Math.sin(angle) * (radius * level);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = level === 1.0 ? '#374c5a' : '#23323c';
      ctx.lineWidth = level === 1.0 ? 1.5 : 1;
      ctx.stroke();
    });

    // Оси от центра
    for (let i = 0; i < totalAxes; i++) {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = '#2d404d';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Подписи осей
      const labelDist = radius + 22;
      const lx = cx + Math.cos(angle) * labelDist;
      const ly = cy + Math.sin(angle) * labelDist;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#93aab8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MUSCLE_AXES[i].name, lx, ly);
    }

    // Собираем значения осей (масштабируем MMR от 0 до 5000)
    const polyPoints = [];
    MUSCLE_AXES.forEach((ax, i) => {
      const mmr = getAxisMmr(ax.id);
      // Коэффициент от 0.2 до 1.0
      const ratio = Math.min(1.0, Math.max(0.15, mmr / 4500));
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * (radius * ratio);
      const py = cy + Math.sin(angle) * (radius * ratio);
      polyPoints.push({ x: px, y: py });
    });

    // Заливка полигона героя
    ctx.beginPath();
    polyPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(88, 204, 2, 0.35)'; // Неоновый полигон Duolingo
    ctx.fill();
    ctx.strokeStyle = '#58cc02';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Точки на вершинах
    polyPoints.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffc800'; // Золотые вершины
      ctx.fill();
      ctx.strokeStyle = '#131f24';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // 4. Вкладка «Рейтинг упражнений»
  function renderExercisesTab() {
    const listEl = document.getElementById('exercise-ranks-list');
    if (!listEl) return;

    let html = '';
    state.exercises.forEach(ex => {
      const mmr = getExerciseMmr(ex.id);
      const rank = getDotaRankByMmr(mmr);
      const lastLog = getLastPerformance(ex.id);
      const best1RM = (lastLog && lastLog.sets.length > 0)
        ? Math.max(...lastLog.sets.map(s => calculate1RM(s.weight, s.reps)))
        : 0;

      html += `
        <div class="duo-card" style="margin-bottom: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 16px; font-weight: 900; color: #fff;">${ex.name}</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                ${ex.muscleGroup} • 1RM: <b>${best1RM ? best1RM + ' кг' : 'нет'}</b>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="rank-pill" style="background: ${rank.bg}; color: ${rank.color}; border: 1px solid ${rank.color};">
                ${rank.fullName} ${rank.starText}
              </div>
              <div style="font-size: 13px; font-weight: 800; color: var(--duo-gold); margin-top: 2px;">
                ${rank.mmr} MMR
              </div>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: var(--text-dim); margin-bottom: 4px;">
              <span>До след. звезды ⭐</span>
              <span>${rank.percentToNext}%</span>
            </div>
            <div class="duo-progress-bar-bg" style="height: 8px;">
              <div class="duo-progress-bar-fill" style="width: ${rank.percentToNext}%; background: ${rank.color};"></div>
            </div>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }

  // 5. Рендер экрана активной тренировки
  function renderActiveWorkout() {
    if (!state.activeWorkout) return;
    const nameInput = document.getElementById('active-workout-name');
    if (nameInput && nameInput.value !== state.activeWorkout.name) {
      nameInput.value = state.activeWorkout.name;
    }

    const listEl = document.getElementById('active-workout-exercises');
    if (!listEl) return;

    if (state.activeWorkout.exercises.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px;">
          <div style="font-size: 38px; margin-bottom: 8px;">⚔️</div>
          <div style="font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 6px;">Катка ещё не начата!</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Добавьте упражнения для набора MMR</div>
          <button class="btn-duo btn-duo-green" onclick="IronTrack.openExercisePicker()">
            + Добавить упражнение
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    state.activeWorkout.exercises.forEach((item, exIdx) => {
      const exMeta = state.exercises.find(e => e.id === item.exerciseId) || { name: 'Упражнение' };
      const exMmr = getExerciseMmr(item.exerciseId);
      const rank = getDotaRankByMmr(exMmr);

      html += `
        <div class="duo-card" style="padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 17px; font-weight: 900; color: #fff;">${exMeta.name}</div>
              <div style="font-size: 12px; color: ${rank.color}; font-weight: 800;">
                ${rank.fullName} (${rank.mmr} MMR)
              </div>
            </div>
            <button class="btn-duo btn-duo-red btn-duo-mini" onclick="IronTrack.removeExercise(${exIdx})">✕</button>
          </div>

          <table class="set-table">
            <thead>
              <tr>
                <th>Сет</th>
                <th>Прошлый</th>
                <th>Вес (кг)</th>
                <th>Повт</th>
                <th>✓</th>
              </tr>
            </thead>
            <tbody>
      `;

      item.sets.forEach((s, sIdx) => {
        let setLabel = sIdx + 1;
        let typeCls = '';
        if (s.type === 'warmup') { setLabel = 'W'; typeCls = 'warmup'; }
        else if (s.type === 'dropset') { setLabel = 'D'; typeCls = 'dropset'; }
        else if (s.type === 'failure') { setLabel = 'F'; typeCls = 'failure'; }

        html += `
          <tr class="set-row ${s.completed ? 'completed' : ''}">
            <td>
              <button class="set-type-btn ${typeCls}" onclick="IronTrack.cycleSetType(${exIdx}, ${sIdx})">
                ${setLabel}
              </button>
            </td>
            <td style="font-size: 12px; color: var(--text-dim);">${s.prev || '-'}</td>
            <td>
              <input type="number" step="0.5" inputmode="decimal" class="set-input" value="${s.weight}" placeholder="0"
                     onchange="IronTrack.updateSetWeight(${exIdx}, ${sIdx}, this.value)">
            </td>
            <td>
              <input type="number" step="1" inputmode="numeric" class="set-input" value="${s.reps}" placeholder="0"
                     onchange="IronTrack.updateSetReps(${exIdx}, ${sIdx}, this.value)">
            </td>
            <td>
              <button class="btn-check-duo ${s.completed ? 'checked' : ''}" onclick="IronTrack.toggleSet(${exIdx}, ${sIdx})">
                ✓
              </button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
            <button class="btn-duo btn-duo-secondary btn-duo-mini" onclick="IronTrack.addSet(${exIdx})">
              + Сет
            </button>
            <div style="display: flex; gap: 6px;">
              <button class="btn-duo btn-duo-secondary btn-duo-mini" onclick="IronTrack.adjustWeight(${exIdx}, -2.5)">-2.5</button>
              <button class="btn-duo btn-duo-secondary btn-duo-mini" onclick="IronTrack.adjustWeight(${exIdx}, +2.5)">+2.5</button>
            </div>
          </div>
        </div>
      `;
    });

    html += `
      <button class="btn-duo btn-duo-secondary" style="width: 100%; margin-top: 8px;" onclick="IronTrack.openExercisePicker()">
        + Добавить упражнение
      </button>
    `;

    listEl.innerHTML = html;
  }

  // Модалка победы в рейтинговой игре
  function showVictoryModal(entry) {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    const heroMmr = getOverallHeroMmr();
    const rank = getDotaRankByMmr(heroMmr);

    document.getElementById('victory-mmr-gain').textContent = `+${entry.earnedMmr} MMR`;
    document.getElementById('victory-hero-rank').textContent = `${rank.fullName} (${heroMmr} MMR)`;
    document.getElementById('victory-tonnage').textContent = `${entry.totalVolume} кг`;
    document.getElementById('victory-sets').textContent = entry.totalSets;

    openModal('victory-modal');
  }

  // Вспомогательные функции
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const tab = document.getElementById(`tab-${tabName}`);
    if (tab) tab.classList.add('active');

    const nav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (nav) nav.classList.add('active');

    if (tabName === 'train') renderDashboard();
    if (tabName === 'hero') renderHeroTab();
    if (tabName === 'ranks') renderExercisesTab();
    if (tabName === 'history') renderHistoryTab();
  }

  function renderHistoryTab() {
    const listEl = document.getElementById('match-history-list');
    if (!listEl) return;

    if (state.workouts.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Матчей пока не было</div>';
      return;
    }

    let html = '';
    state.workouts.forEach((w, idx) => {
      const d = new Date(w.date);
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      html += `
        <div class="duo-card" style="margin-bottom: 10px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 16px; font-weight: 900; color: #fff;">${w.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${dateStr} • ${w.totalSets} сетов</div>
            </div>
            <div style="text-align: right;">
              <span class="rank-pill" style="background: rgba(88,204,2,0.15); color: var(--duo-green); border: 1px solid var(--duo-green);">
                +${w.earnedMmr || 30} MMR
              </span>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">${w.totalVolume} кг</div>
            </div>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }

  function showToast(msg) {
    let t = document.getElementById('app-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast';
      t.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#58cc02; color:#fff; font-weight:900; padding:10px 20px; border-radius:9999px; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.5); font-size:14px;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  // Экспорт API
  window.IronTrack = {
    switchTab,
    openModal,
    closeModal,
    startEmptyWorkout: () => startWorkout(null),
    startWorkoutById: (id) => {
      const t = state.templates.find(tpl => tpl.id === id);
      startWorkout(t);
    },
    toggleSet,
    cycleSetType: (exIdx, sIdx) => {
      const set = state.activeWorkout.exercises[exIdx].sets[sIdx];
      const types = ['normal', 'warmup', 'dropset', 'failure'];
      set.type = types[(types.indexOf(set.type) + 1) % types.length];
      saveActiveWorkout();
      renderActiveWorkout();
    },
    updateSetWeight: (exIdx, sIdx, val) => {
      state.activeWorkout.exercises[exIdx].sets[sIdx].weight = parseFloat(val) || 0;
      saveActiveWorkout();
    },
    updateSetReps: (exIdx, sIdx, val) => {
      state.activeWorkout.exercises[exIdx].sets[sIdx].reps = parseInt(val, 10) || 0;
      saveActiveWorkout();
    },
    addSet: (exIdx) => {
      const ex = state.activeWorkout.exercises[exIdx];
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        type: 'normal',
        weight: last ? last.weight : '',
        reps: last ? last.reps : 10,
        completed: false,
        prev: '-'
      });
      saveActiveWorkout();
      renderActiveWorkout();
    },
    adjustWeight: (exIdx, delta) => {
      const sets = state.activeWorkout.exercises[exIdx].sets;
      if (sets.length === 0) return;
      const last = sets[sets.length - 1];
      let val = (parseFloat(last.weight) || 0) + delta;
      last.weight = Math.max(0, Math.round(val * 10) / 10);
      saveActiveWorkout();
      renderActiveWorkout();
    },
    removeExercise: (exIdx) => {
      if (confirm('Убрать упражнение из тренировки?')) {
        state.activeWorkout.exercises.splice(exIdx, 1);
        saveActiveWorkout();
        renderActiveWorkout();
      }
    },
    finishWorkout,
    cancelWorkout,
    updateWorkoutName: (name) => {
      if (state.activeWorkout) {
        state.activeWorkout.name = name;
        saveActiveWorkout();
      }
    },
    adjustRestTimer,
    stopRestTimer,
    openExercisePicker: () => {
      populatePicker();
      openModal('exercise-picker-modal');
    },
    addExerciseToWorkout: (id) => {
      if (!state.activeWorkout) return;
      const lastLog = getLastPerformance(id);
      const sets = [];
      for (let i = 0; i < 3; i++) {
        const prev = lastLog && lastLog.sets[i];
        sets.push({
          type: 'normal',
          weight: prev ? prev.weight : '',
          reps: prev ? prev.reps : 10,
          completed: false,
          prev: prev ? `${prev.weight} кг × ${prev.reps}` : '-'
        });
      }
      state.activeWorkout.exercises.push({ exerciseId: id, sets });
      saveActiveWorkout();
      renderActiveWorkout();
      closeModal('exercise-picker-modal');
    },
    setWeeklyGoal: (val) => {
      state.settings.targetWorkoutsPerWeek = parseInt(val, 10) || 4;
      saveSettings();
      renderDashboard();
      showToast(`Недельная цель: ${val} тренировок!`);
    }
  };

  function populatePicker() {
    const list = document.getElementById('modal-exercise-list');
    if (!list) return;
    let html = '';
    state.exercises.forEach(e => {
      const mmr = getExerciseMmr(e.id);
      const r = getDotaRankByMmr(mmr);
      html += `
        <div class="duo-card" style="padding: 12px; margin-bottom: 8px; cursor: pointer;" onclick="IronTrack.addExerciseToWorkout('${e.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; color: #fff;">${e.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${e.muscleGroup}</div>
            </div>
            <span class="rank-pill" style="background:${r.bg}; color:${r.color}; border: 1px solid ${r.color};">
              ${r.fullName}
            </span>
          </div>
        </div>
      `;
    });
    list.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    renderDashboard();

    // Слушатель поиска упражнений в модалке
    const search = document.getElementById('modal-exercise-search');
    if (search) {
      search.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#modal-exercise-list .duo-card').forEach(c => {
          c.style.display = c.textContent.toLowerCase().includes(q) ? 'block' : 'none';
        });
      });
    }

    if (state.activeWorkout) {
      renderActiveWorkout();
    }
  });

})();
