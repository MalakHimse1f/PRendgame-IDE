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

// -- Types --------------------------------------------------------------------

interface ITaskCard {
	id: string;
	title: string;
	priority: 'critical' | 'high' | 'medium' | 'low';
	assigneeInitials: string;
	assigneeColor: string;
	labels: string[];
	status: string;
}

interface IStatusGroup {
	id: string;
	name: string;
	tasks: ITaskCard[];
	collapsed: boolean;
}

// -- Mock Data ----------------------------------------------------------------

function createMockGroups(): IStatusGroup[] {
	const m = (initials: string, color: string) => ({ assigneeInitials: initials, assigneeColor: color });
	const jp = m('JP', '#06b6d4');
	const ml = m('ML', '#10b981');
	const sr = m('SR', '#f59e0b');
	const rb = m('RB', '#ef4444');
	const aq = m('AQ', '#ec4899');
	const ac = m('AC', '#6366f1');

	return [
		{
			id: 'in_progress', name: 'In Progress', collapsed: false, tasks: [
				{ id: 'PRE-3', title: 'Build kanban board webview', priority: 'critical', ...ml, labels: ['frontend', 'core'], status: 'in_progress' },
				{ id: 'PRE-4', title: 'Implement task detail view', priority: 'high', ...sr, labels: ['frontend', 'core'], status: 'in_progress' },
				{ id: 'PRE-5', title: 'Create sidebar tree views', priority: 'high', ...rb, labels: ['frontend'], status: 'in_progress' },
			]
		},
		{
			id: 'todo', name: 'To Do', collapsed: false, tasks: [
				{ id: 'PRE-6', title: 'Build document editor with PRD template', priority: 'high', ...ml, labels: ['frontend', 'docs'], status: 'todo' },
				{ id: 'PRE-7', title: 'Implement list view for tasks', priority: 'medium', ...sr, labels: ['frontend'], status: 'todo' },
				{ id: 'PRE-8', title: 'Implement timeline view', priority: 'medium', ...ml, labels: ['frontend'], status: 'todo' },
				{ id: 'PRE-15', title: 'Sprint dashboard view', priority: 'medium', ...ml, labels: ['dashboard'], status: 'todo' },
				{ id: 'PRE-16', title: 'QA pass on kanban interactions', priority: 'high', ...aq, labels: ['qa'], status: 'todo' },
			]
		},
		{
			id: 'in_review', name: 'In Review', collapsed: false, tasks: []
		},
		{
			id: 'backlog', name: 'Backlog', collapsed: true, tasks: [
				{ id: 'PRE-9', title: 'Expose MCP server tools', priority: 'high', ...jp, labels: ['backend', 'mcp'], status: 'backlog' },
				{ id: 'PRE-10', title: 'Build MCP activity log panel', priority: 'medium', ...rb, labels: ['frontend', 'mcp'], status: 'backlog' },
				{ id: 'PRE-11', title: 'Mock cloud sync indicator', priority: 'low', ...sr, labels: ['frontend'], status: 'backlog' },
				{ id: 'PRE-12', title: 'Mock team presence avatars', priority: 'low', ...rb, labels: ['frontend'], status: 'backlog' },
				{ id: 'PRE-13', title: 'Write PRD for notifications', priority: 'low', ...ac, labels: ['prd'], status: 'backlog' },
				{ id: 'PRE-14', title: 'Mock paywall modal', priority: 'low', ...sr, labels: ['frontend'], status: 'backlog' },
			]
		},
		{
			id: 'done', name: 'Done', collapsed: true, tasks: [
				{ id: 'PRE-1', title: 'Design auth flow for Supabase', priority: 'critical', ...jp, labels: ['auth'], status: 'done' },
				{ id: 'PRE-2', title: 'Set up Supabase project and schema', priority: 'critical', ...jp, labels: ['backend'], status: 'done' },
			]
		},
	];
}

// -- Styles -------------------------------------------------------------------

