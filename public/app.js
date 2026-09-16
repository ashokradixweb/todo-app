const state = {
  todos: [],
  filter: 'all',
  search: '',
  sort: 'updated',
  editingId: null,
  selected: new Set(),
};

const $ = (selector) => document.querySelector(selector);

const els = {
  list: $('#todoList'),
  empty: $('#emptyState'),
  emptyTitle: $('#emptyTitle'),
  emptyText: $('#emptyText'),
  dialog: $('#todoDialog'),
  form: $('#todoForm'),
  todoId: $('#todoId'),
  titleInput: $('#titleInput'),
  notesInput: $('#notesInput'),
  priorityInput: $('#priorityInput'),
  dueDateInput: $('#dueDateInput'),
  tagsInput: $('#tagsInput'),
  dialogTitle: $('#dialogTitle'),
  deleteDialogButton: $('#deleteDialogButton'),
  searchInput: $('#searchInput'),
  sortSelect: $('#sortSelect'),
  selectionBar: $('#selectionBar'),
  selectedCount: $('#selectedCount'),
  toast: $('#toast'),
};

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  refresh();
});

function bindEvents() {
  $('#quickAddButton').addEventListener('click', () => openDialog());
  $('#emptyAdd').addEventListener('click', () => openDialog());
  $('#closeDialog').addEventListener('click', closeDialog);
  $('#cancelDialog').addEventListener('click', closeDialog);
  $('#deleteDialogButton').addEventListener('click', deleteEditing);

  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveTask();
  });

  els.searchInput.addEventListener('input', () => {
    state.search = els.searchInput.value;
    render();
  });

  els.sortSelect.addEventListener('change', () => {
    state.sort = els.sortSelect.value;
    render();
  });

  $('#filterNav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;

    state.filter = button.dataset.filter;
    state.selected.clear();
    updateFilterButtons();
    refresh();
  });

  $('#clearCompleted').addEventListener('click', clearCompleted);
  $('#completeSelected').addEventListener('click', () => bulkComplete(true));
  $('#deleteSelected').addEventListener('click', deleteSelected);

  els.list.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit]');
    const deleteButton = event.target.closest('[data-delete]');

    if (editButton) openDialog(editButton.dataset.edit);
    if (deleteButton) await deleteTask(deleteButton.dataset.delete);
  });

  els.list.addEventListener('change', async (event) => {
    const completion = event.target.closest('[data-complete]');
    const selection = event.target.closest('[data-select]');

    if (completion) {
      await updateTask(completion.dataset.complete, {
        completed: completion.checked,
      });
    }

    if (selection) {
      if (selection.checked) state.selected.add(selection.dataset.select);
      else state.selected.delete(selection.dataset.select);
      updateSelectionBar();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (els.dialog.open) closeDialog();
      return;
    }

    const tag = document.activeElement?.tagName?.toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (event.key.toLowerCase() === 'n' && !typing) {
      event.preventDefault();
      openDialog();
    }

    if (event.key === '/' && !typing) {
      event.preventDefault();
      els.searchInput.focus();
    }
  });
}

async function refresh() {
  try {
    const todos = await api('/api/todos');
    state.todos = todos.items;
    normalizeSelection();
    render();
  } catch (error) {
    showToast(error.message || 'Unable to load tasks');
  }
}

