/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append } from '../../../../base/browser/dom.js';
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

interface ITask { id: string; title: string; priority: string; initials: string; color: string; labels: string[] }
interface IGroup { id: string; name: string; tasks: ITask[]; collapsed: boolean }

function getGroups(): IGroup[] {
	const t = (id: string, title: string, priority: string, initials: string, color: string, labels: string[]): ITask => ({ id, title, priority, initials, color, labels });
	return [
		{
			id: 'in_progress', name: 'In Progress', collapsed: false, tasks: [
				t('PRE-3', 'Build kanban board webview', 'critical', 'ML', '#10b981', ['frontend', 'core']),
				t('PRE-4', 'Implement task detail view', 'high', 'SR', '#f59e0b', ['frontend']),
				t('PRE-5', 'Create sidebar tree views', 'high', 'RB', '#ef4444', ['frontend']),
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

		const groups = getGroups();

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

		const commandService = this.commandService;

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
				if (!didDrag) { commandService.executeCommand('prendgame.openTaskDetail', task.id); }
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
		const sprint = append(root, $('div'));
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
		const searchWrap = append(root, $('div'));
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
		const pills = append(root, $('div'));
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
			const hdr = append(root, $('div'));
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
			const dz = append(root, $('div'));
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
			const cards = append(root, $('div'));
			cards.style.cssText = 'padding:2px 0;';
			if (group.collapsed) { cards.style.display = 'none'; }
			cardsContainers.push({ el: cards, groupId: group.id });

			// Separator
			const sep = append(root, $('div'));
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
		const progressSection = append(root, $('div'));
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
		const actions = append(root, $('div'));
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
			b.addEventListener('click', () => { this.commandService.executeCommand(command); });
		};

		makeBtn('Board', 'prendgame.openBoard', true);
		makeBtn('Sprint', 'prendgame.openSprintDashboard');
		makeBtn('MCP Log', 'prendgame.openMcpLog');
	}
}
