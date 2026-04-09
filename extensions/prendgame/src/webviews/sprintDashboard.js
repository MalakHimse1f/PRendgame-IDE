/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
module.exports = function sprintDashboardHTML(sprintsData, tasksData, teamData) {
	const active = sprintsData.sprints.find(s => s.status === 'active');
	if (!active) { return '<html><body><h1>No active sprint</h1></body></html>'; }

	const sprintTasks = tasksData.tasks.filter(t => t.sprint === active.id);
	const total = sprintTasks.length;
	const done = sprintTasks.filter(t => t.status === 'done').length;
	const inProgress = sprintTasks.filter(t => t.status === 'in_progress').length;
	const inReview = sprintTasks.filter(t => t.status === 'in_review').length;
	const todo = sprintTasks.filter(t => t.status === 'todo').length;
	const backlog = sprintTasks.filter(t => t.status === 'backlog').length;
	const pct = total > 0 ? Math.round((done / total) * 100) : 0;

	// Workload per member
	const workload = teamData.members.map(m => {
		const memberTasks = sprintTasks.filter(t => t.assignee === m.id);
		return { ...m, taskCount: memberTasks.length, doneTasks: memberTasks.filter(t => t.status === 'done').length };
	}).filter(w => w.taskCount > 0);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
:root {
	--bg: var(--vscode-editor-background, #1e1e1e);
	--fg: var(--vscode-editor-foreground, #cccccc);
	--border: var(--vscode-panel-border, #333);
	--card-bg: var(--vscode-editorWidget-background, #252526);
	--accent: var(--vscode-focusBorder, #007acc);
	--muted: var(--vscode-descriptionForeground, #888);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--vscode-font-family, system-ui); color: var(--fg); background: var(--bg); padding: 24px; max-width: 900px; margin: 0 auto; }

.dash-header { margin-bottom: 24px; }
.dash-title { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.dash-subtitle { font-size: 13px; color: var(--muted); }

.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.stat-value.done-color { color: #22c55e; }
.stat-value.progress-color { color: #3b82f6; }
.stat-value.review-color { color: #a855f7; }
.stat-value.todo-color { color: #6b7280; }

.progress-section { margin-bottom: 24px; }
.progress-bar-bg { height: 12px; background: var(--card-bg); border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); border-radius: 6px; transition: width 0.5s; }
.progress-label { font-size: 13px; margin-top: 4px; color: var(--muted); }

.section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }

.workload-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
.workload-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; }
.avatar-md { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; }
.workload-info { flex: 1; }
.workload-name { font-size: 13px; font-weight: 500; }
.workload-role { font-size: 11px; color: var(--muted); }
.workload-bar { height: 4px; background: var(--border); border-radius: 2px; margin-top: 4px; }
.workload-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; }

.goal-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
.goal-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.goal-text { font-size: 14px; line-height: 1.5; }

.sprint-nav { display: flex; gap: 8px; margin-bottom: 24px; }
.sprint-chip { padding: 6px 14px; border-radius: 16px; font-size: 12px; cursor: pointer; border: 1px solid var(--border); }
.sprint-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.sprint-chip.completed { opacity: 0.5; }
</style>
</head>
<body>
	<div class="dash-header">
		<div class="dash-title">Sprint Dashboard</div>
		<div class="dash-subtitle">${active.startDate} -> ${active.endDate}</div>
	</div>

	<div class="sprint-nav">
		${sprintsData.sprints.map(s => `<div class="sprint-chip ${s.status === 'active' ? 'active' : s.status}">${s.name.split('--')[0].trim()}</div>`).join('')}
	</div>

	<div class="goal-card">
		<div class="goal-label">Sprint Goal</div>
		<div class="goal-text">${active.goal}</div>
	</div>

	<div class="progress-section">
		<div class="section-title">Overall Progress</div>
		<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
		<div class="progress-label">${done} of ${total} tasks completed (${pct}%)</div>
	</div>

	<div class="stats-row">
		<div class="stat-card"><div class="stat-value done-color">${done}</div><div class="stat-label">Done</div></div>
		<div class="stat-card"><div class="stat-value review-color">${inReview}</div><div class="stat-label">In Review</div></div>
		<div class="stat-card"><div class="stat-value progress-color">${inProgress}</div><div class="stat-label">In Progress</div></div>
		<div class="stat-card"><div class="stat-value todo-color">${todo}</div><div class="stat-label">To Do</div></div>
		<div class="stat-card"><div class="stat-value">${backlog}</div><div class="stat-label">Backlog</div></div>
	</div>

	<div class="section-title">Team Workload</div>
	<div class="workload-grid">
		${workload.map(w => `
		<div class="workload-card">
			<div class="avatar-md" style="background:${w.color}">${w.avatar}</div>
			<div class="workload-info">
				<div class="workload-name">${w.name}</div>
				<div class="workload-role">${w.taskCount} tasks / ${w.doneTasks} done</div>
				<div class="workload-bar"><div class="workload-bar-fill" style="width:${w.taskCount > 0 ? Math.round((w.doneTasks / w.taskCount) * 100) : 0}%"></div></div>
			</div>
		</div>`).join('')}
	</div>
</body>
</html>`;
};
