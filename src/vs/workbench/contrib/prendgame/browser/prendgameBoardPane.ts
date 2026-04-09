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

		// -- Summary pills -----------------------------------------------------
		const pills = append(root, $('div'));
		pills.style.cssText = 'display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));';

		const groups = getGroups();
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
			// Section header (22px line-height, matching VS Code tree rows)
			const hdr = append(root, $('div'));
			hdr.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 16px;height:28px;cursor:pointer;user-select:none;';
			hdr.addEventListener('mouseenter', () => { hdr.style.background = 'var(--vscode-list-hoverBackground)'; });
			hdr.addEventListener('mouseleave', () => { hdr.style.background = ''; });

			// Twistie (matches VS Code tree twistie: 16px wide, 10px font)
			const twistie = append(hdr, $('span'));
			twistie.style.cssText = 'width:16px;font-size:10px;text-align:center;color:var(--vscode-descriptionForeground);transition:transform 0.12s;';
			twistie.textContent = '\u25B6';
			if (!group.collapsed) {
				twistie.style.transform = 'rotate(90deg)';
			}

			// Status indicator
			const statusDot = append(hdr, $('span'));
			const sc = STATUS_COLORS[group.id] || '#666';
			statusDot.style.cssText = `width:8px;height:8px;border-radius:2px;background:${sc};flex-shrink:0;`;

			// Name
			const label = append(hdr, $('span'));
			label.style.cssText = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--vscode-foreground);';
			label.textContent = group.name;

			// Count badge
			const badge = append(hdr, $('span'));
			badge.style.cssText = 'font-size:10px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);padding:0 5px;border-radius:8px;margin-left:auto;min-width:16px;text-align:center;';
			badge.textContent = String(group.tasks.length);

			// Cards container
			const cards = append(root, $('div'));
			if (group.collapsed) {
				cards.style.display = 'none';
			}

			// Separator after section
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
				const row = append(cards, $('div'));
				row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 16px 0 38px;height:22px;cursor:pointer;';
				row.addEventListener('mouseenter', () => { row.style.background = 'var(--vscode-list-hoverBackground)'; });
				row.addEventListener('mouseleave', () => { row.style.background = ''; });

				// Priority indicator (thin left bar)
				const pBar = append(row, $('span'));
				const pc = PRIORITY_COLORS[task.priority] || '#666';
				pBar.style.cssText = `width:3px;height:14px;border-radius:1px;background:${pc};flex-shrink:0;`;

				// Task ID
				const tid = append(row, $('span'));
				tid.style.cssText = 'font-size:11px;opacity:0.45;font-family:var(--monaco-monospace-font);white-space:nowrap;';
				tid.textContent = task.id;

				// Task title
				const title = append(row, $('span'));
				title.style.cssText = 'font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:22px;';
				title.textContent = task.title;
				title.title = task.title;

				// Assignee
				const av = append(row, $('span'));
				av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;background:${task.color};`;
				av.textContent = task.initials;
				av.title = task.initials;
			}
		}

		// -- Expand button ----------------------------------------------------
		const expandWrap = append(root, $('div'));
		expandWrap.style.cssText = 'padding:12px 16px;';

		const btn = append(expandWrap, $('div'));
		btn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;padding:6px;border-radius:4px;border:1px solid var(--vscode-sideBar-border,var(--vscode-panel-border));cursor:pointer;font-size:11px;color:var(--vscode-descriptionForeground);transition:all 0.12s;';
		btn.textContent = 'Open Board View';
		btn.addEventListener('mouseenter', () => {
			btn.style.color = 'var(--vscode-foreground)';
			btn.style.borderColor = 'var(--vscode-focusBorder)';
			btn.style.background = 'var(--vscode-list-hoverBackground)';
		});
		btn.addEventListener('mouseleave', () => {
			btn.style.color = 'var(--vscode-descriptionForeground)';
			btn.style.borderColor = 'var(--vscode-sideBar-border,var(--vscode-panel-border))';
			btn.style.background = '';
		});
		btn.addEventListener('click', () => {
			this.commandService.executeCommand('prendgame.openBoard');
		});
	}
}
