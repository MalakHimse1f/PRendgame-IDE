/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';

// -- Interfaces ---------------------------------------------------------------

export interface ISubtask { title: string; done: boolean; assignee?: string }
export interface ITask { id: string; title: string; priority: string; initials: string; color: string; tags: string[]; description: string; dueDate: string; subtasks: ISubtask[] }
export interface IGroup { id: string; name: string; tasks: ITask[]; collapsed: boolean }
export interface IDoc { id: string; title: string; type: string; status: string; priority: string; owner: string; ownerInitials: string; ownerColor: string; tasksTotal: number; tasksDone: number; updatedAt: string; dueDate: string; content: string }
export interface ITeamMember { id: string; name: string; initials: string; color: string; role: string }
export interface ILink { fromType: 'task' | 'doc'; fromId: string; toType: 'task' | 'doc'; toId: string }

// --Events -------------------------------------------------------------------

const _onTaskChanged = new Emitter<{ taskId: string; field: string }>();
export const onTaskChanged: Event<{ taskId: string; field: string }> = _onTaskChanged.event;

const _onDocChanged = new Emitter<{ docId: string; field: string }>();
export const onDocChanged: Event<{ docId: string; field: string }> = _onDocChanged.event;

const _onDataChanged = new Emitter<void>();
export const onDataChanged: Event<void> = _onDataChanged.event;

// -- Constants ----------------------------------------------------------------

export const PRIORITY_COLORS: Record<string, string> = {
	critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#52525b',
};
export const PRIORITY_LABELS: Record<string, string> = {
	critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
	in_progress: '#6366f1', todo: '#71717a', in_review: '#a855f7', backlog: '#3f3f46', done: '#22c55e',
};
export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
export const TASK_STATUS_LABELS: Record<string, string> = {
	backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done',
};

export const DOC_TYPE_COLORS: Record<string, string> = {
	prd: '#6366f1', spec: '#06b6d4', user_story: '#8b5cf6', research: '#f59e0b', meeting_notes: '#71717a', adr: '#ec4899',
};
export const DOC_TYPE_LABELS: Record<string, string> = {
	prd: 'PRD', spec: 'Spec', user_story: 'Story', research: 'Research', meeting_notes: 'Notes', adr: 'ADR',
};
export const DOC_STATUSES = ['draft', 'in_review', 'approved', 'ready_for_dev', 'archived'];
export const DOC_STATUS_LABELS: Record<string, string> = {
	draft: 'Draft', in_review: 'In Review', approved: 'Approved', ready_for_dev: 'Ready for Dev', archived: 'Archived',
};
export const DOC_STATUS_COLORS: Record<string, string> = {
	draft: '#71717a', in_review: '#a855f7', approved: '#22c55e', ready_for_dev: '#3b82f6', archived: '#3f3f46',
};

// -- Utilities ----------------------------------------------------------------

export function getDueDateStyle(d: string): { color: string; label: string } {
	if (!d) { return { color: '#52525b', label: '' }; }
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(d);
	const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
	if (diff < 0) { return { color: '#ef4444', label: d + ' (overdue)' }; }
	if (diff === 0) { return { color: '#f59e0b', label: d + ' (today)' }; }
	if (diff <= 3) { return { color: '#f59e0b', label: d }; }
	return { color: '#52525b', label: d };
}

export function findTask(taskId: string): ITask | undefined {
	for (const g of _groups) {
		const t = g.tasks.find(tt => tt.id === taskId);
		if (t) { return t; }
	}
	return undefined;
}

export function findTaskGroup(taskId: string): string {
	for (const g of _groups) {
		if (g.tasks.some(tt => tt.id === taskId)) { return g.id; }
	}
	return '';
}

// -- Mutation functions -------------------------------------------------------

export function updateTask(taskId: string, field: string, value: unknown): void {
	const task = findTask(taskId);
	if (task) {
		Object.assign(task, { [field]: value });
		_onTaskChanged.fire({ taskId, field });
		_onDataChanged.fire();
	}
}

export function updateDoc(docId: string, field: string, value: unknown): void {
	const doc = _docs.find(d => d.id === docId);
	if (doc) {
		Object.assign(doc, { [field]: value });
		_onDocChanged.fire({ docId, field });
		_onDataChanged.fire();
	}
}

// -- Mock Data ----------------------------------------------------------------

const t = (id: string, title: string, priority: string, initials: string, color: string, tags: string[], description?: string, dueDate?: string, subtasks?: ISubtask[]): ITask => ({ id, title, priority, initials, color, tags, description: description || '', dueDate: dueDate || '', subtasks: subtasks || [] });

