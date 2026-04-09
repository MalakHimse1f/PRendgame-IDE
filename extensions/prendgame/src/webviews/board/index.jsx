/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import Sortable from 'sortablejs';
import { postMessage, onMessage, getState, setState } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './board.css';

// -- Components ---------------------------------------------------------------

function Avatar({ member, size = 'sm' }) {
	return (
		<span class={`pg-avatar pg-avatar--${size}`} style={{ background: member.color }} title={member.name}>
			{member.avatar}
		</span>
	);
}

function PresenceRow({ members }) {
	const online = members.filter(m => m.status !== 'offline');
	return (
		<div class="board-presence">
			{online.map(m => (
				<div class="presence-item" key={m.id} title={`${m.name} (${m.status})`}>
					<Avatar member={m} size="md" />
					<span class={`presence-dot presence-dot--${m.status}`} />
				</div>
			))}
		</div>
	);
}

function TaskCard({ task, members, onOpen }) {
	const member = members.find(m => m.id === task.assignee) || { name: '?', avatar: '?', color: '#666' };
	return (
		<div class="task-card" data-task-id={task.id} onClick={() => onOpen(task.id)}>
			<div class="task-card__header">
				<span class="task-card__id">{task.id}</span>
				<span class={`pg-badge pg-badge--${task.priority}`}>{task.priority}</span>
			</div>
			<div class="task-card__title">{task.title}</div>
			<div class="task-card__footer">
				<div class="task-card__labels">
					{task.labels.map(l => <span class="pg-label" key={l}>{l}</span>)}
				</div>
				<Avatar member={member} size="sm" />
			</div>
		</div>
	);
}

function Column({ column, tasks, members, onOpen, onSortableInit }) {
	const bodyRef = useRef(null);

	useEffect(() => {
		if (bodyRef.current) {
			const sortable = Sortable.create(bodyRef.current, {
				group: 'board',
				animation: 180,
				ghostClass: 'task-card--ghost',
				chosenClass: 'task-card--chosen',
				dragClass: 'task-card--drag',
				easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
				onEnd: (evt) => {
					const taskId = evt.item.dataset.taskId;
					const newStatus = evt.to.dataset.status;
					if (taskId && newStatus) {
						postMessage('moveTask', { taskId, newStatus });
					}
				},
			});
			if (onSortableInit) {
				onSortableInit(column.id, sortable);
			}
			return () => sortable.destroy();
		}
	}, [column.id]);

	return (
		<div class="board-column">
			<div class="board-column__header">
				<span class="board-column__name">{column.name}</span>
				<span class="board-column__count">{tasks.length}</span>
			</div>
			<div class="board-column__body" ref={bodyRef} data-status={column.id}>
				{tasks.map(t => (
					<TaskCard key={t.id} task={t} members={members} onOpen={onOpen} />
				))}
			</div>
		</div>
	);
}

