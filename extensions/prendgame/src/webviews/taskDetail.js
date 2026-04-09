/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
module.exports = function taskDetailHTML(task, teamData, docsData) {
	const member = teamData.members.find(m => m.id === task.assignee) || { name: 'Unassigned', avatar: '?', color: '#666', role: '' };
	const linkedDocs = (task.linkedDocs || []).map(id => docsData.documents.find(d => d.id === id)).filter(Boolean);
	const statusLabels = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
	const allStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

	const mockComments = [
		{ author: 'user-001', text: 'Please make sure the acceptance criteria cover edge cases for empty boards.', time: '2 days ago' },
		{ author: 'user-003', text: 'Good point -- I will add handling for the zero-task state.', time: '1 day ago' },
		{ author: 'user-007', text: 'I will add this to my QA checklist for PRE-16.', time: '3 hours ago' }
	];

	const mockActivity = [
		{ action: 'created this task', who: 'user-001', when: task.createdAt?.slice(0, 10) },
		{ action: 'assigned to ' + member.name, who: 'user-002', when: task.createdAt?.slice(0, 10) },
		{ action: 'moved to In Progress', who: task.assignee, when: task.updatedAt?.slice(0, 10) }
	];

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
body { font-family: var(--vscode-font-family, system-ui); color: var(--fg); background: var(--bg); padding: 20px; max-width: 800px; margin: 0 auto; }

.header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.task-id { font-family: monospace; font-size: 14px; color: var(--accent); }
.task-title { font-size: 20px; font-weight: 600; }

.meta-grid { display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; margin-bottom: 24px; padding: 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; }
.meta-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.meta-value { font-size: 13px; display: flex; align-items: center; gap: 6px; }

.status-select { background: var(--card-bg); border: 1px solid var(--border); color: var(--fg); padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.avatar-sm { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; color: #fff; }
.priority-badge { font-size: 11px; padding: 2px 8px; border-radius: 3px; }
.priority-badge.critical { background: #dc2626; color: #fff; }
.priority-badge.high { background: #ea580c; color: #fff; }
.priority-badge.medium { background: #ca8a04; color: #fff; }
.priority-badge.low { background: #4b5563; color: #d1d5db; }
.label-tag { font-size: 11px; padding: 2px 8px; border-radius: 3px; background: #374151; }

.section { margin-bottom: 24px; }
.section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 4px; }

.description { font-size: 14px; line-height: 1.7; white-space: pre-wrap; padding: 12px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; }
.description code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 13px; }

.linked-doc { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; margin-bottom: 4px; }
.linked-doc:hover { border-color: var(--accent); }
.doc-icon { font-size: 16px; }

.comment { padding: 10px 0; border-bottom: 1px solid var(--border); }
.comment:last-child { border-bottom: none; }
.comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comment-author { font-size: 13px; font-weight: 500; }
.comment-time { font-size: 11px; color: var(--muted); }
.comment-body { font-size: 13px; line-height: 1.5; padding-left: 30px; }

.comment-input { display: flex; gap: 8px; margin-top: 12px; }
.comment-input input { flex: 1; background: var(--card-bg); border: 1px solid var(--border); color: var(--fg); padding: 8px; border-radius: 4px; font-size: 13px; }
.comment-input button { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }

.activity-item { display: flex; gap: 8px; align-items: center; padding: 4px 0; font-size: 12px; color: var(--muted); }
.activity-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
</style>
</head>
<body>
	<div class="header">
		<span class="task-id">${task.id}</span>
		<span class="task-title">${task.title}</span>
	</div>

	<div class="meta-grid">
		<span class="meta-label">Status</span>
		<div class="meta-value">
			<select class="status-select" onchange="changeStatus(this.value)">
				${allStatuses.map(s => `<option value="${s}" ${s === task.status ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
			</select>
		</div>

		<span class="meta-label">Assignee</span>
		<div class="meta-value">
			<span class="avatar-sm" style="background:${member.color}">${member.avatar}</span>
			${member.name}
		</div>

		<span class="meta-label">Priority</span>
		<div class="meta-value"><span class="priority-badge ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span></div>

		<span class="meta-label">Labels</span>
		<div class="meta-value">${task.labels.map(l => `<span class="label-tag">${l}</span>`).join(' ')}</div>

		<span class="meta-label">Sprint</span>
		<div class="meta-value">${task.sprint || 'Unassigned'}</div>

		<span class="meta-label">Created</span>
		<div class="meta-value">${task.createdAt?.slice(0, 10) || '--'}</div>

		<span class="meta-label">Updated</span>
		<div class="meta-value">${task.updatedAt?.slice(0, 10) || '--'}</div>
	</div>

	<div class="section">
		<div class="section-title">Description</div>
		<div class="description">${task.description || 'No description.'}</div>
	</div>

	${linkedDocs.length > 0 ? `
	<div class="section">
		<div class="section-title">Linked Documents</div>
		${linkedDocs.map(d => `
			<div class="linked-doc" onclick="openDoc('${d.id}')">
				<span class="doc-icon">[doc]</span>
				<span>${d.title}</span>
				<span style="margin-left:auto;font-size:11px;opacity:0.5">${d.status}</span>
			</div>
		`).join('')}
	</div>` : ''}

	<div class="section">
		<div class="section-title">Comments</div>
		${mockComments.map(c => {
		const cm = teamData.members.find(m => m.id === c.author) || { name: 'Unknown', avatar: '?', color: '#666' };
		return `
			<div class="comment">
				<div class="comment-header">
					<span class="avatar-sm" style="background:${cm.color}">${cm.avatar}</span>
					<span class="comment-author">${cm.name}</span>
					<span class="comment-time">${c.time}</span>
				</div>
				<div class="comment-body">${c.text}</div>
			</div>`;
	}).join('')}
		<div class="comment-input">
			<input type="text" placeholder="Add a comment..." />
			<button>Send</button>
		</div>
	</div>

	<div class="section">
		<div class="section-title">Activity</div>
		${mockActivity.map(a => {
		const am = teamData.members.find(m => m.id === a.who) || { name: 'System' };
		return `<div class="activity-item"><span class="activity-dot"></span> <strong>${am.name}</strong> ${a.action} <span style="margin-left:auto">${a.when}</span></div>`;
	}).join('')}
	</div>

<script>
const vscode = acquireVsCodeApi();
function changeStatus(newStatus) {
	vscode.postMessage({ command: 'statusChange', taskId: '${task.id}', newStatus });
}
function openDoc(docId) {
	vscode.postMessage({ command: 'openDoc', docId });
}
</script>
</body>
</html>`;
};
