/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { postMessage, onMessage } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './task-detail.css';

const STATUS_LABELS = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
const ALL_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#52525b' };

function Avatar({ initials, color, size = 20 }) {
	return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', fontSize: size * 0.4, fontWeight: 600, color: '#fff', background: color, flexShrink: 0 }}>{initials}</span>;
}

function MetaRow({ label, children }) {
	return (
		<div class="meta-row">
			<span class="meta-label">{label}</span>
			<div class="meta-value">{children}</div>
		</div>
	);
}

function TaskDetail() {
	const [data, setData] = useState(null);
	const [commentText, setCommentText] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editTitle, setEditTitle] = useState('');

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init') {
				setData(msg.data);
				setEditTitle(msg.data.task.title);
			}
		});
		postMessage('ready');
	}, []);

	if (!data) { return <div class="td-loading">Loading...</div>; }

	const { task, members, linkedDocs, comments, activity } = data;
	const assignee = members.find(m => m.initials === task.initials) || { name: task.initials, initials: task.initials, color: task.color };

	function handleStatusChange(e) {
		postMessage('statusChange', { taskId: task.id, newStatus: e.target.value });
	}

	function handleTitleSave() {
		setIsEditingTitle(false);
		if (editTitle !== task.title) {
			postMessage('updateTitle', { taskId: task.id, title: editTitle });
		}
	}

	function handleAddComment() {
		if (commentText.trim()) {
			postMessage('addComment', { taskId: task.id, text: commentText });
			setCommentText('');
		}
	}

	const pc = PRIORITY_COLORS[task.priority] || '#52525b';

	return (
		<div class="td">
			<div class="td-two-col">
				<div class="td-main">
					<div class="td-header">
						<span class="td-task-id">{task.id}</span>
						{isEditingTitle ? (
							<input
								class="td-title-input pg-input"
								value={editTitle}
								onInput={e => setEditTitle(e.target.value)}
								onBlur={handleTitleSave}
								onKeyDown={e => { if (e.key === 'Enter') { handleTitleSave(); } }}
								autoFocus
							/>
						) : (
							<h1 class="td-title" onClick={() => setIsEditingTitle(true)} title="Click to edit">
								{task.title}
							</h1>
						)}
					</div>

					{task.description && (
						<section class="td-section">
							<h2 class="td-section__title">Description</h2>
							<div class="td-description">{task.description}</div>
						</section>
					)}

					{task.subtasks && task.subtasks.length > 0 && (
						<section class="td-section">
							<h2 class="td-section__title">Sub-tasks ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})</h2>
							{task.subtasks.map((st, i) => (
								<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
									<span style={{ color: st.done ? '#22c55e' : '#52525b' }}>{st.done ? '\u2611' : '\u2610'}</span>
									<span style={{ color: st.done ? '#71717a' : '#e4e4e7', textDecoration: st.done ? 'line-through' : 'none', fontSize: 13 }}>{st.title}</span>
								</div>
							))}
						</section>
					)}

					<section class="td-section">
						<h2 class="td-section__title">Comments ({comments.length})</h2>
						{comments.map((c, i) => (
							<div key={i} class="comment">
								<div class="comment__header">
									<Avatar initials={c.initials} color={c.color} size={18} />
									<span class="comment__author">{c.author}</span>
									<span class="comment__time">{c.time}</span>
								</div>
								<div class="comment__body">{c.text}</div>
							</div>
						))}
						<div class="td-comment-input">
							<input
								class="pg-input td-comment-field"
								placeholder="Add a comment..."
								value={commentText}
								onInput={e => setCommentText(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter') { handleAddComment(); } }}
							/>
							<button class="pg-btn pg-btn--primary" onClick={handleAddComment}>Send</button>
						</div>
					</section>

					<section class="td-section">
						<h2 class="td-section__title">Activity</h2>
						{activity.map((a, i) => (
							<div key={i} class="td-activity">
								<span class="td-activity__dot" style={{ background: a.color || '#6366f1' }} />
								<span style={{ fontSize: 11, color: '#71717a' }}>{a.text}</span>
								<span class="td-activity__time">{a.time}</span>
							</div>
						))}
					</section>
				</div>

				<div class="td-sidebar">
					<MetaRow label="Status">
						<select class="pg-select" value={task.status || 'todo'} onChange={handleStatusChange}>
							{ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
						</select>
					</MetaRow>
					<MetaRow label="Priority">
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: pc + '20', color: pc, fontWeight: 500 }}>
							{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
						</span>
					</MetaRow>
					<MetaRow label="Assignee">
						<Avatar initials={assignee.initials} color={assignee.color} size={20} />
						<span>{assignee.name}</span>
					</MetaRow>
					<MetaRow label="Tags">
						{(task.tags || []).map(l => <span class="pg-label" key={l}>{l}</span>)}
					</MetaRow>
					{task.dueDate && (
						<MetaRow label="Due Date">
							<span>{task.dueDate}</span>
						</MetaRow>
					)}

					{linkedDocs.length > 0 && (
						<div style={{ marginTop: 16, borderTop: '1px solid #1e1e22', paddingTop: 12 }}>
							<h3 style={{ fontSize: 11, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Linked Documents ({linkedDocs.length})</h3>
							{linkedDocs.map(d => (
								<div key={d.id} class="td-linked-doc" onClick={() => postMessage('openDoc', { docId: d.id })}>
									<span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#6366f120', color: '#6366f1', textTransform: 'uppercase' }}>{d.type || 'DOC'}</span>
									<span class="td-linked-doc__title">{d.title}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

render(<TaskDetail />, document.getElementById('root'));
