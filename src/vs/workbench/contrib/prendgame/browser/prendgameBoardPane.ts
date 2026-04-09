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

// -- Data ---------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
	critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#52525b',
};
const STATUS_COLORS: Record<string, string> = {
	in_progress: '#3b82f6', todo: '#6b7280', in_review: '#a855f7', backlog: '#52525b', done: '#22c55e',
};

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
		root.style.cssText = 'overflow-y:auto;height:100%;';

		const groups = getGroups();

		// Drag state
		let dragTaskId: string | null = null;
		let dragSourceGroup: string | null = null;
		const dropZones: { el: HTMLElement; groupId: string }[] = [];
		const cardsContainers: { el: HTMLElement; groupId: string }[] = [];
		const badges: { el: HTMLElement; groupId: string }[] = [];
		const twisties: { el: HTMLElement; groupId: string }[] = [];

		// Filter state
		const taskRows: { el: HTMLElement; task: ITask; groupId: string }[] = [];

		function clearDropHighlights() {
			for (const dz of dropZones) {
				dz.el.style.cssText = 'height:0;transition:height 0.15s,background 0.15s,margin 0.15s;overflow:hidden;';
			}
		}

		function showDropHighlights() {
			for (const dz of dropZones) {
				if (dz.groupId !== dragSourceGroup) {
					dz.el.style.cssText = 'height:28px;margin:2px 16px;border-radius:4px;background:color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent);border:1px dashed var(--vscode-focusBorder);transition:height 0.15s,background 0.15s,margin 0.15s;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--vscode-descriptionForeground);';
					dz.el.textContent = 'Drop here';
				}
			}
		}

		function moveTask(taskId: string, targetGroupId: string) {
			// Find and remove from source
			let task: ITask | undefined;
			for (const g of groups) {
				const idx = g.tasks.findIndex(t => t.id === taskId);
				if (idx !== -1) {
					task = g.tasks.splice(idx, 1)[0];
					// Update source container
					const srcContainer = cardsContainers.find(c => c.groupId === g.id);
					const srcBadge = badges.find(b => b.groupId === g.id);
					if (srcContainer) {
						// Remove the row from DOM
						const rows = srcContainer.el.children;
						for (let i = 0; i < rows.length; i++) {
							if ((rows[i] as HTMLElement).dataset.taskId === taskId) {
								srcContainer.el.removeChild(rows[i]);
								break;
							}
						}
					}
					if (srcBadge) {
						srcBadge.el.textContent = String(g.tasks.length);
					}
					break;
				}
			}

			if (!task) { return; }

			// Add to target
			const targetGroup = groups.find(g => g.id === targetGroupId);
			if (!targetGroup) { return; }
			targetGroup.tasks.push(task);

			const tgtContainer = cardsContainers.find(c => c.groupId === targetGroupId);
			const tgtBadge = badges.find(b => b.groupId === targetGroupId);
			const tgtTwistie = twisties.find(tw => tw.groupId === targetGroupId);

			if (tgtBadge) {
				tgtBadge.el.textContent = String(targetGroup.tasks.length);
			}

			// Expand target if collapsed
			if (tgtContainer && tgtContainer.el.style.display === 'none') {
				tgtContainer.el.style.display = '';
				if (tgtTwistie) {
					tgtTwistie.el.style.transform = 'rotate(90deg)';
				}
			}

			// Add row to target container
			if (tgtContainer) {
				renderTaskRow(tgtContainer.el, task, targetGroupId);
			}
		}

		const commandService = this.commandService;

		function renderTaskRow(parent: HTMLElement, task: ITask, groupId?: string) {
			const row = append(parent, $('div'));
			row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 16px 0 38px;height:22px;cursor:pointer;';
			row.dataset.taskId = task.id;
			row.draggable = true;
			taskRows.push({ el: row, task, groupId: groupId || '' });
			row.addEventListener('mouseenter', () => { if (!dragTaskId) { row.style.background = 'var(--vscode-list-hoverBackground)'; } });
			row.addEventListener('mouseleave', () => { row.style.background = ''; });

			let didDrag = false;
			row.addEventListener('click', () => {
				if (!didDrag) {
					commandService.executeCommand('prendgame.openTaskDetail', task.id);
				}
				didDrag = false;
			});

			row.addEventListener('dragstart', (e) => {
				didDrag = true;
				dragTaskId = task.id;
				// Find which group this task is in
				for (const g of groups) {
					if (g.tasks.some(t => t.id === task.id)) {
						dragSourceGroup = g.id;
						break;
					}
				}
				row.style.opacity = '0.35';
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

			const pBar = append(row, $('span'));
			const pc = PRIORITY_COLORS[task.priority] || '#666';
			pBar.style.cssText = `width:3px;height:14px;border-radius:1px;background:${pc};flex-shrink:0;`;

			const tid = append(row, $('span'));
			tid.style.cssText = 'font-size:11px;opacity:0.45;font-family:var(--monaco-monospace-font);white-space:nowrap;';
			tid.textContent = task.id;

			const title = append(row, $('span'));
			title.style.cssText = 'font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:22px;';
			title.textContent = task.title;
			title.title = task.title;

			const av = append(row, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;background:${task.color};`;
			av.textContent = task.initials;
			av.title = task.initials;
		}

		// -- Sprint bar -------------------------------------------------------
		const sprint = append(root, $('div'));
		sprint.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));';

		const sprintDot = append(sprint, $('span'));
		sprintDot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#3b82f6;flex-shrink:0;';

		const sprintText = append(sprint, $('span'));
		sprintText.style.cssText = 'font-size:12px;font-weight:600;';
		sprintText.textContent = 'Sprint 2 \u00B7 Core UI';

		const sprintMeta = append(sprint, $('span'));
		sprintMeta.style.cssText = 'font-size:11px;color:var(--vscode-descriptionForeground);margin-left:auto;';
		sprintMeta.textContent = 'Apr 7\u201318';

		// -- Search / filter --------------------------------------------------
		const searchWrap = append(root, $('div'));
		searchWrap.style.cssText = 'padding:6px 16px;border-bottom:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));';

		const searchInput = append(searchWrap, $('input'));
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter tasks...';
		searchInput.style.cssText = 'width:100%;background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));color:var(--vscode-input-foreground,var(--vscode-editor-foreground));padding:4px 8px;border-radius:4px;font-size:12px;font-family:var(--vscode-font-family);outline:none;';
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = 'var(--vscode-focusBorder)'; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'var(--vscode-input-border,var(--vscode-panel-border))'; });

		searchInput.addEventListener('input', () => {
			const q = searchInput.value.toLowerCase().trim();
			for (const entry of taskRows) {
				const t = entry.task;
				const match = !q
					|| t.id.toLowerCase().includes(q)
					|| t.title.toLowerCase().includes(q)
					|| t.labels.some(l => l.toLowerCase().includes(q))
					|| t.initials.toLowerCase().includes(q)
					|| t.priority.toLowerCase().includes(q);
				entry.el.style.display = match ? '' : 'none';
			}

			// Update badge counts to reflect visible tasks
			for (const b of badges) {
				const visibleCount = taskRows.filter(r => r.groupId === b.groupId && r.el.style.display !== 'none').length;
				b.el.textContent = String(visibleCount);
			}
		});

		// -- Summary pills -----------------------------------------------------
		const pills = append(root, $('div'));
		pills.style.cssText = 'display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));flex-wrap:wrap;';

		const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);

		for (const g of groups) {
			if (g.tasks.length === 0) { continue; }
			const pill = append(pills, $('span'));
			const sc = STATUS_COLORS[g.id] || '#666';
			pill.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 8px;border-radius:10px;background:${sc}18;color:${sc};font-weight:500;`;
			pill.textContent = `${g.tasks.length} ${g.name.toLowerCase()}`;
		}

		const totalPill = append(pills, $('span'));
		totalPill.style.cssText = 'font-size:10px;color:var(--vscode-descriptionForeground);margin-left:auto;padding:2px 0;';
		totalPill.textContent = `${totalTasks} total`;

		// -- Groups -----------------------------------------------------------
		for (const group of groups) {
			// Section header
			const hdr = append(root, $('div'));
			hdr.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 16px;height:28px;cursor:pointer;user-select:none;';
			hdr.addEventListener('mouseenter', () => { hdr.style.background = 'var(--vscode-list-hoverBackground)'; });
			hdr.addEventListener('mouseleave', () => { hdr.style.background = ''; });

			const twistie = append(hdr, $('span'));
			twistie.style.cssText = 'width:16px;font-size:10px;text-align:center;color:var(--vscode-descriptionForeground);transition:transform 0.12s;';
			twistie.textContent = '\u25B6';
			if (!group.collapsed) {
				twistie.style.transform = 'rotate(90deg)';
			}
			twisties.push({ el: twistie, groupId: group.id });

			const statusDot = append(hdr, $('span'));
			const sc = STATUS_COLORS[group.id] || '#666';
			statusDot.style.cssText = `width:8px;height:8px;border-radius:2px;background:${sc};flex-shrink:0;`;

			const label = append(hdr, $('span'));
			label.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--vscode-foreground);';
			label.textContent = group.name;

			const badge = append(hdr, $('span'));
			badge.style.cssText = 'font-size:10px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);padding:0 5px;border-radius:8px;margin-left:auto;min-width:16px;text-align:center;';
			badge.textContent = String(group.tasks.length);
			badges.push({ el: badge, groupId: group.id });

			// Drop zone (above cards)
			const dz = append(root, $('div'));
			dz.style.cssText = 'height:0;transition:height 0.15s,background 0.15s,margin 0.15s;overflow:hidden;';
			dropZones.push({ el: dz, groupId: group.id });

			dz.addEventListener('dragover', (e) => {
				e.preventDefault();
				if (e.dataTransfer) { e.dataTransfer.dropEffect = 'move'; }
				dz.style.background = 'color-mix(in srgb, var(--vscode-focusBorder) 22%, transparent)';
			});
			dz.addEventListener('dragleave', () => {
				dz.style.background = 'color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent)';
			});
			dz.addEventListener('drop', (e) => {
				e.preventDefault();
				if (dragTaskId) {
					moveTask(dragTaskId, group.id);
				}
				clearDropHighlights();
			});

			// Cards container
			const cards = append(root, $('div'));
			if (group.collapsed) {
				cards.style.display = 'none';
			}
			cardsContainers.push({ el: cards, groupId: group.id });

			// Separator
			const sep = append(root, $('div'));
			sep.style.cssText = 'height:1px;background:var(--vscode-sideBar-border,var(--vscode-panel-border));';

			// Toggle
			hdr.addEventListener('click', () => {
				const wasHidden = cards.style.display === 'none';
				cards.style.display = wasHidden ? '' : 'none';
				twistie.style.transform = wasHidden ? 'rotate(90deg)' : 'rotate(0deg)';
			});

			// Render task rows
			for (const task of group.tasks) {
				renderTaskRow(cards, task, group.id);
			}
		}

		// -- Sprint progress section ------------------------------------------
		const sprintSection = append(root, $('div'));
		sprintSection.style.cssText = 'padding:12px 16px;border-top:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));';

		const sprintTitle = append(sprintSection, $('div'));
		sprintTitle.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--vscode-descriptionForeground);margin-bottom:8px;';
		sprintTitle.textContent = 'Sprint Progress';

		const doneTasks = groups.find(g => g.id === 'done')?.tasks.length || 0;
		const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

		const barBg = append(sprintSection, $('div'));
		barBg.style.cssText = 'height:6px;border-radius:3px;background:var(--vscode-editorWidget-background);overflow:hidden;margin-bottom:4px;';

		const barFill = append(barBg, $('div'));
		barFill.style.cssText = `height:100%;border-radius:3px;background:#22c55e;width:${pct}%;transition:width 0.3s;`;

		const barLabel = append(sprintSection, $('div'));
		barLabel.style.cssText = 'font-size:10px;color:var(--vscode-descriptionForeground);margin-bottom:10px;';
		barLabel.textContent = `${doneTasks}/${totalTasks} done (${pct}%)`;

		// -- Action buttons ---------------------------------------------------
		const actions = append(root, $('div'));
		actions.style.cssText = 'display:flex;gap:6px;padding:4px 16px 14px;';

		const makeBtn = (btnLabel: string, command: string) => {
			const b = append(actions, $('div'));
			b.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;padding:5px;border-radius:4px;border:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));cursor:pointer;font-size:11px;color:var(--vscode-descriptionForeground);transition:all 0.12s;';
			b.textContent = btnLabel;
			b.addEventListener('mouseenter', () => {
				b.style.color = 'var(--vscode-foreground)';
				b.style.borderColor = 'var(--vscode-focusBorder)';
				b.style.background = 'var(--vscode-list-hoverBackground)';
			});
			b.addEventListener('mouseleave', () => {
				b.style.color = 'var(--vscode-descriptionForeground)';
				b.style.borderColor = 'var(--vscode-sideBar-border,var(--vscode-panel-border))';
				b.style.background = '';
			});
			b.addEventListener('click', () => {
				this.commandService.executeCommand(command);
			});
		};

		makeBtn('Board', 'prendgame.openBoard');
		makeBtn('Sprint', 'prendgame.openSprintDashboard');
		makeBtn('MCP Log', 'prendgame.openMcpLog');
	}
}