async function saveTask() {
  const payload = {
    title: els.titleInput.value.trim(),
    notes: els.notesInput.value.trim(),
    priority: els.priorityInput.value,
    dueDate: els.dueDateInput.value || null,
    tags: els.tagsInput.value
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  };

  if (!payload.title) {
    els.titleInput.focus();
    return;
  }

  try {
    if (state.editingId) {
      await api(`/api/todos/${state.editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      showToast('Task updated');
    } else {
      await api('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Task added');
    }

    closeDialog();
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to save task');
  }
}

async function updateTask(id, payload) {
  try {
    await api(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to update task');
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;

  try {
    await api(`/api/todos/${id}`, { method: 'DELETE' });
    showToast('Task deleted');
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to delete task');
  }
}

async function deleteEditing() {
  if (!state.editingId) return;
  await deleteTask(state.editingId);
  closeDialog();
}

async function clearCompleted() {
  if (!state.todos.some((todo) => todo.completed)) {
    showToast('No completed tasks');
    return;
  }

  if (!confirm('Clear all completed tasks?')) return;

  try {
    await api('/api/todos/bulk/completed', { method: 'DELETE' });
    showToast('Completed tasks cleared');
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to clear completed tasks');
  }
}

async function bulkComplete(completed) {
  if (state.selected.size === 0) return;

  try {
    await api('/api/todos/bulk/completed', {
      method: 'POST',
      body: JSON.stringify({
        ids: [...state.selected],
        completed,
      }),
    });
    state.selected.clear();
    showToast(completed ? 'Tasks marked done' : 'Tasks reopened');
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to update selected tasks');
  }
}

async function deleteSelected() {
  if (state.selected.size === 0) return;
  if (!confirm(`Delete ${state.selected.size} selected task(s)?`)) return;

  try {
    await Promise.all(
      [...state.selected].map((id) =>
        api(`/api/todos/${id}`, { method: 'DELETE' }),
      ),
    );
    state.selected.clear();
    showToast('Selected tasks deleted');
    await refresh();
  } catch (error) {
    showToast(error.message || 'Unable to delete selected tasks');
  }
}

function openDialog(id = null) {
  state.editingId = id;
  const todo = id ? state.todos.find((item) => item.id === id) : null;

  els.dialogTitle.textContent = todo ? 'Edit task' : 'Add task';
  els.todoId.value = todo?.id ?? '';
  els.titleInput.value = todo?.title ?? '';
  els.notesInput.value = todo?.notes ?? '';
  els.priorityInput.value = todo?.priority ?? 'medium';
  els.dueDateInput.value = todo?.dueDate ?? '';
  els.tagsInput.value = todo?.tags?.join(', ') ?? '';
  els.deleteDialogButton.classList.toggle('hidden', !todo);

  els.dialog.showModal();
  requestAnimationFrame(() => els.titleInput.focus());
}

function closeDialog() {
  state.editingId = null;
  els.dialog.close();
  els.form.reset();
  els.priorityInput.value = 'medium';
  els.deleteDialogButton.classList.add('hidden');
}

function render() {
  const visible = state.todos
    .filter((todo) => matchesClientFilter(todo, state.filter))
    .filter(matchesSearch)
    .toSorted(compareTodos);

  renderStats();
  updateFilterButtons();
  updateSelectionBar();

  els.list.replaceChildren(...visible.map(renderTodoCard));

  const isEmpty = visible.length === 0;
  els.empty.classList.toggle('hidden', !isEmpty);

  if (isEmpty) {
    const hasData = state.todos.length > 0;
    els.emptyTitle.textContent = hasData ? 'No matching tasks' : 'No tasks yet';
    els.emptyText.textContent = hasData
      ? 'Try a different filter or search.'
      : 'Add something you want to remember.';
  }
}

function renderTodoCard(todo) {
  const card = document.createElement('article');
  card.className = 'todo-card panel';

  const tags = todo.tags
    .map((tag) => `<span class="badge">#${escapeHtml(tag)}</span>`)
    .join('');

  const due = todo.dueDate
    ? `<span class="badge ${isOverdue(todo) ? 'overdue' : ''}">${escapeHtml(formatDue(todo.dueDate))}</span>`
    : '';

  card.innerHTML = `
    <input class="todo-check" type="checkbox" data-complete="${todo.id}" ${todo.completed ? 'checked' : ''} aria-label="Mark task complete">
    <div class="todo-main">
      <div>
        <h3 class="todo-title ${todo.completed ? 'done' : ''}">${escapeHtml(todo.title)}</h3>
        ${todo.notes ? `<p class="todo-notes">${escapeHtml(todo.notes)}</p>` : ''}
      </div>
      <div class="todo-meta">
        <label class="badge">
          <input class="select-check" type="checkbox" data-select="${todo.id}" ${state.selected.has(todo.id) ? 'checked' : ''} aria-label="Select task">
        </label>
        <span class="badge priority-${todo.priority}">${todo.priority}</span>
        ${due}
        ${tags}
      </div>
    </div>
    <div class="todo-actions">
      <button class="icon-button" data-edit="${todo.id}" aria-label="Edit task" title="Edit">✎</button>
      <button class="icon-button" data-delete="${todo.id}" aria-label="Delete task" title="Delete">×</button>
    </div>
  `;

  return card;
}

function renderStats() {
  const total = state.todos.length;
  const active = state.todos.filter((todo) => !todo.completed).length;
  const done = state.todos.filter((todo) => todo.completed).length;
  const overdue = state.todos.filter(isOverdue).length;

  $('#statTotal').textContent = total;
  $('#statActive').textContent = active;
  $('#statDone').textContent = done;
  $('#statOverdue').textContent = overdue;

  const counts = {
    all: total,
    active,
    completed: done,
    today: state.todos.filter((todo) => todo.dueDate === todayIso()).length,
    overdue,
  };

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.querySelector('span').textContent = counts[button.dataset.filter];
  });
}

function updateFilterButtons() {
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filter === state.filter);
  });
}

function updateSelectionBar() {
  els.selectedCount.textContent = state.selected.size;
  els.selectionBar.classList.toggle('hidden', state.selected.size === 0);
}

function normalizeSelection() {
  const ids = new Set(state.todos.map((todo) => todo.id));
  state.selected = new Set([...state.selected].filter((id) => ids.has(id)));
}

function matchesClientFilter(todo, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;
  if (!todo.dueDate) return false;
  if (filter === 'today') return todo.dueDate === todayIso();
  return !todo.completed && todo.dueDate < todayIso();
}

function matchesSearch(todo) {
  const query = state.search.trim().toLowerCase();
  if (!query) return true;

  return [
    todo.title,
    todo.notes,
    todo.priority,
    todo.dueDate ?? '',
    ...todo.tags,
  ].join(' ').toLowerCase().includes(query);
}

function compareTodos(a, b) {
  if (state.sort === 'title') return a.title.localeCompare(b.title);
  if (state.sort === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  }
  if (state.sort === 'due') {
    return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
  }
  if (state.sort === 'created') return b.createdAt.localeCompare(a.createdAt);
  return b.updatedAt.localeCompare(a.updatedAt);
}

function isOverdue(todo) {
  return !todo.completed && Boolean(todo.dueDate) && todo.dueDate < todayIso();
}

function formatDue(value) {
  if (value === todayIso()) return 'Today';
  const date = new Date(`${value}T00:00:00`);
  return `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}`;
}

function todayIso() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