const S = {
	pane: 'font-family: var(--vscode-font-family); font-size: 12px; overflow-y: auto; height: 100%;',

	// Sprint banner
	banner: 'display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid var(--vscode-panel-border); background: color-mix(in srgb, var(--vscode-focusBorder) 6%, transparent);',
	bannerSprint: 'font-weight: 600; font-size: 12px;',
	bannerDates: 'font-size: 11px; opacity: 0.45;',

	// Stats bar
	statsBar: 'display: flex; gap: 2px; padding: 8px 14px; border-bottom: 1px solid var(--vscode-panel-border);',
	stat: 'flex: 1; text-align: center; padding: 4px 0; border-radius: 3px; font-size: 10px; line-height: 1.4; cursor: default;',

	// Section header
	sectionHeader: 'display: flex; align-items: center; gap: 6px; padding: 6px 14px; cursor: pointer; user-select: none; border-bottom: 1px solid var(--vscode-panel-border); transition: background 0.1s;',
	sectionChevron: 'font-size: 10px; width: 14px; opacity: 0.5; transition: transform 0.15s;',
	sectionName: 'font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;',
	sectionCount: 'font-size: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 0 6px; border-radius: 8px; margin-left: auto;',

	// Task card
	card: 'padding: 8px 14px; border-bottom: 1px solid var(--vscode-panel-border); cursor: pointer; transition: background 0.1s;',
	cardHover: 'background: var(--vscode-list-hoverBackground);',
	cardRow1: 'display: flex; align-items: center; gap: 6px; margin-bottom: 3px;',
	cardId: 'font-family: var(--monaco-monospace-font); font-size: 10px; opacity: 0.4;',
	cardTitle: 'font-size: 12px; line-height: 1.35; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
	cardRow2: 'display: flex; align-items: center; gap: 4px;',
	avatar: 'display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 8px; font-weight: 600; color: #fff; flex-shrink: 0;',
	label: 'font-size: 9px; padding: 1px 5px; border-radius: 2px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); opacity: 0.7;',

	// Priority dot
	dotBase: 'width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;',

	// Drop zone
	dropZone: 'min-height: 2px; transition: min-height 0.15s, background 0.15s, margin 0.15s;',
	dropZoneActive: 'min-height: 32px; background: color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent); border: 1px dashed var(--vscode-focusBorder); border-radius: 4px; margin: 4px 14px;',

	// Expand button
	expandBtn: 'display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; margin: 8px 14px; border-radius: 4px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editorWidget-background); cursor: pointer; font-size: 11px; color: var(--vscode-editor-foreground); opacity: 0.7; transition: opacity 0.1s, border-color 0.1s;',
};

const PRIORITY_COLORS: Record<string, string> = {
	critical: '#dc2626',
	high: '#ea580c',
	medium: '#ca8a04',
	low: '#4b5563',
};

const STATUS_COLORS: Record<string, string> = {
	in_progress: '#3b82f6',
	todo: '#6b7280',
	in_review: '#a855f7',
	backlog: '#374151',
	done: '#22c55e',
};

// -- Board Pane ---------------------------------------------------------------

export class PRendgameBoardPane extends ViewPane {

	private container!: HTMLElement;
	private groups: IStatusGroup[] = [];
	private draggedTaskId: string | null = null;
	private dropZones: Map<string, HTMLElement> = new Map();

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
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.groups = createMockGroups();
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		this.container = append(parent, $('div'));
		this.container.setAttribute('style', S.pane);

