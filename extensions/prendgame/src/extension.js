/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// -- Data Layer ---------------------------------------------------------------

function loadJSON(filename) {
	const filePath = path.join(__dirname, '..', 'mock-data', filename);
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const store = {
	tasks: null,
	team: null,
	docs: null,
	sprints: null,
	mcpLog: null,
	reload() {
		this.tasks = loadJSON('tasks.json');
		this.team = loadJSON('team.json');
		this.docs = loadJSON('documents.json');
		this.sprints = loadJSON('sprints.json');
		this.mcpLog = loadJSON('mcp-log.json');
	},
	getMember(id) {
		return this.team.members.find(m => m.id === id);
	},
	getMyTasks() {
		return this.tasks.tasks.filter(t => t.assignee === 'user-003');
	},
};

// -- Webview Helper -----------------------------------------------------------

function getWebviewHTML(webview, extensionUri, bundleName) {
	const distUri = vscode.Uri.joinPath(extensionUri, 'dist', bundleName);
	const scriptUri = webview.asWebviewUri(distUri);
	const nonce = getNonce();
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width,initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
</head>
<body>
	<div id="root"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
	let text = '';
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return text;
}

// -- Tree Providers -----------------------------------------------------------

class MyTasksProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() { this._onDidChangeTreeData.fire(); }
	getTreeItem(el) { return el; }
	getChildren(el) {
		if (!el) {
			const statuses = ['in_progress', 'todo', 'in_review', 'backlog', 'done'];
			const labels = { in_progress: 'In Progress', todo: 'To Do', in_review: 'In Review', backlog: 'Backlog', done: 'Done' };
			return statuses.map(s => {
				const count = store.getMyTasks().filter(t => t.status === s).length;
				if (count === 0) { return null; }
				const item = new vscode.TreeItem(`${labels[s]} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
				item.contextValue = 'status-group';
				item.id = `my-status-${s}`;
				return item;
			}).filter(Boolean);
		}
		const status = el.id.replace('my-status-', '');
		return store.getMyTasks().filter(t => t.status === status).map(t => {
			const item = new vscode.TreeItem(`${t.id}: ${t.title}`, vscode.TreeItemCollapsibleState.None);
			const icons = { critical: '$(circle-filled)', high: '$(arrow-up)', medium: '$(dash)', low: '$(arrow-down)' };
			item.description = icons[t.priority] || '';
			const m = store.getMember(t.assignee);
			item.tooltip = `${t.title}\nPriority: ${t.priority}\nAssignee: ${m ? m.name : 'Unassigned'}`;
			item.command = { command: 'prendgame.openTaskDetail', title: 'Open Task', arguments: [t.id] };
			item.contextValue = 'task';
			return item;
		});
	}
}

class DocumentsProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() { this._onDidChangeTreeData.fire(); }
	getTreeItem(el) { return el; }
	getChildren(el) {
		if (!el) {
			const types = [...new Set(store.docs.documents.map(d => d.type))];
			const labels = { prd: 'PRDs', spec: 'Technical Specs', adr: 'ADRs', notes: 'Meeting Notes' };
			return types.map(type => {
				const count = store.docs.documents.filter(d => d.type === type).length;
				const item = new vscode.TreeItem(`${labels[type] || type} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
				item.id = `doc-type-${type}`;
				return item;
			});
		}
		const type = el.id.replace('doc-type-', '');
		return store.docs.documents.filter(d => d.type === type).map(d => {
			const item = new vscode.TreeItem(d.title, vscode.TreeItemCollapsibleState.None);
			const icons = { approved: '$(check)', draft: '$(edit)', archived: '$(archive)' };
			item.description = icons[d.status] || d.status;
			item.command = { command: 'prendgame.openDocument', title: 'Open Document', arguments: [d.id] };
			return item;
		});
	}
}

class SprintsProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() { this._onDidChangeTreeData.fire(); }
	getTreeItem(el) { return el; }
	getChildren(el) {
		if (!el) {
			return store.sprints.sprints.map(s => {
				const count = store.tasks.tasks.filter(t => t.sprint === s.id).length;
				const icon = s.status === 'active' ? '$(play-circle)' : s.status === 'completed' ? '$(check-all)' : '$(calendar)';
				const item = new vscode.TreeItem(`${icon} ${s.name}`, vscode.TreeItemCollapsibleState.Collapsed);
				item.description = `${count} tasks`;
				item.id = `sprint-${s.id}`;
				return item;
			});
		}
		const sid = el.id.replace('sprint-', '');
		return store.tasks.tasks.filter(t => t.sprint === sid).map(t => {
			const icons = { done: '$(check)', in_progress: '$(sync~spin)', in_review: '$(eye)', todo: '$(circle-outline)', backlog: '$(inbox)' };
			const item = new vscode.TreeItem(`${icons[t.status] || ''} ${t.id}: ${t.title}`, vscode.TreeItemCollapsibleState.None);
			item.command = { command: 'prendgame.openTaskDetail', title: 'Open Task', arguments: [t.id] };
			return item;
		});
	}
}

class TeamProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() { this._onDidChangeTreeData.fire(); }
	getTreeItem(el) { return el; }
	getChildren() {
		return store.team.members.map(m => {
			const dot = m.status === 'online' ? '$(circle-filled)' : m.status === 'away' ? '$(circle-outline)' : '$(circle-slash)';
			const item = new vscode.TreeItem(`${dot} ${m.name}`, vscode.TreeItemCollapsibleState.None);
			item.description = m.role;
			return item;
		});
	}
}

// -- Activation ---------------------------------------------------------------

function activate(context) {
	store.reload();
	const extUri = context.extensionUri;

	const myTasks = new MyTasksProvider();
	const docsTree = new DocumentsProvider();
	const sprintsTree = new SprintsProvider();
	const teamTree = new TeamProvider();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('prendgame.myTasks', myTasks),
		vscode.window.registerTreeDataProvider('prendgame.documents', docsTree),
		vscode.window.registerTreeDataProvider('prendgame.sprints', sprintsTree),
		vscode.window.registerTreeDataProvider('prendgame.team', teamTree)
	);

	function getBoardPayload() {
		return {
			projectKey: store.tasks.projectKey,
			columns: store.tasks.columns,
			tasks: store.tasks.tasks,
			members: store.team.members,
			sprints: store.sprints.sprints,
		};
	}

	let boardPanel = null;

	function refreshAll() {
		myTasks.refresh();
		sprintsTree.refresh();
		if (boardPanel) {
			boardPanel.webview.postMessage({ command: 'update', data: getBoardPayload() });
		}
	}

	// -- Board ----------------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.openBoard', () => {
		if (boardPanel) { boardPanel.reveal(); return; }
		boardPanel = vscode.window.createWebviewPanel(
			'prendgame.board', 'PRendgame Board', vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.joinPath(extUri, 'dist')] }
		);
		boardPanel.webview.html = getWebviewHTML(boardPanel.webview, extUri, 'board/index.js');
		boardPanel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'ready') {
				boardPanel.webview.postMessage({ command: 'init', data: getBoardPayload() });
			} else if (msg.command === 'moveTask') {
				const task = store.tasks.tasks.find(t => t.id === msg.taskId);
				if (task) { task.status = msg.newStatus; refreshAll(); }
			} else if (msg.command === 'openTask') {
				vscode.commands.executeCommand('prendgame.openTaskDetail', msg.taskId);
			}
		});
		boardPanel.onDidDispose(() => { boardPanel = null; });
	}));

	// -- Task Detail ----------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.openTaskDetail', (taskId) => {
		const task = store.tasks.tasks.find(t => t.id === taskId);
		if (!task) { return; }
		const panel = vscode.window.createWebviewPanel(
			'prendgame.taskDetail', `${taskId}`, vscode.ViewColumn.One,
			{ enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extUri, 'dist')] }
		);
		panel.webview.html = getWebviewHTML(panel.webview, extUri, 'task-detail/index.js');
		const linkedDocs = (task.linkedDocs || []).map(id => store.docs.documents.find(d => d.id === id)).filter(Boolean);
		const assignee = store.getMember(task.assignee) || { name: 'Unassigned' };
		const comments = [
			{ author: 'user-001', text: 'Please make sure the acceptance criteria cover edge cases.', time: '2 days ago' },
			{ author: 'user-003', text: 'Good point, I will add handling for the zero-task state.', time: '1 day ago' },
			{ author: 'user-007', text: 'Adding to my QA checklist.', time: '3 hours ago' },
		];
		const activity = [
			{ action: 'created this task', who: assignee.name, when: (task.createdAt || '').slice(0, 10) },
			{ action: 'moved to ' + task.status, who: assignee.name, when: (task.updatedAt || '').slice(0, 10) },
		];

		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'ready') {
				panel.webview.postMessage({ command: 'init', data: { task, members: store.team.members, linkedDocs, comments, activity } });
			} else if (msg.command === 'statusChange') {
				const t = store.tasks.tasks.find(x => x.id === msg.taskId);
				if (t) { t.status = msg.newStatus; refreshAll(); }
			} else if (msg.command === 'openDoc') {
				vscode.commands.executeCommand('prendgame.openDocument', msg.docId);
			}
		});
	}));

	// -- Document -------------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.openDocument', async (docId) => {
		const doc = store.docs.documents.find(d => d.id === docId);
		if (!doc) { return; }

		// Write document content to a temp .md file and open in native editor
		const docsDir = path.join(__dirname, '..', 'mock-data', 'docs');
		if (!fs.existsSync(docsDir)) { fs.mkdirSync(docsDir, { recursive: true }); }

		const filePath = path.join(docsDir, `${doc.id}.md`);
		if (!fs.existsSync(filePath)) {
			// Add metadata header to the content
			const author = store.getMember(doc.author);
			const linkedTasks = (doc.linkedTasks || []).map(id => store.tasks.tasks.find(t => t.id === id)).filter(Boolean);
			let header = `---\ntitle: "${doc.title}"\ntype: ${doc.type}\nauthor: ${author ? author.name : 'Unknown'}\nstatus: ${doc.status}\n`;
			if (linkedTasks.length > 0) {
				header += `linked_tasks:\n${linkedTasks.map(t => `  - ${t.id}: ${t.title}`).join('\n')}\n`;
			}
			header += `---\n\n`;
			fs.writeFileSync(filePath, header + doc.content, 'utf8');
		}

		const uri = vscode.Uri.file(filePath);
		await vscode.commands.executeCommand('vscode.open', uri);
	}));

	// -- Sprint Dashboard -----------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.openSprintDashboard', () => {
		const panel = vscode.window.createWebviewPanel(
			'prendgame.sprintDashboard', 'Sprint Dashboard', vscode.ViewColumn.One,
			{ enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extUri, 'dist')] }
		);
		panel.webview.html = getWebviewHTML(panel.webview, extUri, 'sprint-dashboard/index.js');
		const active = store.sprints.sprints.find(s => s.status === 'active');
		const sprintTasks = store.tasks.tasks.filter(t => t.sprint === (active ? active.id : ''));
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'ready') {
				panel.webview.postMessage({ command: 'init', data: { sprint: active, tasks: sprintTasks, members: store.team.members, sprints: store.sprints.sprints } });
			}
		});
	}));

	// -- MCP Log --------------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.openMcpLog', () => {
		const panel = vscode.window.createWebviewPanel(
			'prendgame.mcpLog', 'MCP Activity Log', vscode.ViewColumn.Two,
			{ enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extUri, 'dist')] }
		);
		panel.webview.html = getWebviewHTML(panel.webview, extUri, 'mcp-log/index.js');
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'ready') {
				panel.webview.postMessage({ command: 'init', data: store.mcpLog });
			}
		});
	}));

	// -- New Task -------------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.newTask', async () => {
		const title = await vscode.window.showInputBox({ prompt: 'Task title', placeHolder: 'e.g. Add dark mode support' });
		if (!title) { return; }
		const nextId = store.tasks.tasks.length + 1;
		store.tasks.tasks.push({
			id: `${store.tasks.projectKey}-${nextId}`,
			title,
			description: '',
			status: 'backlog',
			priority: 'medium',
			assignee: 'user-003',
			labels: [],
			sprint: 'sprint-2',
			linkedDocs: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		refreshAll();
		vscode.window.showInformationMessage(`Created ${store.tasks.projectKey}-${nextId}: ${title}`);
	}));

	// -- New Document ---------------------------------------------------------
	context.subscriptions.push(vscode.commands.registerCommand('prendgame.newDocument', async () => {
		const type = await vscode.window.showQuickPick(
			['PRD', 'Technical Spec', 'User Story', 'Meeting Notes', 'ADR'],
			{ placeHolder: 'Select document type' }
		);
		if (!type) { return; }
		const title = await vscode.window.showInputBox({ prompt: 'Document title' });
		if (!title) { return; }
		vscode.window.showInformationMessage(`Created ${type}: ${title}`);
		docsTree.refresh();
	}));

	// -- Status Bar -----------------------------------------------------------
	const syncStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	syncStatus.text = '$(cloud) Synced';
	syncStatus.tooltip = 'PRendgame: Cloud sync active (Team plan)';
	syncStatus.show();
	context.subscriptions.push(syncStatus);

	const activeSprint = store.sprints.sprints.find(s => s.status === 'active');
	if (activeSprint) {
		const sprintBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
		sprintBar.text = `$(iterations) ${activeSprint.name.split('--')[0].trim()}`;
		sprintBar.tooltip = activeSprint.goal;
		sprintBar.command = 'prendgame.openSprintDashboard';
		sprintBar.show();
		context.subscriptions.push(sprintBar);
	}

	const myTaskCount = store.getMyTasks().filter(t => t.status !== 'done').length;
	const taskBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
	taskBar.text = `$(tasklist) ${myTaskCount} tasks`;
	taskBar.tooltip = 'PRendgame: Your open tasks';
	taskBar.command = 'prendgame.openBoard';
	taskBar.show();
	context.subscriptions.push(taskBar);

	// Board now lives in the native workbench ViewPane, no auto-open needed
}

function deactivate() {}

module.exports = { activate, deactivate };
