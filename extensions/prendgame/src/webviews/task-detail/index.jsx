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

function Avatar({ member, size = 'sm' }) {
	return <span class={`pg-avatar pg-avatar--${size}`} style={{ background: member.color }}>{member.avatar}</span>;
}

function MetaRow({ label, children }) {
	return (
		<div class="meta-row">
			<span class="meta-label">{label}</span>
			<div class="meta-value">{children}</div>
		</div>
	);
}

function CommentItem({ comment, member }) {
	return (
		<div class="comment">
			<div class="comment__header">
				<Avatar member={member} size="sm" />
				<span class="comment__author">{member.name}</span>
				<span class="comment__time">{comment.time}</span>
			</div>
			<div class="comment__body">{comment.text}</div>
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
	const assignee = members.find(m => m.id === task.assignee) || { name: 'Unassigned', avatar: '?', color: '#666' };

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

	return (
		<div class="td">
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

			<div class="td-meta">
				<MetaRow label="Status">
					<select class="pg-select" value={task.status} onChange={handleStatusChange}>
						{ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
					</select>
				</MetaRow>
				<MetaRow label="Assignee">
					<Avatar member={assignee} size="sm" />
					<span>{assignee.name}</span>
				</MetaRow>
				<MetaRow label="Priority">
					<span class={`pg-badge pg-badge--${task.priority}`}>
						{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
					</span>
				</MetaRow>
				<MetaRow label="Labels">
					{task.labels.map(l => <span class="pg-label" key={l}>{l}</span>)}
				</MetaRow>
				<MetaRow label="Sprint">{task.sprint || 'Unassigned'}</MetaRow>
				<MetaRow label="Created">{(task.createdAt || '').slice(0, 10)}</MetaRow>
				<MetaRow label="Updated">{(task.updatedAt || '').slice(0, 10)}</MetaRow>
			</div>

			<section class="td-section">
				<h2 class="td-section__title">Description</h2>
				<div class="td-description">{task.description || 'No description yet. Click to add one.'}</div>
			</section>

			{linkedDocs.length > 0 && (
				<section class="td-section">
					<h2 class="td-section__title">Linked Documents</h2>
					{linkedDocs.map(d => (
						<div key={d.id} class="td-linked-doc" onClick={() => postMessage('openDoc', { docId: d.id })}>
							<span class="td-linked-doc__title">{d.title}</span>
							<span class={`pg-status pg-status--${d.status === 'approved' ? 'done' : 'todo'}`}>{d.status}</span>
						</div>
					))}
				</section>
			)}

			<section class="td-section">
				<h2 class="td-section__title">Comments ({comments.length})</h2>
				{comments.map((c, i) => {
					const m = members.find(x => x.id === c.author) || { name: 'Unknown', avatar: '?', color: '#666' };
					return <CommentItem key={i} comment={c} member={m} />;
				})}
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
						<span class="td-activity__dot" />
						<strong>{a.who}</strong> {a.action}
						<span class="td-activity__time">{a.when}</span>
					</div>
				))}
			</section>
		</div>
	);
}

render(<TaskDetail />, document.getElementById('root'));