function FilterBar({ members, sprints, filters, onFilterChange }) {
	return (
		<div class="board-filters">
			<span class="board-filters__label">Filter:</span>
			<select class="pg-select" value={filters.assignee} onChange={e => onFilterChange('assignee', e.target.value)}>
				<option value="">All Assignees</option>
				{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
			</select>
			<select class="pg-select" value={filters.priority} onChange={e => onFilterChange('priority', e.target.value)}>
				<option value="">All Priorities</option>
				<option value="critical">Critical</option>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
			<select class="pg-select" value={filters.sprint} onChange={e => onFilterChange('sprint', e.target.value)}>
				<option value="">All Sprints</option>
				{sprints.map(s => <option key={s.id} value={s.id}>{s.name.split('--')[0].trim()}</option>)}
			</select>
			{(filters.assignee || filters.priority || filters.sprint) && (
				<button class="pg-btn" onClick={() => onFilterChange('reset')}>Clear</button>
			)}
		</div>
	);
}

function ViewTabs({ active, onChange }) {
	return (
		<div class="board-tabs">
			{['kanban', 'list', 'timeline'].map(v => (
				<button key={v} class={`board-tab ${active === v ? 'board-tab--active' : ''}`} onClick={() => onChange(v)}>
					{v.charAt(0).toUpperCase() + v.slice(1)}
				</button>
			))}
		</div>
	);
}

function ListView({ tasks, members, onOpen }) {
	const [sortCol, setSortCol] = useState('id');
	const [sortDir, setSortDir] = useState(1);

	const sorted = [...tasks].sort((a, b) => {
		const av = a[sortCol] || '';
		const bv = b[sortCol] || '';
		return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
	});

	function handleSort(col) {
		if (col === sortCol) {
			setSortDir(d => d * -1);
		} else {
			setSortCol(col);
			setSortDir(1);
		}
	}

	const statusLabels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };

	return (
		<div class="list-view">
			<table class="list-table">
				<thead>
					<tr>
						{[['id', 'ID'], ['title', 'Title'], ['status', 'Status'], ['assignee', 'Assignee'], ['priority', 'Priority']].map(([key, label]) => (
							<th key={key} class={`list-th ${sortCol === key ? 'list-th--sorted' : ''}`} onClick={() => handleSort(key)}>
								{label} {sortCol === key ? (sortDir === 1 ? '\u25B2' : '\u25BC') : ''}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{sorted.map(t => {
						const m = members.find(x => x.id === t.assignee) || { name: 'Unassigned', avatar: '?', color: '#666' };
						return (
							<tr key={t.id} class="list-row" onClick={() => onOpen(t.id)}>
								<td class="list-td list-td--id">{t.id}</td>
								<td class="list-td list-td--title">{t.title}</td>
								<td class="list-td"><span class={`pg-status pg-status--${t.status}`}>{statusLabels[t.status]}</span></td>
								<td class="list-td list-td--assignee"><Avatar member={m} size="sm" /> {m.name}</td>
								<td class="list-td"><span class={`pg-badge pg-badge--${t.priority}`}>{t.priority}</span></td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function TimelineView({ tasks, members, sprints }) {
	const weeks = ['Mar 25', 'Apr 1', 'Apr 7', 'Apr 14', 'Apr 21', 'Apr 28'];
	const sprintMap = { 'sprint-1': [0, 1], 'sprint-2': [2, 3], 'sprint-3': [4, 5] };

	return (
		<div class="timeline-view">
			<table class="timeline-table">
				<thead>
					<tr>
						<th class="timeline-th--member">Team Member</th>
						{weeks.map(w => <th key={w}>{w}</th>)}
					</tr>
				</thead>
				<tbody>
					{members.map(m => {
						const memberTasks = tasks.filter(t => t.assignee === m.id && t.status !== 'done');
						return (
							<tr key={m.id}>
								<td class="timeline-td--member">
									<Avatar member={m} size="sm" /> {m.name}
								</td>
								{weeks.map((w, i) => {
									const weekTasks = memberTasks.filter(t => {
										const range = sprintMap[t.sprint];
										return range && i >= range[0] && i <= range[1];
									});
									return (
										<td key={i} class="timeline-cell">
											{weekTasks.map(t => (
												<div key={t.id} class={`timeline-bar timeline-bar--${t.priority}`}
													onClick={() => postMessage('openTask', { taskId: t.id })}
													title={`${t.id}: ${t.title}`}>
													{t.id}
												</div>
											))}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// -- Main App ----------------------------------------------------------------

function Board() {
	const [data, setData] = useState(null);
	const [view, setView] = useState(getState().view || 'kanban');
	const [filters, setFilters] = useState({ assignee: '', priority: '', sprint: '' });

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init' || msg.command === 'update') {
				setData(msg.data);
			}
		});
		postMessage('ready');
	}, []);

	useEffect(() => {
		setState({ view });
	}, [view]);

	const handleFilterChange = useCallback((key, value) => {
		if (key === 'reset') {
			setFilters({ assignee: '', priority: '', sprint: '' });
		} else {
			setFilters(prev => ({ ...prev, [key]: value }));
		}
	}, []);

	const handleOpenTask = useCallback((taskId) => {
		postMessage('openTask', { taskId });
	}, []);

	if (!data) {
		return <div class="board-loading">Loading board...</div>;
	}

	const { tasks: allTasks, columns, members, sprints } = data;

	// Apply filters
	const tasks = allTasks.filter(t => {
		if (filters.assignee && t.assignee !== filters.assignee) { return false; }
		if (filters.priority && t.priority !== filters.priority) { return false; }
		if (filters.sprint && t.sprint !== filters.sprint) { return false; }
		return true;
	});

	const activeSprint = sprints.find(s => s.status === 'active');

	return (
		<div class="board">
			<div class="board-header">
				<div class="board-header__left">
					<span class="board-project-key">{data.projectKey}</span>
					<span class="board-title">PRendgame Board</span>
				</div>
				<PresenceRow members={members} />
			</div>

			{activeSprint && (
				<div class="board-sprint-banner">
					<strong>{activeSprint.name}</strong>
					<span class="board-sprint-dates">{activeSprint.startDate} -&gt; {activeSprint.endDate}</span>
				</div>
			)}

			<ViewTabs active={view} onChange={setView} />
			<FilterBar members={members} sprints={sprints} filters={filters} onFilterChange={handleFilterChange} />

			{view === 'kanban' && (
				<div class="board-kanban">
					{columns.map(col => (
						<Column
							key={col.id}
							column={col}
							tasks={tasks.filter(t => t.status === col.id)}
							members={members}
							onOpen={handleOpenTask}
						/>
					))}
					<div class="board-add-column" title="Add Column">
						<span>+</span>
					</div>
				</div>
			)}

			{view === 'list' && (
				<ListView tasks={tasks} members={members} onOpen={handleOpenTask} />
			)}

			{view === 'timeline' && (
				<TimelineView tasks={tasks} members={members} sprints={sprints} />
			)}
		</div>
	);
}

render(<Board />, document.getElementById('root'));