const _groups: IGroup[] = [
	{
		id: 'in_progress', name: 'In Progress', collapsed: false, tasks: [
			t('PRE-3', 'Build kanban board webview', 'critical', 'ML', '#10b981', ['frontend', 'core'], 'Implement the main kanban board as a VS Code webview panel.\n\n- 5 default columns (configurable)\n- Drag-and-drop between columns\n- Task card rendering with title, assignee avatar, priority badge\n- Filter bar (assignee, priority, label)', '2026-04-08', [
				{ title: 'Render column headers with task counts', done: true },
				{ title: 'Implement drag-and-drop between columns', done: true },
				{ title: 'Build task card component', done: false, assignee: 'ML' },
				{ title: 'Add filter bar with dropdowns', done: false, assignee: 'ML' },
			]),
			t('PRE-4', 'Implement task detail view', 'high', 'SR', '#f59e0b', ['frontend'], 'When a user clicks a task card, show a detail view with all fields inline-editable.\n\n- Title, status, priority, assignee\n- Description with markdown rendering\n- Comments thread\n- Linked documents and code snippets', '2026-04-11', [
				{ title: 'Metadata grid with inline editing', done: true },
				{ title: 'Description with click-to-edit', done: true },
				{ title: 'Comments section', done: true },
				{ title: 'Linked code snippets', done: false, assignee: 'SR' },
				{ title: 'Activity log', done: false },
			]),
			t('PRE-5', 'Create sidebar tree views', 'high', 'RB', '#ef4444', ['frontend'], 'Register tree view providers in the PRendgame activity bar.\n\n- My Tasks grouped by status\n- Documents grouped by type\n- Sprints with task counts', '2026-04-09'),
		]
	},
	{
		id: 'todo', name: 'To Do', collapsed: false, tasks: [
			t('PRE-6', 'Build document editor with PRD template', 'high', 'ML', '#10b981', ['docs'], '', '2026-04-14', [
				{ title: 'Markdown rendering in sidebar', done: true },
				{ title: 'Inline block editing', done: false, assignee: 'ML' },
				{ title: 'Template picker for new docs', done: false },
			]),
			t('PRE-7', 'Implement list view for tasks', 'medium', 'SR', '#f59e0b', ['frontend'], '', '2026-04-16'),
			t('PRE-8', 'Implement timeline view', 'medium', 'ML', '#10b981', ['frontend'], '', '2026-04-18'),
			t('PRE-15', 'Sprint dashboard view', 'medium', 'ML', '#10b981', ['dashboard'], '', '2026-04-18'),
			t('PRE-16', 'QA pass on kanban interactions', 'high', 'AQ', '#ec4899', ['qa'], '', '2026-04-11'),
		]
	},
	{ id: 'in_review', name: 'In Review', collapsed: false, tasks: [] },
	{
		id: 'backlog', name: 'Backlog', collapsed: true, tasks: [
			t('PRE-9', 'Expose MCP server tools', 'high', 'JP', '#06b6d4', ['mcp']),
			t('PRE-10', 'Build MCP activity log', 'medium', 'RB', '#ef4444', ['mcp']),
			t('PRE-11', 'Mock cloud sync indicator', 'low', 'SR', '#f59e0b', ['frontend']),
			t('PRE-12', 'Mock team presence avatars', 'low', 'RB', '#ef4444', ['frontend']),
			t('PRE-13', 'Write PRD for notifications', 'low', 'AC', '#6366f1', ['prd']),
			t('PRE-14', 'Mock paywall modal', 'low', 'SR', '#f59e0b', ['frontend']),
		]
	},
	{
		id: 'done', name: 'Done', collapsed: true, tasks: [
			t('PRE-1', 'Design auth flow for Supabase', 'critical', 'JP', '#06b6d4', ['auth']),
			t('PRE-2', 'Set up Supabase project and schema', 'critical', 'JP', '#06b6d4', ['backend']),
		]
	},
];

