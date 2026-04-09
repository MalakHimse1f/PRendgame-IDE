/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, getWindow } from '../../../../base/browser/dom.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';

// -- Theme --------------------------------------------------------------------

const T = {
	// PRendgame brand palette (Linear-inspired dark premium)
	accent: '#6366f1',
	accentMuted: '#6366f120',
	accentSubtle: '#6366f10d',
	surface: '#141416',
	surfaceHover: '#1c1c20',
	border: '#1e1e22',
	borderSubtle: '#16161a',
	text: '#e4e4e7',
	textMuted: '#71717a',
	textFaint: '#52525b',
	radius: '6px',
	radiusSm: '4px',
	radiusPill: '10px',
};

const PRIORITY_COLORS: Record<string, string> = {
	critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#52525b',
};
const STATUS_COLORS: Record<string, string> = {
	in_progress: '#6366f1', todo: '#71717a', in_review: '#a855f7', backlog: '#3f3f46', done: '#22c55e',
};

// -- Data ---------------------------------------------------------------------

interface ITask { id: string; title: string; priority: string; initials: string; color: string; labels: string[]; description: string }
interface IGroup { id: string; name: string; tasks: ITask[]; collapsed: boolean }

function getGroups(): IGroup[] {
	const t = (id: string, title: string, priority: string, initials: string, color: string, labels: string[], description?: string): ITask => ({ id, title, priority, initials, color, labels, description: description || '' });
	return [
		{
			id: 'in_progress', name: 'In Progress', collapsed: false, tasks: [
				t('PRE-3', 'Build kanban board webview', 'critical', 'ML', '#10b981', ['frontend', 'core'], 'Implement the main kanban board as a VS Code webview panel.\n\n- 5 default columns (configurable)\n- Drag-and-drop between columns\n- Task card rendering with title, assignee avatar, priority badge\n- Filter bar (assignee, priority, label)'),
				t('PRE-4', 'Implement task detail view', 'high', 'SR', '#f59e0b', ['frontend'], 'When a user clicks a task card, show a detail view with all fields inline-editable.\n\n- Title, status, priority, assignee\n- Description with markdown rendering\n- Comments thread\n- Linked documents and code snippets'),
				t('PRE-5', 'Create sidebar tree views', 'high', 'RB', '#ef4444', ['frontend'], 'Register tree view providers in the PRendgame activity bar.\n\n- My Tasks grouped by status\n- Documents grouped by type\n- Sprints with task counts'),
			]
		},
		{
			id: 'todo', name: 'To Do', collapsed: false, tasks: [
				t('PRE-6', 'Build document editor with PRD template', 'high', 'ML', '#10b981', ['docs']),
				t('PRE-7', 'Implement list view for tasks', 'medium', 'SR', '#f59e0b', ['frontend']),
				t('PRE-8', 'Implement timeline view', 'medium', 'ML', '#10b981', ['frontend']),
				t('PRE-15', 'Sprint dashboard view', 'medium', 'ML', '#10b981', ['dashboard']),
				t('PRE-16', 'QA pass on kanban interactions', 'high', 'AQ', '#ec4899', ['qa']),
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
}

// -- Pane ---------------------------------------------------------------------

export class PRendgameBoardPane extends ViewPane {

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		const root = append(container, $('div'));
		root.style.cssText = `overflow-y:auto;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased;`;
		renderBoardContent(root, this.commandService);
	}
}

export function renderBoardContent(root: HTMLElement, commandService: { executeCommand(id: string, ...args: unknown[]): unknown }): void {

	const groups = getGroups();
	const members = [
		{ id: 'user-001', name: 'Alex Chen', initials: 'AC', color: '#6366f1', role: 'PM' },
		{ id: 'user-002', name: 'Taylor Reeves', initials: 'TR', color: '#8b5cf6', role: 'EM' },
		{ id: 'user-003', name: 'Jordan Park', initials: 'JP', color: '#06b6d4', role: 'Senior Eng' },
		{ id: 'user-004', name: 'Morgan Liu', initials: 'ML', color: '#10b981', role: 'Senior Eng' },
		{ id: 'user-005', name: 'Sam Rivera', initials: 'SR', color: '#f59e0b', role: 'Junior Eng' },
		{ id: 'user-006', name: 'Riley Brooks', initials: 'RB', color: '#ef4444', role: 'Junior Eng' },
		{ id: 'user-007', name: 'Avery Quinn', initials: 'AQ', color: '#ec4899', role: 'QA' },
	];

	// Drill-in containers
	const boardContainer = append(root, $('div'));
	const detailContainer = append(root, $('div'));
	detailContainer.style.display = 'none';
	let activeTaskId: string | null = null;

	function findTask(taskId: string): ITask | undefined {
		for (const g of groups) {
			const t = g.tasks.find(tt => tt.id === taskId);
			if (t) { return t; }
		}
		return undefined;
	}

	function findTaskGroup(taskId: string): string {
		for (const g of groups) {
			if (g.tasks.some(tt => tt.id === taskId)) { return g.id; }
		}
		return '';
	}

	function showBoard() {
		activeTaskId = null;
		boardContainer.style.display = '';
		detailContainer.style.display = 'none';
	}

	function showDetail(taskId: string) {
		activeTaskId = taskId;
		boardContainer.style.display = 'none';
		detailContainer.style.display = '';
		renderTaskDetail();
	}

	function renderTaskDetail() {
		detailContainer.textContent = '';
		const task = findTask(activeTaskId || '');
		if (!task) { showBoard(); return; }
		const groupId = findTaskGroup(task.id);
		const statusLabel = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }[groupId] || groupId;

		// Back
		const backRow = append(detailContainer, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { showBoard(); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = 'Board';

		// Header
		const header = append(detailContainer, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		// Task ID
		const idEl = append(header, $('span'));
		idEl.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
		idEl.textContent = task.id;

		// Editable title
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:6px;cursor:text;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;letter-spacing:-0.01em;`;
		titleEl.textContent = task.title;
		titleEl.addEventListener('mouseenter', () => { titleEl.style.background = T.surfaceHover; });
		titleEl.addEventListener('mouseleave', () => { titleEl.style.background = ''; });
		titleEl.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = task.title;
			input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:4px 8px;border-radius:${T.radiusSm};font-size:16px;font-weight:600;font-family:inherit;outline:none;`;
			titleEl.textContent = '';
			titleEl.appendChild(input);
			input.focus();
			input.select();
			const finish = () => { const v = input.value.trim(); if (v) { task.title = v; } titleEl.textContent = task.title; };
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { input.blur(); } if (ke.key === 'Escape') { input.value = task.title; input.blur(); } });
		});

		// Metadata grid
		const metaGrid = append(detailContainer, $('div'));
		metaGrid.style.cssText = `padding:12px 20px;border-bottom:1px solid ${T.border};display:grid;grid-template-columns:80px 1fr;gap:6px 12px;align-items:center;`;

		// Status
		const statusLbl = append(metaGrid, $('span'));
		statusLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		statusLbl.textContent = 'Status';
		const statusWrap = append(metaGrid, $('div'));
		statusWrap.style.cssText = 'position:relative;';
		const statusPill = append(statusWrap, $('span'));
		let sc = STATUS_COLORS[groupId] || '#666';
		const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
		const taskStatusLabels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
		statusPill.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};cursor:pointer;font-weight:500;`;
		statusPill.textContent = statusLabel + ' \u25BE';
		let statusDropdown: HTMLElement | null = null;
		statusPill.addEventListener('click', () => {
			if (statusDropdown) { statusDropdown.remove(); statusDropdown = null; return; }
			const dd = append(statusWrap, $('div'));
			statusDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:130px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const s of taskStatuses) {
				const opt = append(dd, $('div'));
				const osc = STATUS_COLORS[s] || '#666';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${osc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = taskStatusLabels[s] || s;
				opt.addEventListener('click', (e) => { e.stopPropagation(); sc = osc; statusPill.style.background = `${sc}20`; statusPill.style.color = sc; statusPill.textContent = (taskStatusLabels[s] || s) + ' \u25BE'; dd.remove(); statusDropdown = null; });
			}
			const w = getWindow(statusWrap);
			const closeFn = (e: Event) => { if (!statusWrap.contains(e.target as Node)) { dd.remove(); statusDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Priority
		const prioLbl = append(metaGrid, $('span'));
		prioLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		prioLbl.textContent = 'Priority';
		const prioWrap = append(metaGrid, $('div'));
		prioWrap.style.cssText = 'position:relative;';
		const prioPill = append(prioWrap, $('span'));
		let pc = PRIORITY_COLORS[task.priority] || '#52525b';
		const prioLabels: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
		const priorities = ['low', 'medium', 'high', 'critical'];
		prioPill.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${pc}20;color:${pc};cursor:pointer;font-weight:500;`;
		prioPill.textContent = (prioLabels[task.priority] || task.priority) + ' \u25BE';
		let prioDropdown: HTMLElement | null = null;
		prioPill.addEventListener('click', () => {
			if (prioDropdown) { prioDropdown.remove(); prioDropdown = null; return; }
			const dd = append(prioWrap, $('div'));
			prioDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:110px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const p of priorities) {
				const opt = append(dd, $('div'));
				const opc = PRIORITY_COLORS[p] || '#52525b';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${opc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = prioLabels[p] || p;
				opt.addEventListener('click', (e) => { e.stopPropagation(); task.priority = p; pc = opc; prioPill.style.background = `${pc}20`; prioPill.style.color = pc; prioPill.textContent = (prioLabels[p] || p) + ' \u25BE'; dd.remove(); prioDropdown = null; });
			}
			const w = getWindow(prioWrap);
			const closeFn = (e: Event) => { if (!prioWrap.contains(e.target as Node)) { dd.remove(); prioDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Assignee (dropdown)
		const assigneeLbl = append(metaGrid, $('span'));
		assigneeLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		assigneeLbl.textContent = 'Assignee';
		const assigneeWrap = append(metaGrid, $('div'));
		assigneeWrap.style.cssText = 'position:relative;';
		const assigneeBtn = append(assigneeWrap, $('span'));
		assigneeBtn.style.cssText = `display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.text};cursor:pointer;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		const memberMatch = members.find(m => m.initials === task.initials);

		function renderAssignee() {
			assigneeBtn.textContent = '';
			const av = append(assigneeBtn, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;background:${task.color};`;
			av.textContent = task.initials;
			const nm = append(assigneeBtn, $('span'));
			const m = members.find(mm => mm.initials === task.initials);
			nm.textContent = (m ? m.name : task.initials) + ' \u25BE';
		}
		renderAssignee();

		assigneeBtn.addEventListener('mouseenter', () => { assigneeBtn.style.background = T.surfaceHover; });
		assigneeBtn.addEventListener('mouseleave', () => { assigneeBtn.style.background = ''; });

		let assigneeDropdown: HTMLElement | null = null;
		assigneeBtn.addEventListener('click', () => {
			if (assigneeDropdown) { assigneeDropdown.remove(); assigneeDropdown = null; return; }
			const dd = append(assigneeWrap, $('div'));
			assigneeDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const m of members) {
				const opt = append(dd, $('div'));
				const isActive = task.initials === m.initials;
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${isActive ? T.text : T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const oav = append(opt, $('span'));
				oav.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${m.color};`;
				oav.textContent = m.initials;
				const ol = append(opt, $('span'));
				ol.textContent = m.name;
				if (isActive) { ol.style.fontWeight = '600'; }
				const or = append(opt, $('span'));
				or.style.cssText = `margin-left:auto;font-size:10px;color:${T.textFaint};`;
				or.textContent = m.role;
				opt.addEventListener('click', (e) => {
					e.stopPropagation();
					task.initials = m.initials;
					task.color = m.color;
					renderAssignee();
					dd.remove();
					assigneeDropdown = null;
				});
			}
			const w = getWindow(assigneeWrap);
			const closeFn = (e: Event) => { if (!assigneeWrap.contains(e.target as Node)) { dd.remove(); assigneeDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Labels
		const labelsLbl = append(metaGrid, $('span'));
		labelsLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		labelsLbl.textContent = 'Labels';
		const labelsEl = append(metaGrid, $('div'));
		labelsEl.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
		for (const l of task.labels) {
			const lbl = append(labelsEl, $('span'));
			lbl.style.cssText = `font-size:10px;padding:2px 8px;border-radius:${T.radiusPill};background:${T.border};color:${T.textMuted};`;
			lbl.textContent = l;
		}

		// Description
		const descSection = append(detailContainer, $('div'));
		descSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const descTitle = append(descSection, $('div'));
		descTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
		descTitle.textContent = 'Description';
		const descContent = append(descSection, $('div'));
		descContent.style.cssText = `font-size:13px;line-height:1.7;color:${T.text};cursor:text;padding:4px;border-radius:${T.radiusSm};transition:background 0.1s;min-height:40px;`;
		const descText = task.description || 'Click to add a description...';

		function renderDesc() {
			descContent.textContent = '';
			const lines = (task.description || descText).split('\n');
			for (const line of lines) {
				if (line.startsWith('- ')) {
					const el = append(descContent, $('div'));
					el.style.cssText = `margin:2px 0;padding-left:12px;`;
					el.textContent = '\u2022 ' + line.slice(2);
				} else if (line.trim() === '') {
					append(descContent, $('br'));
				} else {
					const el = append(descContent, $('div'));
					el.style.cssText = 'margin:2px 0;';
					el.textContent = line;
				}
			}
		}
		renderDesc();

		descContent.addEventListener('mouseenter', () => { descContent.style.background = T.surfaceHover; });
		descContent.addEventListener('mouseleave', () => { descContent.style.background = ''; });
		descContent.addEventListener('click', () => {
			const textarea = document.createElement('textarea');
			textarea.value = task.description || '';
			textarea.style.cssText = `width:100%;box-sizing:border-box;min-height:120px;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:8px;border-radius:${T.radius};font-size:13px;font-family:inherit;line-height:1.6;outline:none;resize:vertical;`;
			descContent.textContent = '';
			descContent.appendChild(textarea);
			textarea.focus();
			textarea.addEventListener('blur', () => { task.description = textarea.value; renderDesc(); });
			textarea.addEventListener('keydown', (ke) => { if (ke.key === 'Escape') { renderDesc(); } });
		});

		// Comments
		const commentsSection = append(detailContainer, $('div'));
		commentsSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		const mockComments: { author: string; initials: string; color: string; text: string; time: string }[] = [
			{ author: 'Alex Chen', initials: 'AC', color: '#6366f1', text: 'Please make sure the acceptance criteria cover edge cases for empty states.', time: '2 days ago' },
			{ author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text: 'Good call. I will add handling for the zero-task state and loading skeleton.', time: 'Yesterday' },
			{ author: 'Avery Quinn', initials: 'AQ', color: '#ec4899', text: 'Adding this to my QA checklist.', time: '3 hours ago' },
		];

		const commentsTitle = append(commentsSection, $('div'));
		commentsTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		commentsTitle.textContent = `Comments (${mockComments.length})`;

		const commentsList = append(commentsSection, $('div'));

		function renderComment(c: { author: string; initials: string; color: string; text: string; time: string }) {
			const entry = append(commentsList, $('div'));
			entry.style.cssText = `margin-bottom:12px;`;

			const header = append(entry, $('div'));
			header.style.cssText = `display:flex;align-items:center;gap:6px;margin-bottom:3px;`;

			const cav = append(header, $('span'));
			cav.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${c.color};flex-shrink:0;`;
			cav.textContent = c.initials;

			const cname = append(header, $('span'));
			cname.style.cssText = `font-size:12px;font-weight:500;color:${T.text};`;
			cname.textContent = c.author;

			const ctime = append(header, $('span'));
			ctime.style.cssText = `font-size:10px;color:${T.textFaint};margin-left:auto;`;
			ctime.textContent = c.time;

			const cbody = append(entry, $('div'));
			cbody.style.cssText = `font-size:12px;color:${T.textMuted};line-height:1.5;padding-left:24px;`;
			cbody.textContent = c.text;
		}

		for (const c of mockComments) { renderComment(c); }

		// Add comment input
		const addRow = append(commentsSection, $('div'));
		addRow.style.cssText = `display:flex;gap:8px;margin-top:8px;`;

		const commentInput = document.createElement('input');
		commentInput.type = 'text';
		commentInput.placeholder = 'Add a comment...';
		commentInput.style.cssText = `flex:1;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:6px 10px;border-radius:${T.radiusSm};font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;`;
		commentInput.addEventListener('focus', () => { commentInput.style.borderColor = T.accent; });
		commentInput.addEventListener('blur', () => { commentInput.style.borderColor = T.border; });
		addRow.appendChild(commentInput);

		const sendBtn = append(addRow, $('span'));
		sendBtn.style.cssText = `padding:6px 14px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;font-size:11px;font-weight:500;cursor:pointer;transition:opacity 0.12s;flex-shrink:0;`;
		sendBtn.textContent = 'Send';
		sendBtn.addEventListener('mouseenter', () => { sendBtn.style.opacity = '0.85'; });
		sendBtn.addEventListener('mouseleave', () => { sendBtn.style.opacity = '1'; });

		function addComment() {
			const text = commentInput.value.trim();
			if (!text) { return; }
			const newComment = { author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text, time: 'Just now' };
			mockComments.push(newComment);
			renderComment(newComment);
			commentsTitle.textContent = `Comments (${mockComments.length})`;
			commentInput.value = '';
		}

		sendBtn.addEventListener('click', addComment);
		commentInput.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { addComment(); } });

		// Linked Code
		const codeSection = append(detailContainer, $('div'));
		codeSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		const codeTitle = append(codeSection, $('div'));
		codeTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		codeTitle.textContent = 'Linked Code';

		const mockSnippets = [
			{ file: 'src/vs/workbench/contrib/prendgame/browser/prendgameBoardPane.ts', lines: '117-238', code: 'export function renderBoardContent(\n  root: HTMLElement,\n  commandService: { ... }\n): void {\n  const groups = getGroups();' },
			{ file: 'extensions/prendgame/src/extension.js', lines: '236-265', code: 'context.subscriptions.push(\n  vscode.commands.registerCommand(\n    \'prendgame.openTaskDetail\',\n    (taskId) => { ... }\n  )\n);' },
		];

		for (const snip of mockSnippets) {
			const snippetEl = append(codeSection, $('div'));
			snippetEl.style.cssText = `margin-bottom:10px;border:1px solid ${T.border};border-radius:${T.radius};overflow:hidden;`;

			const snippetHeader = append(snippetEl, $('div'));
			snippetHeader.style.cssText = `display:flex;align-items:center;gap:6px;padding:6px 10px;background:${T.surface};border-bottom:1px solid ${T.border};`;

			const fileIcon = append(snippetHeader, $('span'));
			fileIcon.style.cssText = `font-size:12px;color:${T.textFaint};`;
			fileIcon.textContent = '\u{1F4C4}';

			const fileName = append(snippetHeader, $('span'));
			fileName.style.cssText = `font-size:11px;color:${T.text};font-family:var(--monaco-monospace-font);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			fileName.textContent = snip.file;

			const lineRange = append(snippetHeader, $('span'));
			lineRange.style.cssText = `font-size:10px;color:${T.textFaint};white-space:nowrap;`;
			lineRange.textContent = `L${snip.lines}`;

			const codeBlock = append(snippetEl, $('div'));
			codeBlock.style.cssText = `padding:8px 10px;font-family:var(--monaco-monospace-font);font-size:11px;line-height:1.5;color:#a5b4fc;white-space:pre;overflow-x:auto;`;
			codeBlock.textContent = snip.code;
		}

		const linkCodeBtn = append(codeSection, $('div'));
		linkCodeBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:6px;border-radius:${T.radiusSm};border:1px dashed ${T.border};cursor:pointer;font-size:11px;color:${T.textMuted};transition:all 0.12s;margin-top:6px;`;
		linkCodeBtn.textContent = '+ Link Code';
		linkCodeBtn.addEventListener('mouseenter', () => { linkCodeBtn.style.color = T.text; linkCodeBtn.style.borderColor = T.accent; linkCodeBtn.style.background = T.surfaceHover; });
		linkCodeBtn.addEventListener('mouseleave', () => { linkCodeBtn.style.color = T.textMuted; linkCodeBtn.style.borderColor = T.border; linkCodeBtn.style.background = ''; });

		// Open in Editor button
		const btnWrap = append(detailContainer, $('div'));
		btnWrap.style.cssText = `padding:12px 20px;`;
		const openBtn = append(btnWrap, $('div'));
		openBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:7px;border-radius:${T.radius};border:1px solid ${T.border};cursor:pointer;font-size:11px;font-weight:500;color:${T.textMuted};transition:all 0.15s;`;
		openBtn.textContent = 'Open in Editor';
		openBtn.addEventListener('mouseenter', () => { openBtn.style.color = T.text; openBtn.style.borderColor = T.accent; openBtn.style.background = T.surfaceHover; });
		openBtn.addEventListener('mouseleave', () => { openBtn.style.color = T.textMuted; openBtn.style.borderColor = T.border; openBtn.style.background = ''; });
		openBtn.addEventListener('click', () => { commandService.executeCommand('prendgame.openTaskDetail', task.id); });
	}

	// Drag state
	let dragTaskId: string | null = null;
	let dragSourceGroup: string | null = null;
	const dropZones: { el: HTMLElement; groupId: string }[] = [];
	const cardsContainers: { el: HTMLElement; groupId: string }[] = [];
	const badges: { el: HTMLElement; groupId: string }[] = [];
	const twisties: { el: HTMLElement; groupId: string }[] = [];
	const taskRows: { el: HTMLElement; task: ITask; groupId: string }[] = [];

	function clearDropHighlights() {
		for (const dz of dropZones) {
			dz.el.style.cssText = `height:0;transition:height 0.2s ease,opacity 0.2s;overflow:hidden;opacity:0;`;
		}
	}

	function showDropHighlights() {
		for (const dz of dropZones) {
			if (dz.groupId !== dragSourceGroup) {
				dz.el.style.cssText = `height:32px;margin:3px 20px;border-radius:${T.radius};background:${T.accentMuted};border:1px dashed ${T.accent};transition:height 0.2s ease,opacity 0.2s;display:flex;align-items:center;justify-content:center;font-size:11px;color:${T.accent};opacity:1;`;
				dz.el.textContent = 'Drop here';
			}
		}
	}

	function moveTask(taskId: string, targetGroupId: string) {
		let task: ITask | undefined;
		for (const g of groups) {
			const idx = g.tasks.findIndex(tt => tt.id === taskId);
			if (idx !== -1) {
				task = g.tasks.splice(idx, 1)[0];
				const srcContainer = cardsContainers.find(c => c.groupId === g.id);
				const srcBadge = badges.find(b => b.groupId === g.id);
				if (srcContainer) {
					const rows = srcContainer.el.children;
					for (let i = 0; i < rows.length; i++) {
						if ((rows[i] as HTMLElement).dataset.taskId === taskId) {
							srcContainer.el.removeChild(rows[i]);
							break;
						}
					}
				}
				if (srcBadge) { srcBadge.el.textContent = String(g.tasks.length); }
				break;
			}
		}
		if (!task) { return; }
		const targetGroup = groups.find(g => g.id === targetGroupId);
		if (!targetGroup) { return; }
		targetGroup.tasks.push(task);
		const tgtContainer = cardsContainers.find(c => c.groupId === targetGroupId);
		const tgtBadge = badges.find(b => b.groupId === targetGroupId);
		const tgtTwistie = twisties.find(tw => tw.groupId === targetGroupId);
		if (tgtBadge) { tgtBadge.el.textContent = String(targetGroup.tasks.length); }
		if (tgtContainer && tgtContainer.el.style.display === 'none') {
			tgtContainer.el.style.display = '';
			if (tgtTwistie) { tgtTwistie.el.style.transform = 'rotate(90deg)'; }
		}
		if (tgtContainer) { renderTaskRow(tgtContainer.el, task, targetGroupId); }
	}

	function renderTaskRow(parent: HTMLElement, task: ITask, groupId?: string) {
		const row = append(parent, $('div'));
		row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px 6px 42px;cursor:pointer;transition:background 0.1s;border-radius:${T.radiusSm};margin:0 4px;`;
		row.dataset.taskId = task.id;
		row.draggable = true;
		taskRows.push({ el: row, task, groupId: groupId || '' });

		row.addEventListener('mouseenter', () => { if (!dragTaskId) { row.style.background = T.surfaceHover; } });
		row.addEventListener('mouseleave', () => { row.style.background = ''; });

		let didDrag = false;
		row.addEventListener('click', () => {
			if (!didDrag) { showDetail(task.id); }
			didDrag = false;
		});

		row.addEventListener('dragstart', (e) => {
			didDrag = true;
			dragTaskId = task.id;
			for (const g of groups) {
				if (g.tasks.some(tt => tt.id === task.id)) { dragSourceGroup = g.id; break; }
			}
			row.style.opacity = '0.3';
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', task.id);
			}
			showDropHighlights();
		});
		row.addEventListener('dragend', () => {
			dragTaskId = null;
			dragSourceGroup = null;
			row.style.opacity = '1';
			clearDropHighlights();
		});

		// Priority bar
		const pBar = append(row, $('span'));
		const pc = PRIORITY_COLORS[task.priority] || '#52525b';
		pBar.style.cssText = `width:3px;height:16px;border-radius:2px;background:${pc};flex-shrink:0;`;

		// Task ID
		const tid = append(row, $('span'));
		tid.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;min-width:42px;`;
		tid.textContent = task.id;

		// Task title
		const title = append(row, $('span'));
		title.style.cssText = `font-size:13px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em;`;
		title.textContent = task.title;
		title.title = task.title;

		// Assignee
		const av = append(row, $('span'));
		av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;flex-shrink:0;background:${task.color};letter-spacing:0;`;
		av.textContent = task.initials;
		av.title = task.initials;
	}

	// == Sprint bar ===========================================================
	const sprint = append(boardContainer, $('div'));
	sprint.style.cssText = `display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${T.border};`;

	const sprintIndicator = append(sprint, $('span'));
	sprintIndicator.style.cssText = `width:8px;height:8px;border-radius:50%;background:${T.accent};flex-shrink:0;`;

	const sprintInfo = append(sprint, $('div'));
	sprintInfo.style.cssText = 'display:flex;flex-direction:column;gap:1px;flex:1;';

	const sprintName = append(sprintInfo, $('span'));
	sprintName.style.cssText = `font-size:13px;font-weight:600;color:${T.text};letter-spacing:-0.01em;`;
	sprintName.textContent = 'Sprint 2 \u00B7 Core UI';

	const sprintDates = append(sprintInfo, $('span'));
	sprintDates.style.cssText = `font-size:11px;color:${T.textMuted};`;
	sprintDates.textContent = 'April 7 \u2013 18, 2026';

	// == Search ===============================================================
	const searchWrap = append(boardContainer, $('div'));
	searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;

	const searchInput = append(searchWrap, $('input'));
	searchInput.type = 'text';
	searchInput.placeholder = 'Filter tasks\u2026';
	searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
	searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
	searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });

	searchInput.addEventListener('input', () => {
		const q = searchInput.value.toLowerCase().trim();
		for (const entry of taskRows) {
			const tt = entry.task;
			const match = !q
				|| tt.id.toLowerCase().includes(q)
				|| tt.title.toLowerCase().includes(q)
				|| tt.labels.some(l => l.toLowerCase().includes(q))
				|| tt.initials.toLowerCase().includes(q)
				|| tt.priority.toLowerCase().includes(q);
			entry.el.style.display = match ? '' : 'none';
		}
		for (const b of badges) {
			const visibleCount = taskRows.filter(r => r.groupId === b.groupId && r.el.style.display !== 'none').length;
			b.el.textContent = String(visibleCount);
		}
	});

	// == Summary pills ========================================================
	const pills = append(boardContainer, $('div'));
	pills.style.cssText = `display:flex;gap:8px;padding:10px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

	const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);

	for (const g of groups) {
		if (g.tasks.length === 0) { continue; }
		const pill = append(pills, $('span'));
		const sc = STATUS_COLORS[g.id] || '#52525b';
		pill.style.cssText = `display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}15;color:${sc};font-weight:500;letter-spacing:0;`;

		const pillDot = append(pill, $('span'));
		pillDot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sc};`;
		pill.appendChild(document.createTextNode(`${g.tasks.length} ${g.name.toLowerCase()}`));
	}

	const totalLabel = append(pills, $('span'));
	totalLabel.style.cssText = `font-size:11px;color:${T.textFaint};margin-left:auto;`;
	totalLabel.textContent = `${totalTasks} total`;

	// == Groups ===============================================================
	for (const group of groups) {
		const hdr = append(boardContainer, $('div'));
		hdr.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;user-select:none;transition:background 0.1s;`;
		hdr.addEventListener('mouseenter', () => { hdr.style.background = T.surfaceHover; });
		hdr.addEventListener('mouseleave', () => { hdr.style.background = ''; });

		// Twistie
		const twistie = append(hdr, $('span'));
		twistie.style.cssText = `width:16px;font-size:10px;text-align:center;color:${T.textFaint};transition:transform 0.15s ease;`;
		twistie.textContent = '\u25B6';
		if (!group.collapsed) { twistie.style.transform = 'rotate(90deg)'; }
		twisties.push({ el: twistie, groupId: group.id });

		// Status square
		const statusSquare = append(hdr, $('span'));
		const sc = STATUS_COLORS[group.id] || '#52525b';
		statusSquare.style.cssText = `width:8px;height:8px;border-radius:2px;background:${sc};flex-shrink:0;`;

		// Label
		const label = append(hdr, $('span'));
		label.style.cssText = `font-size:12px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;`;
		label.textContent = group.name;

		// Count badge
		const badge = append(hdr, $('span'));
		badge.style.cssText = `font-size:10px;background:${T.border};color:${T.textMuted};padding:1px 7px;border-radius:${T.radiusPill};margin-left:auto;min-width:20px;text-align:center;font-weight:500;`;
		badge.textContent = String(group.tasks.length);
		badges.push({ el: badge, groupId: group.id });

		// Drop zone
		const dz = append(boardContainer, $('div'));
		dz.style.cssText = `height:0;transition:height 0.2s ease,opacity 0.2s;overflow:hidden;opacity:0;`;
		dropZones.push({ el: dz, groupId: group.id });

		dz.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) { e.dataTransfer.dropEffect = 'move'; }
			dz.style.background = `${T.accent}30`;
		});
		dz.addEventListener('dragleave', () => { dz.style.background = T.accentMuted; });
		dz.addEventListener('drop', (e) => {
			e.preventDefault();
			if (dragTaskId) { moveTask(dragTaskId, group.id); }
			clearDropHighlights();
		});

		// Cards container
		const cards = append(boardContainer, $('div'));
		cards.style.cssText = 'padding:2px 0;';
		if (group.collapsed) { cards.style.display = 'none'; }
		cardsContainers.push({ el: cards, groupId: group.id });

		// Separator
		const sep = append(boardContainer, $('div'));
		sep.style.cssText = `height:1px;background:${T.borderSubtle};margin:0 20px;`;

		// Toggle
		hdr.addEventListener('click', () => {
			const wasHidden = cards.style.display === 'none';
			cards.style.display = wasHidden ? '' : 'none';
			twistie.style.transform = wasHidden ? 'rotate(90deg)' : 'rotate(0deg)';
		});

		for (const task of group.tasks) {
			renderTaskRow(cards, task, group.id);
		}
	}

	// == Sprint progress ======================================================
	const progressSection = append(boardContainer, $('div'));
	progressSection.style.cssText = `padding:16px 20px;border-top:1px solid ${T.border};`;

	const progressLabel = append(progressSection, $('div'));
	progressLabel.style.cssText = `font-size:11px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
	progressLabel.textContent = 'Sprint Progress';

	const doneTasks = groups.find(g => g.id === 'done')?.tasks.length || 0;
	const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	const barBg = append(progressSection, $('div'));
	barBg.style.cssText = `height:6px;border-radius:3px;background:${T.border};overflow:hidden;margin-bottom:6px;`;

	const barFill = append(barBg, $('div'));
	barFill.style.cssText = `height:100%;border-radius:3px;background:${STATUS_COLORS.done};width:${pct}%;transition:width 0.4s ease;`;

	const barText = append(progressSection, $('div'));
	barText.style.cssText = `font-size:11px;color:${T.textFaint};`;
	barText.textContent = `${doneTasks} of ${totalTasks} complete (${pct}%)`;

	// == Action buttons =======================================================
	const actions = append(boardContainer, $('div'));
	actions.style.cssText = `display:flex;gap:8px;padding:8px 20px 20px;`;

	const makeBtn = (btnLabel: string, command: string, isPrimary?: boolean) => {
		const b = append(actions, $('div'));
		const bg = isPrimary ? T.accent : 'transparent';
		const fg = isPrimary ? '#fff' : T.textMuted;
		const border = isPrimary ? T.accent : T.border;
		b.style.cssText = `flex:1;display:flex;align-items:center;justify-content:center;padding:7px;border-radius:${T.radius};border:1px solid ${border};cursor:pointer;font-size:11px;font-weight:500;color:${fg};background:${bg};transition:all 0.15s;letter-spacing:0;`;
		b.textContent = btnLabel;
		b.addEventListener('mouseenter', () => {
			if (isPrimary) { b.style.opacity = '0.85'; }
			else { b.style.color = T.text; b.style.borderColor = T.accent; b.style.background = T.surfaceHover; }
		});
		b.addEventListener('mouseleave', () => {
			if (isPrimary) { b.style.opacity = '1'; }
			else { b.style.color = fg; b.style.borderColor = border; b.style.background = 'transparent'; }
		});
		b.addEventListener('click', () => { commandService.executeCommand(command); });
	};

	makeBtn('Board', 'prendgame.openBoard', true);
	makeBtn('Sprint', 'prendgame.openSprintDashboard');
	makeBtn('MCP Log', 'prendgame.openMcpLog');
}
