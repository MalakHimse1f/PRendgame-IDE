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

interface ITask {
	id: string;
	title: string;
	priority: string;
	initials: string;
	color: string;
	labels: string[];
}

interface IGroup {
	id: string;
	name: string;
	tasks: ITask[];
	startCollapsed: boolean;
}

function getGroups(): IGroup[] {
	return [
		{
			id: 'in_progress', name: 'In Progress', startCollapsed: false, tasks: [
				{ id: 'PRE-3', title: 'Build kanban board webview', priority: 'critical', initials: 'ML', color: '#10b981', labels: ['frontend', 'core'] },
				{ id: 'PRE-4', title: 'Implement task detail view', priority: 'high', initials: 'SR', color: '#f59e0b', labels: ['frontend'] },
				{ id: 'PRE-5', title: 'Create sidebar tree views', priority: 'high', initials: 'RB', color: '#ef4444', labels: ['frontend'] },
			]
		},
		{
			id: 'todo', name: 'To Do', startCollapsed: false, tasks: [
				{ id: 'PRE-6', title: 'Build document editor with PRD template', priority: 'high', initials: 'ML', color: '#10b981', labels: ['docs'] },
				{ id: 'PRE-7', title: 'Implement list view for tasks', priority: 'medium', initials: 'SR', color: '#f59e0b', labels: ['frontend'] },
				{ id: 'PRE-8', title: 'Implement timeline view', priority: 'medium', initials: 'ML', color: '#10b981', labels: ['frontend'] },
				{ id: 'PRE-15', title: 'Sprint dashboard view', priority: 'medium', initials: 'ML', color: '#10b981', labels: ['dashboard'] },
				{ id: 'PRE-16', title: 'QA pass on kanban interactions', priority: 'high', initials: 'AQ', color: '#ec4899', labels: ['qa'] },
			]
		},
		{ id: 'in_review', name: 'In Review', startCollapsed: false, tasks: [] },
		{
			id: 'backlog', name: 'Backlog', startCollapsed: true, tasks: [
				{ id: 'PRE-9', title: 'Expose MCP server tools', priority: 'high', initials: 'JP', color: '#06b6d4', labels: ['mcp'] },
				{ id: 'PRE-10', title: 'Build MCP activity log', priority: 'medium', initials: 'RB', color: '#ef4444', labels: ['mcp'] },
				{ id: 'PRE-11', title: 'Mock cloud sync indicator', priority: 'low', initials: 'SR', color: '#f59e0b', labels: ['frontend'] },
				{ id: 'PRE-12', title: 'Mock team presence avatars', priority: 'low', initials: 'RB', color: '#ef4444', labels: ['frontend'] },
				{ id: 'PRE-13', title: 'Write PRD for notifications', priority: 'low', initials: 'AC', color: '#6366f1', labels: ['prd'] },
				{ id: 'PRE-14', title: 'Mock paywall modal', priority: 'low', initials: 'SR', color: '#f59e0b', labels: ['frontend'] },
			]
		},
		{
			id: 'done', name: 'Done', startCollapsed: true, tasks: [
				{ id: 'PRE-1', title: 'Design auth flow for Supabase', priority: 'critical', initials: 'JP', color: '#06b6d4', labels: ['auth'] },
				{ id: 'PRE-2', title: 'Set up Supabase project and schema', priority: 'critical', initials: 'JP', color: '#06b6d4', labels: ['backend'] },
			]
		},
	];
}

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
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const wrapper = append(container, $('div'));
		wrapper.style.overflowY = 'auto';
		wrapper.style.height = '100%';
		wrapper.style.fontSize = '12px';

		// Sprint banner
		const banner = append(wrapper, $('div'));
		banner.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--vscode-panel-border);';
		const sprintLabel = append(banner, $('span'));
		sprintLabel.style.fontWeight = '600';
		sprintLabel.textContent = 'Sprint 2';
		const sprintDates = append(banner, $('span'));
		sprintDates.style.cssText = 'font-size:11px;opacity:0.45;';
		sprintDates.textContent = 'Apr 7 - Apr 18';

		// Stats row
		const stats = append(wrapper, $('div'));
		stats.style.cssText = 'display:flex;gap:2px;padding:6px 14px;border-bottom:1px solid var(--vscode-panel-border);';
		const groups = getGroups();
		for (const g of groups) {
			const s = append(stats, $('span'));
			const bg = STATUS_COLORS[g.id] || '#333';
			s.style.cssText = `flex:1;text-align:center;padding:3px 0;border-radius:3px;font-size:10px;background:${bg}22;color:${bg};`;
			s.textContent = String(g.tasks.length);
			s.title = g.name;
		}

		// Groups
		const collapsedState: Record<string, boolean> = {};
		for (const g of groups) {
			collapsedState[g.id] = g.startCollapsed;
		}

		for (const group of groups) {
			const collapsed = collapsedState[group.id];

			// Section header
			const header = append(wrapper, $('div'));
			header.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 14px;cursor:pointer;user-select:none;border-bottom:1px solid var(--vscode-panel-border);';
			header.addEventListener('mouseenter', () => { header.style.background = 'var(--vscode-list-hoverBackground)'; });
			header.addEventListener('mouseleave', () => { header.style.background = ''; });

			const chevron = append(header, $('span'));
			chevron.style.cssText = 'font-size:10px;width:14px;opacity:0.5;';
			chevron.textContent = collapsed ? '\u25B6' : '\u25BC';

			const dot = append(header, $('span'));
			const dotColor = STATUS_COLORS[group.id] || '#666';
			dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;`;

			const name = append(header, $('span'));
			name.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;';
			name.textContent = group.name;

			const count = append(header, $('span'));
			count.style.cssText = 'font-size:10px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);padding:0 6px;border-radius:8px;margin-left:auto;';
			count.textContent = String(group.tasks.length);

			// Cards container
			const cardsContainer = append(wrapper, $('div'));
			if (collapsed) {
				cardsContainer.style.display = 'none';
			}

			// Toggle
			header.addEventListener('click', () => {
				const isHidden = cardsContainer.style.display === 'none';
				cardsContainer.style.display = isHidden ? '' : 'none';
				chevron.textContent = isHidden ? '\u25BC' : '\u25B6';
			});

			// Task cards
			for (const task of group.tasks) {
				const card = append(cardsContainer, $('div'));
				card.style.cssText = 'padding:6px 14px;border-bottom:1px solid var(--vscode-panel-border);cursor:pointer;';
				card.addEventListener('mouseenter', () => { card.style.background = 'var(--vscode-list-hoverBackground)'; });
				card.addEventListener('mouseleave', () => { card.style.background = ''; });

				// Row 1: dot + id + title + avatar
				const row1 = append(card, $('div'));
				row1.style.cssText = 'display:flex;align-items:center;gap:5px;';

				const pDot = append(row1, $('span'));
				const pColor = PRIORITY_COLORS[task.priority] || '#666';
				pDot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${pColor};flex-shrink:0;`;
				pDot.title = task.priority;

				const taskId = append(row1, $('span'));
				taskId.style.cssText = 'font-size:10px;opacity:0.4;font-family:var(--monaco-monospace-font);white-space:nowrap;';
				taskId.textContent = task.id;

				const taskTitle = append(row1, $('span'));
				taskTitle.style.cssText = 'font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
				taskTitle.textContent = task.title;
				taskTitle.title = task.title;

				const av = append(row1, $('span'));
				av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;background:${task.color};`;
				av.textContent = task.initials;

				// Row 2: labels
				if (task.labels.length > 0) {
					const row2 = append(card, $('div'));
					row2.style.cssText = 'display:flex;gap:3px;padding-left:11px;margin-top:2px;';
					for (const l of task.labels) {
						const lbl = append(row2, $('span'));
						lbl.style.cssText = 'font-size:9px;padding:0 4px;border-radius:2px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);opacity:0.65;';
						lbl.textContent = l;
					}
				}
			}
		}

		// Expand button
		const expandBtn = append(wrapper, $('div'));
		expandBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;margin:10px 14px;border-radius:4px;border:1px solid var(--vscode-panel-border);background:var(--vscode-editorWidget-background);cursor:pointer;font-size:11px;opacity:0.6;';
		expandBtn.textContent = '\u2922  Open full board view';
		expandBtn.addEventListener('mouseenter', () => { expandBtn.style.opacity = '1'; expandBtn.style.borderColor = 'var(--vscode-focusBorder)'; });
		expandBtn.addEventListener('mouseleave', () => { expandBtn.style.opacity = '0.6'; expandBtn.style.borderColor = 'var(--vscode-panel-border)'; });
	}
}
