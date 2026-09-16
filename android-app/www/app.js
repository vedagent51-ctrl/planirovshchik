const STORAGE_KEY = 'habit-tracker-data';
const THEME_KEY = 'habit-tracker-theme';
const DAYS_SHOWN = 14;

const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function todayStr() {
  return dateToStr(new Date());
}

function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function computeStreaks(completions) {
  let current = 0;
  let cursor = new Date();
  while (completions[dateToStr(cursor)]) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const dates = Object.keys(completions).filter((d) => completions[d]).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of dates) {
    if (prev) {
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() + 1);
      if (dateToStr(prevDate) === d) {
        run++;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }

  return { current, best: Math.max(best, current) };
}

let habits = loadHabits();

const listEl = document.getElementById('habitList');
const emptyEl = document.getElementById('emptyState');
const form = document.getElementById('addForm');
const nameInput = document.getElementById('habitName');
const colorPicker = document.getElementById('colorPicker');
const themeToggle = document.getElementById('themeToggle');

let selectedColor = '#6c5ce7';

colorPicker.addEventListener('click', (e) => {
  const swatch = e.target.closest('.swatch');
  if (!swatch) return;
  selectedColor = swatch.dataset.color;
  [...colorPicker.children].forEach((s) => s.classList.toggle('selected', s === swatch));
});
colorPicker.firstElementChild.classList.add('selected');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  habits.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    color: selectedColor,
    completions: {},
  });
  saveHabits(habits);
  nameInput.value = '';
  render();
});

function toggleDay(habitId, dateStr) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;
  if (habit.completions[dateStr]) {
    delete habit.completions[dateStr];
  } else {
    habit.completions[dateStr] = true;
  }
  saveHabits(habits);
  render();
}

function deleteHabit(habitId) {
  habits = habits.filter((h) => h.id !== habitId);
  saveHabits(habits);
  render();
}

function render() {
  listEl.innerHTML = '';
  emptyEl.style.display = habits.length === 0 ? 'block' : 'none';

  const today = todayStr();

  for (const habit of habits) {
    const { current, best } = computeStreaks(habit.completions);

    const card = document.createElement('div');
    card.className = 'habit-card';

    const head = document.createElement('div');
    head.className = 'habit-head';
    head.innerHTML = `
      <div class="habit-title">
        <span class="dot" style="background:${habit.color}"></span>
        <span>${escapeHtml(habit.name)}</span>
      </div>
      <div class="habit-actions">
        <span class="streak-badge">🔥 ${current} подряд · рекорд ${best}</span>
        <button class="delete-btn" title="Удалить">✕</button>
      </div>
    `;
    head.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить привычку «${habit.name}»?`)) deleteHabit(habit.id);
    });

    const grid = document.createElement('div');
    grid.className = 'day-grid';

    const days = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    for (const d of days) {
      const ds = dateToStr(d);
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      if (ds === today) cell.classList.add('today');
      if (habit.completions[ds]) {
        cell.classList.add('done');
        cell.style.background = habit.color;
      }
      cell.textContent = DOW[d.getDay()];
      cell.title = ds;
      cell.addEventListener('click', () => toggleDay(habit.id, ds));
      grid.appendChild(cell);
    }

    card.appendChild(head);
    card.appendChild(grid);
    listEl.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const savedTheme = localStorage.getItem(THEME_KEY) ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

render();
