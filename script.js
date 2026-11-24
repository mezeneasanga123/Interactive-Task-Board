'use strict';

// Flowstate is completely client-side. All task data stays in this browser.
const TASKS_KEY = 'flowstate.tasks.v1';
const THEME_KEY = 'flowstate.theme.v1';
const STATUSES = ['todo', 'progress', 'done'];
const CATEGORIES = ['Development', 'Design', 'Marketing', 'Research', 'Personal'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUS_LABELS = { todo: 'To do', progress: 'In progress', done: 'Completed' };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const elements = {
  dialog: $('#task-dialog'), form: $('#task-form'), dialogTitle: $('#dialog-heading'),
  saveTask: $('#save-task'), search: $('#search'), category: $('#filter-category'),
  priority: $('#filter-priority'), sort: $('#sort-by'), resetFilters: $('#clear-filters'),
  toast: $('#toast')
};
let tasks = loadTasks();
let editingId = null;
let toastTimeout;

function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function demoTasks() {
  const time = Date.now();
  return [
    { id: createId(), title: 'Map the user experience', description: 'Outline the key screens and the journey between them.', category: 'Design', priority: 'High', status: 'todo', dueDate: '', createdAt: time - 120000 },
    { id: createId(), title: 'Build responsive components', description: 'Make sure the layout works on mobile, tablet and desktop.', category: 'Development', priority: 'High', status: 'progress', dueDate: '', createdAt: time - 100000 },
    { id: createId(), title: 'Write launch copy', description: 'Create clear, welcoming language for the project.', category: 'Marketing', priority: 'Medium', status: 'todo', dueDate: '', createdAt: time - 80000 },
    { id: createId(), title: 'Research design references', description: 'Collect a few examples of simple, intuitive interfaces.', category: 'Research', priority: 'Low', status: 'done', dueDate: '', createdAt: time - 60000 },
    { id: createId(), title: 'Test keyboard navigation', description: 'Check focus states, buttons, and form interactions.', category: 'Development', priority: 'Medium', status: 'progress', dueDate: '', createdAt: time - 40000 },
    { id: createId(), title: 'Plan the weekly schedule', description: 'Block out time for deep work and important milestones.', category: 'Personal', priority: 'Low', status: 'done', dueDate: '', createdAt: time - 20000 }
  ];
}

function normaliseTask(value) {
  if (!value || typeof value !== 'object' || typeof value.title !== 'string' || !value.title.trim()) return null;
  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    title: value.title.trim().slice(0, 100),
    description: typeof value.description === 'string' ? value.description.trim().slice(0, 600) : '',
    category: CATEGORIES.includes(value.category) ? value.category : 'Personal',
    priority: PRIORITIES.includes(value.priority) ? value.priority : 'Medium',
    status: STATUSES.includes(value.status) ? value.status : 'todo',
    dueDate: typeof value.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate) ? value.dueDate : '',
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now()
  };
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved === null) return demoTasks();
    const data = JSON.parse(saved);
    if (Array.isArray(data)) return data.map(normaliseTask).filter(Boolean);
  } catch (error) {
    console.warn('Unable to read saved tasks:', error);
  }
  return demoTasks();
}

