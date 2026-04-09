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

// -- Theme (shared with board pane) -------------------------------------------

const T = {
	accent: '#6366f1',
	accentMuted: '#6366f120',
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

const TYPE_COLORS: Record<string, string> = {
	prd: '#6366f1',
	spec: '#06b6d4',
	user_story: '#8b5cf6',
	research: '#f59e0b',
	meeting_notes: '#71717a',
	adr: '#ec4899',
};

const TYPE_LABELS: Record<string, string> = {
	prd: 'PRD',
	spec: 'Spec',
	user_story: 'Story',
	research: 'Research',
	meeting_notes: 'Notes',
	adr: 'ADR',
};

const STATUS_LABELS: Record<string, string> = {
	draft: 'Draft',
	in_review: 'In Review',
	approved: 'Approved',
	ready_for_dev: 'Ready for Dev',
	archived: 'Archived',
};

const STATUS_COLORS: Record<string, string> = {
	draft: '#71717a',
	in_review: '#a855f7',
	approved: '#22c55e',
	ready_for_dev: '#3b82f6',
	archived: '#3f3f46',
};

// -- Data ---------------------------------------------------------------------

interface IDoc {
	id: string;
	title: string;
	type: string;
	status: string;
	owner: string;
	ownerInitials: string;
	ownerColor: string;
	tasksTotal: number;
	tasksDone: number;
	updatedAt: string;
}

function getDocs(): IDoc[] {
	return [
		{ id: 'doc-prd-v1', title: 'Core Task Management', type: 'prd', status: 'approved', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 4, tasksDone: 2, updatedAt: 'Mar 28' },
		{ id: 'doc-prd-v2', title: 'Documentation & Diagrams', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 1, tasksDone: 0, updatedAt: 'Apr 1' },
		{ id: 'doc-prd-v3', title: 'AI-Native Integration (MCP)', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 2, tasksDone: 0, updatedAt: 'Apr 4' },
		{ id: 'doc-prd-v4', title: 'Cloud Sync & Collaboration', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 5, tasksDone: 2, updatedAt: 'Apr 5' },
		{ id: 'doc-prd-v5', title: 'Product Workspace', type: 'prd', status: 'ready_for_dev', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 9' },
		{ id: 'doc-spec-auth', title: 'Authentication Architecture', type: 'spec', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 1, tasksDone: 1, updatedAt: 'Mar 30' },
		{ id: 'doc-story-onboard', title: 'PM Onboarding Flow', type: 'user_story', status: 'in_review', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 8' },
		{ id: 'doc-research-mcp', title: 'MCP Protocol Feasibility', type: 'research', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 3' },
		{ id: 'doc-notes-retro', title: 'Sprint 1 Retrospective', type: 'meeting_notes', status: 'draft', owner: 'Taylor Reeves', ownerInitials: 'TR', ownerColor: '#8b5cf6', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 4' },
	];
}

// -- Pane ---------------------------------------------------------------------

export class PRendgameDocsPane extends ViewPane {

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

		const docs = getDocs();
		const docRows: { el: HTMLElement; doc: IDoc }[] = [];

		// -- Search -----------------------------------------------------------
		const searchWrap = append(root, $('div'));
		searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;

		const searchInput = append(searchWrap, $('input'));
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter documents\u2026';
		searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });

		searchInput.addEventListener('input', () => {
			const q = searchInput.value.toLowerCase().trim();
			for (const entry of docRows) {
				const d = entry.doc;
				const match = !q
					|| d.title.toLowerCase().includes(q)
					|| d.type.toLowerCase().includes(q)
					|| (TYPE_LABELS[d.type] || '').toLowerCase().includes(q)
					|| d.owner.toLowerCase().includes(q)
					|| d.status.toLowerCase().includes(q);
				entry.el.style.display = match ? '' : 'none';
			}
		});

		// -- Type filter pills ------------------------------------------------
		const filterRow = append(root, $('div'));
		filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

		let activeFilter = '';

		const allPill = append(filterRow, $('span'));
		allPill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;background:${T.accent};color:#fff;transition:all 0.12s;`;
		allPill.textContent = 'All';

		const typePills: { el: HTMLElement; type: string }[] = [];

		const types = [...new Set(docs.map(d => d.type))];
		for (const type of types) {
			const pill = append(filterRow, $('span'));
			const tc = TYPE_COLORS[type] || '#666';
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;background:${tc}15;color:${tc};transition:all 0.12s;`;
			pill.textContent = TYPE_LABELS[type] || type;
			typePills.push({ el: pill, type });

			pill.addEventListener('click', () => {
				activeFilter = type;
				updateFilter();
			});
		}

		allPill.addEventListener('click', () => {
			activeFilter = '';
			updateFilter();
		});

		function updateFilter() {
			// Update pill styles
			if (activeFilter === '') {
				allPill.style.background = T.accent;
				allPill.style.color = '#fff';
			} else {
				allPill.style.background = `${T.textFaint}15`;
				allPill.style.color = T.textFaint;
			}
			for (const tp of typePills) {
				const tc = TYPE_COLORS[tp.type] || '#666';
				if (tp.type === activeFilter) {
					tp.el.style.background = tc;
					tp.el.style.color = '#fff';
				} else {
					tp.el.style.background = `${tc}15`;
					tp.el.style.color = tc;
				}
			}
			// Filter rows
			for (const entry of docRows) {
				const matchesType = !activeFilter || entry.doc.type === activeFilter;
				const matchesSearch = !searchInput.value.trim() || entry.doc.title.toLowerCase().includes(searchInput.value.toLowerCase().trim());
				entry.el.style.display = (matchesType && matchesSearch) ? '' : 'none';
			}
		}

		// -- Document rows ----------------------------------------------------
		const commandService = this.commandService;

		for (const doc of docs) {
			const row = append(root, $('div'));
			row.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid ${T.borderSubtle};`;
			docRows.push({ el: row, doc });

			row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
			row.addEventListener('mouseleave', () => { row.style.background = ''; });
			row.addEventListener('click', () => {
				commandService.executeCommand('prendgame.openDocument', doc.id);
			});

			// Type badge
			const typeBadge = append(row, $('span'));
			const tc = TYPE_COLORS[doc.type] || '#666';
			typeBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;min-width:32px;text-align:center;`;
			typeBadge.textContent = TYPE_LABELS[doc.type] || doc.type;

			// Title + meta column
			const info = append(row, $('div'));
			info.style.cssText = 'flex:1;min-width:0;';

			const title = append(info, $('div'));
			title.style.cssText = `font-size:13px;color:${T.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em;`;
			title.textContent = doc.title;
			title.title = doc.title;

			const meta = append(info, $('div'));
			meta.style.cssText = `font-size:11px;color:${T.textFaint};display:flex;align-items:center;gap:6px;margin-top:1px;`;

			// Status
			const statusDot = append(meta, $('span'));
			const sc = STATUS_COLORS[doc.status] || '#666';
			statusDot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sc};flex-shrink:0;`;

			const statusLabel = append(meta, $('span'));
			statusLabel.textContent = STATUS_LABELS[doc.status] || doc.status;

			// Updated
			const updated = append(meta, $('span'));
			updated.style.cssText = `color:${T.textFaint};`;
			updated.textContent = `\u00B7 ${doc.updatedAt}`;

			// Task progress (if any)
			if (doc.tasksTotal > 0) {
				const progress = append(meta, $('span'));
				const allDone = doc.tasksDone === doc.tasksTotal;
				progress.style.cssText = `color:${allDone ? '#22c55e' : T.textFaint};`;
				progress.textContent = `\u00B7 ${doc.tasksDone}/${doc.tasksTotal} tasks`;
			}

			// Owner avatar
			const av = append(row, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;flex-shrink:0;background:${doc.ownerColor};`;
			av.textContent = doc.ownerInitials;
			av.title = doc.owner;
		}

		// -- New document button ----------------------------------------------
		const newDocWrap = append(root, $('div'));
		newDocWrap.style.cssText = `padding:12px 20px;`;

		const newDocBtn = append(newDocWrap, $('div'));
		newDocBtn.style.cssText = `display:flex;align-items:center;justify-content:center;gap:6px;padding:7px;border-radius:${T.radius};border:1px dashed ${T.border};cursor:pointer;font-size:11px;font-weight:500;color:${T.textMuted};transition:all 0.15s;`;
		newDocBtn.textContent = '+ New Document';
		newDocBtn.addEventListener('mouseenter', () => {
			newDocBtn.style.color = T.text;
			newDocBtn.style.borderColor = T.accent;
			newDocBtn.style.background = T.surfaceHover;
		});
		newDocBtn.addEventListener('mouseleave', () => {
			newDocBtn.style.color = T.textMuted;
			newDocBtn.style.borderColor = T.border;
			newDocBtn.style.background = '';
		});
		newDocBtn.addEventListener('click', () => {
			commandService.executeCommand('prendgame.newDocument');
		});
	}
}
