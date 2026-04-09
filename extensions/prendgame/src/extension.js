/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// -- Load mock data ----------------------------------------------------------
function loadJSON(filename) {
	const filePath = path.join(__dirname, '..', 'mock-data', filename);
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

let tasksData, teamData, docsData, sprintsData, mcpLogData;

function reloadData() {
	tasksData = loadJSON('tasks.json');
	teamData = loadJSON('team.json');
	docsData = loadJSON('documents.json');
	sprintsData = loadJSON('sprints.json');
	mcpLogData = loadJSON('mcp-log.json');
}

// -- Helpers ----------------------------------------------------------------
function getMember(id) {
	return teamData.members.find(m => m.id === id);
}

function getTasksByStatus(status) {
	return tasksData.tasks.filter(t => t.status === status);
}

function getMyTasks() {
	// Mock: current user is Jordan Park (user-003)
	return tasksData.tasks.filter(t => t.assignee === 'user-003');
}

// -- Tree Data Providers ----------------------------------------------------

class MyTasksProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}
	refresh() { this._onDidChangeTreeData.fire(); }

	getTreeItem(element) { return element; }

	getChildren(element) {
		if (!element) {
			const statuses = ['in_progress', 'todo', 'in_review', 'backlog', 'done'];
			const labels = { in_progress: 'In Progress', todo: 'To Do', in_review: 'In Review', backlog: 'Backlog', done: 'Done' };
			return statuses.map(s => {
				const count = getMyTasks().filter(t => t.status === s).length;
				if (count === 0) { return null; }
				const item = new vscode.TreeItem(`${labels[s]} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
				item.contextValue = 'status-group';
				item.id = `my-status-${s}`;
				return item;
			}).filter(Boolean);
		}
		const status = element.id.replace('my-status-', '');
		return getMyTasks().filter(t => t.status === status).map(t => {
			const item = new vscode.TreeItem(`${t.id}: ${t.title}`, vscode.TreeItemCollapsibleState.None);
			const priorityIcons = { critical: '$(circle-filled)', high: '$(arrow-up)', medium: '$(dash)', low: '$(arrow-down)' };
			item.description = priorityIcons[t.priority] || '';
			item.tooltip = `${t.title}\nPriority: ${t.priority}\nAssignee: ${(getMember(t.assignee) || {}).name || 'Unassigned'}`;
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

	getTreeItem(element) { return element; }

	getChildren(element) {
		if (!element) {
			const types = [...new Set(docsData.documents.map(d => d.type))];
			const typeLabels = { prd: 'PRDs', spec: 'Technical Specs', adr: 'ADRs', notes: 'Meeting Notes' };
			return types.map(type => {
				const count = docsData.documents.filter(d => d.type === type).length;
				const item = new vscode.TreeItem(`${typeLabels[type] || type} (${count})`, vscode.TreeItemCollapsibleState.Expanded);
				item.id = `doc-type-${type}`;
				return item;
			});
		}
		const type = element.id.replace('doc-type-', '');
		return docsData.documents.filter(d => d.type === type).map(d => {
			const item = new vscode.TreeItem(d.title, vscode.TreeItemCollapsibleState.None);
			const statusIcons = { approved: '$(check)', draft: '$(edit)', archived: '$(archive)' };
			item.description = statusIcons[d.status] || d.status;
			item.tooltip = `${d.title}\nAuthor: ${(getMember(d.author) || {}).name}\nStatus: ${d.status}`;
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

	getTreeItem(element) { return element; }

	getChildren(element) {
		if (!element) {
			return sprintsData.sprints.map(s => {
				const taskCount = tasksData.tasks.filter(t => t.sprint === s.id).length;
				const icon = s.status === 'active' ? '$(play-circle)' : s.status === 'completed' ? '$(check-all)' : '$(calendar)';
				const item = new vscode.TreeItem(`${icon} ${s.name}`, vscode.TreeItemCollapsibleState.Collapsed);
				item.description = `${taskCount} tasks`;
				item.tooltip = `${s.goal}\n${s.startDate} → ${s.endDate}`;
				item.id = `sprint-${s.id}`;
				return item;
			});
		}
		const sprintId = element.id.replace('sprint-', '');
		return tasksData.tasks.filter(t => t.sprint === sprintId).map(t => {
			const statusIcons = { done: '$(check)', in_progress: '$(sync~spin)', in_review: '$(eye)', todo: '$(circle-outline)', backlog: '$(inbox)' };
			const item = new vscode.TreeItem(`${statusIcons[t.status] || ''} ${t.id}: ${t.title}`, vscode.TreeItemCollapsibleState.None);
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

	getTreeItem(element) { return element; }

	getChildren() {
		return teamData.members.map(m => {
			const statusDot = m.status === 'online' ? '$(circle-filled)' : m.status === 'away' ? '$(circle-outline)' : '$(circle-slash)';
			const item = new vscode.TreeItem(`${statusDot} ${m.name}`, vscode.TreeItemCollapsibleState.None);
			item.description = m.role;
			item.tooltip = `${m.name}\n${m.role}\n${m.email}\nStatus: ${m.status}`;
			return item;
		});
	}
}

// -- Webview Panels ----------------------------------------------------------

function getBoardHTML(webview, extensionUri) {
	return require('./webviews/board.js')(tasksData, teamData, docsData, sprintsData);
}

function getTaskDetailHTML(taskId) {
	const task = tasksData.tasks.find(t => t.id === taskId);
	if (!task) { return '<html><body><h1>Task not found</h1></body></html>'; }
	return require('./webviews/taskDetail.js')(task, teamData, docsData);
}

function getDocumentHTML(docId) {
	const doc = docsData.documents.find(d => d.id === docId);
	if (!doc) { return '<html><body><h1>Document not found</h1></body></html>'; }
	return require('./webviews/document.js')(doc, teamData, tasksData);
}

function getSprintDashboardHTML() {
	return require('./webviews/sprintDashboard.js')(sprintsData, tasksData, teamData);
}

function getMcpLogHTML() {
	return require('./webviews/mcpLog.js')(mcpLogData);
}

// -- Activation --------------------------------------------------------------

function activate(context) {
	reloadData();

	// Register tree views
	const myTasksProvider = new MyTasksProvider();
	const docsProvider = new DocumentsProvider();
	const sprintsProvider = new SprintsProvider();
	const teamProvider = new TeamProvider();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('prendgame.myTasks', myTasksProvider),
		vscode.window.registerTreeDataProvider('prendgame.documents', docsProvider),
		vscode.window.registerTreeDataProvider('prendgame.sprints', sprintsProvider),
		vscode.window.registerTreeDataProvider('prendgame.team', teamProvider)
	);

	// -- Board command ----------------------------------------------------
	let boardPanel = null;
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.openBoard', () => {
			if (boardPanel) {
				boardPanel.reveal();
				return;
			}
			boardPanel = vscode.window.createWebviewPanel(
				'prendgame.board', 'PRendgame Board', vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true }
			);
			boardPanel.webview.html = getBoardHTML(boardPanel.webview);
			boardPanel.webview.onDidReceiveMessage(msg => {
				if (msg.command === 'moveTask') {
					const task = tasksData.tasks.find(t => t.id === msg.taskId);
					if (task) {
						task.status = msg.newStatus;
						boardPanel.webview.html = getBoardHTML(boardPanel.webview);
						myTasksProvider.refresh();
						sprintsProvider.refresh();
					}
				} else if (msg.command === 'openTask') {
					vscode.commands.executeCommand('prendgame.openTaskDetail', msg.taskId);
				} else if (msg.command === 'filterChanged') {
					// Filter is handled client-side in the webview
				}
			});
			boardPanel.onDidDispose(() => { boardPanel = null; });
		})
	);

	// -- Task detail command ----------------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.openTaskDetail', (taskId) => {
			const panel = vscode.window.createWebviewPanel(
				'prendgame.taskDetail', `Task: ${taskId}`, vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			panel.webview.html = getTaskDetailHTML(taskId);
			panel.webview.onDidReceiveMessage(msg => {
				if (msg.command === 'statusChange') {
					const task = tasksData.tasks.find(t => t.id === msg.taskId);
					if (task) {
						task.status = msg.newStatus;
						panel.webview.html = getTaskDetailHTML(msg.taskId);
						myTasksProvider.refresh();
						if (boardPanel) { boardPanel.webview.html = getBoardHTML(boardPanel.webview); }
					}
				} else if (msg.command === 'openDoc') {
					vscode.commands.executeCommand('prendgame.openDocument', msg.docId);
				}
			});
		})
	);

	// -- Document command ------------------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.openDocument', (docId) => {
			const doc = docsData.documents.find(d => d.id === docId);
			const title = doc ? doc.title : 'Document';
			const panel = vscode.window.createWebviewPanel(
				'prendgame.document', title, vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			panel.webview.html = getDocumentHTML(docId);
			panel.webview.onDidReceiveMessage(msg => {
				if (msg.command === 'openTask') {
					vscode.commands.executeCommand('prendgame.openTaskDetail', msg.taskId);
				}
			});
		})
	);

	// -- Sprint dashboard command ----------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.openSprintDashboard', () => {
			const panel = vscode.window.createWebviewPanel(
				'prendgame.sprintDashboard', 'Sprint Dashboard', vscode.ViewColumn.One,
				{ enableScripts: true }
			);
			panel.webview.html = getSprintDashboardHTML();
		})
	);

	// -- MCP log command --------------------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.openMcpLog', () => {
			const panel = vscode.window.createWebviewPanel(
				'prendgame.mcpLog', 'MCP Activity Log', vscode.ViewColumn.Two,
				{ enableScripts: true }
			);
			panel.webview.html = getMcpLogHTML();
		})
	);

	// -- New task command (mock) ------------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.newTask', async () => {
			const title = await vscode.window.showInputBox({ prompt: 'Task title', placeHolder: 'e.g. Add dark mode support' });
			if (!title) { return; }
			const nextId = tasksData.tasks.length + 1;
			tasksData.tasks.push({
				id: `${tasksData.projectKey}-${nextId}`,
				title,
				description: '',
				status: 'backlog',
				priority: 'medium',
				assignee: 'user-003',
				labels: [],
				sprint: 'sprint-2',
				linkedDocs: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
			myTasksProvider.refresh();
			sprintsProvider.refresh();
			if (boardPanel) { boardPanel.webview.html = getBoardHTML(boardPanel.webview); }
			vscode.window.showInformationMessage(`Created ${tasksData.projectKey}-${nextId}: ${title}`);
		})
	);

	// -- New document command (mock) --------------------------------------
	context.subscriptions.push(
		vscode.commands.registerCommand('prendgame.newDocument', async () => {
			const type = await vscode.window.showQuickPick(
				['PRD', 'Technical Spec', 'User Story', 'Meeting Notes', 'ADR'],
				{ placeHolder: 'Select document type' }
			);
			if (!type) { return; }
			const title = await vscode.window.showInputBox({ prompt: 'Document title' });
			if (!title) { return; }
			vscode.window.showInformationMessage(`Created ${type}: ${title}`);
			docsProvider.refresh();
		})
	);

	// -- Status bar items ------------------------------------------------
	const syncStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	syncStatus.text = '$(cloud) Synced';
	syncStatus.tooltip = 'PRendgame: Cloud sync active (Team plan)';
	syncStatus.show();
	context.subscriptions.push(syncStatus);

	const activeSprint = sprintsData.sprints.find(s => s.status === 'active');
	if (activeSprint) {
		const sprintStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
		sprintStatus.text = `$(iterations) ${activeSprint.name.split('—')[0].trim()}`;
		sprintStatus.tooltip = activeSprint.goal;
		sprintStatus.command = 'prendgame.openSprintDashboard';
		sprintStatus.show();
		context.subscriptions.push(sprintStatus);
	}

	const myTaskCount = getMyTasks().filter(t => t.status !== 'done').length;
	const taskCountStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
	taskCountStatus.text = `$(tasklist) ${myTaskCount} tasks`;
	taskCountStatus.tooltip = 'PRendgame: Your open tasks';
	taskCountStatus.command = 'prendgame.openBoard';
	taskCountStatus.show();
	context.subscriptions.push(taskCountStatus);

	// Auto-open the board on first activation for demo impact
	vscode.commands.executeCommand('prendgame.openBoard');
}

function deactivate() {}

module.exports = { activate, deactivate };
