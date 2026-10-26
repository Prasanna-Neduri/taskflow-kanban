/**
 * TaskFlow – Modern Kanban Board Frontend Application
 * Vanilla JavaScript communicating with Express REST API & MongoDB
 */

(function () {
  'use strict';

  // ==========================================================================
  // Application State
  // ==========================================================================
  const state = {
    tasks: [],
    filters: {
      search: '',
      priority: 'all',
      status: 'all',
      preset: 'all' // 'all', 'high-priority', 'overdue'
    },
    isDbConnected: false,
    draggedTaskId: null,
    editingTaskId: null,
    deletingTaskId: null
  };

  // ==========================================================================
  // DOM Elements Cache
  // ==========================================================================
  const DOM = {
    // Topbar & Filters
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    priorityFilter: document.getElementById('priorityFilter'),
    statusFilter: document.getElementById('statusFilter'),
    openCreateModalBtn: document.getElementById('openCreateModalBtn'),
    quickAddBtnMobile: document.getElementById('quickAddBtnMobile'),
    sidebarAddTaskBtn: document.getElementById('sidebarAddTaskBtn'),
    loadSampleDataBtn: document.getElementById('loadSampleDataBtn'),

    // Filter pill bar
    filterPillContainer: document.getElementById('filterPillContainer'),
    activeFilterPills: document.getElementById('activeFilterPills'),
    resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),

    // Metrics
    metricTotal: document.getElementById('metricTotal'),
    metricTodo: document.getElementById('metricTodo'),
    metricInProgress: document.getElementById('metricInProgress'),
    metricDone: document.getElementById('metricDone'),
    metricOverdue: document.getElementById('metricOverdue'),
    metricOverdueCard: document.getElementById('metricOverdueCard'),
    metricOverdueSubtext: document.getElementById('metricOverdueSubtext'),
    metricProgressBar: document.getElementById('metricProgressBar'),
    metricProgressPercent: document.getElementById('metricProgressPercent'),
    navTotalBadge: document.getElementById('navTotalBadge'),
    navOverdueBadge: document.getElementById('navOverdueBadge'),

    // Kanban Dropzones & Count Badges
    dropzoneTodo: document.getElementById('tasks-todo'),
    dropzoneInProgress: document.getElementById('tasks-in-progress'),
    dropzoneDone: document.getElementById('tasks-done'),
    colCountTodo: document.getElementById('colCountTodo'),
    colCountInProgress: document.getElementById('colCountInProgress'),
    colCountDone: document.getElementById('colCountDone'),

    // Database Status
    dbStatusBadge: document.getElementById('dbStatusBadge'),
    dbStatusText: document.getElementById('dbStatusText'),
    dbAlertBanner: document.getElementById('dbAlertBanner'),
    dbAlertMessage: document.getElementById('dbAlertMessage'),

    // Modals
    taskModal: document.getElementById('taskModal'),
    modalTitle: document.getElementById('modalTitle'),
    taskForm: document.getElementById('taskForm'),
    taskIdInput: document.getElementById('taskIdInput'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    taskStatusInput: document.getElementById('taskStatusInput'),
    taskPriorityInput: document.getElementById('taskPriorityInput'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    titleFeedback: document.getElementById('titleFeedback'),
    descCharCount: document.getElementById('descCharCount'),
    submitTaskBtn: document.getElementById('submitTaskBtn'),
    submitBtnText: document.getElementById('submitBtnText'),
    submitBtnSpinner: document.getElementById('submitBtnSpinner'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    deleteTaskTitle: document.getElementById('deleteTaskTitle'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    deleteBtnSpinner: document.getElementById('deleteBtnSpinner'),

    // Mobile Navigation
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================================================
  // Date & Format Helpers
  // ==========================================================================
  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays === -1) return 'Due Yesterday';

    // Format as "MMM DD, YYYY"
    return taskDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const escapeHtml = (unsafeStr) => {
    if (!unsafeStr) return '';
    return unsafeStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================
  const showToast = (message, type = 'info', duration = 3500) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        ${iconSvg}
        <span class="toast-message">${escapeHtml(message)}</span>
      </div>
      <button class="toast-close" aria-label="Close notification">✕</button>
    `;

    DOM.toastContainer.appendChild(toast);

    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
  };

  // ==========================================================================
  // API Calls (REST Integration)
  // ==========================================================================
  const API = {
    // Check Health & DB connectivity
    async checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();

        state.isDbConnected = data.database && data.database.connected;

        if (state.isDbConnected) {
          DOM.dbStatusBadge.className = 'db-status-pill connected';
          DOM.dbStatusText.textContent = `MongoDB: Connected (${data.database.name || 'Atlas'})`;
          DOM.dbAlertBanner.classList.add('hidden');
        } else {
          DOM.dbStatusBadge.className = 'db-status-pill disconnected';
          DOM.dbStatusText.textContent = 'MongoDB: Disconnected';
          DOM.dbAlertBanner.classList.remove('hidden');
          DOM.dbAlertMessage.textContent = data.message || 'Please configure MONGODB_URI in backend/.env to connect to MongoDB Atlas.';
        }
        return data;
      } catch (err) {
        state.isDbConnected = false;
        DOM.dbStatusBadge.className = 'db-status-pill disconnected';
        DOM.dbStatusText.textContent = 'Backend Offline';
        DOM.dbAlertBanner.classList.remove('hidden');
        DOM.dbAlertMessage.textContent = 'Cannot reach backend server. Make sure "npm start" is running on port 3000.';
        return null;
      }
    },

    // Get all tasks
    async getTasks() {
      try {
        const res = await fetch('/api/tasks');
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || 'Failed to fetch tasks');
        }

        state.tasks = json.data || [];
        renderAll();
      } catch (err) {
        console.error('Fetch tasks error:', err);
        showToast(err.message, 'error', 5000);
        renderEmptySkeletonState();
      }
    },

    // Create a new task
    async createTask(taskData) {
      try {
        setSubmitLoading(true);
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Failed to create task');
        }

        state.tasks.unshift(json.data);
        renderAll();
        closeTaskModal();
        showToast('Task created successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSubmitLoading(false);
      }
    },

    // Update an existing task
    async updateTask(id, taskData) {
      try {
        setSubmitLoading(true);
        const res = await fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Failed to update task');
        }

        const index = state.tasks.findIndex((t) => (t._id || t.id) === id);
        if (index !== -1) {
          state.tasks[index] = json.data;
        }

        renderAll();
        closeTaskModal();
        showToast('Task updated successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setSubmitLoading(false);
      }
    },

    // Patch task status (Drag-and-drop & Quick move)
    async updateTaskStatus(id, newStatus) {
      const taskIndex = state.tasks.findIndex((t) => (t._id || t.id) === id);
      if (taskIndex === -1) return;

      const previousStatus = state.tasks[taskIndex].status;
      if (previousStatus === newStatus) return;

      // Optimistic update
      state.tasks[taskIndex].status = newStatus;
      renderAll();

      try {
        const res = await fetch(`/api/tasks/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Failed to update task status');
        }

        // Sync with server returned data
        state.tasks[taskIndex] = json.data;
        renderAll();
        showToast(`Moved to "${formatStatusName(newStatus)}"`, 'info', 2000);
      } catch (err) {
        // Rollback optimistic update
        state.tasks[taskIndex].status = previousStatus;
        renderAll();
        showToast(`Error updating status: ${err.message}`, 'error');
      }
    },

    // Delete a task
    async deleteTask(id) {
      try {
        setDeleteLoading(true);
        const res = await fetch(`/api/tasks/${id}`, {
          method: 'DELETE'
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Failed to delete task');
        }

        state.tasks = state.tasks.filter((t) => (t._id || t.id) !== id);
        renderAll();
        closeDeleteModal();
        showToast('Task permanently deleted', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setDeleteLoading(false);
      }
    },

    // Seed sample tasks
    async seedTasks() {
      try {
        const hasExisting = state.tasks.length > 0;
        let shouldClear = false;

        if (hasExisting) {
          shouldClear = confirm('Replace existing tasks with realistic sample tasks? Click OK to replace, or Cancel to abort.');
          if (!shouldClear) return;
        }

        showToast('Seeding realistic sample tasks into MongoDB...', 'info', 2500);

        const res = await fetch(`/api/tasks/seed?clear=${shouldClear}`, {
          method: 'POST'
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Failed to seed sample data');
        }

        await API.getTasks();
        showToast(`Loaded ${json.count || 6} sample tasks successfully!`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const formatStatusName = (status) => {
    if (status === 'in-progress') return 'In Progress';
    if (status === 'done') return 'Done';
    return 'To Do';
  };

  // ==========================================================================
  // Filtering & Search Logic
  // ==========================================================================
  const getFilteredTasks = () => {
    return state.tasks.filter((task) => {
      // 1. Search filter (title or description)
      if (state.filters.search) {
        const query = state.filters.search.toLowerCase();
        const matchesTitle = task.title && task.title.toLowerCase().includes(query);
        const matchesDesc = task.description && task.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Priority filter
      if (state.filters.priority !== 'all') {
        if (task.priority !== state.filters.priority) return false;
      }

      // 3. Status filter
      if (state.filters.status !== 'all') {
        if (task.status !== state.filters.status) return false;
      }

      // 4. Quick preset filters
      if (state.filters.preset === 'high-priority') {
        if (task.priority !== 'high') return false;
      } else if (state.filters.preset === 'overdue') {
        if (!isOverdue(task.dueDate, task.status)) return false;
      }

      return true;
    });
  };

  // ==========================================================================
  // Renderers: Board, Cards, Metrics, Pills
  // ==========================================================================
  const renderAll = () => {
    renderMetrics();
    renderBoard();
    renderFilterPills();
  };

  // Render Dashboard Overview Metrics
  const renderMetrics = () => {
    const total = state.tasks.length;
    const todoCount = state.tasks.filter((t) => t.status === 'todo').length;
    const inProgressCount = state.tasks.filter((t) => t.status === 'in-progress').length;
    const doneCount = state.tasks.filter((t) => t.status === 'done').length;
    const overdueCount = state.tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

    DOM.metricTotal.textContent = total;
    DOM.metricTodo.textContent = todoCount;
    DOM.metricInProgress.textContent = inProgressCount;
    DOM.metricDone.textContent = doneCount;
    DOM.metricOverdue.textContent = overdueCount;

    // Badges in sidebar
    DOM.navTotalBadge.textContent = total;
    DOM.navOverdueBadge.textContent = overdueCount;

    // Progress bar
    const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    DOM.metricProgressBar.style.width = `${percent}%`;
    DOM.metricProgressPercent.textContent = `${percent}%`;

    // Overdue card alert highlight
    if (overdueCount > 0) {
      DOM.metricOverdueCard.classList.add('has-overdue');
      DOM.metricOverdueSubtext.textContent = `${overdueCount} task${overdueCount > 1 ? 's' : ''} past due date!`;
    } else {
      DOM.metricOverdueCard.classList.remove('has-overdue');
      DOM.metricOverdueSubtext.textContent = 'All tasks on schedule';
    }
  };

  // Render Active Filter Pills
  const renderFilterPills = () => {
    const hasSearch = Boolean(state.filters.search);
    const hasPriority = state.filters.priority !== 'all';
    const hasStatus = state.filters.status !== 'all';
    const hasPreset = state.filters.preset !== 'all';

    const isFiltered = hasSearch || hasPriority || hasStatus || hasPreset;

    if (!isFiltered) {
      DOM.filterPillContainer.classList.add('hidden');
      DOM.activeFilterPills.innerHTML = '';
      return;
    }

    DOM.filterPillContainer.classList.remove('hidden');
    let pillsHtml = '';

    if (hasSearch) {
      pillsHtml += `
        <span class="filter-pill">
          Search: "${escapeHtml(state.filters.search)}"
          <button data-remove-filter="search" aria-label="Remove search filter">✕</button>
        </span>
      `;
    }

    if (hasPriority) {
      pillsHtml += `
        <span class="filter-pill">
          Priority: ${state.filters.priority.toUpperCase()}
          <button data-remove-filter="priority" aria-label="Remove priority filter">✕</button>
        </span>
      `;
    }

    if (hasStatus) {
      pillsHtml += `
        <span class="filter-pill">
          Status: ${formatStatusName(state.filters.status)}
          <button data-remove-filter="status" aria-label="Remove status filter">✕</button>
        </span>
      `;
    }

    if (hasPreset) {
      const presetLabel = state.filters.preset === 'high-priority' ? 'High Priority Only' : 'Overdue Only';
      pillsHtml += `
        <span class="filter-pill">
          Preset: ${presetLabel}
          <button data-remove-filter="preset" aria-label="Remove preset filter">✕</button>
        </span>
      `;
    }

    DOM.activeFilterPills.innerHTML = pillsHtml;

    // Attach pill clear handlers
    DOM.activeFilterPills.querySelectorAll('button[data-remove-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-remove-filter');
        if (type === 'search') {
          state.filters.search = '';
          DOM.searchInput.value = '';
          DOM.clearSearchBtn.classList.add('hidden');
        } else if (type === 'priority') {
          state.filters.priority = 'all';
          DOM.priorityFilter.value = 'all';
        } else if (type === 'status') {
          state.filters.status = 'all';
          DOM.statusFilter.value = 'all';
        } else if (type === 'preset') {
          state.filters.preset = 'all';
          document.querySelectorAll('.nav-link-btn').forEach((b) => b.classList.remove('active'));
        }
        renderAll();
      });
    });
  };

  // Render Kanban Board Columns
  const renderBoard = () => {
    const filteredTasks = getFilteredTasks();

    const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
    const inProgressTasks = filteredTasks.filter((t) => t.status === 'in-progress');
    const doneTasks = filteredTasks.filter((t) => t.status === 'done');

    // Update column count badges
    DOM.colCountTodo.textContent = todoTasks.length;
    DOM.colCountInProgress.textContent = inProgressTasks.length;
    DOM.colCountDone.textContent = doneTasks.length;

    // Render columns
    renderColumn(DOM.dropzoneTodo, todoTasks, 'todo', 'No tasks to do. Add one to get started!');
    renderColumn(DOM.dropzoneInProgress, inProgressTasks, 'in-progress', 'No tasks in progress. Drag a task here.');
    renderColumn(DOM.dropzoneDone, doneTasks, 'done', 'No completed tasks yet. Finish a task to see it here.');
  };

  const renderColumn = (container, tasks, statusKey, emptyMessage) => {
    container.innerHTML = '';

    if (tasks.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-col-message';
      emptyDiv.innerHTML = `
        <div class="empty-col-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <path d="M9 12h6"></path>
          </svg>
        </div>
        <div class="empty-col-title">Column Empty</div>
        <div class="empty-col-sub">${emptyMessage}</div>
      `;
      container.appendChild(emptyDiv);
      return;
    }

    tasks.forEach((task) => {
      const card = createTaskCardElement(task);
      container.appendChild(card);
    });
  };

  // Create a single Task Card DOM Element
  const createTaskCardElement = (task) => {
    const id = task._id || task.id;
    const taskOverdue = isOverdue(task.dueDate, task.status);
    const formattedDate = formatDueDate(task.dueDate);

    const card = document.createElement('article');
    card.className = 'task-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', id);

    const priorityClass = `priority-${task.priority || 'medium'}`;

    card.innerHTML = `
      <div class="card-top">
        <div class="card-badges">
          <span class="priority-pill ${priorityClass}">${escapeHtml(task.priority || 'medium')}</span>
          ${
            taskOverdue
              ? `<span class="overdue-pill" title="Past due date!">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Overdue
                </span>`
              : ''
          }
        </div>
        <div class="card-actions">
          <button class="card-action-btn btn-edit" data-action="edit" data-id="${id}" title="Edit Task" aria-label="Edit task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="card-action-btn btn-delete" data-action="delete" data-id="${id}" title="Delete Task" aria-label="Delete task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      <h3 class="card-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ''}

      <div class="card-footer">
        <div class="card-due-date ${taskOverdue ? 'is-overdue' : ''}">
          ${
            formattedDate
              ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                 <span>${formattedDate}</span>`
              : '<span style="color:var(--text-subtle);">No due date</span>'
          }
        </div>

        <!-- Accessible Quick-Move Select (helps mobile & touch users) -->
        <select class="card-move-select" data-action="quick-move" data-id="${id}" aria-label="Move task to column">
          <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
    `;

    // Attach Drag and Drop Event Listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Attach Action Buttons
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const moveSelect = card.querySelector('[data-action="quick-move"]');

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(id);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(id);
    });

    moveSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const targetStatus = e.target.value;
      API.updateTaskStatus(id, targetStatus);
    });

    return card;
  };

  const renderEmptySkeletonState = () => {
    DOM.dropzoneTodo.innerHTML = '<div class="task-card-skeleton"></div>';
    DOM.dropzoneInProgress.innerHTML = '<div class="task-card-skeleton"></div>';
    DOM.dropzoneDone.innerHTML = '<div class="task-card-skeleton"></div>';
  };

  // ==========================================================================
  // HTML5 Drag and Drop Handlers
  // ==========================================================================
  const handleDragStart = (e) => {
    state.draggedTaskId = e.currentTarget.getAttribute('data-id');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', state.draggedTaskId);

    // Delay slight opacity shift so dragged ghost remains clear
    setTimeout(() => {
      if (e.target && e.target.classList) {
        e.target.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragging');
    }
    state.draggedTaskId = null;
    clearDropzoneHighlights();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dropzone = e.currentTarget;
    if (!dropzone.classList.contains('drag-over')) {
      dropzone.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e) => {
    // Only remove if leaving dropzone itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropzone = e.currentTarget;
    dropzone.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain') || state.draggedTaskId;
    const targetStatus = dropzone.getAttribute('data-status');

    if (taskId && targetStatus) {
      API.updateTaskStatus(taskId, targetStatus);
    }
  };

  const clearDropzoneHighlights = () => {
    [DOM.dropzoneTodo, DOM.dropzoneInProgress, DOM.dropzoneDone].forEach((dz) => {
      dz.classList.remove('drag-over');
    });
  };

  // Register dropzone listeners
  const initDropzones = () => {
    [DOM.dropzoneTodo, DOM.dropzoneInProgress, DOM.dropzoneDone].forEach((dz) => {
      dz.addEventListener('dragover', handleDragOver);
      dz.addEventListener('dragleave', handleDragLeave);
      dz.addEventListener('drop', handleDrop);
    });
  };

  // ==========================================================================
  // Modal Management: Create & Edit Task
  // ==========================================================================
  const openCreateModal = (defaultStatus = 'todo') => {
    state.editingTaskId = null;
    DOM.taskForm.reset();
    DOM.taskIdInput.value = '';
    DOM.taskStatusInput.value = defaultStatus;
    DOM.taskPriorityInput.value = 'medium';
    DOM.taskTitleInput.classList.remove('is-invalid');
    DOM.titleFeedback.textContent = '';
    DOM.descCharCount.textContent = '0';

    DOM.modalTitle.textContent = 'Create New Task';
    DOM.submitBtnText.textContent = 'Create Task';
    DOM.taskModal.classList.remove('hidden');
    DOM.taskTitleInput.focus();
  };

  const openEditModal = (taskId) => {
    const task = state.tasks.find((t) => (t._id || t.id) === taskId);
    if (!task) return;

    state.editingTaskId = taskId;
    DOM.taskIdInput.value = taskId;
    DOM.taskTitleInput.value = task.title || '';
    DOM.taskDescInput.value = task.description || '';
    DOM.taskStatusInput.value = task.status || 'todo';
    DOM.taskPriorityInput.value = task.priority || 'medium';

    if (task.dueDate) {
      // Form expects YYYY-MM-DD
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) {
        DOM.taskDueDateInput.value = d.toISOString().split('T')[0];
      } else {
        DOM.taskDueDateInput.value = '';
      }
    } else {
      DOM.taskDueDateInput.value = '';
    }

    DOM.taskTitleInput.classList.remove('is-invalid');
    DOM.titleFeedback.textContent = '';
    DOM.descCharCount.textContent = (task.description || '').length;

    DOM.modalTitle.textContent = 'Edit Task';
    DOM.submitBtnText.textContent = 'Save Changes';
    DOM.taskModal.classList.remove('hidden');
    DOM.taskTitleInput.focus();
  };

  const closeTaskModal = () => {
    DOM.taskModal.classList.add('hidden');
    state.editingTaskId = null;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const title = DOM.taskTitleInput.value.trim();
    const description = DOM.taskDescInput.value.trim();
    const status = DOM.taskStatusInput.value;
    const priority = DOM.taskPriorityInput.value;
    const dueDate = DOM.taskDueDateInput.value ? new Date(DOM.taskDueDateInput.value).toISOString() : null;

    // Client-side validation
    if (!title) {
      DOM.taskTitleInput.classList.add('is-invalid');
      DOM.titleFeedback.textContent = 'Task title cannot be empty.';
      DOM.taskTitleInput.focus();
      return;
    }

    DOM.taskTitleInput.classList.remove('is-invalid');
    DOM.titleFeedback.textContent = '';

    const payload = { title, description, status, priority, dueDate };

    if (state.editingTaskId) {
      API.updateTask(state.editingTaskId, payload);
    } else {
      API.createTask(payload);
    }
  };

  const setSubmitLoading = (loading) => {
    DOM.submitTaskBtn.disabled = loading;
    if (loading) {
      DOM.submitBtnSpinner.classList.remove('hidden');
    } else {
      DOM.submitBtnSpinner.classList.add('hidden');
    }
  };

  // ==========================================================================
  // Modal Management: Delete Confirmation
  // ==========================================================================
  const openDeleteModal = (taskId) => {
    const task = state.tasks.find((t) => (t._id || t.id) === taskId);
    if (!task) return;

    state.deletingTaskId = taskId;
    DOM.deleteTaskTitle.textContent = `"${task.title}"`;
    DOM.deleteModal.classList.remove('hidden');
  };

  const closeDeleteModal = () => {
    DOM.deleteModal.classList.add('hidden');
    state.deletingTaskId = null;
  };

  const confirmDelete = () => {
    if (!state.deletingTaskId) return;
    API.deleteTask(state.deletingTaskId);
  };

  const setDeleteLoading = (loading) => {
    DOM.confirmDeleteBtn.disabled = loading;
    if (loading) {
      DOM.deleteBtnSpinner.classList.remove('hidden');
    } else {
      DOM.deleteBtnSpinner.classList.add('hidden');
    }
  };

  // ==========================================================================
  // Event Listeners Registration
  // ==========================================================================
  const setupEventListeners = () => {
    // Search input
    DOM.searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.trim();
      if (state.filters.search) {
        DOM.clearSearchBtn.classList.remove('hidden');
      } else {
        DOM.clearSearchBtn.classList.add('hidden');
      }
      renderAll();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.filters.search = '';
      DOM.clearSearchBtn.classList.add('hidden');
      renderAll();
    });

    // Priority filter
    DOM.priorityFilter.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      renderAll();
    });

    // Status filter
    DOM.statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderAll();
    });

    // Reset all filters button
    DOM.resetAllFiltersBtn.addEventListener('click', () => {
      state.filters = { search: '', priority: 'all', status: 'all', preset: 'all' };
      DOM.searchInput.value = '';
      DOM.clearSearchBtn.classList.add('hidden');
      DOM.priorityFilter.value = 'all';
      DOM.statusFilter.value = 'all';
      document.querySelectorAll('.nav-link-btn').forEach((b) => b.classList.remove('active'));
      renderAll();
    });

    // Sidebar quick presets
    document.querySelectorAll('.nav-link-btn[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        document.querySelectorAll('.nav-link-btn').forEach((b) => b.classList.remove('active'));

        if (state.filters.preset === preset) {
          state.filters.preset = 'all';
        } else {
          state.filters.preset = preset;
          btn.classList.add('active');
        }
        renderAll();
        closeMobileSidebar();
      });
    });

    // Modal triggers
    DOM.openCreateModalBtn.addEventListener('click', () => openCreateModal());
    DOM.quickAddBtnMobile.addEventListener('click', () => openCreateModal());
    DOM.sidebarAddTaskBtn.addEventListener('click', () => {
      openCreateModal();
      closeMobileSidebar();
    });

    // Column add buttons
    document.querySelectorAll('.col-add-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const status = btn.getAttribute('data-add-to') || 'todo';
        openCreateModal(status);
      });
    });

    // Form submission & character counter
    DOM.taskForm.addEventListener('submit', handleFormSubmit);
    DOM.taskDescInput.addEventListener('input', (e) => {
      DOM.descCharCount.textContent = e.target.value.length;
    });

    // Close Modals
    DOM.closeModalBtn.addEventListener('click', closeTaskModal);
    DOM.cancelModalBtn.addEventListener('click', closeTaskModal);

    DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    DOM.confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Close on overlay backdrop click
    DOM.taskModal.addEventListener('click', (e) => {
      if (e.target === DOM.taskModal) closeTaskModal();
    });
    DOM.deleteModal.addEventListener('click', (e) => {
      if (e.target === DOM.deleteModal) closeDeleteModal();
    });

    // Keyboard ESC to close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!DOM.taskModal.classList.contains('hidden')) closeTaskModal();
        if (!DOM.deleteModal.classList.contains('hidden')) closeDeleteModal();
        closeMobileSidebar();
      }
    });

    // Seed Sample Tasks
    DOM.loadSampleDataBtn.addEventListener('click', () => {
      API.seedTasks();
      closeMobileSidebar();
    });

    // Mobile Sidebar Drawer
    DOM.mobileMenuBtn.addEventListener('click', openMobileSidebar);
    DOM.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
    DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  };

  const openMobileSidebar = () => {
    DOM.sidebar.classList.add('open');
    DOM.sidebarBackdrop.classList.add('active');
  };

  const closeMobileSidebar = () => {
    DOM.sidebar.classList.remove('open');
    DOM.sidebarBackdrop.classList.remove('active');
  };

  // ==========================================================================
  // App Initialization
  // ==========================================================================
  const init = async () => {
    initDropzones();
    setupEventListeners();

    // Check backend health & DB connection
    await API.checkHealth();

    // Fetch initial tasks
    await API.getTasks();

    // Periodic health check every 15 seconds
    setInterval(API.checkHealth, 15000);
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