		this.renderContent();
	}

	private renderContent(): void {
		this.container.innerHTML = '';
		this.dropZones.clear();

		// Sprint banner
		const banner = append(this.container, $('div'));
		banner.setAttribute('style', S.banner);
		const sprintName = append(banner, $('span'));
		sprintName.setAttribute('style', S.bannerSprint);
		sprintName.textContent = 'Sprint 2';
		const sprintDates = append(banner, $('span'));
		sprintDates.setAttribute('style', S.bannerDates);
		sprintDates.textContent = 'Apr 7 - Apr 18';

		// Stats bar
		const statsBar = append(this.container, $('div'));
		statsBar.setAttribute('style', S.statsBar);
		for (const g of this.groups) {
			const stat = append(statsBar, $('div'));
			const bg = STATUS_COLORS[g.id] || '#333';
			stat.setAttribute('style', `${S.stat} background: color-mix(in srgb, ${bg} 15%, transparent); color: ${bg};`);
			stat.setAttribute('title', g.name);
			stat.textContent = `${g.tasks.length}`;
		}

		// Status groups
		for (const group of this.groups) {
			this.renderGroup(group);
		}

		// Expand to editor button
		const expandBtn = append(this.container, $('div'));
		expandBtn.setAttribute('style', S.expandBtn);
		expandBtn.textContent = 'Open full board view';
		expandBtn.addEventListener('mouseenter', () => {
			expandBtn.style.opacity = '1';
			expandBtn.style.borderColor = 'var(--vscode-focusBorder)';
		});
		expandBtn.addEventListener('mouseleave', () => {
			expandBtn.style.opacity = '0.7';
			expandBtn.style.borderColor = 'var(--vscode-panel-border)';
		});
	}

	private renderGroup(group: IStatusGroup): void {
		// Section header
		const header = append(this.container, $('div'));
		header.setAttribute('style', S.sectionHeader);
		header.addEventListener('mouseenter', () => { header.style.background = 'var(--vscode-list-hoverBackground)'; });
		header.addEventListener('mouseleave', () => { header.style.background = ''; });

		const chevron = append(header, $('span'));
		chevron.setAttribute('style', S.sectionChevron);
		chevron.textContent = group.collapsed ? '\u25B6' : '\u25BC';

		const statusDot = append(header, $('span'));
		const dotColor = STATUS_COLORS[group.id] || '#666';
		statusDot.setAttribute('style', `${S.dotBase} background: ${dotColor};`);

		const name = append(header, $('span'));
		name.setAttribute('style', S.sectionName);
		name.textContent = group.name;

		const count = append(header, $('span'));
		count.setAttribute('style', S.sectionCount);
		count.textContent = String(group.tasks.length);

		// Toggle collapse
		header.addEventListener('click', () => {
			group.collapsed = !group.collapsed;
			this.renderContent();
		});

		// Drop zone for this group (always present, even collapsed)
		const dropZone = append(this.container, $('div'));
		dropZone.setAttribute('style', S.dropZone);
		this.dropZones.set(group.id, dropZone);
		this.setupDropZone(dropZone, group.id);

		if (group.collapsed) {
			return;
		}

		// Task cards
		for (const task of group.tasks) {
			this.renderCard(task);
		}
	}

	private renderCard(task: ITaskCard): void {
		const card = append(this.container, $('div'));
		card.setAttribute('style', S.card);
		card.draggable = true;
		card.setAttribute('data-task-id', task.id);

		// Hover
		card.addEventListener('mouseenter', () => { card.style.background = 'var(--vscode-list-hoverBackground)'; });
		card.addEventListener('mouseleave', () => { card.style.background = ''; });

		// Drag
		card.addEventListener('dragstart', (e) => {
			this.draggedTaskId = task.id;
			card.style.opacity = '0.4';
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
			}
			// Activate drop zones
			for (const [, dz] of this.dropZones) {
				dz.setAttribute('style', S.dropZoneActive);
			}
		});
		card.addEventListener('dragend', () => {
			this.draggedTaskId = null;
			card.style.opacity = '1';
			for (const [, dz] of this.dropZones) {
				dz.setAttribute('style', S.dropZone);
			}
		});

		// Row 1: ID + title
		const row1 = append(card, $('div'));
		row1.setAttribute('style', S.cardRow1);

		const priorityDot = append(row1, $('span'));
		const pColor = PRIORITY_COLORS[task.priority] || '#666';
		priorityDot.setAttribute('style', `${S.dotBase} background: ${pColor};`);
		priorityDot.setAttribute('title', task.priority);

		const id = append(row1, $('span'));
		id.setAttribute('style', S.cardId);
		id.textContent = task.id;

		const title = append(row1, $('span'));
		title.setAttribute('style', S.cardTitle);
		title.textContent = task.title;
		title.setAttribute('title', task.title);

		const avatar = append(row1, $('span'));
		avatar.setAttribute('style', `${S.avatar} background: ${task.assigneeColor};`);
		avatar.textContent = task.assigneeInitials;

		// Row 2: labels
		if (task.labels.length > 0) {
			const row2 = append(card, $('div'));
			row2.setAttribute('style', `${S.cardRow2} padding-left: 13px;`);
			for (const l of task.labels) {
				const label = append(row2, $('span'));
				label.setAttribute('style', S.label);
				label.textContent = l;
			}
		}
	}

	private setupDropZone(el: HTMLElement, statusId: string): void {
		el.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			el.style.background = 'color-mix(in srgb, var(--vscode-focusBorder) 20%, transparent)';
		});
		el.addEventListener('dragleave', () => {
			el.style.background = 'color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent)';
		});
		el.addEventListener('drop', (e) => {
			e.preventDefault();
			if (this.draggedTaskId) {
				this.moveTask(this.draggedTaskId, statusId);
			}
		});
	}

	private moveTask(taskId: string, newStatus: string): void {
		let movedTask: ITaskCard | undefined;
		for (const g of this.groups) {
			const idx = g.tasks.findIndex(t => t.id === taskId);
			if (idx !== -1) {
				movedTask = g.tasks.splice(idx, 1)[0];
				break;
			}
		}
		if (movedTask) {
			movedTask.status = newStatus;
			const target = this.groups.find(g => g.id === newStatus);
			if (target) {
				target.tasks.push(movedTask);
				target.collapsed = false;
			}
			this.renderContent();
		}
	}
}
