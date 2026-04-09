/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append } from '../../../../base/browser/dom.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import './prendgame.css';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';

// --- Mock Data ---

interface ITaskCard {
	id: string;
	title: string;
	priority: 'critical' | 'high' | 'medium' | 'low';
	assignee: string;
	assigneeColor: string;
	assigneeInitials: string;
	labels: string[];
	status: string;
}

interface IColumn {
	id: string;
	name: string;
	tasks: ITaskCard[];
}

function getMockColumns(): IColumn[] {
	const members: Record<string, { name: string; color: string; initials: string }> = {
		'user-001': { name: 'Alex Chen', color: '#6366f1', initials: 'AC' },
		'user-002': { name: 'Taylor Reeves', color: '#8b5cf6', initials: 'TR' },
		'user-003': { name: 'Jordan Park', color: '#06b6d4', initials: 'JP' },
		'user-004': { name: 'Morgan Liu', color: '#10b981', initials: 'ML' },
		'user-005': { name: 'Sam Rivera', color: '#f59e0b', initials: 'SR' },
		'user-006': { name: 'Riley Brooks', color: '#ef4444', initials: 'RB' },
		'user-007': { name: 'Avery Quinn', color: '#ec4899', initials: 'AQ' },
	};

	function m(id: string) {
		const member = members[id] ?? { name: '?', color: '#666', initials: '?' };
		return { assignee: member.name, assigneeColor: member.color, assigneeInitials: member.initials };
	}

	return [
		{
			id: 'backlog', name: 'Backlog', tasks: [
				{ id: 'PRE-9', title: 'Expose MCP server tools for external agents', priority: 'high', ...m('user-003'), labels: ['backend', 'mcp'], status: 'backlog' },
				{ id: 'PRE-10', title: 'Build MCP activity log panel', priority: 'medium', ...m('user-006'), labels: ['frontend', 'mcp'], status: 'backlog' },
				{ id: 'PRE-11', title: 'Add mock cloud sync indicator', priority: 'low', ...m('user-005'), labels: ['frontend'], status: 'backlog' },
				{ id: 'PRE-12', title: 'Add mock team presence avatars', priority: 'low', ...m('user-006'), labels: ['frontend'], status: 'backlog' },
				{ id: 'PRE-13', title: 'Write PRD for notification system', priority: 'low', ...m('user-001'), labels: ['prd'], status: 'backlog' },
				{ id: 'PRE-14', title: 'Implement mock paywall modal', priority: 'low', ...m('user-005'), labels: ['frontend'], status: 'backlog' },
			]
		},
		{
			id: 'todo', name: 'To Do', tasks: [
				{ id: 'PRE-6', title: 'Build document editor webview with PRD template', priority: 'high', ...m('user-004'), labels: ['frontend', 'docs'], status: 'todo' },
				{ id: 'PRE-7', title: 'Implement list view for tasks', priority: 'medium', ...m('user-005'), labels: ['frontend'], status: 'todo' },
				{ id: 'PRE-8', title: 'Implement timeline view', priority: 'medium', ...m('user-004'), labels: ['frontend'], status: 'todo' },
				{ id: 'PRE-15', title: 'Sprint dashboard view', priority: 'medium', ...m('user-004'), labels: ['frontend'], status: 'todo' },
				{ id: 'PRE-16', title: 'QA pass on kanban board interactions', priority: 'high', ...m('user-007'), labels: ['qa'], status: 'todo' },
			]
		},
		{
			id: 'in_progress', name: 'In Progress', tasks: [
				{ id: 'PRE-3', title: 'Build kanban board webview', priority: 'critical', ...m('user-004'), labels: ['frontend', 'core'], status: 'in_progress' },
				{ id: 'PRE-4', title: 'Implement task detail view', priority: 'high', ...m('user-005'), labels: ['frontend', 'core'], status: 'in_progress' },
				{ id: 'PRE-5', title: 'Create sidebar tree views', priority: 'high', ...m('user-006'), labels: ['frontend'], status: 'in_progress' },
			]
		},
		{
			id: 'in_review', name: 'In Review', tasks: []
		},
		{
			id: 'done', name: 'Done', tasks: [
				{ id: 'PRE-1', title: 'Design authentication flow for Supabase', priority: 'critical', ...m('user-003'), labels: ['auth'], status: 'done' },
				{ id: 'PRE-2', title: 'Set up Supabase project and schema', priority: 'critical', ...m('user-003'), labels: ['backend'], status: 'done' },
			]
		},
	];
}

// --- Board Pane ---

export class PRendgameBoardPane extends ViewPane {