function saveTasks() {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
  catch (error) { notify('Could not save. Check browser storage settings.'); console.warn(error); }
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDueSoon(task) {
  if (!task.dueDate || task.status === 'done') return false;
  const today = localDateString();
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  return task.dueDate >= today && task.dueDate <= localDateString(inThreeDays);
}

function escapeHtml(input) {
  return String(input).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function dueLabel(task) {
  if (!task.dueDate) return '';
  const today = localDateString();
  const status = task.status === 'done' ? '' : task.dueDate < today ? 'is-overdue' : task.dueDate === today ? 'is-today' : '';
  const label = task.dueDate === today ? 'Today' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T12:00:00`));
  return `<span class="due ${status}" title="Due ${escapeHtml(task.dueDate)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${escapeHtml(label)}</span>`;
}

function renderCard(task) {
  // All user-created text is escaped before entering markup.
  const card = document.createElement('article');
  card.className = 'task-card';
  card.dataset.id = task.id;
  card.draggable = true;
  card.setAttribute('aria-label', `${task.title}, ${task.priority} priority, ${STATUS_LABELS[task.status]}`);
  card.innerHTML = `
    <div class="card-top">
      <span class="category-pill" data-category="${escapeHtml(task.category)}">${escapeHtml(task.category)}</span>
      <div class="card-actions">
        <button type="button" class="card-icon-button" data-action="edit" title="Edit task" aria-label="Edit ${escapeHtml(task.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4 10.5-10.5Z"/></svg></button>
        <button type="button" class="card-icon-button" data-action="delete" title="Delete task" aria-label="Delete ${escapeHtml(task.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-10 0 1 14h10l1-14M10 10v7m4-7v7"/></svg></button>
      </div>
    </div>
    <h4>${escapeHtml(task.title)}</h4>
    ${task.description ? `<p>${escapeHtml(task.description)}</p>` : '<div class="empty-description"></div>'}
    <div class="card-bottom"><span class="priority priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)} priority</span>${dueLabel(task)}</div>
    <div class="card-status-row"><label><span class="sr-only">Move ${escapeHtml(task.title)} to another stage</span>
      <select class="card-status-select" data-action="status" aria-label="Change status of ${escapeHtml(task.title)}">
        ${STATUSES.map((status) => `<option value="${status}" ${status === task.status ? 'selected' : ''}>${STATUS_LABELS[status]}</option>`).join('')}
      </select>
    </label></div>`;
  return card;
}

function filteredTasks() {
  const searchText = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;
  const priority = elements.priority.value;
  const result = tasks.filter((task) =>
    (!searchText || task.title.toLowerCase().includes(searchText)) &&
    (category === 'all' || task.category === category) &&
    (priority === 'all' || task.priority === priority)
  );
  const sort = elements.sort.value;
  return result.sort((a, b) => {
    if (sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
    if (sort === 'due') return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || b.createdAt - a.createdAt;
    return b.createdAt - a.createdAt;
  });
}

function render() {
  const visible = filteredTasks();
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const activeCount = tasks.length - doneCount;
  const percentage = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
  $('#stat-total').textContent = tasks.length;
  $('#stat-active').textContent = activeCount;
  $('#stat-done').textContent = doneCount;
  $('#stat-due').textContent = tasks.filter(isDueSoon).length;
  $('#progress-percent').textContent = `${percentage}%`;
  $('#progress-done').textContent = doneCount;
  $('#progress-dial').style.setProperty('--progress', `${percentage}%`);

  STATUSES.forEach((status) => {
    const list = $(`#list-${status}`);
    const stageTasks = visible.filter((task) => task.status === status);
    list.replaceChildren();
    $(`#count-${status}`).textContent = stageTasks.length;
    if (!stageTasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-orbit" aria-hidden="true">${status === 'done' ? '✓' : '✧'}</div><strong>${visible.length < tasks.length ? 'No matching tasks' : status === 'done' ? 'Nothing here yet' : 'A little breathing room'}</strong><span>${visible.length < tasks.length ? 'Try changing your search or filters.' : status === 'done' ? 'Move finished tasks here to celebrate.' : 'Drop a task here or create a new one.'}</span>`;
      list.appendChild(empty);
    } else stageTasks.forEach((task) => list.appendChild(renderCard(task)));
  });
  const filtersActive = Boolean(elements.search.value.trim()) || elements.category.value !== 'all' || elements.priority.value !== 'all';
  elements.resetFilters.hidden = !filtersActive;
  $('#filter-summary').textContent = filtersActive ? `Showing ${visible.length} of ${tasks.length} tasks` : 'Drag cards between columns, or use the stage menu on each card.';
}

function notify(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function openDialog(task = null, presetStatus = 'todo') {
  editingId = task ? task.id : null;
  elements.form.reset();
  elements.dialogTitle.textContent = task ? 'Edit task' : 'Create a task';
  elements.saveTask.textContent = task ? 'Save changes' : 'Create task';
  $('#task-title').value = task?.title || '';
  $('#task-description').value = task?.description || '';
  $('#task-category').value = task?.category || 'Development';
  $('#task-priority').value = task?.priority || 'Medium';
  $('#task-due').value = task?.dueDate || '';
  $('#task-status').value = task?.status || presetStatus;
  elements.dialog.showModal();
  $('#task-title').focus();
}

function closeDialog() { elements.dialog.close(); }

function updateTaskStatus(id, status) {
  if (!STATUSES.includes(status)) return;
  const task = tasks.find((item) => item.id === id);
  if (!task || task.status === status) return;
  task.status = status;
  saveTasks();
  render();
  notify(`Moved to ${STATUS_LABELS[status]}`);
}

function handleSubmit(event) {
  event.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) { $('#task-title').setCustomValidity('Enter a task title.'); $('#task-title').reportValidity(); return; }
  const category = $('#task-category').value;
  const priority = $('#task-priority').value;
  const status = $('#task-status').value;
  if (!CATEGORIES.includes(category) || !PRIORITIES.includes(priority) || !STATUSES.includes(status)) return;
  const original = tasks.find((task) => task.id === editingId);
  const task = {
    id: original?.id || createId(), title: title.slice(0, 100),
    description: $('#task-description').value.trim().slice(0, 600),
    category, priority, status, dueDate: $('#task-due').value,
    createdAt: original?.createdAt || Date.now()
  };
  if (original) Object.assign(original, task);
  else tasks.push(task);
  saveTasks();
  render();
  closeDialog();
  notify(original ? 'Task updated' : 'Task created');
}

function handleCardClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.task-card');
  const task = tasks.find((item) => item.id === card?.dataset.id);
  if (!task) return;
  if (button.dataset.action === 'edit') openDialog(task);
  if (button.dataset.action === 'delete' && window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks(); render(); notify('Task deleted');
  }
}

function initDragAndDrop() {
  // HTML5 Drag and Drop is a desktop enhancement; stage dropdowns also work on touch and keyboard.
  $('.board-grid').addEventListener('dragstart', (event) => {
    const card = event.target.closest('.task-card');
    if (!card) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.id);
    card.classList.add('is-dragging');
  });
  $('.board-grid').addEventListener('dragend', () => {
    $$('.board-column').forEach((col) => col.classList.remove('drag-over'));
    $$('.task-card').forEach((card) => card.classList.remove('is-dragging'));
  });
  $$('.board-column').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      if (!event.dataTransfer.types.includes('text/plain')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove('drag-over');
    });
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      column.classList.remove('drag-over');
      updateTaskStatus(event.dataTransfer.getData('text/plain'), column.dataset.status);
    });
  });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) { console.warn(error); }
}

