// IronTrack - Main Application Logic
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
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

    // Звук завершения подхода
    playCheck() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    }

    // Предупреждающий пик (3, 2, 1)
    playTick() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    // Финальный гонг таймера отдыха (время вышло)
    playFinishAlarm() {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [880, 1174.66, 1396.91].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.3, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.6);
      });
    }
  }

  const sfx = new SoundEffects();

  // Тактильная вибрация
  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // --- STATE AND STORAGE ---
  const STORAGE_KEYS = {
    EXERCISES: 'irontrack_exercises',
    TEMPLATES: 'irontrack_templates',
    WORKOUTS: 'irontrack_workouts',
    ACTIVE: 'irontrack_active_session',
    SETTINGS: 'irontrack_settings'
  };

  const state = {
    exercises: [],
    templates: [],
    workouts: [],
    activeWorkout: null,
    settings: {
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
    currentTab: 'train',
    selectedExerciseForChart: 'chest_bench_press'
  };

  // Инициализация данных
  function initStorage() {
    try {
      const savedEx = localStorage.getItem(STORAGE_KEYS.EXERCISES);
      if (savedEx) {
        state.exercises = JSON.parse(savedEx);
      } else {
        state.exercises = (typeof DEFAULT_EXERCISES !== 'undefined') ? [...DEFAULT_EXERCISES] : [];
        saveExercises();
      }

      const savedTemp = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (savedTemp) {
        state.templates = JSON.parse(savedTemp);
      } else {
        state.templates = (typeof DEFAULT_TEMPLATES !== 'undefined') ? [...DEFAULT_TEMPLATES] : [];
        saveTemplates();
      }

      const savedWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      state.workouts = savedWorkouts ? JSON.parse(savedWorkouts) : [];

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        state.settings = Object.assign(state.settings, JSON.parse(savedSettings));
      }

      const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE);
      if (savedActive) {
        state.activeWorkout = JSON.parse(savedActive);
      }
    } catch (err) {
      console.error('Failed to load storage:', err);
    }
  }

  function saveExercises() {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(state.exercises));
  }

  function saveTemplates() {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(state.templates));
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

  // --- SCREEN WAKE LOCK ---
  async function requestWakeLock() {
    if (!state.settings.wakeLock) return;
    if ('wakeLock' in navigator) {
      try {
        state.wakeLockSentinel = await navigator.wakeLock.request('screen');
        state.wakeLockSentinel.addEventListener('release', () => {
          state.wakeLockSentinel = null;
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }

  function releaseWakeLock() {
    if (state.wakeLockSentinel) {
      state.wakeLockSentinel.release();
      state.wakeLockSentinel = null;
    }
  }

  // --- 1RM & VOLUME CALCULATIONS ---
  // Формула Epley: 1RM = Weight * (1 + Reps / 30)
  function calculate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (r <= 0 || w <= 0) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30) * 10) / 10;
  }

  // Получить последние выполненные подходы по упражнению
  function getLastPerformance(exerciseId) {
    if (!state.workouts || state.workouts.length === 0) return null;
    // Идем от самых свежих к старым
    for (let i = state.workouts.length - 1; i >= 0; i--) {
      const wo = state.workouts[i];
      const exEntry = wo.exercises.find(e => e.exerciseId === exerciseId);
      if (exEntry && exEntry.sets && exEntry.sets.length > 0) {
        const completedSets = exEntry.sets.filter(s => s.completed);
        if (completedSets.length > 0) {
          return {
            date: wo.date,
            sets: completedSets
          };
        }
      }
    }
    return null;
  }

  // Найти личный рекорд (PR) по упражнению
  function getPersonalRecords(exerciseId) {
    let maxWeight = 0;
    let max1RM = 0;
    let maxVolume = 0;

    state.workouts.forEach(wo => {
      const exEntry = wo.exercises.find(e => e.exerciseId === exerciseId);
      if (exEntry && exEntry.sets) {
        exEntry.sets.forEach(s => {
          if (s.completed && s.weight > 0 && s.reps > 0) {
            if (s.weight > maxWeight) maxWeight = s.weight;
            const rm = calculate1RM(s.weight, s.reps);
            if (rm > max1RM) max1RM = rm;
            const vol = s.weight * s.reps;
            if (vol > maxVolume) maxVolume = vol;
          }
        });
      }
    });

    return { maxWeight, max1RM, maxVolume };
  }

  // --- REST TIMER ---
  function startRestTimer(seconds) {
    if (state.restTimer.intervalId) {
      clearInterval(state.restTimer.intervalId);
    }

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
        if (state.settings.sound) sfx.playFinishAlarm();
        if (state.settings.vibration) vibrate([200, 100, 200, 100, 400]);
        // Показать уведомление
        showToast('Время отдыха истекло! Пора жать!');
      } else {
        // Звуковые подсказки на 3, 2, 1
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

    // SVG progress circle
    const progressEl = document.getElementById('timer-circle-progress');
    if (progressEl && state.restTimer.totalSec > 0) {
      const circumference = 2 * Math.PI * 18; // r=18
      const ratio = remainingSec / state.restTimer.totalSec;
      const offset = circumference * (1 - ratio);
      progressEl.style.strokeDashoffset = offset;
    }
  }

  // --- ACTIVE WORKOUT CONTROLLER ---
  let workoutDurationInterval = null;

  function startWorkout(template = null) {
    sfx.init();
    requestWakeLock();

    const newSession = {
      id: 'wo_' + Date.now(),
      name: template ? template.name : 'Свободная тренировка',
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

    startWorkoutDurationTracker();
    vibrate(50);
  }

  function startWorkoutDurationTracker() {
    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    updateWorkoutDuration();
    workoutDurationInterval = setInterval(updateWorkoutDuration, 1000);
  }

  function updateWorkoutDuration() {
    if (!state.activeWorkout) return;
    const elapsedSec = Math.floor((Date.now() - state.activeWorkout.startTime) / 1000);
    const hrs = Math.floor(elapsedSec / 3600);
    const mins = Math.floor((elapsedSec % 3600) / 60);
    const secs = elapsedSec % 60;
    const str = (hrs > 0 ? `${hrs}:` : '') +
      `${mins < 10 && hrs > 0 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const timerEl = document.getElementById('active-workout-timer');
    if (timerEl) timerEl.textContent = str;
  }

  function addExerciseToActiveWorkout(exerciseId) {
    if (!state.activeWorkout) return;
    const lastLog = getLastPerformance(exerciseId);
    const initialSets = [];

    const defaultSetsCount = 3;
    for (let i = 0; i < defaultSetsCount; i++) {
      const prevSet = (lastLog && lastLog.sets[i]) ? lastLog.sets[i] : null;
      initialSets.push({
        type: 'normal',
        weight: prevSet ? prevSet.weight : '',
        reps: prevSet ? prevSet.reps : 10,
        completed: false,
        prev: prevSet ? `${prevSet.weight} кг × ${prevSet.reps}` : '-'
      });
    }

    state.activeWorkout.exercises.push({
      exerciseId: exerciseId,
      notes: '',
      sets: initialSets
    });

    saveActiveWorkout();
    renderActiveWorkout();
    closeModal('exercise-picker-modal');
  }

  function addSetToExercise(exIndex) {
    if (!state.activeWorkout || !state.activeWorkout.exercises[exIndex]) return;
    const ex = state.activeWorkout.exercises[exIndex];
    const prevSetInCurrent = ex.sets[ex.sets.length - 1];
    const setNum = ex.sets.length + 1;
    const lastLog = getLastPerformance(ex.exerciseId);
    const prevFromHistory = (lastLog && lastLog.sets[setNum - 1]) ? lastLog.sets[setNum - 1] : null;

    ex.sets.push({
      type: 'normal',
      weight: prevSetInCurrent ? prevSetInCurrent.weight : (prevFromHistory ? prevFromHistory.weight : ''),
      reps: prevSetInCurrent ? prevSetInCurrent.reps : (prevFromHistory ? prevFromHistory.reps : 10),
      completed: false,
      prev: prevFromHistory ? `${prevFromHistory.weight} кг × ${prevFromHistory.reps}` : '-'
    });

    saveActiveWorkout();
    renderActiveWorkout();
  }

  function removeSet(exIndex, setIndex) {
    if (!state.activeWorkout || !state.activeWorkout.exercises[exIndex]) return;
    state.activeWorkout.exercises[exIndex].sets.splice(setIndex, 1);
    saveActiveWorkout();
    renderActiveWorkout();
  }

  function removeExerciseFromWorkout(exIndex) {
    if (!state.activeWorkout) return;
    if (confirm('Удалить упражнение из этой тренировки?')) {
      state.activeWorkout.exercises.splice(exIndex, 1);
      saveActiveWorkout();
      renderActiveWorkout();
    }
  }

  function toggleSetCompletion(exIndex, setIndex) {
    if (!state.activeWorkout) return;
    const set = state.activeWorkout.exercises[exIndex].sets[setIndex];
    set.completed = !set.completed;

    if (set.completed) {
      if (state.settings.sound) sfx.playCheck();
      if (state.settings.vibration) vibrate([40, 50, 40]);

      // Запуск таймера отдыха
      if (state.settings.autoTimer) {
        const exMeta = state.exercises.find(e => e.id === state.activeWorkout.exercises[exIndex].exerciseId);
        const restSec = (exMeta && exMeta.defaultRestSec) ? exMeta.defaultRestSec : 90;
        startRestTimer(restSec);
      }
    }

    saveActiveWorkout();
    renderActiveWorkout();
  }

  function cycleSetType(exIndex, setIndex) {
    if (!state.activeWorkout) return;
    const set = state.activeWorkout.exercises[exIndex].sets[setIndex];
    const types = ['normal', 'warmup', 'dropset', 'failure'];
    const currentIdx = types.indexOf(set.type);
    set.type = types[(currentIdx + 1) % types.length];
    saveActiveWorkout();
    renderActiveWorkout();
  }

  function adjustSetWeight(exIndex, setIndex, delta) {
    if (!state.activeWorkout) return;
    const set = state.activeWorkout.exercises[exIndex].sets[setIndex];
    let val = parseFloat(set.weight) || 0;
    val = Math.max(0, val + delta);
    set.weight = Math.round(val * 10) / 10;
    saveActiveWorkout();
    renderActiveWorkout();
  }

  function finishWorkout() {
    if (!state.activeWorkout) return;

    // Проверяем, есть ли завершенные подходы
    let totalCompleted = 0;
    let totalVolume = 0;
    let newPRCount = 0;

    state.activeWorkout.exercises.forEach(ex => {
      const oldPR = getPersonalRecords(ex.exerciseId);
      ex.sets.forEach(s => {
        if (s.completed) {
          totalCompleted++;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          totalVolume += w * r;
          if (w > oldPR.maxWeight) newPRCount++;
        }
      });
    });

    if (totalCompleted === 0) {
      if (!confirm('В тренировке нет отмеченных подходов. Всё равно завершить и сохранить?')) {
        return;
      }
    }

    const durationSec = Math.floor((Date.now() - state.activeWorkout.startTime) / 1000);

    const finishedEntry = {
      id: state.activeWorkout.id,
      name: state.activeWorkout.name || 'Тренировка',
      date: new Date().toISOString(),
      durationSec: durationSec,
      totalVolume: Math.round(totalVolume),
      totalSets: totalCompleted,
      exercises: state.activeWorkout.exercises
    };

    state.workouts.unshift(finishedEntry);
    saveWorkouts();

    // Очищаем активную тренировку
    state.activeWorkout = null;
    saveActiveWorkout();

    if (workoutDurationInterval) clearInterval(workoutDurationInterval);
    stopRestTimer();
    releaseWakeLock();

    const screen = document.getElementById('active-workout-screen');
    if (screen) screen.classList.remove('active');

    // Показываем поздравительный тост / экран
    showWorkoutSummaryModal(finishedEntry, newPRCount);
    renderDashboard();
    renderHistory();
  }

  function cancelWorkout() {
    if (confirm('Вы уверены, что хотите отменить и сбросить текущую тренировку? Прогресс не сохранится.')) {
      state.activeWorkout = null;
      saveActiveWorkout();
      if (workoutDurationInterval) clearInterval(workoutDurationInterval);
      stopRestTimer();
      releaseWakeLock();
      const screen = document.getElementById('active-workout-screen');
      if (screen) screen.classList.remove('active');
      renderDashboard();
    }
  }

  // --- RENDERING VIEWS ---

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
        <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 12px;">🏋️</div>
          <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Упражнения ещё не добавлены</div>
          <div style="font-size: 13px; margin-bottom: 16px;">Нажмите кнопку ниже, чтобы выбрать первое упражнение</div>
          <button class="btn-primary" onclick="IronTrack.openExercisePicker()" style="max-width: 240px; margin: 0 auto;">
            + Добавить упражнение
          </button>
        </div>
      `;
      return;
    }

    let html = '';

    state.activeWorkout.exercises.forEach((item, exIdx) => {
      const exMeta = state.exercises.find(e => e.id === item.exerciseId) || {
        name: 'Упражнение',
        muscleGroup: 'Общее'
      };

      html += `
        <div class="workout-card">
          <div class="workout-card-header">
            <div class="workout-card-title">
              <span>${exMeta.name}</span>
            </div>
            <div class="workout-card-actions">
              <button class="btn-icon" title="Калькулятор блинов" onclick="IronTrack.openPlateCalculatorForExercise(${exIdx})" style="width: 32px; height: 32px;">
                ⚙️
              </button>
              <button class="btn-icon" title="Удалить" onclick="IronTrack.removeExerciseFromWorkout(${exIdx})" style="width: 32px; height: 32px; color: #f87171;">
                ✕
              </button>
            </div>
          </div>

          <table class="set-table">
            <thead>
              <tr>
                <th>Сет</th>
                <th>Прошлый</th>
                <th>Вес (${state.settings.unit})</th>
                <th>Повт</th>
                <th>✓</th>
              </tr>
            </thead>
            <tbody>
      `;

      item.sets.forEach((s, sIdx) => {
        let setLabel = sIdx + 1;
        let typeClass = '';
        if (s.type === 'warmup') { setLabel = 'W'; typeClass = 'warmup'; }
        else if (s.type === 'dropset') { setLabel = 'D'; typeClass = 'dropset'; }
        else if (s.type === 'failure') { setLabel = 'F'; typeClass = 'failure'; }

        html += `
          <tr class="set-row ${s.completed ? 'completed' : ''}">
            <td>
              <button class="set-type-btn ${typeClass}" title="Нажмите, чтобы сменить тип (W=разминка, D=дропсет, F=отказ)" onclick="IronTrack.cycleSetType(${exIdx}, ${sIdx})">
                ${setLabel}
              </button>
            </td>
            <td class="prev-log">${s.prev || '-'}</td>
            <td class="input-cell">
              <input type="number" step="0.5" inputmode="decimal" class="set-input" value="${s.weight}" placeholder="0"
                onchange="IronTrack.updateSetWeight(${exIdx}, ${sIdx}, this.value)">
            </td>
            <td class="input-cell">
              <input type="number" step="1" inputmode="numeric" class="set-input" value="${s.reps}" placeholder="0"
                onchange="IronTrack.updateSetReps(${exIdx}, ${sIdx}, this.value)">
            </td>
            <td>
              <button class="btn-check ${s.completed ? 'checked' : ''}" onclick="IronTrack.toggleSetCompletion(${exIdx}, ${sIdx})">
                ✓
              </button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>

          <div class="card-footer">
            <button class="btn-add-set" onclick="IronTrack.addSetToExercise(${exIdx})">
              + Добавить подход
            </button>
            <div style="display: flex; gap: 4px;">
              <button class="btn-timer-chip" onclick="IronTrack.quickAdjustWeight(${exIdx}, -2.5)">-2.5</button>
              <button class="btn-timer-chip" onclick="IronTrack.quickAdjustWeight(${exIdx}, +2.5)">+2.5</button>
            </div>
          </div>
        </div>
      `;
    });

    html += `
      <button class="btn-secondary" onclick="IronTrack.openExercisePicker()" style="width: 100%; padding: 14px; margin-top: 8px;">
        + Добавить упражнение
      </button>
    `;

    listEl.innerHTML = html;
  }

  // Быстрая корректировка веса последнего подхода в упражнении
  function quickAdjustWeight(exIdx, delta) {
    if (!state.activeWorkout || !state.activeWorkout.exercises[exIdx]) return;
    const sets = state.activeWorkout.exercises[exIdx].sets;
    if (sets.length === 0) return;
    const lastSet = sets[sets.length - 1];
    let val = parseFloat(lastSet.weight) || 0;
    val = Math.max(0, val + delta);
    lastSet.weight = Math.round(val * 10) / 10;
    saveActiveWorkout();
    renderActiveWorkout();
  }

  // --- DASHBOARD RENDERING ---
  function renderDashboard() {
    // Подсчет статистики
    const totalWorkouts = state.workouts.length;
    let totalTonnage = 0;
    let totalSets = 0;

    state.workouts.forEach(wo => {
      totalTonnage += wo.totalVolume || 0;
      totalSets += wo.totalSets || 0;
    });

    const totalWoEl = document.getElementById('dash-total-workouts');
    if (totalWoEl) totalWoEl.textContent = totalWorkouts;

    const totalTonEl = document.getElementById('dash-total-tonnage');
    if (totalTonEl) {
      if (totalTonnage > 1000) {
        totalTonEl.textContent = (totalTonnage / 1000).toFixed(1) + ' т';
      } else {
        totalTonEl.textContent = totalTonnage + ' кг';
      }
    }

    const totalSetsEl = document.getElementById('dash-total-sets');
    if (totalSetsEl) totalSetsEl.textContent = totalSets;

    // Баннер активной тренировки (если свернута)
    const resumeBox = document.getElementById('resume-workout-banner');
    if (resumeBox) {
      if (state.activeWorkout) {
        resumeBox.style.display = 'block';
        const nameEl = document.getElementById('resume-workout-name');
        if (nameEl) nameEl.textContent = state.activeWorkout.name;
      } else {
        resumeBox.style.display = 'none';
      }
    }

    // Рендер популярных шаблонов на главной
    renderTemplatesList();
  }

  function renderTemplatesList() {
    const container = document.getElementById('templates-list');
    if (!container) return;

    if (state.templates.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Шаблоны отсутствуют</div>';
      return;
    }

    let html = '';
    state.templates.forEach(tpl => {
      const exTags = tpl.exercises.slice(0, 4).map(e => {
        const meta = state.exercises.find(m => m.id === e.exerciseId);
        return `<span class="exercise-tag">${meta ? meta.name : 'Упражнение'}</span>`;
      }).join('');

      html += `
        <div class="template-card" onclick="IronTrack.startWorkoutById('${tpl.id}')">
          <div class="template-header">
            <div class="template-name">${tpl.name}</div>
            <span class="template-badge">${tpl.exercises.length} упр.</span>
          </div>
          <div class="template-desc">${tpl.description || ''}</div>
          <div class="template-preview">
            ${exTags}
            ${tpl.exercises.length > 4 ? `<span class="exercise-tag">+${tpl.exercises.length - 4} ещё</span>` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- EXERCISES CATALOG RENDERING ---
  let exerciseMuscleFilter = 'Все';
  let exerciseSearchQuery = '';

  function renderExercisesCatalog() {
    const listEl = document.getElementById('catalog-exercise-list');
    if (!listEl) return;

    const filtered = state.exercises.filter(ex => {
      const matchMuscle = (exerciseMuscleFilter === 'Все' || ex.muscleGroup === exerciseMuscleFilter);
      const matchSearch = ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase());
      return matchMuscle && matchSearch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          Упражнения не найдены
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(ex => {
      const pr = getPersonalRecords(ex.id);
      html += `
        <div class="exercise-item" onclick="IronTrack.openExerciseDetail('${ex.id}')">
          <div>
            <div class="exercise-item-name">${ex.name}</div>
            <div class="exercise-item-sub">
              ${ex.muscleGroup} • ${ex.equipment}
              ${pr.maxWeight > 0 ? ` • <span class="pr-badge">PR: ${pr.maxWeight} кг</span>` : ''}
            </div>
          </div>
          <span style="color: var(--text-dim); font-size: 18px;">›</span>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  // --- HISTORY RENDERING ---
  function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (state.workouts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 700; color: #fff;">История пока пуста</div>
          <div style="font-size: 13px; margin-top: 4px;">Завершите первую тренировку, и она появится здесь!</div>
        </div>
      `;
      return;
    }

    let html = '';
    state.workouts.forEach((wo, idx) => {
      const dateObj = new Date(wo.date);
      const dateStr = dateObj.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const durMin = Math.round((wo.durationSec || 0) / 60);

      // Сводка по упражнениям
      const exercisesSummary = wo.exercises.map(e => {
        const meta = state.exercises.find(m => m.id === e.exerciseId);
        const validSets = e.sets.filter(s => s.completed);
        if (validSets.length === 0) return null;
        const bestSet = validSets.reduce((best, s) => (parseFloat(s.weight) > parseFloat(best.weight) ? s : best), validSets[0]);
        return `<div>• <b>${meta ? meta.name : 'Упражнение'}</b>: ${validSets.length} подх. (лучший: ${bestSet.weight} кг × ${bestSet.reps})</div>`;
      }).filter(Boolean).join('');

      html += `
        <div class="history-card">
          <div class="history-card-top">
            <div>
              <div class="history-card-title">${wo.name}</div>
              <div class="history-card-date">${dateStr}</div>
            </div>
            <button class="btn-icon" title="Удалить из истории" onclick="IronTrack.deleteWorkout(${idx})" style="width: 28px; height: 28px; color: #f87171;">
              ✕
            </button>
          </div>

          <div style="font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; margin: 8px 0;">
            ${exercisesSummary}
          </div>

          <div class="history-summary">
            <div>Тоннаж: <b>${wo.totalVolume || 0} кг</b></div>
            <div>Подходов: <b>${wo.totalSets || 0}</b></div>
            <div>Время: <b>${durMin} мин</b></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- ANALYTICS & CANVAS CHART ---
  function renderAnalytics() {
    populateAnalyticsExerciseSelect();
    drawProgressChart();
  }

  function populateAnalyticsExerciseSelect() {
    const select = document.getElementById('analytics-exercise-select');
    if (!select) return;

    // Собрать только упражнения, по которым есть история
    const usedIds = new Set();
    state.workouts.forEach(w => {
      w.exercises.forEach(e => {
        if (e.sets.some(s => s.completed)) {
          usedIds.add(e.exerciseId);
        }
      });
    });

    let options = '';
    state.exercises.forEach(ex => {
      const hasData = usedIds.has(ex.id);
      options += `<option value="${ex.id}" ${ex.id === state.selectedExerciseForChart ? 'selected' : ''}>
        ${ex.name} ${hasData ? '★' : ''}
      </option>`;
    });

    select.innerHTML = options;
  }

  function drawProgressChart() {
    const canvas = document.getElementById('progress-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth || 320;
    const height = 200;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Сбор точек данных по выбранному упражнению
    const points = [];
    const exerciseId = state.selectedExerciseForChart;

    // Хронологически от старых к новым
    const chronologicalWorkouts = [...state.workouts].reverse();

    chronologicalWorkouts.forEach(wo => {
      const exEntry = wo.exercises.find(e => e.exerciseId === exerciseId);
      if (exEntry) {
        let maxWeight = 0;
        let max1RM = 0;
        exEntry.sets.forEach(s => {
          if (s.completed && s.weight > 0) {
            if (s.weight > maxWeight) maxWeight = s.weight;
            const rm = calculate1RM(s.weight, s.reps);
            if (rm > max1RM) max1RM = rm;
          }
        });
        if (maxWeight > 0) {
          const d = new Date(wo.date);
          points.push({
            date: `${d.getDate()}.${d.getMonth() + 1}`,
            weight: maxWeight,
            rm: max1RM
          });
        }
      }
    });

    // Очистка
    ctx.clearRect(0, 0, width, height);

    if (points.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Нет данных по этому упражнению', width / 2, height / 2);
      ctx.fillText('Выполните его на тренировке, чтобы увидеть график', width / 2, height / 2 + 20);

      const prEl = document.getElementById('chart-pr-stats');
      if (prEl) prEl.innerHTML = '';
      return;
    }

    // Отображение рекордов в карточке
    const prs = getPersonalRecords(exerciseId);
    const prEl = document.getElementById('chart-pr-stats');
    if (prEl) {
      prEl.innerHTML = `
        <div style="display: flex; justify-content: space-around; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-color);">
          <div style="text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Лучший вес</div>
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${prs.maxWeight} кг</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Расчетный 1RM</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent);">${prs.max1RM} кг</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Макс. подход</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--gold);">${prs.maxVolume} кг</div>
          </div>
        </div>
      `;
    }

    // Нахождение min и max для масштабирования
    const weights = points.map(p => p.weight);
    const minW = Math.max(0, Math.min(...weights) - 5);
    const maxW = Math.max(...weights) + 5;
    const padding = { top: 20, right: 20, bottom: 30, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Сетка
    ctx.strokeStyle = '#263346';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = Math.round(maxW - ((maxW - minW) / gridLines) * i);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(val + ' кг', padding.left - 6, y + 3);
    }

    // Расчет координат точек
    const coords = points.map((p, i) => {
      const x = points.length === 1
        ? padding.left + chartW / 2
        : padding.left + (chartW / (points.length - 1)) * i;
      const y = padding.top + chartH - ((p.weight - minW) / (maxW - minW || 1)) * chartH;
      return { x, y, point: p };
    });

    // Рисование линии градиента
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - padding.bottom);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Основная линия графика
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    coords.forEach((c, idx) => {
      if (idx === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    // Точки
    ctx.textAlign = 'center';
    coords.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#0a0d12';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Подпись даты снизу
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(c.point.date, c.x, height - 10);
    });
  }

  // --- PLATE CALCULATOR ---
  function calculatePlates(targetWeight, barWeight = 20) {
    const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const weightPerSide = (targetWeight - barWeight) / 2;

    if (weightPerSide <= 0) {
      return { plates: [], leftover: 0, weightPerSide: 0 };
    }

    let remaining = weightPerSide;
    const result = [];

    for (let p of plates) {
      while (remaining >= p - 0.001) {
        result.push(p);
        remaining -= p;
      }
    }

    return {
      plates: result,
      leftover: Math.round(remaining * 100) / 100,
      weightPerSide: weightPerSide
    };
  }

  function renderPlateCalculatorView() {
    const targetInput = document.getElementById('calc-target-weight');
    const barSelect = document.getElementById('calc-bar-weight');
    if (!targetInput || !barSelect) return;

    const targetW = parseFloat(targetInput.value) || 0;
    const barW = parseFloat(barSelect.value) || 20;

    const res = calculatePlates(targetW, barW);

    const sleeveEl = document.getElementById('bar-sleeve-container');
    const textEl = document.getElementById('plate-calc-breakdown');

    if (sleeveEl) {
      if (res.plates.length === 0) {
        sleeveEl.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); margin-left: 10px;">Только гриф</div>';
      } else {
        sleeveEl.innerHTML = res.plates.map(p => {
          const cls = `plate plate-${String(p).replace('.', '_')}`;
          return `<div class="${cls}" title="${p} кг">${p}</div>`;
        }).join('');
      }
    }

    if (textEl) {
      if (res.plates.length === 0) {
        textEl.textContent = `Общий вес: ${barW} кг (только гриф без блинов)`;
      } else {
        const counts = {};
        res.plates.forEach(p => counts[p] = (counts[p] || 0) + 1);
        const desc = Object.keys(counts).map(p => `${counts[p]} × ${p} кг`).join(' + ');
        textEl.innerHTML = `На каждую сторону (<b>${res.weightPerSide} кг</b>):<br><span style="color: var(--accent); font-weight: 700;">${desc}</span>`;
      }
    }
  }

  // --- MODALS AND TABS MANAGEMENT ---
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    if (tabName === 'train') renderDashboard();
    if (tabName === 'exercises') renderExercisesCatalog();
    if (tabName === 'history') renderHistory();
    if (tabName === 'analytics') renderAnalytics();
  }

  // Сводка после тренировки
  function showWorkoutSummaryModal(entry, prCount) {
    const modal = document.getElementById('workout-summary-modal');
    if (!modal) return;

    const mins = Math.round(entry.durationSec / 60);
    document.getElementById('summary-time').textContent = `${mins} мин`;
    document.getElementById('summary-tonnage').textContent = `${entry.totalVolume} кг`;
    document.getElementById('summary-sets').textContent = entry.totalSets;

    const prBox = document.getElementById('summary-pr-badge');
    if (prBox) {
      if (prCount > 0) {
        prBox.style.display = 'block';
        prBox.textContent = `🔥 Новых личных рекордов: ${prCount}!`;
      } else {
        prBox.style.display = 'none';
      }
    }

    openModal('workout-summary-modal');
  }

  // Тост уведомление
  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: #042f20;
        font-weight: 700;
        padding: 10px 20px;
        border-radius: 9999px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        font-size: 14px;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2500);
  }

  // Экспорт данных в JSON файл
  function exportData() {
    const data = {
      exercises: state.exercises,
      templates: state.templates,
      workouts: state.workouts,
      settings: state.settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IronTrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Бэкап сохранен!');
  }

  // Импорт данных
  function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.workouts) state.workouts = imported.workouts;
        if (imported.exercises) state.exercises = imported.exercises;
        if (imported.templates) state.templates = imported.templates;
        saveExercises();
        saveTemplates();
        saveWorkouts();
        showToast('Данные успешно импортированы!');
        renderDashboard();
      } catch (err) {
        alert('Ошибка при чтении файла бэкапа: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // Демонстрационные тренировки для быстрого ознакомления
  function preloadDemoData() {
    if (confirm('Загрузить тестовую неделю тренировок для демонстрации аналитики и графиков?')) {
      const now = Date.now();
      const oneDay = 86400000;

      const demoWorkouts = [
        {
          id: 'demo_1',
          name: 'Жим / Push',
          date: new Date(now - oneDay * 14).toISOString(),
          durationSec: 3600,
          totalVolume: 5200,
          totalSets: 12,
          exercises: [
            {
              exerciseId: 'chest_bench_press',
              sets: [
                { weight: 70, reps: 10, completed: true },
                { weight: 75, reps: 8, completed: true },
                { weight: 80, reps: 6, completed: true }
              ]
            }
          ]
        },
        {
          id: 'demo_2',
          name: 'Жим / Push',
          date: new Date(now - oneDay * 7).toISOString(),
          durationSec: 3750,
          totalVolume: 5600,
          totalSets: 12,
          exercises: [
            {
              exerciseId: 'chest_bench_press',
              sets: [
                { weight: 72.5, reps: 10, completed: true },
                { weight: 77.5, reps: 8, completed: true },
                { weight: 82.5, reps: 6, completed: true }
              ]
            }
          ]
        },
        {
          id: 'demo_3',
          name: 'Жим / Push',
          date: new Date(now - oneDay * 2).toISOString(),
          durationSec: 3900,
          totalVolume: 6100,
          totalSets: 14,
          exercises: [
            {
              exerciseId: 'chest_bench_press',
              sets: [
                { weight: 75, reps: 10, completed: true },
                { weight: 80, reps: 8, completed: true },
                { weight: 85, reps: 6, completed: true }
              ]
            }
          ]
        }
      ];

      state.workouts = [...demoWorkouts, ...state.workouts];
      saveWorkouts();
      showToast('Тестовые данные загружены!');
      renderDashboard();
      renderHistory();
      renderAnalytics();
    }
  }

  // --- GLOBAL API FOR INLINE EVENT HANDLERS ---
  window.IronTrack = {
    // Navigation
    switchTab,
    openModal,
    closeModal,

    // Workouts
    startEmptyWorkout: () => startWorkout(null),
    startWorkoutById: (templateId) => {
      const tpl = state.templates.find(t => t.id === templateId);
      startWorkout(tpl);
    },
    resumeActiveWorkout: () => {
      if (state.activeWorkout) {
        const screen = document.getElementById('active-workout-screen');
        if (screen) screen.classList.add('active');
        startWorkoutDurationTracker();
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
    deleteWorkout: (idx) => {
      if (confirm('Удалить эту тренировку из истории?')) {
        state.workouts.splice(idx, 1);
        saveWorkouts();
        renderHistory();
        renderDashboard();
      }
    },

    // Sets & Exercises in active session
    openExercisePicker: () => {
      populateExercisePickerList();
      openModal('exercise-picker-modal');
    },
    addExerciseToActiveWorkout,
    removeExerciseFromWorkout,
    addSetToExercise,
    removeSet,
    toggleSetCompletion,
    cycleSetType,
    quickAdjustWeight,
    updateSetWeight: (exIdx, sIdx, val) => {
      if (state.activeWorkout && state.activeWorkout.exercises[exIdx]) {
        state.activeWorkout.exercises[exIdx].sets[sIdx].weight = parseFloat(val) || 0;
        saveActiveWorkout();
      }
    },
    updateSetReps: (exIdx, sIdx, val) => {
      if (state.activeWorkout && state.activeWorkout.exercises[exIdx]) {
        state.activeWorkout.exercises[exIdx].sets[sIdx].reps = parseInt(val, 10) || 0;
        saveActiveWorkout();
      }
    },

    // Timer
    startRestTimer,
    adjustRestTimer,
    stopRestTimer,

    // Plate Calculator
    openPlateCalculatorForExercise: (exIdx) => {
      if (state.activeWorkout && state.activeWorkout.exercises[exIdx]) {
        const sets = state.activeWorkout.exercises[exIdx].sets;
        const lastWeight = sets.length > 0 ? parseFloat(sets[sets.length - 1].weight) || 60 : 60;
        const targetInput = document.getElementById('calc-target-weight');
        if (targetInput) targetInput.value = lastWeight;
        renderPlateCalculatorView();
        openModal('plate-calculator-modal');
      }
    },
    onPlateCalcChange: renderPlateCalculatorView,

    // Catalog & Filters
    setMuscleFilter: (muscle) => {
      exerciseMuscleFilter = muscle;
      document.querySelectorAll('#muscle-filter-chips .chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-muscle') === muscle);
      });
      renderExercisesCatalog();
    },
    searchExercises: (q) => {
      exerciseSearchQuery = q;
      renderExercisesCatalog();
    },
    openExerciseDetail: (exerciseId) => {
      state.selectedExerciseForChart = exerciseId;
      switchTab('analytics');
    },

    // Analytics
    onAnalyticsSelectChange: (exerciseId) => {
      state.selectedExerciseForChart = exerciseId;
      drawProgressChart();
    },

    // Data
    exportData,
    importData,
    preloadDemoData
  };

  // Вспомогательный рендер списка в модальном окне выбора упражнений
  function populateExercisePickerList() {
    const listEl = document.getElementById('modal-exercise-list');
    if (!listEl) return;

    let html = '';
    state.exercises.forEach(ex => {
      html += `
        <div class="exercise-item" onclick="IronTrack.addExerciseToActiveWorkout('${ex.id}')">
          <div>
            <div class="exercise-item-name">${ex.name}</div>
            <div class="exercise-item-sub">${ex.muscleGroup} • ${ex.equipment}</div>
          </div>
          <span style="color: var(--accent); font-weight: 800; font-size: 18px;">+</span>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }

  // --- DOM READY INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    renderDashboard();

    // Слушатель поиска в каталоге
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        IronTrack.searchExercises(e.target.value);
      });
    }

    // Слушатель поиска в модалке упражнений
    const modalSearchInput = document.getElementById('modal-exercise-search');
    if (modalSearchInput) {
      modalSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#modal-exercise-list .exercise-item');
        items.forEach(it => {
          const text = it.textContent.toLowerCase();
          it.style.display = text.includes(q) ? 'flex' : 'none';
        });
      });
    }

    // Регистрация Service Worker для PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration skipped:', err);
      });
    }

    // Если есть незаконченная активная тренировка
    if (state.activeWorkout) {
      renderActiveWorkout();
    }
  });

})();