	private boardContainer!: HTMLElement;
	private columns: IColumn[] = [];
	private columnBodies: HTMLElement[] = [];
	private draggedCard: HTMLElement | null = null;
	private draggedTaskId: string | null = null;

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
		@ITelemetryService telemetryService: ITelemetryService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService, hoverService);
		this.columns = getMockColumns();
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.classList.add('prendgame-board-pane');

		// Header bar
		const header = append(container, $('.pg-board-header'));
		const headerLeft = append(header, $('.pg-board-header-left'));
		const projectKey = append(headerLeft, $('span.pg-project-key'));
		projectKey.textContent = 'PRE';
		const title = append(headerLeft, $('span.pg-board-title'));
		title.textContent = 'PRendgame Board';

		// Presence avatars
		const presence = append(header, $('.pg-presence-row'));
		const onlineMembers = [
			{ initials: 'AC', color: '#6366f1', status: 'online' },
			{ initials: 'TR', color: '#8b5cf6', status: 'online' },
			{ initials: 'JP', color: '#06b6d4', status: 'online' },
			{ initials: 'ML', color: '#10b981', status: 'away' },
			{ initials: 'SR', color: '#f59e0b', status: 'online' },
			{ initials: 'AQ', color: '#ec4899', status: 'online' },
		];
		for (const m of onlineMembers) {
			const avatar = append(presence, $('.pg-presence-avatar'));
			const circle = append(avatar, $('span.pg-avatar'));
			circle.textContent = m.initials;
			circle.style.background = m.color;
			const dot = append(avatar, $(`span.pg-status-dot.pg-status-dot--${m.status}`));
			dot.className = `pg-status-dot pg-status-dot--${m.status}`;
		}

		// Sprint banner
		const banner = append(container, $('.pg-sprint-banner'));
		const sprintName = append(banner, $('strong'));
		sprintName.textContent = 'Sprint 2 -- Core UI';
		const sprintDates = append(banner, $('span.pg-sprint-dates'));
		sprintDates.textContent = '2026-04-07 -> 2026-04-18';

		// View tabs
		const tabs = append(container, $('.pg-view-tabs'));
		for (const label of ['Kanban', 'List', 'Timeline']) {
			const tab = append(tabs, $('button.pg-view-tab'));
			tab.textContent = label;
			if (label === 'Kanban') {
				tab.classList.add('pg-view-tab--active');
			}
		}

		// Board columns
		this.boardContainer = append(container, $('.pg-board-kanban'));
		this.renderColumns();
	}

	private renderColumns(): void {
		this.boardContainer.innerHTML = '';
		this.columnBodies = [];

		for (const col of this.columns) {
			const colEl = append(this.boardContainer, $('.pg-column'));
			colEl.dataset.status = col.id;

			// Column header
			const colHeader = append(colEl, $('.pg-column-header'));
			const colName = append(colHeader, $('span.pg-column-name'));
			colName.textContent = col.name;
			const colCount = append(colHeader, $('span.pg-column-count'));
			colCount.textContent = String(col.tasks.length);

			// Column body (drop zone)
			const colBody = append(colEl, $('.pg-column-body'));
			colBody.dataset.status = col.id;
			this.columnBodies.push(colBody);

			// Drop zone events
			colBody.addEventListener('dragover', (e) => {
				e.preventDefault();
				if (e.dataTransfer) {
					e.dataTransfer.dropEffect = 'move';
				}
				colBody.classList.add('pg-column-body--dragover');
			});
			colBody.addEventListener('dragleave', () => {
				colBody.classList.remove('pg-column-body--dragover');
			});
			colBody.addEventListener('drop', (e) => {
				e.preventDefault();
				colBody.classList.remove('pg-column-body--dragover');
				if (this.draggedTaskId) {
					this.moveTask(this.draggedTaskId, col.id);
				}
			});

			// Render task cards
			for (const task of col.tasks) {
				this.renderCard(colBody, task);
			}
		}

		// Add Column button
		const addCol = append(this.boardContainer, $('.pg-add-column'));
		addCol.textContent = '+';
		addCol.title = 'Add Column';
	}

	private renderCard(parent: HTMLElement, task: ITaskCard): void {
		const card = append(parent, $('.pg-task-card'));
		card.draggable = true;
		card.dataset.taskId = task.id;

		// Drag events
		card.addEventListener('dragstart', (e) => {
			this.draggedCard = card;
			this.draggedTaskId = task.id;
			card.classList.add('pg-task-card--dragging');
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
			}
		});
		card.addEventListener('dragend', () => {
			card.classList.remove('pg-task-card--dragging');
			this.draggedCard = null;
			this.draggedTaskId = null;
			// Remove all dragover highlights
			for (const body of this.columnBodies) {
				body.classList.remove('pg-column-body--dragover');
			}
		});

		// Card header
		const cardHeader = append(card, $('.pg-card-header'));
		const cardId = append(cardHeader, $('span.pg-card-id'));
		cardId.textContent = task.id;
		const badge = append(cardHeader, $(`span.pg-priority-badge.pg-priority-badge--${task.priority}`));
		badge.textContent = task.priority;

		// Card title
		const cardTitle = append(card, $('.pg-card-title'));
		cardTitle.textContent = task.title;

		// Card footer
		const cardFooter = append(card, $('.pg-card-footer'));

		// Labels
		const labelsEl = append(cardFooter, $('.pg-card-labels'));
		for (const label of task.labels) {
			const labelEl = append(labelsEl, $('span.pg-card-label'));
			labelEl.textContent = label;
		}

		// Assignee avatar
		const avatar = append(cardFooter, $('span.pg-avatar.pg-avatar--sm'));
		avatar.textContent = task.assigneeInitials;
		avatar.style.background = task.assigneeColor;
	}

	private moveTask(taskId: string, newStatus: string): void {
		// Find and remove the task from its current column
		let movedTask: ITaskCard | undefined;
		for (const col of this.columns) {
			const idx = col.tasks.findIndex(t => t.id === taskId);
			if (idx !== -1) {
				movedTask = col.tasks.splice(idx, 1)[0];
				break;
			}
		}

		// Add to new column
		if (movedTask) {
			movedTask.status = newStatus;
			const targetCol = this.columns.find(c => c.id === newStatus);
			if (targetCol) {
				targetCol.tasks.push(movedTask);
			}
			this.renderColumns();
		}
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}