const _docs: IDoc[] = [
	{ id: 'doc-prd-v1', title: 'Core Task Management', type: 'prd', status: 'approved', priority: 'high', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 4, tasksDone: 2, updatedAt: 'Mar 28', dueDate: '2026-04-14', content: '## User Stories\n\nAs an engineer, I want to see my assigned tasks in a kanban board inside my IDE so that I never leave my editor to check task status.\n\nAs a PM, I want to create and prioritize tasks in the same tool engineers use so that handoff friction is eliminated.\n\nAs an AI agent, I want to read task state via MCP so that I can update status after completing work.\n\n## UX Description\n\nThe task board appears in the right sidebar as a collapsible grouped list. Each status group (Backlog, To Do, In Progress, In Review, Done) shows its tasks as compact rows with a priority bar, task ID, title, and assignee avatar. Users can drag tasks between groups to change status. Clicking a task opens a detail view with inline editing for all fields.\n\n## Requirements\n\n1. Board displays 5 default status columns: Backlog, To Do, In Progress, In Review, Done\n2. Drag-and-drop moves tasks between status groups and updates status\n3. Each task row shows: priority color bar, monospace ID, title, assignee avatar\n4. Filter bar supports filtering by assignee, priority, and tags\n5. Clicking a task card opens inline detail view with all fields editable\n6. Comments thread with inline add\n7. Activity log showing system-generated history\n\n## Acceptance Criteria\n\n- [ ] Board renders 5 status groups with correct task counts\n- [ ] Dragging a task between groups updates its status\n- [ ] Task detail opens inline with all fields editable\n- [ ] Filter bar narrows visible tasks by assignee, priority, tags\n- [ ] Comments can be added and appear in real time\n- [x] Activity log shows system-generated history entries\n\n## Notes\n\nConsider adding keyboard shortcuts for power users. The board should feel as fast as typing in a terminal. Sprint context should be optional (some teams use continuous flow).\n\n## Attachments\n\n- Figma mockups: figma.com/file/prendgame-board\n- Competitive analysis: docs/vision/competitive-analysis.md' },
	{ id: 'doc-prd-v2', title: 'Documentation & Diagrams', type: 'prd', status: 'draft', priority: 'medium', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 1, tasksDone: 0, updatedAt: 'Apr 1', dueDate: '2026-04-21', content: '## Overview\n\nEmbed a rich document editor inside PRendgame.\n\n## Goals\n\n1. PMs can author requirements without leaving the IDE\n2. Documents are first-class objects linked to tasks\n3. AI agents can read documents to understand context' },
	{ id: 'doc-prd-v3', title: 'AI-Native Integration (MCP)', type: 'prd', status: 'draft', priority: 'high', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 2, tasksDone: 0, updatedAt: 'Apr 4', dueDate: '2026-04-25', content: '## Overview\n\nPRendgame is the project context layer that AI agents plug into via MCP.\n\n## MCP Tools\n\n- prendgame.tasks.list\n- prendgame.tasks.get\n- prendgame.tasks.create\n- prendgame.tasks.transition\n- prendgame.docs.list\n- prendgame.docs.get' },
	{ id: 'doc-prd-v4', title: 'Cloud Sync & Collaboration', type: 'prd', status: 'draft', priority: 'medium', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 5, tasksDone: 2, updatedAt: 'Apr 5', dueDate: '2026-04-18', content: '## Overview\n\nSupabase-backed cloud sync for team collaboration.\n\n## Tiers\n\n- Free: Local tasks and docs\n- Team: Cloud sync, shared boards\n- Enterprise: SSO, audit logs' },
	{ id: 'doc-prd-v5', title: 'Product Workspace', type: 'prd', status: 'ready_for_dev', priority: 'critical', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 9', dueDate: '2026-04-16', content: '## Overview\n\nA Notion-style document workspace for Product Managers.\n\n## Goals\n\n1. PMs can create rich documents inside PRendgame\n2. Documents have custom attributes and multiple views\n3. Documents can be converted into engineering tasks' },
	{ id: 'doc-spec-auth', title: 'Authentication Architecture', type: 'spec', status: 'approved', priority: 'high', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 1, tasksDone: 1, updatedAt: 'Mar 30', dueDate: '', content: '## Approach\n\nSupabase Auth with email/password + GitHub OAuth.\n\n## Flow\n\n1. User clicks Sign In\n2. Browser opens for OAuth\n3. Redirect back to prendgame://\n4. Token stored in SecretStorage' },
	{ id: 'doc-story-onboard', title: 'PM Onboarding Flow', type: 'user_story', status: 'in_review', priority: 'medium', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 8', dueDate: '2026-04-15', content: '## As a new PM\n\nI want to quickly understand how to create documents and track sprints.\n\n## Acceptance Criteria\n\n- [ ] Welcome walkthrough\n- [ ] Template picker\n- [ ] Sample project' },
	{ id: 'doc-research-mcp', title: 'MCP Protocol Feasibility', type: 'research', status: 'approved', priority: 'low', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 3', dueDate: '', content: '## Summary\n\nMCP is viable for exposing PRendgame data to AI agents.\n\n## Findings\n\n- Claude Code supports MCP natively\n- Sub-100ms latency for local calls\n- Tool definitions are straightforward JSON schema' },
	{ id: 'doc-notes-retro', title: 'Sprint 1 Retrospective', type: 'meeting_notes', status: 'draft', priority: 'low', owner: 'Taylor Reeves', ownerInitials: 'TR', ownerColor: '#8b5cf6', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 4', dueDate: '2026-04-25', content: '## What went well\n\n- Auth flow completed ahead of schedule\n- Supabase schema is solid\n\n## What could improve\n\n- Need better task estimation\n- PR reviews took too long\n\n## Action items\n\n- [ ] Set up review SLAs\n- [ ] Add story points to tasks' },
];

const _members: ITeamMember[] = [
	{ id: 'user-001', name: 'Alex Chen', initials: 'AC', color: '#6366f1', role: 'PM' },
	{ id: 'user-002', name: 'Taylor Reeves', initials: 'TR', color: '#8b5cf6', role: 'EM' },
	{ id: 'user-003', name: 'Jordan Park', initials: 'JP', color: '#06b6d4', role: 'Senior Eng' },
	{ id: 'user-004', name: 'Morgan Liu', initials: 'ML', color: '#10b981', role: 'Senior Eng' },
	{ id: 'user-005', name: 'Sam Rivera', initials: 'SR', color: '#f59e0b', role: 'Junior Eng' },
	{ id: 'user-006', name: 'Riley Brooks', initials: 'RB', color: '#ef4444', role: 'Junior Eng' },
	{ id: 'user-007', name: 'Avery Quinn', initials: 'AQ', color: '#ec4899', role: 'QA' },
];

// -- Links --------------------------------------------------------------------

const _links: ILink[] = [
	// PRD v1 (Core Task Management) <-> PRE-3, PRE-4, PRE-5, PRE-7
	{ fromType: 'doc', fromId: 'doc-prd-v1', toType: 'task', toId: 'PRE-3' },
	{ fromType: 'doc', fromId: 'doc-prd-v1', toType: 'task', toId: 'PRE-4' },
	{ fromType: 'doc', fromId: 'doc-prd-v1', toType: 'task', toId: 'PRE-5' },
	{ fromType: 'doc', fromId: 'doc-prd-v1', toType: 'task', toId: 'PRE-7' },
	// Cloud Sync PRD <-> PRE-6, PRE-8
	{ fromType: 'doc', fromId: 'doc-prd-v4', toType: 'task', toId: 'PRE-6' },
	{ fromType: 'doc', fromId: 'doc-prd-v4', toType: 'task', toId: 'PRE-8' },
	// Auth spec <-> PRE-9
	{ fromType: 'doc', fromId: 'doc-spec-auth', toType: 'task', toId: 'PRE-9' },
];

export function getLinkedDocs(taskId: string): IDoc[] {
	const docIds = _links
		.filter(l => (l.fromType === 'task' && l.fromId === taskId && l.toType === 'doc') ||
			(l.toType === 'task' && l.toId === taskId && l.fromType === 'doc'))
		.map(l => l.fromType === 'doc' ? l.fromId : l.toId);
	return docIds.map(id => _docs.find(d => d.id === id)).filter((d): d is IDoc => d !== undefined);
}

export function getLinkedTasks(docId: string): ITask[] {
	const taskIds = _links
		.filter(l => (l.fromType === 'doc' && l.fromId === docId && l.toType === 'task') ||
			(l.toType === 'doc' && l.toId === docId && l.fromType === 'task'))
		.map(l => l.fromType === 'task' ? l.fromId : l.toId);
	return taskIds.map(id => findTask(id)).filter((t): t is ITask => t !== undefined);
}

export function addLink(link: ILink): void {
	const exists = _links.some(l =>
		l.fromType === link.fromType && l.fromId === link.fromId &&
		l.toType === link.toType && l.toId === link.toId
	);
	if (!exists) {
		_links.push(link);
		_onDataChanged.fire();
	}
}

export function isDocLocked(docId: string): boolean {
	const linkedTasks = getLinkedTasks(docId);
	const lockedStatuses = ['in_progress', 'in_review', 'done'];
	return linkedTasks.some(task => lockedStatuses.includes(findTaskGroup(task.id)));
}

export function getReadyForDevDocs(): IDoc[] {
	return _docs.filter(d => d.status === 'ready_for_dev');
}

export function createTasksFromDoc(docId: string): ITask[] {
	const doc = _docs.find(d => d.id === docId);
	if (!doc) { return []; }
	const nextId = _groups.reduce((max, g) => Math.max(max, ...g.tasks.map(t => parseInt(t.id.replace('PRE-', '')) || 0)), 0) + 1;
	const newTasks: ITask[] = [
		{ id: `PRE-${nextId}`, title: `Implement ${doc.title}`, priority: 'high', initials: 'ML', color: '#10b981', tags: ['from-doc'], description: `Auto-created from document: ${doc.title}`, dueDate: '', subtasks: [] },
		{ id: `PRE-${nextId + 1}`, title: `Write tests for ${doc.title}`, priority: 'medium', initials: 'SR', color: '#f59e0b', tags: ['from-doc'], description: `Test coverage for: ${doc.title}`, dueDate: '', subtasks: [] },
		{ id: `PRE-${nextId + 2}`, title: `QA review: ${doc.title}`, priority: 'medium', initials: 'AQ', color: '#ec4899', tags: ['qa', 'from-doc'], description: `QA pass for: ${doc.title}`, dueDate: '', subtasks: [] },
	];
	const todoGroup = _groups.find(g => g.id === 'todo');
	if (todoGroup) { todoGroup.tasks.push(...newTasks); }
	for (const task of newTasks) {
		_links.push({ fromType: 'doc', fromId: docId, toType: 'task', toId: task.id });
	}
	doc.tasksTotal += newTasks.length;
	_onDataChanged.fire();
	return newTasks;
}

// -- Accessors ----------------------------------------------------------------

// -- Org Context --------------------------------------------------------------

export interface IOrgContext {
	techStack: string;
	codingStandards: string;
	cicd: string;
	testing: string;
	commenting: string;
	aiInstructions: string;
}

const _orgContext: IOrgContext = {
	techStack: 'TypeScript, React, Node.js, PostgreSQL (Supabase), Tailwind CSS',
	codingStandards: '- Use functional components\n- Prefer const over let\n- Max 200 lines per file\n- Use barrel exports\n- Error boundaries on all routes',
	cicd: 'GitHub Actions. Push to main triggers: lint, test, build, deploy to staging. PR merge to production triggers production deploy.',
	testing: 'Vitest for unit tests. Playwright for E2E. 80% coverage minimum. Tests live next to source files (*.test.ts).',
	commenting: 'JSDoc on all exported functions. No inline comments unless logic is non-obvious. TODO comments must reference a task ID.',
	aiInstructions: 'Always read the linked PRD before starting. Follow the coding standards above. Write tests for new functions. Create a PR with a description that references the task ID.',
};

export function getOrgContext(): IOrgContext { return _orgContext; }
export function updateOrgContext(field: keyof IOrgContext, value: string): void {
	_orgContext[field] = value;
	_onDataChanged.fire();
}

// -- MCP Activity Log ---------------------------------------------------------

export interface IMcpLogEntry {
	timestamp: string;
	agent: string;
	agentColor: string;
	tool: string;
	params?: string;
	result: string;
}

const _mcpLog: IMcpLogEntry[] = [
	{ timestamp: '09:14:22', agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.org.getContext', result: 'Returned org context: TypeScript, React, Node.js, Supabase...' },
	{ timestamp: '09:14:23', agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.org.getAIInstructions', result: 'Always read the linked PRD before starting. Follow coding standards...' },
	{ timestamp: '09:14:25', agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.docs.getStructured', params: '{ id: "doc-prd-v1" }', result: 'Returned PRD: Core Task Management (7 requirements, 3 user stories)' },
	{ timestamp: '09:14:30', agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.tasks.get', params: '{ id: "PRE-3" }', result: 'Returned task: Build kanban board webview (critical, in_progress)' },
	{ timestamp: '09:32:15', agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.tasks.transition', params: '{ id: "PRE-3", status: "in_review" }', result: 'Task PRE-3 moved to In Review' },
	{ timestamp: '10:01:44', agent: 'Gemini Code Assist', agentColor: '#4285f4', tool: 'prendgame.org.getAIInstructions', result: 'Always read the linked PRD before starting...' },
	{ timestamp: '10:01:46', agent: 'Gemini Code Assist', agentColor: '#4285f4', tool: 'prendgame.tasks.list', params: '{ assignee: "SR", status: "todo" }', result: 'Returned 2 tasks: PRE-7, PRE-8' },
	{ timestamp: '10:02:10', agent: 'Gemini Code Assist', agentColor: '#4285f4', tool: 'prendgame.docs.getStructured', params: '{ id: "doc-prd-v4" }', result: 'Returned PRD: Cloud Sync & Collaboration (3 tiers, draft)' },
];

export function getMcpLog(): IMcpLogEntry[] { return _mcpLog; }

// -- Accessors ----------------------------------------------------------------

export function getGroups(): IGroup[] { return _groups; }
export function getDocs(): IDoc[] { return _docs; }
export function getMembers(): ITeamMember[] { return _members; }
