(() => {
  const root = document.getElementById('sw-root');

  // ---------- Tabs & theme ----------
  const tabs = {
    talk: document.getElementById('sw-tab-talk'),
    tools: document.getElementById('sw-tab-tools')
  };
  const panels = {
    talk: document.getElementById('sw-panel-talk'),
    tools: document.getElementById('sw-panel-tools')
  };

  function showTab(name) {
    Object.keys(tabs).forEach(k => {
      tabs[k].classList.toggle('active', k === name);
      panels[k].classList.toggle('active', k === name);
    });
  }

  tabs.talk.addEventListener('click', () => showTab('talk'));
  tabs.tools.addEventListener('click', () => showTab('tools'));

  document.getElementById('sw-theme-toggle').addEventListener('click', () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
  });

  // ---------- Modals ----------
  const helpModal = document.getElementById('sw-modal-bg');
  document.getElementById('sw-help-open').addEventListener('click', () => helpModal.style.display = 'flex');
  document.getElementById('sw-modal-close').addEventListener('click', () => helpModal.style.display = 'none');
  helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.style.display = 'none'; });

  const breathModal = document.getElementById('sw-breath-modal');
  document.getElementById('sw-breathe-option').addEventListener('click', () => openBreathingModal());
  document.getElementById('sw-breathe-chip').addEventListener('click', () => openBreathingModal());
  document.getElementById('sw-breath-close').addEventListener('click', closeBreathingModal);
  breathModal.addEventListener('click', e => { if (e.target === breathModal) closeBreathingModal(); });

  function openBreathingModal() {
    breathModal.style.display = 'flex';
    resetBreathing();
  }
  function closeBreathingModal() {
    stopBreathing();
    breathModal.style.display = 'none';
  }

  // ---------- Chat ----------
  const chat = document.getElementById('sw-chat');
  const input = document.getElementById('sw-input');
  const sendBtn = document.getElementById('sw-send');
  const typing = document.getElementById('sw-typing');
  let history = [];
  let crisisShown = false;

  const CRISIS_WORDS = [
    'suicide','kill myself','want to die','end my life','ending it all',
    'no reason to live','not worth living','self harm','self-harm',
    'hurt myself','cut myself','better off dead','can\'t go on',
    'end it all','no point living','give up on life'
  ];

  function checkCrisis(text) {
    const t = text.toLowerCase();
    return CRISIS_WORDS.some(w => t.includes(w));
  }

  function showCrisisCard() {
    if (crisisShown) return;
    crisisShown = true;
    const card = document.getElementById('sw-crisis');
    card.style.display = 'block';
    chat.scrollTop = chat.scrollHeight;
  }

  function addBubble(role, text) {
    const row = document.createElement('div');
    row.className = 'sw-row ' + (role === 'user' ? 'user' : 'bot');

    if (role !== 'user') {
      const avatar = document.createElement('div');
      avatar.className = 'sw-avatar';
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'sw-bubble ' + (role === 'user' ? 'user' : 'bot');
    bubble.textContent = text;
    row.appendChild(bubble);
    chat.insertBefore(row, typing);
    chat.scrollTop = chat.scrollHeight;
  }

  function usePrompt(text) {
    input.value = text;
    input.focus();
    input.dispatchEvent(new Event('input'));
  }

  document.querySelectorAll('.sw-chip[data-prompt]').forEach(btn => {
    btn.addEventListener('click', () => usePrompt(btn.dataset.prompt));
  });

  document.getElementById('sw-study-prompt').addEventListener('click', () => {
    usePrompt('I am a student. Help me make a realistic study plan for today with breaks.');
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener('click', send);

  async function send() {
    const text = input.value.trim();
    if (!text) return;

    addBubble('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    const isCrisis = checkCrisis(text);
    if (isCrisis) showCrisisCard();

    typing.style.display = 'flex';

    const systemPrompt = `You are Stay a While, a warm student companion.
You can help with study planning, time management, simple programming explanations,
exam preparation, motivation, and emotional support.
Keep normal replies concise (2-5 short sentences) and practical.
Do not claim to be a doctor or therapist. Do not diagnose.
For academic questions, explain from basics when the student seems like a beginner.
For stress, listen first and suggest one small next step.
If the user mentions self-harm, suicide, or not being safe, prioritize immediate human support
and encourage a trusted person or appropriate crisis/emergency support. Never provide methods or instructions for self-harm.
${isCrisis ? 'This is a possible crisis message: respond with calm, supportive language and encourage immediate real-world support.' : ''}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, systemPrompt })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);

      const reply = data.reply || "I'm here with you. Tell me a little more.";
      history.push({ role: 'assistant', content: reply });

      typing.style.display = 'none';
      addBubble('bot', reply);
    } catch (err) {
      console.error('Chat error:', err);
      typing.style.display = 'none';
      addBubble('bot', `I couldn't reach Gemini right now. ${err.message || 'Please check the server and API key.'}`);
    } finally {
      sendBtn.disabled = false;
      chat.scrollTop = chat.scrollHeight;
    }
  }

  // ---------- Local storage helpers ----------
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  // ---------- Tasks ----------
  let tasks = store.get('sw_tasks', []);

  function renderTasks() {
    const list = document.getElementById('sw-task-list');
    const empty = document.getElementById('sw-task-empty');
    list.innerHTML = '';
    empty.style.display = tasks.length ? 'none' : 'block';

    tasks.forEach(task => {
      const row = document.createElement('div');
      row.className = 'sw-list-item' + (task.done ? ' done' : '');
      row.innerHTML = `
        <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Complete task">
        <span></span>
        <button title="Delete task" aria-label="Delete task">✕</button>
      `;
      row.querySelector('span').textContent = task.text;
      row.querySelector('input').addEventListener('change', e => {
        task.done = e.target.checked;
        store.set('sw_tasks', tasks);
        renderTasks();
        updateDashboard();
      });
      row.querySelector('button').addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        store.set('sw_tasks', tasks);
        renderTasks();
        updateDashboard();
      });
      list.appendChild(row);
    });
  }

  document.getElementById('sw-task-form').addEventListener('submit', e => {
    e.preventDefault();
    const el = document.getElementById('sw-task-input');
    const text = el.value.trim();
    if (!text) return;
    tasks.unshift({ id: Date.now(), text, done: false });
    store.set('sw_tasks', tasks);
    el.value = '';
    renderTasks();
    updateDashboard();
  });

  // ---------- Goals ----------
  let goals = store.get('sw_goals', []);

  function renderGoals() {
    const list = document.getElementById('sw-goal-list');
    const empty = document.getElementById('sw-goal-empty');
    list.innerHTML = '';
    empty.style.display = goals.length ? 'none' : 'block';

    goals.forEach(goal => {
      const row = document.createElement('div');
      row.className = 'sw-list-item' + (goal.done ? ' done' : '');
      row.innerHTML = `
        <input type="checkbox" ${goal.done ? 'checked' : ''} aria-label="Complete goal">
        <span></span>
        <button title="Delete goal" aria-label="Delete goal">✕</button>
      `;
      row.querySelector('span').textContent = goal.text;
      row.querySelector('input').addEventListener('change', e => {
        goal.done = e.target.checked;
        store.set('sw_goals', goals);
        renderGoals();
        updateDashboard();
      });
      row.querySelector('button').addEventListener('click', () => {
        goals = goals.filter(g => g.id !== goal.id);
        store.set('sw_goals', goals);
        renderGoals();
        updateDashboard();
      });
      list.appendChild(row);
    });
  }

  document.getElementById('sw-goal-form').addEventListener('submit', e => {
    e.preventDefault();
    const el = document.getElementById('sw-goal-input');
    const text = el.value.trim();
    if (!text) return;
    goals.unshift({ id: Date.now(), text, done: false });
    store.set('sw_goals', goals);
    el.value = '';
    renderGoals();
    updateDashboard();
  });

  // ---------- Dashboard + study minutes ----------
  let studyMinutes = store.get('sw_study_minutes', 0);
  let streak = store.get('sw_streak', { count: 0, last: '' });

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function markStudyDay() {
    const today = todayKey();
    if (streak.last === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);

    streak.count = streak.last === y ? streak.count + 1 : 1;
    streak.last = today;
    store.set('sw_streak', streak);
  }

  function updateDashboard() {
    document.getElementById('sw-task-count').textContent = tasks.filter(t => !t.done).length;
    document.getElementById('sw-goal-count').textContent = goals.filter(g => !g.done).length;
    document.getElementById('sw-study-mins').textContent = studyMinutes;
    document.getElementById('sw-streak').textContent = streak.count;
  }

  // ---------- Focus timer ----------
  const ring = document.getElementById('sw-ring');
  const ringNum = document.getElementById('sw-ring-num');
  const timerStart = document.getElementById('sw-timer-start');
  const timerReset = document.getElementById('sw-timer-reset');
  const timerStatus = document.getElementById('sw-timer-status');
  const modePills = document.querySelectorAll('.sw-mode-pill');

  const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const RING_CIRC = 2 * Math.PI * 52;
  ring.style.strokeDasharray = RING_CIRC;

  let currentMode = 'focus';
  let remaining = DURATIONS.focus;
  let timerRunning = false;
  let intervalId = null;

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateRing() {
    const percent = remaining / DURATIONS[currentMode];
    ring.style.strokeDashoffset = RING_CIRC * (1 - percent);
    ringNum.textContent = formatTime(remaining);
  }

  function pauseTimer() {
    timerRunning = false;
    clearInterval(intervalId);
    timerStart.textContent = 'Start';
  }

  function setMode(mode) {
    currentMode = mode;
    remaining = DURATIONS[mode];
    pauseTimer();
    updateRing();
    timerStatus.textContent = 'Ready when you are';
    modePills.forEach(p => p.classList.toggle('active', p.dataset.mode === mode));
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      updateRing();
      pauseTimer();
      if (currentMode === 'focus') {
        studyMinutes += 25;
        store.set('sw_study_minutes', studyMinutes);
        markStudyDay();
        updateDashboard();
        timerStatus.textContent = 'Nice work — time for a break.';
      } else {
        timerStatus.textContent = "Break's done whenever you're ready.";
      }
      return;
    }
    updateRing();
  }

  modePills.forEach(p => p.addEventListener('click', () => setMode(p.dataset.mode)));

  timerStart.addEventListener('click', () => {
    if (timerRunning) {
      pauseTimer();
      timerStatus.textContent = 'Paused';
    } else {
      timerRunning = true;
      timerStart.textContent = 'Pause';
      timerStatus.textContent = currentMode === 'focus' ? 'Focusing…' : 'Resting…';
      intervalId = setInterval(tick, 1000);
    }
  });

  timerReset.addEventListener('click', () => setMode(currentMode));
  updateRing();

  // ---------- Exam countdown ----------
  const examName = document.getElementById('sw-exam-name');
  const examDate = document.getElementById('sw-exam-date');
  const countdown = document.getElementById('sw-countdown');
  const savedExam = store.get('sw_exam', null);

  if (savedExam) {
    examName.value = savedExam.name || '';
    examDate.value = savedExam.date || '';
  }

  function renderCountdown() {
    const name = examName.value.trim();
    const date = examDate.value;
    if (!name || !date) {
      countdown.textContent = 'No exam set yet.';
      return;
    }

    const target = new Date(date + 'T00:00:00');
    const now = new Date();
    const diff = Math.ceil((target - now) / 86400000);

    if (diff < 0) countdown.textContent = `${name} was ${Math.abs(diff)} day(s) ago.`;
    else if (diff === 0) countdown.textContent = `${name} is today.`;
    else countdown.textContent = `${name} is in ${diff} day(s).`;
  }

  document.getElementById('sw-exam-save').addEventListener('click', () => {
    if (!examName.value.trim() || !examDate.value) return;
    store.set('sw_exam', { name: examName.value.trim(), date: examDate.value });
    renderCountdown();
  });
  renderCountdown();

  // ---------- Marks calculator ----------
  document.getElementById('sw-calc-marks').addEventListener('click', () => {
    const obtained = Number(document.getElementById('sw-marks-obtained').value);
    const total = Number(document.getElementById('sw-marks-total').value);
    const result = document.getElementById('sw-marks-result');

    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
      result.textContent = 'Enter valid marks (obtained must be between 0 and total).';
      return;
    }
    result.textContent = `Percentage: ${(obtained / total * 100).toFixed(2)}%`;
  });

  // ---------- Notes ----------
  const dump = document.getElementById('sw-dump');
  dump.value = localStorage.getItem('sw_dump') || '';
  dump.addEventListener('input', () => localStorage.setItem('sw_dump', dump.value));
  document.getElementById('sw-dump-clear').addEventListener('click', () => {
    dump.value = '';
    localStorage.removeItem('sw_dump');
  });

  // ---------- Breathing exercise ----------
  let breathTimer = null;
  let breathRunning = false;
  let breathStartTime = 0;
  const BREATH_TOTAL = 60;
  const breathPhases = [
    { name: 'Inhale', seconds: 4, scale: 1.22, instruction: 'Breathe in gently through your nose.' },
    { name: 'Hold', seconds: 4, scale: 1.22, instruction: 'Hold softly. No need to strain.' },
    { name: 'Exhale', seconds: 6, scale: 0.82, instruction: 'Breathe out slowly and comfortably.' }
  ];

  const breathOrb = document.getElementById('sw-breath-orb');
  const breathPhase = document.getElementById('sw-breath-phase');
  const breathInstruction = document.getElementById('sw-breath-instruction');
  const modalOrb = document.getElementById('sw-modal-orb');
  const modalText = document.getElementById('sw-modal-breath-text');
  const progress = document.getElementById('sw-breath-progress');

  function setBreathVisual(phase) {
    breathPhase.textContent = phase.name;
    breathInstruction.textContent = phase.instruction;
    breathOrb.textContent = phase.name;
    breathOrb.style.transform = `scale(${phase.scale})`;
    modalOrb.textContent = phase.name;
    modalOrb.style.transform = `scale(${phase.scale})`;
    modalText.textContent = `${phase.instruction}  ${phase.name === 'Inhale' ? '4 seconds' : phase.name === 'Hold' ? '4 seconds' : '6 seconds'}.`;
  }

  function resetBreathing() {
    stopBreathing();
    breathPhase.textContent = 'Ready';
    breathInstruction.textContent = 'Press start for a gentle 4–4–6 rhythm.';
    breathOrb.textContent = 'Breathe';
    breathOrb.style.transform = 'scale(1)';
    modalOrb.textContent = 'Ready';
    modalOrb.style.transform = 'scale(1)';
    progress.style.width = '0%';
  }

  function startBreathing() {
    if (breathRunning) return;
    breathRunning = true;
    breathStartTime = performance.now();
    const startButtons = [
      document.getElementById('sw-breath-start'),
      document.getElementById('sw-modal-breath-start')
    ];
    startButtons.forEach(b => b.textContent = 'Running…');

    function frame(now) {
      if (!breathRunning) return;

      const elapsed = (now - breathStartTime) / 1000;
      const cycle = 14;
      const within = elapsed % cycle;
      let acc = 0;
      let phase = breathPhases[2];

      for (const p of breathPhases) {
        if (within < acc + p.seconds) {
          phase = p;
          break;
        }
        acc += p.seconds;
      }

      setBreathVisual(phase);
      progress.style.width = `${Math.min(100, elapsed / BREATH_TOTAL * 100)}%`;

      if (elapsed >= BREATH_TOTAL) {
        stopBreathing();
        breathPhase.textContent = 'Done';
        breathInstruction.textContent = 'Nice. Give yourself a moment before jumping back in.';
        breathOrb.textContent = 'Done';
        modalOrb.textContent = 'Done';
        progress.style.width = '100%';
        return;
      }
      breathTimer = requestAnimationFrame(frame);
    }
    breathTimer = requestAnimationFrame(frame);
  }

  function stopBreathing() {
    breathRunning = false;
    if (breathTimer) cancelAnimationFrame(breathTimer);
    breathTimer = null;
    document.getElementById('sw-breath-start').textContent = 'Start';
    document.getElementById('sw-modal-breath-start').textContent = 'Start';
  }

  document.getElementById('sw-breath-start').addEventListener('click', startBreathing);
  document.getElementById('sw-breath-stop').addEventListener('click', resetBreathing);
  document.getElementById('sw-modal-breath-start').addEventListener('click', startBreathing);
  document.getElementById('sw-modal-breath-stop').addEventListener('click', resetBreathing);

  // ---------- Motivation ----------
  const AFFIRMATIONS = [
    "You don't have to have it all figured out today.",
    "One page, one problem, one breath at a time — that's enough.",
    "Rest is part of the work, not a break from it.",
    "Small steps still count as moving forward.",
    "Comparison steals focus. Your pace still counts as progress.",
    "You are more than your grades.",
    "A rough day doesn't erase the good ones you've had.",
    "Done is often better than perfect.",
    "You showed up today. That's not nothing."
  ];
  let lastIdx = -1;
  document.getElementById('sw-motiv-btn').addEventListener('click', () => {
    let idx;
    do { idx = Math.floor(Math.random() * AFFIRMATIONS.length); }
    while (idx === lastIdx && AFFIRMATIONS.length > 1);
    lastIdx = idx;
    document.getElementById('sw-motiv-text').textContent = AFFIRMATIONS[idx];
  });

  // Initial render
  renderTasks();
  renderGoals();
  updateDashboard();
})();
