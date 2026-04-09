/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
module.exports = function documentHTML(doc, teamData, tasksData) {
	const author = teamData.members.find(m => m.id === doc.author) || { name: 'Unknown', avatar: '?', color: '#666' };
	const linkedTasks = (doc.linkedTasks || []).map(id => tasksData.tasks.find(t => t.id === id)).filter(Boolean);

	// Simple markdown-to-HTML (mock -- not a real parser)
	function renderMarkdown(md) {
		return md
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/^- \[ \] (.+)$/gm, '<div class="checklist"><input type="checkbox" disabled> $1</div>')
			.replace(/^- \[x\] (.+)$/gm, '<div class="checklist"><input type="checkbox" checked disabled> $1</div>')
			.replace(/^- (.+)$/gm, '<li>$1</li>')
			.replace(/^\| (.+) \|$/gm, (match) => {
				const cells = match.replace(/^\| /, '').replace(/ \|$/, '').split(' | ');
				return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
			})
			.replace(/^---$/gm, '<hr>')
			.replace(/```mermaid\n([\s\S]*?)```/gm, '<div class="mermaid-block"><div class="mermaid-label">Mermaid Diagram</div><pre class="mermaid-code">$1</pre><div class="mermaid-placeholder"><svg width="200" height="120" viewBox="0 0 200 120"><rect x="10" y="10" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.3"/><text x="50" y="30" text-anchor="middle" fill="#93c5fd" font-size="10">Node A</text><rect x="110" y="10" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.3"/><text x="150" y="30" text-anchor="middle" fill="#93c5fd" font-size="10">Node B</text><line x1="90" y1="25" x2="110" y2="25" stroke="#60a5fa" stroke-width="1.5" marker-end="url(#arrow)"/><rect x="60" y="60" width="80" height="30" rx="4" fill="#3b82f6" opacity="0.3"/><text x="100" y="80" text-anchor="middle" fill="#93c5fd" font-size="10">Node C</text><line x1="50" y1="40" x2="80" y2="60" stroke="#60a5fa" stroke-width="1.5"/><line x1="150" y1="40" x2="120" y2="60" stroke="#60a5fa" stroke-width="1.5"/><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#60a5fa"/></marker></defs></svg><div class="mermaid-note">Diagram rendered in preview</div></div></div>')
			.replace(/```(\w*)\n([\s\S]*?)```/gm, '<pre class="code-block"><code>$2</code></pre>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/^\s*$\n/gm, '');
		}

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
body { font-family: var(--vscode-font-family, system-ui); color: var(--fg); background: var(--bg); }

.doc-layout { display: grid; grid-template-columns: 1fr 240px; min-height: 100vh; }
.doc-main { padding: 24px 32px; max-width: 720px; }
.doc-sidebar { border-left: 1px solid var(--border); padding: 16px; font-size: 12px; }

.doc-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.doc-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; font-size: 12px; color: var(--muted); }
.doc-status { padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.doc-status.approved { background: #166534; color: #86efac; }
.doc-status.draft { background: #374151; color: #d1d5db; }

.doc-content { line-height: 1.8; font-size: 14px; }
.doc-content h1 { font-size: 22px; margin: 24px 0 8px; }
.doc-content h2 { font-size: 18px; margin: 20px 0 8px; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.doc-content h3 { font-size: 15px; margin: 16px 0 6px; }
.doc-content hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
.doc-content li { margin-left: 20px; margin-bottom: 4px; }
.doc-content code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; }
.doc-content pre.code-block { background: var(--card-bg); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
.doc-content table { border-collapse: collapse; margin: 12px 0; }
.doc-content td { padding: 6px 12px; border: 1px solid var(--border); font-size: 13px; }
.checklist { margin: 4px 0; }
.checklist input { margin-right: 6px; }

.mermaid-block { margin: 16px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.mermaid-label { font-size: 11px; padding: 6px 12px; background: var(--card-bg); border-bottom: 1px solid var(--border); color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.mermaid-code { padding: 12px; font-size: 12px; margin: 0; background: rgba(0,0,0,0.2); }
.mermaid-placeholder { padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.mermaid-note { font-size: 11px; color: var(--muted); }

/* Sidebar */
.sidebar-section { margin-bottom: 20px; }
.sidebar-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
.sidebar-item { padding: 6px 8px; border-radius: 4px; cursor: pointer; }
.sidebar-item:hover { background: var(--card-bg); }
.avatar-xs { display: inline-flex; width: 18px; height: 18px; border-radius: 50%; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; color: #fff; vertical-align: middle; margin-right: 4px; }

.edit-toggle { display: flex; gap: 0; margin-bottom: 16px; }
.edit-toggle button { padding: 6px 16px; border: 1px solid var(--border); background: var(--card-bg); color: var(--fg); cursor: pointer; font-size: 12px; }
.edit-toggle button:first-child { border-radius: 4px 0 0 4px; }
.edit-toggle button:last-child { border-radius: 0 4px 4px 0; }
.edit-toggle button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
</style>
</head>
<body>
	<div class="doc-layout">
		<div class="doc-main">
			<div class="edit-toggle">
				<button class="active">Preview</button>
				<button>Edit</button>
			</div>

			<div class="doc-title">${doc.title}</div>
			<div class="doc-meta">
				<span class="avatar-xs" style="background:${author.color}">${author.avatar}</span>
				${author.name}
				<span class="doc-status ${doc.status}">${doc.status}</span>
				<span>Updated ${doc.updatedAt?.slice(0, 10)}</span>
			</div>

			<div class="doc-content">
				${renderMarkdown(doc.content)}
			</div>
		</div>

		<div class="doc-sidebar">
			<div class="sidebar-section">
				<div class="sidebar-title">Details</div>
				<div style="margin-bottom:4px"><strong>Type:</strong> ${doc.type.toUpperCase()}</div>
				<div style="margin-bottom:4px"><strong>Author:</strong> ${author.name}</div>
				<div style="margin-bottom:4px"><strong>Status:</strong> ${doc.status}</div>
				<div><strong>Created:</strong> ${doc.createdAt?.slice(0, 10)}</div>
			</div>

			${linkedTasks.length > 0 ? `
			<div class="sidebar-section">
				<div class="sidebar-title">Linked Tasks</div>
				${linkedTasks.map(t => `
					<div class="sidebar-item" onclick="openTask('${t.id}')">
						<span style="font-family:monospace;opacity:0.6">${t.id}</span> ${t.title.slice(0, 30)}${t.title.length > 30 ? '...' : ''}
					</div>
				`).join('')}
			</div>` : ''}

			<div class="sidebar-section">
				<div class="sidebar-title">Table of Contents</div>
				<div class="sidebar-item" style="opacity:0.7">Overview</div>
				<div class="sidebar-item" style="opacity:0.7">Goals</div>
				<div class="sidebar-item" style="opacity:0.7">Requirements</div>
				<div class="sidebar-item" style="opacity:0.7">Non-Goals</div>
			</div>
		</div>
	</div>

<script>
const vscode = acquireVsCodeApi();
function openTask(taskId) {
	vscode.postMessage({ command: 'openTask', taskId });
}
</script>
</body>
</html>`;
};
