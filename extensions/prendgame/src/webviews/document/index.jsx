/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { postMessage, onMessage } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './document.css';

const STATUS_LABELS = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', ready_for_dev: 'Ready for Dev', archived: 'Archived' };
const STATUS_COLORS = { draft: '#71717a', in_review: '#a855f7', approved: '#22c55e', ready_for_dev: '#3b82f6', archived: '#3f3f46' };
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#52525b' };

function Avatar({ initials, color, size = 18 }) {
	return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', fontSize: size * 0.4, fontWeight: 600, color: '#fff', background: color, flexShrink: 0 }}>{initials}</span>;
}

// Parse content into structured sections
function parseSections(content) {
	const sections = [];
	let current = null;
	for (const line of content.split('\n')) {
		if (line.startsWith('## ')) {
			if (current) { sections.push(current); }
			current = { title: line.slice(3), lines: [] };
		} else if (current) {
			current.lines.push(line);
		}
	}
	if (current) { sections.push(current); }
	return sections;
}

function SectionContent({ lines }) {
	return (
		<div class="doc-section-body">
			{lines.map((line, i) => {
				if (line.startsWith('- [x] ')) {
					return <div key={i} class="doc-check doc-check--done">{'\u2611'} {line.slice(6)}</div>;
				}
				if (line.startsWith('- [ ] ')) {
					return <div key={i} class="doc-check">{'\u2610'} {line.slice(6)}</div>;
				}
				if (/^\d+\. /.test(line)) {
					return <div key={i} class="doc-numbered">{line}</div>;
				}
				if (line.startsWith('- ')) {
					return <div key={i} class="doc-bullet">{'\u2022'} {line.slice(2)}</div>;
				}
				if (line.trim() === '') { return <br key={i} />; }
				return <div key={i} class="doc-text">{line}</div>;
			})}
		</div>
	);
}

function DocumentView() {
	const [data, setData] = useState(null);

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init') {
				setData(msg.data);
			}
		});
		postMessage('ready');
	}, []);

	if (!data) { return <div class="doc-loading">Loading...</div>; }

	const { doc, linkedTasks, locked } = data;
	const sections = parseSections(doc.content);
	const sc = STATUS_COLORS[doc.status] || '#666';
	const pc = PRIORITY_COLORS[doc.priority] || '#52525b';

	return (
		<div class="doc-layout">
			<div class="doc-centered">
				{locked && (
					<div class="doc-lock-banner">
						{'\u{1F512}'} Locked — In Development
					</div>
				)}

				<div class="doc-header">
					<span class="doc-type-badge" style={{ background: '#6366f120', color: '#6366f1' }}>
						{(doc.type || 'prd').toUpperCase()}
					</span>
					<h1 class="doc-title">{doc.title}</h1>
					<div class="doc-meta-bar">
						<span class="doc-status-pill" style={{ background: sc + '20', color: sc }}>{STATUS_LABELS[doc.status] || doc.status}</span>
						<span class="doc-priority-pill" style={{ background: pc + '20', color: pc }}>{(doc.priority || 'medium').charAt(0).toUpperCase() + (doc.priority || 'medium').slice(1)}</span>
						<Avatar initials={doc.ownerInitials} color={doc.ownerColor} size={18} />
						<span class="doc-meta-owner">{doc.owner}</span>
						{doc.dueDate && <span class="doc-meta-date">Due {doc.dueDate}</span>}
					</div>
				</div>

				<div class="doc-properties">
					<div class="doc-prop-row"><span class="doc-prop-label">Type</span><span>{(doc.type || 'prd').toUpperCase()}</span></div>
					<div class="doc-prop-row"><span class="doc-prop-label">Status</span><span style={{ color: sc }}>{STATUS_LABELS[doc.status] || doc.status}</span></div>
					<div class="doc-prop-row"><span class="doc-prop-label">Priority</span><span style={{ color: pc }}>{(doc.priority || 'medium').charAt(0).toUpperCase() + (doc.priority || 'medium').slice(1)}</span></div>
					<div class="doc-prop-row"><span class="doc-prop-label">Assignee</span><span>{doc.owner}</span></div>
					{doc.dueDate && <div class="doc-prop-row"><span class="doc-prop-label">Due Date</span><span>{doc.dueDate}</span></div>}
					<div class="doc-prop-row"><span class="doc-prop-label">Updated</span><span>{doc.updatedAt}</span></div>
				</div>

				{sections.map((sec, i) => (
					<section key={i} class="doc-section">
						<h2 class="doc-section__title">{sec.title}</h2>
						<SectionContent lines={sec.lines} />
					</section>
				))}

				{linkedTasks && linkedTasks.length > 0 && (
					<section class="doc-section">
						<h2 class="doc-section__title">Linked Tasks ({linkedTasks.length})</h2>
						{linkedTasks.map(t => (
							<div key={t.id} class="doc-linked-task" onClick={() => postMessage('openTask', { taskId: t.id })}>
								<span class="doc-linked-task__bar" style={{ background: PRIORITY_COLORS[t.priority] || '#52525b' }} />
								<span class="doc-linked-task__id">{t.id}</span>
								<span class="doc-linked-task__title">{t.title}</span>
							</div>
						))}
					</section>
				)}
			</div>
		</div>
	);
}

render(<DocumentView />, document.getElementById('root'));
