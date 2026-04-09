/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { postMessage, onMessage } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './sprint-dashboard.css';

function Avatar({ member, size = 'sm' }) {
	return <span class={`pg-avatar pg-avatar--${size}`} style={{ background: member.color }}>{member.avatar}</span>;
}

function StatCard({ value, label, colorClass }) {
	return (
		<div class="sd-stat">
			<div class={`sd-stat__value ${colorClass || ''}`}>{value}</div>
			<div class="sd-stat__label">{label}</div>
		</div>
	);
}

function WorkloadCard({ member, taskCount, doneCount }) {
	const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
	return (
		<div class="sd-workload">
			<Avatar member={member} size="lg" />
			<div class="sd-workload__info">
				<div class="sd-workload__name">{member.name}</div>
				<div class="sd-workload__role">{taskCount} tasks / {doneCount} done</div>
				<div class="sd-workload__bar">
					<div class="sd-workload__fill" style={{ width: `${pct}%` }} />
				</div>
			</div>
		</div>
	);
}

function SprintDashboard() {
	const [data, setData] = useState(null);

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init') { setData(msg.data); }
		});
		postMessage('ready');
	}, []);

	if (!data) { return <div class="sd-loading">Loading...</div>; }

	const { sprint, tasks, members, sprints } = data;
	const total = tasks.length;
	const done = tasks.filter(t => t.status === 'done').length;
	const inProgress = tasks.filter(t => t.status === 'in_progress').length;
	const inReview = tasks.filter(t => t.status === 'in_review').length;
	const todo = tasks.filter(t => t.status === 'todo').length;
	const backlog = tasks.filter(t => t.status === 'backlog').length;
	const pct = total > 0 ? Math.round((done / total) * 100) : 0;

	const workload = members
		.map(m => ({
			member: m,
			taskCount: tasks.filter(t => t.assignee === m.id).length,
			doneCount: tasks.filter(t => t.assignee === m.id && t.status === 'done').length,
		}))
		.filter(w => w.taskCount > 0);

	return (
		<div class="sd">
			<div class="sd-header">
				<h1 class="sd-title">Sprint Dashboard</h1>
				<span class="sd-dates">{sprint.startDate} -&gt; {sprint.endDate}</span>
			</div>

			<div class="sd-sprint-nav">
				{sprints.map(s => (
					<button key={s.id} class={`sd-sprint-chip ${s.id === sprint.id ? 'sd-sprint-chip--active' : ''} ${s.status === 'completed' ? 'sd-sprint-chip--done' : ''}`}>
						{s.name.split('--')[0].trim()}
					</button>
				))}
			</div>

			<div class="sd-goal">
				<div class="sd-goal__label">Sprint Goal</div>
				<div class="sd-goal__text">{sprint.goal}</div>
			</div>

			<div class="sd-progress">
				<h2 class="sd-section-title">Overall Progress</h2>
				<div class="sd-progress-bar">
					<div class="sd-progress-fill" style={{ width: `${pct}%` }} />
				</div>
				<div class="sd-progress-label">{done} of {total} tasks completed ({pct}%)</div>
			</div>

			<div class="sd-stats">
				<StatCard value={done} label="Done" colorClass="sd-stat--done" />
				<StatCard value={inReview} label="In Review" colorClass="sd-stat--review" />
				<StatCard value={inProgress} label="In Progress" colorClass="sd-stat--progress" />
				<StatCard value={todo} label="To Do" colorClass="sd-stat--todo" />
				<StatCard value={backlog} label="Backlog" />
			</div>

			<h2 class="sd-section-title">Team Workload</h2>
			<div class="sd-workload-grid">
				{workload.map(w => (
					<WorkloadCard key={w.member.id} member={w.member} taskCount={w.taskCount} doneCount={w.doneCount} />
				))}
			</div>
		</div>
	);
}

render(<SprintDashboard />, document.getElementById('root'));