function exportTasks() {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flowstate-tasks-${localDateString()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Tasks exported');
}

function init() {
  $('#today-label').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  try { setTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'); }
  catch { setTheme('light'); }
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#hero-add').addEventListener('click', () => openDialog());
  $('#board-add').addEventListener('click', () => openDialog());
  $$('[data-add-status]').forEach((button) => button.addEventListener('click', () => openDialog(null, button.dataset.addStatus)));
  $('#close-dialog').addEventListener('click', closeDialog);
  $('#cancel-dialog').addEventListener('click', closeDialog);
  elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) closeDialog(); });
  elements.form.addEventListener('submit', handleSubmit);
  $('#task-title').addEventListener('input', (event) => event.target.setCustomValidity(''));
  [elements.search, elements.category, elements.priority, elements.sort].forEach((input) => input.addEventListener('input', render));
  elements.resetFilters.addEventListener('click', () => {
    elements.search.value = ''; elements.category.value = 'all'; elements.priority.value = 'all'; render();
  });
  $('.board-grid').addEventListener('click', handleCardClick);
  $('.board-grid').addEventListener('change', (event) => {
    if (event.target.matches('[data-action="status"]')) updateTaskStatus(event.target.closest('.task-card')?.dataset.id, event.target.value);
  });
  $('#export-tasks').addEventListener('click', exportTasks);
  $('#reset-board').addEventListener('click', () => {
    if (window.confirm('Delete every task on this board? This cannot be undone.')) {
      tasks = []; saveTasks(); render(); notify('Board cleared');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !elements.dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault(); elements.search.focus();
    }
  });
  initDragAndDrop();
  saveTasks(); // Persist the first-visit example tasks so users can edit or remove them.
  render();
}

init();
