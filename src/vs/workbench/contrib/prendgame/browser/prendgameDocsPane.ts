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

const T = {
	accent: '#6366f1', accentMuted: '#6366f120', surface: '#141416', surfaceHover: '#1c1c20',
	border: '#1e1e22', borderSubtle: '#16161a', text: '#e4e4e7', textMuted: '#71717a', textFaint: '#52525b',
	radius: '6px', radiusSm: '4px', radiusPill: '10px',
};

const TYPE_COLORS: Record<string, string> = { prd: '#6366f1', spec: '#06b6d4', user_story: '#8b5cf6', research: '#f59e0b', meeting_notes: '#71717a', adr: '#ec4899' };
const TYPE_LABELS: Record<string, string> = { prd: 'PRD', spec: 'Spec', user_story: 'Story', research: 'Research', meeting_notes: 'Notes', adr: 'ADR' };
const STATUSES = ['draft', 'in_review', 'approved', 'ready_for_dev', 'archived'];
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', ready_for_dev: 'Ready for Dev', archived: 'Archived' };
const STATUS_COLORS: Record<string, string> = { draft: '#71717a', in_review: '#a855f7', approved: '#22c55e', ready_for_dev: '#3b82f6', archived: '#3f3f46' };

interface IDoc { id: string; title: string; type: string; status: string; owner: string; ownerInitials: string; ownerColor: string; tasksTotal: number; tasksDone: number; updatedAt: string }

