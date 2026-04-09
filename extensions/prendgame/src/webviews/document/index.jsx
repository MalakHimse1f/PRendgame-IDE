/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { postMessage, onMessage } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './document.css';

function Avatar({ member, size = 'sm' }) {
	return <span class={`pg-avatar pg-avatar--${size}`} style={{ background: member.color }}>{member.avatar}</span>;
}

function simpleMarkdown(md) {
	return md
		.replace(/^### (.+)$/gm, '<h3>$1</h3>')
		.replace(/^## (.+)$/gm, '<h2>$1</h2>')
		.replace(/^# (.+)$/gm, '<h1>$1</h1>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/^- \[ \] (.+)$/gm, '<div class="doc-check"><input type="checkbox" disabled/> $1</div>')
		.replace(/^- \[x\] (.+)$/gm, '<div class="doc-check"><input type="checkbox" checked disabled/> $1</div>')
		.replace(/^- (.+)$/gm, '<li>$1</li>')
		.replace(/^---$/gm, '<hr/>')
		.replace(/```mermaid\n([\s\S]*?)```/gm, '<div class="doc-mermaid"><div class="doc-mermaid__label">Mermaid Diagram</div><pre>$1</pre></div>')
		.replace(/```(\w*)\n([\s\S]*?)```/gm, '<pre class="doc-codeblock"><code>$2</code></pre>')
		.replace(/\n\n/g, '<br/><br/>');
}

function DocumentView() {
	const [data, setData] = useState(null);
	const [mode, setMode] = useState('preview');
	const [editContent, setEditContent] = useState('');

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init') {
				setData(msg.data);
				setEditContent(msg.data.doc.content);
			}
		});
		postMessage('ready');
	}, []);

	if (!data) { return <div class="doc-loading">Loading...</div>; }

	const { doc, author, linkedTasks } = data;

	return (
		<div class="doc-layout">
			<div class="doc-main">
				<div class="doc-mode-toggle">
					<button class={`pg-btn ${mode === 'preview' ? 'pg-btn--primary' : ''}`} onClick={() => setMode('preview')}>Preview</button>
					<button class={`pg-btn ${mode === 'edit' ? 'pg-btn--primary' : ''}`} onClick={() => setMode('edit')}>Edit</button>
				</div>

				<h1 class="doc-title">{doc.title}</h1>
				<div class="doc-meta-bar">
					<Avatar member={author} size="sm" />
					<span>{author.name}</span>
					<span class={`pg-status pg-status--${doc.status === 'approved' ? 'done' : 'todo'}`}>{doc.status}</span>
					<span class="doc-meta-date">Updated {(doc.updatedAt || '').slice(0, 10)}</span>
				</div>

				{mode === 'preview' ? (
					<div class="doc-content" dangerouslySetInnerHTML={{ __html: simpleMarkdown(doc.content) }} />
				) : (
					<textarea
						class="doc-editor pg-input"
						value={editContent}
						onInput={e => setEditContent(e.target.value)}
					/>
				)}
			</div>

			<div class="doc-sidebar">
				<div class="doc-sidebar__section">
					<h3 class="doc-sidebar__title">Details</h3>
					<div class="doc-sidebar__row"><strong>Type:</strong> {doc.type.toUpperCase()}</div>
					<div class="doc-sidebar__row"><strong>Author:</strong> {author.name}</div>
					<div class="doc-sidebar__row"><strong>Status:</strong> {doc.status}</div>
					<div class="doc-sidebar__row"><strong>Created:</strong> {(doc.createdAt || '').slice(0, 10)}</div>
				</div>

				{linkedTasks.length > 0 && (
					<div class="doc-sidebar__section">
						<h3 class="doc-sidebar__title">Linked Tasks</h3>
						{linkedTasks.map(t => (
							<div key={t.id} class="doc-sidebar__link" onClick={() => postMessage('openTask', { taskId: t.id })}>
								<span class="doc-sidebar__link-id">{t.id}</span>
								{t.title.length > 35 ? t.title.slice(0, 35) + '...' : t.title}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

render(<DocumentView />, document.getElementById('root'));
