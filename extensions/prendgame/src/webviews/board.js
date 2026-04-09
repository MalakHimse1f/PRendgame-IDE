/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
module.exports = function boardHTML(tasksData, teamData, docsData, sprintsData) {
	const members = teamData.members;
	const tasks = tasksData.tasks;
	const columns = tasksData.columns;

	function getMember(id) {
		return members.find(m => m.id === id) || { name: 'Unassigned', avatar: '?', color: '#666' };
	}

	function priorityBadge(p) {
		const map = {
			critical: '<span class="priority critical">Critical</span>',
			high: '<span class="priority high">High</span>',
			medium: '<span class="priority medium">Med</span>',
			low: '<span class="priority low">Low</span>'
		};
		return map[p] || '';
	}

	function taskCard(t) {
		const m = getMember(t.assignee);
		const labels = t.labels.map(l => `<span class="label">${l}</span>`).join('');
		return `
		<div class="task-card" draggable="true" data-task-id="${t.id}" onclick="openTask('${t.id}')">
			<div class="card-header">
				<span class="task-id">${t.id}</span>
				${priorityBadge(t.priority)}
			</div>
			<div class="card-title">${t.title}</div>
			<div class="card-footer">
				<div class="labels">${labels}</div>
				<div class="assignee-avatar" style="background:${m.color}" title="${m.name}">${m.avatar}</div>
			</div>
		</div>`;
	}

	function kanbanColumn(col) {
		const colTasks = tasks.filter(t => t.status === col.id);
		return `
		<div class="column" data-status="${col.id}">
			<div class="column-header">
				<span class="column-name">${col.name}</span>
				<span class="column-count">${colTasks.length}</span>
			</div>
			<div class="column-body" data-status="${col.id}">
				${colTasks.map(taskCard).join('')}
			</div>
		</div>`;
	}

	function listRow(t) {
		const m = getMember(t.assignee);
		const statusLabels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
		return `
		<tr class="list-row" onclick="openTask('${t.id}')">
			<td class="col-id">${t.id}</td>
			<td class="col-title">${t.title}</td>
			<td class="col-status"><span class="status-pill ${t.status}">${statusLabels[t.status]}</span></td>
			<td class="col-assignee"><span class="assignee-sm" style="background:${m.color}">${m.avatar}</span> ${m.name}</td>
			<td class="col-priority">${priorityBadge(t.priority)}</td>
			<td class="col-sprint">${t.sprint || '--'}</td>
		</tr>`;
	}

	function timelineRow(member) {
		const memberTasks = tasks.filter(t => t.assignee === member.id && t.status !== 'done');
		const weeks = ['Mar 25', 'Apr 1', 'Apr 7', 'Apr 14', 'Apr 21', 'Apr 28'];
		const sprintMap = { 'sprint-1': [0, 1], 'sprint-2': [2, 3], 'sprint-3': [4, 5] };

		const cells = weeks.map((w, i) => {
			const weekTasks = memberTasks.filter(t => {
				const range = sprintMap[t.sprint];
				return range && i >= range[0] && i <= range[1];
			});
			if (weekTasks.length === 0) { return `<td class="timeline-cell empty"></td>`; }
			return `<td class="timeline-cell"><div class="timeline-tasks">${weekTasks.map(t =>
				`<div class="timeline-bar ${t.priority}" title="${t.id}: ${t.title}" onclick="openTask('${t.id}')">${t.id}</div>`
			).join('')}</div></td>`;
		}).join('');

		return `
		<tr>
			<td class="timeline-member"><span class="assignee-sm" style="background:${member.color}">${member.avatar}</span> ${member.name}</td>
			${cells}
		</tr>`;
	}

	const onlineMembers = members.filter(m => m.status !== 'offline');
	const presenceAvatars = onlineMembers.map(m => {
		const dot = m.status === 'online' ? 'online' : 'away';
		return `<div class="presence-avatar" title="${m.name} (${m.status})">
			<span class="avatar-circle" style="background:${m.color}">${m.avatar}</span>
			<span class="status-dot ${dot}"></span>
		</div>`;
	}).join('');

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
:root {
	--bg: var(--vscode-editor-background, #1e1e1e);
	--fg: var(--vscode-editor-foreground, #cccccc);
	--border: var(--vscode-panel-border, #333);
	--card-bg: var(--vscode-editorWidget-background, #252526);
	--hover: var(--vscode-list-hoverBackground, #2a2d2e);
	--accent: var(--vscode-focusBorder, #007acc);
	--badge: var(--vscode-badge-background, #4d4d4d);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--vscode-font-family, system-ui); color: var(--fg); background: var(--bg); overflow-x: auto; }

/* -- Header -- */
.board-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.board-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.board-title .project-key { color: var(--accent); font-size: 12px; background: var(--badge); padding: 2px 6px; border-radius: 3px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.presence-row { display: flex; gap: -4px; }
.presence-avatar { position: relative; display: inline-block; }
.avatar-circle { display: inline-flex; width: 28px; height: 28px; border-radius: 50%; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #fff; }
.status-dot { position: absolute; bottom: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--bg); }
.status-dot.online { background: #22c55e; }
.status-dot.away { background: #eab308; }

/* -- Tabs -- */
.view-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 16px; }
.view-tab { padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent; font-size: 13px; color: var(--fg); opacity: 0.6; }
.view-tab.active { opacity: 1; border-bottom-color: var(--accent); }
.view-tab:hover { opacity: 0.9; }

/* -- Filter Bar -- */
.filter-bar { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); align-items: center; }
.filter-bar select, .filter-bar input {
	background: var(--card-bg); border: 1px solid var(--border); color: var(--fg);
	padding: 4px 8px; border-radius: 4px; font-size: 12px;
}
.filter-label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; }

/* -- Kanban -- */
.kanban-container { display: flex; gap: 12px; padding: 12px 16px; overflow-x: auto; min-height: calc(100vh - 140px); }
.column { min-width: 260px; max-width: 300px; flex: 1; display: flex; flex-direction: column; }
.column-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
.column-count { background: var(--badge); padding: 1px 6px; border-radius: 8px; font-size: 11px; }
.column-body { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 4px; border-radius: 6px; min-height: 100px; transition: background 0.15s; }
.column-body.drag-over { background: rgba(0,122,204,0.08); outline: 2px dashed var(--accent); outline-offset: -2px; }
.add-column-btn { min-width: 48px; display: flex; align-items: flex-start; justify-content: center; padding-top: 32px; opacity: 0.3; cursor: pointer; font-size: 20px; }
.add-column-btn:hover { opacity: 0.6; }

/* -- Task Card -- */
.task-card {
	background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
	padding: 10px; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
}
.task-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.task-card.dragging { opacity: 0.5; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.task-id { font-size: 11px; opacity: 0.5; font-family: monospace; }
.card-title { font-size: 13px; line-height: 1.4; margin-bottom: 8px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.labels { display: flex; gap: 4px; flex-wrap: wrap; }
.label { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: var(--badge); opacity: 0.7; }
.assignee-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; color: #fff; flex-shrink: 0; }

/* -- Priority badges -- */
.priority { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; }
.priority.critical { background: #dc2626; color: #fff; }
.priority.high { background: #ea580c; color: #fff; }
.priority.medium { background: #ca8a04; color: #fff; }
.priority.low { background: #4b5563; color: #d1d5db; }

/* -- List View -- */
.list-container { padding: 0 16px; }
.list-table { width: 100%; border-collapse: collapse; }
.list-table th { text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; border-bottom: 1px solid var(--border); cursor: pointer; }
.list-table th:hover { opacity: 0.8; }
.list-row { cursor: pointer; }
.list-row:hover { background: var(--hover); }
.list-row td { padding: 8px; border-bottom: 1px solid var(--border); font-size: 13px; }
.col-id { font-family: monospace; font-size: 12px; opacity: 0.6; width: 70px; }
.col-status { width: 110px; }
.col-priority { width: 70px; }
.col-sprint { width: 80px; font-size: 12px; opacity: 0.6; }
.status-pill { font-size: 11px; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.status-pill.done { background: #166534; color: #86efac; }
.status-pill.in_progress { background: #1e40af; color: #93c5fd; }
.status-pill.in_review { background: #6b21a8; color: #d8b4fe; }
.status-pill.todo { background: #374151; color: #d1d5db; }
.status-pill.backlog { background: #1f2937; color: #9ca3af; }
.assignee-sm { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; color: #fff; vertical-align: middle; margin-right: 4px; }

/* -- Timeline View -- */
.timeline-container { padding: 0 16px; overflow-x: auto; }
.timeline-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.timeline-table th { padding: 8px; font-size: 11px; text-transform: uppercase; opacity: 0.5; border-bottom: 1px solid var(--border); text-align: center; }
.timeline-table th:first-child { text-align: left; }
.timeline-member { white-space: nowrap; padding: 8px; border-bottom: 1px solid var(--border); }
.timeline-cell { padding: 4px; border-bottom: 1px solid var(--border); border-left: 1px solid var(--border); vertical-align: top; min-width: 100px; }
.timeline-cell.empty { }
.timeline-tasks { display: flex; flex-direction: column; gap: 3px; }
.timeline-bar { font-size: 10px; font-family: monospace; padding: 3px 6px; border-radius: 3px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.timeline-bar.critical { background: #dc2626; color: #fff; }
.timeline-bar.high { background: #ea580c; color: #fff; }
.timeline-bar.medium { background: #ca8a04; color: #fff; }
.timeline-bar.low { background: #4b5563; color: #d1d5db; }

.view-content { display: none; }
.view-content.active { display: block; }

/* Sprint banner */
.sprint-banner { display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: rgba(0,122,204,0.08); font-size: 12px; border-bottom: 1px solid var(--border); }
.sprint-banner .sprint-name { font-weight: 600; }
.sprint-banner .sprint-dates { opacity: 0.5; }
</style>
</head>
<body>
	<div class="board-header">
		<div class="board-title">
			<span class="project-key">${tasksData.projectKey}</span>
			PRendgame Board
		</div>
		<div class="header-right">
			<div class="presence-row">${presenceAvatars}</div>
		</div>
	</div>

	<div class="sprint-banner">
		<span class="sprint-name">${sprintsData.sprints.find(s => s.status === 'active')?.name || 'No active sprint'}</span>
		<span class="sprint-dates">${sprintsData.sprints.find(s => s.status === 'active')?.startDate || ''} -> ${sprintsData.sprints.find(s => s.status === 'active')?.endDate || ''}</span>
	</div>

	<div class="view-tabs">
		<div class="view-tab active" data-view="kanban">Kanban</div>
		<div class="view-tab" data-view="list">List</div>
		<div class="view-tab" data-view="timeline">Timeline</div>
	</div>

	<div class="filter-bar">
		<span class="filter-label">Filter:</span>
		<select id="filter-assignee">
			<option value="">All Assignees</option>
			${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
		</select>
		<select id="filter-priority">
			<option value="">All Priorities</option>
			<option value="critical">Critical</option>
			<option value="high">High</option>
			<option value="medium">Medium</option>
			<option value="low">Low</option>
		</select>
		<select id="filter-sprint">
			<option value="">All Sprints</option>
			${sprintsData.sprints.map(s => `<option value="${s.id}">${s.name.split('--')[0].trim()}</option>`).join('')}
		</select>
	</div>

	<!-- Kanban View -->
	<div id="view-kanban" class="view-content active">
		<div class="kanban-container">
			${columns.map(kanbanColumn).join('')}
			<div class="add-column-btn" title="Add Column">+</div>
		</div>
	</div>

	<!-- List View -->
	<div id="view-list" class="view-content">
		<div class="list-container">
			<table class="list-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Title</th>
						<th>Status</th>
						<th>Assignee</th>
						<th>Priority</th>
						<th>Sprint</th>
					</tr>
				</thead>
				<tbody>
					${tasks.map(listRow).join('')}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Timeline View -->
	<div id="view-timeline" class="view-content">
		<div class="timeline-container">
			<table class="timeline-table">
				<thead>
					<tr>
						<th>Team Member</th>
						<th>Mar 25</th>
						<th>Apr 1</th>
						<th>Apr 7</th>
						<th>Apr 14</th>
						<th>Apr 21</th>
						<th>Apr 28</th>
					</tr>
				</thead>
				<tbody>
					${members.map(timelineRow).join('')}
				</tbody>
			</table>
		</div>
	</div>

<script>
const vscode = acquireVsCodeApi();

// -- View switching --
document.querySelectorAll('.view-tab').forEach(tab => {
	tab.addEventListener('click', () => {
		document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
		document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
		tab.classList.add('active');
		document.getElementById('view-' + tab.dataset.view).classList.add('active');
	});
});

// -- Drag and drop --
let draggedTaskId = null;

document.querySelectorAll('.task-card').forEach(card => {
	card.addEventListener('dragstart', e => {
		draggedTaskId = card.dataset.taskId;
		card.classList.add('dragging');
		e.dataTransfer.effectAllowed = 'move';
	});
	card.addEventListener('dragend', () => {
		card.classList.remove('dragging');
		document.querySelectorAll('.column-body').forEach(col => col.classList.remove('drag-over'));
	});
});

document.querySelectorAll('.column-body').forEach(col => {
	col.addEventListener('dragover', e => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		col.classList.add('drag-over');
	});
	col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
	col.addEventListener('drop', e => {
		e.preventDefault();
		col.classList.remove('drag-over');
		if (draggedTaskId) {
			vscode.postMessage({ command: 'moveTask', taskId: draggedTaskId, newStatus: col.dataset.status });
			draggedTaskId = null;
		}
	});
});

// -- Card click --
function openTask(taskId) {
	vscode.postMessage({ command: 'openTask', taskId });
}

// -- Client-side filtering --
function applyFilters() {
	const assignee = document.getElementById('filter-assignee').value;
	const priority = document.getElementById('filter-priority').value;
	const sprint = document.getElementById('filter-sprint').value;

	document.querySelectorAll('.task-card').forEach(card => {
		const id = card.dataset.taskId;
		// Simple filter -- in production this would be data-driven
		card.style.display = '';
	});
}
document.querySelectorAll('.filter-bar select').forEach(s => s.addEventListener('change', applyFilters));
</script>
</body>
</html>`;
};