function getInitialDocs(): IDoc[] {
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

export class PRendgameDocsPane extends ViewPane {

	private root!: HTMLElement;
	private docs: IDoc[] = [];
	private activeFilter = '';
	private searchQuery = '';

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
		this.docs = getInitialDocs();
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.root = append(container, $('div'));
		this.root.style.cssText = `overflow-y:auto;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased;`;
		this.rebuild();
	}

	private rebuild(): void {
		this.root.textContent = '';

		// -- Search -----------------------------------------------------------
		const searchWrap = append(this.root, $('div'));
		searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;

		const searchInput = append(searchWrap, $('input'));
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter documents\u2026';
		searchInput.value = this.searchQuery;
		searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });
		searchInput.addEventListener('input', () => { this.searchQuery = searchInput.value; this.renderRows(); });

		// -- Type filter pills ------------------------------------------------
		const filterRow = append(this.root, $('div'));
		filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

		const makeFilterPill = (label: string, filterType: string) => {
			const pill = append(filterRow, $('span'));
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;`;
			pill.textContent = label;
			this.stylePill(pill, filterType);
			pill.addEventListener('click', () => {
				this.activeFilter = filterType;
				this.rebuild();
			});
		};

		makeFilterPill('All', '');
		const types = [...new Set(this.docs.map(d => d.type))];
		for (const type of types) {
			makeFilterPill(TYPE_LABELS[type] || type, type);
		}

		// -- Document rows container ------------------------------------------
		this.rowContainer = append(this.root, $('div'));
		this.renderRows();

		// -- New document button ----------------------------------------------
		const newDocWrap = append(this.root, $('div'));
		newDocWrap.style.cssText = 'padding:12px 20px;';

		const newDocBtn = append(newDocWrap, $('div'));
		newDocBtn.style.cssText = `display:flex;align-items:center;justify-content:center;gap:6px;padding:7px;border-radius:${T.radius};border:1px dashed ${T.border};cursor:pointer;font-size:11px;font-weight:500;color:${T.textMuted};transition:all 0.15s;`;
		newDocBtn.textContent = '+ New Document';
		newDocBtn.addEventListener('mouseenter', () => { newDocBtn.style.color = T.text; newDocBtn.style.borderColor = T.accent; newDocBtn.style.background = T.surfaceHover; });
		newDocBtn.addEventListener('mouseleave', () => { newDocBtn.style.color = T.textMuted; newDocBtn.style.borderColor = T.border; newDocBtn.style.background = ''; });
		newDocBtn.addEventListener('click', () => { this.createNewDocument(); });
	}

	private rowContainer!: HTMLElement;

	private renderRows(): void {
		this.rowContainer.textContent = '';
		const q = this.searchQuery.toLowerCase().trim();

		const filtered = this.docs.filter(d => {
			if (this.activeFilter && d.type !== this.activeFilter) { return false; }
			if (q && !d.title.toLowerCase().includes(q) && !d.type.toLowerCase().includes(q) && !d.owner.toLowerCase().includes(q) && !(STATUS_LABELS[d.status] || '').toLowerCase().includes(q)) { return false; }
			return true;
		});

		for (const doc of filtered) {
			this.renderDocRow(this.rowContainer, doc);
		}

		if (filtered.length === 0) {
			const empty = append(this.rowContainer, $('div'));
			empty.style.cssText = `padding:20px;text-align:center;font-size:12px;color:${T.textFaint};`;
			empty.textContent = 'No documents match your filter';
		}
	}

	private renderDocRow(parent: HTMLElement, doc: IDoc): void {
		const row = append(parent, $('div'));
		row.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid ${T.borderSubtle};`;
		row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
		row.addEventListener('mouseleave', () => { row.style.background = ''; });
		row.addEventListener('click', () => { this.commandService.executeCommand('prendgame.openDocument', doc.id); });

		// Type badge
		const typeBadge = append(row, $('span'));
		const tc = TYPE_COLORS[doc.type] || '#666';
		typeBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;min-width:32px;text-align:center;`;
		typeBadge.textContent = TYPE_LABELS[doc.type] || doc.type;

		// Title + meta
		const info = append(row, $('div'));
		info.style.cssText = 'flex:1;min-width:0;';

		const title = append(info, $('div'));
		title.style.cssText = `font-size:13px;color:${T.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em;`;
		title.textContent = doc.title;
		title.title = 'Double-click to rename';

		// Double-click to rename
		title.addEventListener('dblclick', (e) => {
			e.stopPropagation();
			const input = document.createElement('input');
			input.type = 'text';
			input.value = doc.title;
			input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:2px 6px;border-radius:${T.radiusSm};font-size:13px;font-family:inherit;outline:none;`;
			title.textContent = '';
			title.appendChild(input);
			input.focus();
			input.select();

			const finish = () => {
				const newTitle = input.value.trim();
				if (newTitle && newTitle !== doc.title) { doc.title = newTitle; }
				title.textContent = doc.title;
			};
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => {
				if (ke.key === 'Enter') { input.blur(); }
				if (ke.key === 'Escape') { input.value = doc.title; input.blur(); }
			});
		});

		const meta = append(info, $('div'));
		meta.style.cssText = `font-size:11px;color:${T.textFaint};display:flex;align-items:center;gap:6px;margin-top:1px;`;

		// Status (clickable to cycle)
		const statusWrap = append(meta, $('span'));
		statusWrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;cursor:pointer;';
		statusWrap.title = 'Click to change status';

		const statusDot = append(statusWrap, $('span'));
		const sc = STATUS_COLORS[doc.status] || '#666';
		statusDot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sc};flex-shrink:0;`;

		const statusLabel = append(statusWrap, $('span'));
		statusLabel.textContent = STATUS_LABELS[doc.status] || doc.status;

		statusWrap.addEventListener('click', (e) => {
			e.stopPropagation();
			const currentIdx = STATUSES.indexOf(doc.status);
			const nextIdx = (currentIdx + 1) % STATUSES.length;
			doc.status = STATUSES[nextIdx];
			const newSc = STATUS_COLORS[doc.status] || '#666';
			statusDot.style.background = newSc;
			statusLabel.textContent = STATUS_LABELS[doc.status] || doc.status;
		});

		// Updated date
		const updated = append(meta, $('span'));
		updated.textContent = `\u00B7 ${doc.updatedAt}`;

		// Task progress
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

	private stylePill(pill: HTMLElement, filterType: string): void {
		if (filterType === '') {
			pill.style.background = this.activeFilter === '' ? T.accent : `${T.textFaint}15`;
			pill.style.color = this.activeFilter === '' ? '#fff' : T.textFaint;
		} else {
			const tc = TYPE_COLORS[filterType] || '#666';
			pill.style.background = this.activeFilter === filterType ? tc : `${tc}15`;
			pill.style.color = this.activeFilter === filterType ? '#fff' : tc;
		}
	}

	private async createNewDocument(): Promise<void> {
		// Use the extension's newDocument command which shows a type picker
		await this.commandService.executeCommand('prendgame.newDocument');

		// For the mock, also add a doc to our local state and refresh
		const id = `doc-new-${Date.now()}`;
		this.docs.unshift({
			id,
			title: 'Untitled Document',
			type: 'prd',
			status: 'draft',
			owner: 'Alex Chen',
			ownerInitials: 'AC',
			ownerColor: '#6366f1',
			tasksTotal: 0,
			tasksDone: 0,
			updatedAt: 'Just now',
		});
		this.rebuild();
	}
}
