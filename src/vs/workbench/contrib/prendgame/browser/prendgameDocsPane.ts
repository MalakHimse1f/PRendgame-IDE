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

const T = {
	accent: '#6366f1', surface: '#141416', surfaceHover: '#1c1c20',
	border: '#1e1e22', borderSubtle: '#16161a', text: '#e4e4e7', textMuted: '#71717a', textFaint: '#52525b',
	radius: '6px', radiusSm: '4px', radiusPill: '10px',
};
const TYPE_COLORS: Record<string, string> = { prd: '#6366f1', spec: '#06b6d4', user_story: '#8b5cf6', research: '#f59e0b', meeting_notes: '#71717a', adr: '#ec4899' };
const TYPE_LABELS: Record<string, string> = { prd: 'PRD', spec: 'Spec', user_story: 'Story', research: 'Research', meeting_notes: 'Notes', adr: 'ADR' };
const STATUSES = ['draft', 'in_review', 'approved', 'ready_for_dev', 'archived'];
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', ready_for_dev: 'Ready for Dev', archived: 'Archived' };
const STATUS_COLORS: Record<string, string> = { draft: '#71717a', in_review: '#a855f7', approved: '#22c55e', ready_for_dev: '#3b82f6', archived: '#3f3f46' };

interface IDoc { id: string; title: string; type: string; status: string; owner: string; ownerInitials: string; ownerColor: string; tasksTotal: number; tasksDone: number; updatedAt: string; content: string }

function getInitialDocs(): IDoc[] {
	return [
		{ id: 'doc-prd-v1', title: 'Core Task Management', type: 'prd', status: 'approved', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 4, tasksDone: 2, updatedAt: 'Mar 28', content: '## Overview\n\nThe foundational feature of PRendgame: a kanban-style task board.\n\n## Goals\n\n1. Engineers can see and manage their tasks without opening a browser\n2. PMs can create and prioritize tasks in the same tool\n3. Task state is visible to AI agents via MCP\n\n## Requirements\n\n- [x] Default columns: Backlog, To Do, In Progress, In Review, Done\n- [x] Drag-and-drop between columns\n- [ ] Filter by assignee, label, priority, sprint\n- [ ] Comments thread\n- [ ] Activity log' },
		{ id: 'doc-prd-v2', title: 'Documentation & Diagrams', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 1, tasksDone: 0, updatedAt: 'Apr 1', content: '## Overview\n\nEmbed a rich document editor inside PRendgame.\n\n## Goals\n\n1. PMs can author requirements without leaving the IDE\n2. Documents are first-class objects linked to tasks\n3. AI agents can read documents to understand context' },
		{ id: 'doc-prd-v3', title: 'AI-Native Integration (MCP)', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 2, tasksDone: 0, updatedAt: 'Apr 4', content: '## Overview\n\nPRendgame is the project context layer that AI agents plug into via MCP.\n\n## MCP Tools\n\n- prendgame.tasks.list\n- prendgame.tasks.get\n- prendgame.tasks.create\n- prendgame.tasks.transition\n- prendgame.docs.list\n- prendgame.docs.get' },
		{ id: 'doc-prd-v4', title: 'Cloud Sync & Collaboration', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 5, tasksDone: 2, updatedAt: 'Apr 5', content: '## Overview\n\nSupabase-backed cloud sync for team collaboration.\n\n## Tiers\n\n- Free: Local tasks and docs\n- Team: Cloud sync, shared boards\n- Enterprise: SSO, audit logs' },
		{ id: 'doc-prd-v5', title: 'Product Workspace', type: 'prd', status: 'ready_for_dev', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 9', content: '## Overview\n\nA Notion-style document workspace for Product Managers.\n\n## Goals\n\n1. PMs can create rich documents inside PRendgame\n2. Documents have custom attributes and multiple views\n3. Documents can be converted into engineering tasks' },
		{ id: 'doc-spec-auth', title: 'Authentication Architecture', type: 'spec', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 1, tasksDone: 1, updatedAt: 'Mar 30', content: '## Approach\n\nSupabase Auth with email/password + GitHub OAuth.\n\n## Flow\n\n1. User clicks Sign In\n2. Browser opens for OAuth\n3. Redirect back to prendgame://\n4. Token stored in SecretStorage' },
		{ id: 'doc-story-onboard', title: 'PM Onboarding Flow', type: 'user_story', status: 'in_review', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 8', content: '## As a new PM\n\nI want to quickly understand how to create documents and track sprints.\n\n## Acceptance Criteria\n\n- [ ] Welcome walkthrough\n- [ ] Template picker\n- [ ] Sample project' },
		{ id: 'doc-research-mcp', title: 'MCP Protocol Feasibility', type: 'research', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 3', content: '## Summary\n\nMCP is viable for exposing PRendgame data to AI agents.\n\n## Findings\n\n- Claude Code supports MCP natively\n- Sub-100ms latency for local calls\n- Tool definitions are straightforward JSON schema' },
		{ id: 'doc-notes-retro', title: 'Sprint 1 Retrospective', type: 'meeting_notes', status: 'draft', owner: 'Taylor Reeves', ownerInitials: 'TR', ownerColor: '#8b5cf6', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 4', content: '## What went well\n\n- Auth flow completed ahead of schedule\n- Supabase schema is solid\n\n## What could improve\n\n- Need better task estimation\n- PR reviews took too long\n\n## Action items\n\n- [ ] Set up review SLAs\n- [ ] Add story points to tasks' },
	];
}

function renderMarkdownToDOM(parent: HTMLElement, text: string): void {
	const lines = text.split('\n');
	for (const line of lines) {
		if (line.startsWith('## ')) {
			const el = append(parent, $('div'));
			el.style.cssText = 'font-size:14px;font-weight:600;margin:14px 0 6px;color:#e4e4e7;border-bottom:1px solid #1e1e22;padding-bottom:4px';
			el.textContent = line.slice(3);
		} else if (line.startsWith('# ')) {
			const el = append(parent, $('div'));
			el.style.cssText = 'font-size:16px;font-weight:700;margin:16px 0 8px;color:#e4e4e7';
			el.textContent = line.slice(2);
		} else if (line.startsWith('- [x] ')) {
			const el = append(parent, $('div'));
			el.style.cssText = 'margin:2px 0;color:#22c55e';
			el.textContent = '\u2611 ' + line.slice(6);
		} else if (line.startsWith('- [ ] ')) {
			const el = append(parent, $('div'));
			el.style.cssText = 'margin:2px 0;color:#71717a';
			el.textContent = '\u2610 ' + line.slice(6);
		} else if (line.startsWith('- ')) {
			const el = append(parent, $('div'));
			el.style.cssText = 'margin:2px 0;padding-left:12px';
			el.textContent = '\u2022 ' + line.slice(2);
		} else if (/^\d+\. /.test(line)) {
			const el = append(parent, $('div'));
			el.style.cssText = 'margin:2px 0;padding-left:12px';
			el.textContent = line;
		} else if (line.trim() === '') {
			append(parent, $('br'));
		} else {
			const el = append(parent, $('div'));
			el.style.cssText = 'margin:2px 0';
			el.textContent = line;
		}
	}
}

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
		renderDocsContent(root, this.commandService);
	}
}

export function renderDocsContent(root: HTMLElement, commandService: { executeCommand(id: string, ...args: unknown[]): unknown }): void {
	const docs = getInitialDocs();

	// State
	let activeFilter = '';
	let activeDocId: string | null = null;

	// Containers for list and detail (swap visibility)
	const listContainer = append(root, $('div'));
	const detailContainer = append(root, $('div'));
	detailContainer.style.display = 'none';

	function showList() {
		activeDocId = null;
		listContainer.style.display = '';
		detailContainer.style.display = 'none';
	}

	function showDetail(docId: string) {
		activeDocId = docId;
		listContainer.style.display = 'none';
		detailContainer.style.display = '';
		renderDetail();
	}

	// == LIST =============================================================
	function renderList() {
		// Filter pills
		const filterRow = append(listContainer, $('div'));
		filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

		function makePill(label: string, filterType: string) {
			const pill = append(filterRow, $('span'));
			const isActive = activeFilter === filterType;
			const tc = filterType ? (TYPE_COLORS[filterType] || '#666') : T.accent;
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? tc : tc + '15'};color:${isActive ? '#fff' : tc};`;
			pill.textContent = label;
			pill.addEventListener('click', () => {
				activeFilter = filterType;
				rebuildList();
			});
		}

		makePill('All', '');
		const types = [...new Set(docs.map(d => d.type))];
		for (const type of types) { makePill(TYPE_LABELS[type] || type, type); }

		// Doc rows container
		const rowsContainer = append(listContainer, $('div'));

		for (const doc of docs) {
			if (activeFilter && doc.type !== activeFilter) { continue; }

			const row = append(rowsContainer, $('div'));
			row.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid ${T.borderSubtle};`;
			row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
			row.addEventListener('mouseleave', () => { row.style.background = ''; });
			row.addEventListener('click', () => { showDetail(doc.id); });

			const tc = TYPE_COLORS[doc.type] || '#666';
			const badge = append(row, $('span'));
			badge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;min-width:32px;text-align:center;`;
			badge.textContent = TYPE_LABELS[doc.type] || doc.type;

			const info = append(row, $('div'));
			info.style.cssText = 'flex:1;min-width:0;';
			const title = append(info, $('div'));
			title.style.cssText = `font-size:13px;color:${T.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em;`;
			title.textContent = doc.title;
			const meta = append(info, $('div'));
			meta.style.cssText = `font-size:11px;color:${T.textFaint};display:flex;align-items:center;gap:6px;margin-top:1px;`;
			const sc = STATUS_COLORS[doc.status] || '#666';
			const dot = append(meta, $('span'));
			dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sc};`;
			const sl = append(meta, $('span'));
			sl.textContent = STATUS_LABELS[doc.status] || doc.status;
			const upd = append(meta, $('span'));
			upd.textContent = `\u00B7 ${doc.updatedAt}`;
			if (doc.tasksTotal > 0) {
				const p = append(meta, $('span'));
				p.style.cssText = `color:${doc.tasksDone === doc.tasksTotal ? '#22c55e' : T.textFaint};`;
				p.textContent = `\u00B7 ${doc.tasksDone}/${doc.tasksTotal} tasks`;
			}

			const av = append(row, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;flex-shrink:0;background:${doc.ownerColor};`;
			av.textContent = doc.ownerInitials;
		}

		// New doc button
		const wrap = append(listContainer, $('div'));
		wrap.style.cssText = 'padding:12px 20px;';
		const btn = append(wrap, $('div'));
		btn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:7px;border-radius:${T.radius};border:1px dashed ${T.border};cursor:pointer;font-size:11px;font-weight:500;color:${T.textMuted};transition:all 0.15s;`;
		btn.textContent = '+ New Document';
		btn.addEventListener('mouseenter', () => { btn.style.color = T.text; btn.style.borderColor = T.accent; btn.style.background = T.surfaceHover; });
		btn.addEventListener('mouseleave', () => { btn.style.color = T.textMuted; btn.style.borderColor = T.border; btn.style.background = ''; });
		btn.addEventListener('click', () => {
			const id = `doc-new-${Date.now()}`;
			docs.unshift({ id, title: 'Untitled Document', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Just now', content: '## Overview\n\nDescribe the purpose of this document.\n\n## Goals\n\n1. \n2. \n3. \n' });
			showDetail(id);
		});
	}

	function rebuildList() {
		listContainer.textContent = '';
		renderList();
	}

	// == DETAIL ===========================================================
	function renderDetail() {
		detailContainer.textContent = '';
		const doc = docs.find(d => d.id === activeDocId);
		if (!doc) { showList(); return; }

		// Back button
		const backRow = append(detailContainer, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { showList(); rebuildList(); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = 'Documents';

		// Header
		const header = append(detailContainer, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		const tc = TYPE_COLORS[doc.type] || '#666';
		const typeBadge = append(header, $('span'));
		typeBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;`;
		typeBadge.textContent = TYPE_LABELS[doc.type] || doc.type;

		// Editable title
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:8px;cursor:text;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;letter-spacing:-0.01em;`;
		titleEl.textContent = doc.title;
		titleEl.addEventListener('mouseenter', () => { titleEl.style.background = T.surfaceHover; });
		titleEl.addEventListener('mouseleave', () => { titleEl.style.background = ''; });
		titleEl.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = doc.title;
			input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:4px 8px;border-radius:${T.radiusSm};font-size:16px;font-weight:600;font-family:inherit;outline:none;`;
			titleEl.textContent = '';
			titleEl.appendChild(input);
			input.focus();
			input.select();
			const finish = () => { const v = input.value.trim(); if (v) { doc.title = v; } titleEl.textContent = doc.title; };
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { input.blur(); } if (ke.key === 'Escape') { input.value = doc.title; input.blur(); } });
		});

		// Metadata
		const metaRow = append(header, $('div'));
		metaRow.style.cssText = `display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;`;

		const statusWrap = append(metaRow, $('div'));
		statusWrap.style.cssText = 'position:relative;';
		const statusBtn = append(statusWrap, $('span'));
		let sc = STATUS_COLORS[doc.status] || '#666';
		statusBtn.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};cursor:pointer;font-weight:500;transition:all 0.12s;`;
		statusBtn.textContent = (STATUS_LABELS[doc.status] || doc.status) + ' \u25BE';

		let statusDropdown: HTMLElement | null = null;
		statusBtn.addEventListener('click', () => {
			if (statusDropdown) { statusDropdown.remove(); statusDropdown = null; return; }
			const dd = append(statusWrap, $('div'));
			statusDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:140px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;

			for (const status of STATUSES) {
				const option = append(dd, $('div'));
				const optSc = STATUS_COLORS[status] || '#666';
				const isActive = doc.status === status;
				option.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${isActive ? T.text : T.textMuted};transition:background 0.1s;`;
				option.addEventListener('mouseenter', () => { option.style.background = T.surfaceHover; });
				option.addEventListener('mouseleave', () => { option.style.background = ''; });

				const optDot = append(option, $('span'));
				optDot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${optSc};flex-shrink:0;`;
				const optLabel = append(option, $('span'));
				optLabel.textContent = STATUS_LABELS[status] || status;
				if (isActive) { optLabel.style.fontWeight = '600'; }

				option.addEventListener('click', (e) => {
					e.stopPropagation();
					doc.status = status;
					sc = STATUS_COLORS[doc.status] || '#666';
					statusBtn.style.background = `${sc}20`;
					statusBtn.style.color = sc;
					statusBtn.textContent = (STATUS_LABELS[doc.status] || doc.status) + ' \u25BE';
					dd.remove();
					statusDropdown = null;
				});
			}

			const w = getWindow(statusWrap);
			const closeFn = (e: Event) => { if (!statusWrap.contains(e.target as Node)) { dd.remove(); statusDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		const ownerEl = append(metaRow, $('span'));
		ownerEl.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${T.textMuted};`;
		const ownerAv = append(ownerEl, $('span'));
		ownerAv.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${doc.ownerColor};`;
		ownerAv.textContent = doc.ownerInitials;
		ownerEl.appendChild(document.createTextNode(doc.owner));

		if (doc.tasksTotal > 0) {
			const tp = append(metaRow, $('span'));
			tp.style.cssText = `font-size:11px;color:${doc.tasksDone === doc.tasksTotal ? '#22c55e' : T.textFaint};`;
			tp.textContent = `${doc.tasksDone}/${doc.tasksTotal} tasks`;
		}

		// Attributes grid
		const attrsSection = append(detailContainer, $('div'));
		attrsSection.style.cssText = `padding:12px 20px;border-bottom:1px solid ${T.border};display:grid;grid-template-columns:100px 1fr;gap:6px 12px;align-items:center;`;

		// Type (dropdown)
		const typeLbl2 = append(attrsSection, $('span'));
		typeLbl2.style.cssText = `font-size:11px;color:${T.textFaint};`;
		typeLbl2.textContent = 'Type';
		const typeWrap = append(attrsSection, $('div'));
		typeWrap.style.cssText = 'position:relative;';
		const typeVal = append(typeWrap, $('span'));
		let tc2 = TYPE_COLORS[doc.type] || '#666';
		typeVal.style.cssText = `font-size:11px;padding:2px 8px;border-radius:3px;background:${tc2}20;color:${tc2};font-weight:500;cursor:pointer;`;
		typeVal.textContent = (TYPE_LABELS[doc.type] || doc.type) + ' \u25BE';
		const allTypes = Object.keys(TYPE_LABELS);
		let typeDD: HTMLElement | null = null;
		typeVal.addEventListener('click', () => {
			if (typeDD) { typeDD.remove(); typeDD = null; return; }
			const dd = append(typeWrap, $('div'));
			typeDD = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:120px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const typ of allTypes) {
				const opt = append(dd, $('div'));
				const otc = TYPE_COLORS[typ] || '#666';
				const isActive = doc.type === typ;
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${isActive ? T.text : T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `font-size:9px;padding:1px 5px;border-radius:2px;background:${otc}20;color:${otc};font-weight:600;`;
				od.textContent = TYPE_LABELS[typ] || typ;
				opt.addEventListener('click', (e) => {
					e.stopPropagation();
					doc.type = typ;
					tc2 = TYPE_COLORS[typ] || '#666';
					typeVal.style.background = `${tc2}20`;
					typeVal.style.color = tc2;
					typeVal.textContent = (TYPE_LABELS[typ] || typ) + ' \u25BE';
					// Also update the type badge in the header
					typeBadge.style.background = `${tc2}20`;
					typeBadge.style.color = tc2;
					typeBadge.textContent = TYPE_LABELS[typ] || typ;
					dd.remove();
					typeDD = null;
				});
			}
			const w = getWindow(typeWrap);
			const closeFn = (e: Event) => { if (!typeWrap.contains(e.target as Node)) { dd.remove(); typeDD = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Priority (dropdown)
		const prioLbl = append(attrsSection, $('span'));
		prioLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		prioLbl.textContent = 'Priority';
		const prioWrap = append(attrsSection, $('div'));
		prioWrap.style.cssText = 'position:relative;';
		const priorities = ['Low', 'Medium', 'High', 'Critical'];
		const prioColors: Record<string, string> = { Low: '#52525b', Medium: '#ca8a04', High: '#ea580c', Critical: '#ef4444' };
		let docPriority = 'High';
		const prioPill = append(prioWrap, $('span'));
		let ppc = prioColors[docPriority] || '#666';
		prioPill.style.cssText = `font-size:11px;padding:2px 8px;border-radius:${T.radiusPill};background:${ppc}20;color:${ppc};cursor:pointer;font-weight:500;`;
		prioPill.textContent = docPriority + ' \u25BE';
		let prioDD: HTMLElement | null = null;
		prioPill.addEventListener('click', () => {
			if (prioDD) { prioDD.remove(); prioDD = null; return; }
			const dd = append(prioWrap, $('div'));
			prioDD = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:110px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const p of priorities) {
				const opt = append(dd, $('div'));
				const opc = prioColors[p] || '#666';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${opc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = p;
				opt.addEventListener('click', (e) => { e.stopPropagation(); docPriority = p; ppc = opc; prioPill.style.background = `${ppc}20`; prioPill.style.color = ppc; prioPill.textContent = p + ' \u25BE'; dd.remove(); prioDD = null; });
			}
			const w = getWindow(prioWrap);
			const closeFn = (e: Event) => { if (!prioWrap.contains(e.target as Node)) { dd.remove(); prioDD = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Sprint
		const sprintLbl = append(attrsSection, $('span'));
		sprintLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		sprintLbl.textContent = 'Sprint';
		const sprintVal = append(attrsSection, $('span'));
		sprintVal.style.cssText = `font-size:11px;color:${T.text};`;
		sprintVal.textContent = 'Sprint 2';

		// Target Release (editable text)
		const relLbl = append(attrsSection, $('span'));
		relLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		relLbl.textContent = 'Target Release';
		const relVal = append(attrsSection, $('span'));
		relVal.style.cssText = `font-size:11px;color:${T.text};cursor:text;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		let relText = 'v1.0';
		relVal.textContent = relText;
		relVal.addEventListener('mouseenter', () => { relVal.style.background = T.surfaceHover; });
		relVal.addEventListener('mouseleave', () => { relVal.style.background = ''; });
		relVal.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = relText;
			input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:2px 6px;border-radius:${T.radiusSm};font-size:11px;font-family:inherit;outline:none;`;
			relVal.textContent = '';
			relVal.appendChild(input);
			input.focus();
			input.select();
			const finish = () => { relText = input.value.trim() || relText; relVal.textContent = relText; };
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { input.blur(); } if (ke.key === 'Escape') { relVal.textContent = relText; } });
		});

		// Effort Estimate (dropdown)
		const effLbl = append(attrsSection, $('span'));
		effLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		effLbl.textContent = 'Effort';
		const effWrap = append(attrsSection, $('div'));
		effWrap.style.cssText = 'position:relative;';
		const sizes = ['S', 'M', 'L', 'XL'];
		let effSize = 'L';
		const effPill = append(effWrap, $('span'));
		effPill.style.cssText = `font-size:11px;padding:2px 8px;border-radius:${T.radiusPill};background:${T.border};color:${T.textMuted};cursor:pointer;font-weight:500;`;
		effPill.textContent = effSize + ' \u25BE';
		let effDD: HTMLElement | null = null;
		effPill.addEventListener('click', () => {
			if (effDD) { effDD.remove(); effDD = null; return; }
			const dd = append(effWrap, $('div'));
			effDD = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:60px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const s of sizes) {
				const opt = append(dd, $('div'));
				opt.style.cssText = `padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				opt.textContent = s;
				if (s === effSize) { opt.style.fontWeight = '600'; opt.style.color = T.text; }
				opt.addEventListener('click', (e) => { e.stopPropagation(); effSize = s; effPill.textContent = s + ' \u25BE'; dd.remove(); effDD = null; });
			}
			const w = getWindow(effWrap);
			const closeFn = (e: Event) => { if (!effWrap.contains(e.target as Node)) { dd.remove(); effDD = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Tags
		const tagsLbl = append(attrsSection, $('span'));
		tagsLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		tagsLbl.textContent = 'Tags';
		const tagsRow = append(attrsSection, $('div'));
		tagsRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;';
		const mockTags = ['product', 'v1', 'priority'];
		for (const tag of mockTags) {
			const tagEl = append(tagsRow, $('span'));
			tagEl.style.cssText = `font-size:10px;padding:2px 8px;border-radius:${T.radiusPill};background:${T.border};color:${T.textMuted};`;
			tagEl.textContent = tag;
		}
		const addTagBtn = append(tagsRow, $('span'));
		addTagBtn.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};border:1px dashed ${T.border};color:${T.textFaint};cursor:pointer;transition:all 0.12s;`;
		addTagBtn.textContent = '+';
		addTagBtn.addEventListener('mouseenter', () => { addTagBtn.style.color = T.text; addTagBtn.style.borderColor = T.accent; });
		addTagBtn.addEventListener('mouseleave', () => { addTagBtn.style.color = T.textFaint; addTagBtn.style.borderColor = T.border; });

		// Open in Editor button (single, not a mode toggle)
		const openEditorWrap = append(detailContainer, $('div'));
		openEditorWrap.style.cssText = 'padding:10px 20px;';
		const openEditorBtn = append(openEditorWrap, $('span'));
		openEditorBtn.style.cssText = `font-size:11px;padding:4px 12px;border-radius:${T.radiusSm};border:1px solid ${T.border};cursor:pointer;color:${T.textMuted};transition:all 0.12s;`;
		openEditorBtn.textContent = 'Open in Editor';
		openEditorBtn.addEventListener('mouseenter', () => { openEditorBtn.style.color = T.text; openEditorBtn.style.borderColor = T.accent; });
		openEditorBtn.addEventListener('mouseleave', () => { openEditorBtn.style.color = T.textMuted; openEditorBtn.style.borderColor = T.border; });
		openEditorBtn.addEventListener('click', () => { commandService.executeCommand('prendgame.openDocument', doc.id); });

		// Inline editable content blocks
		const contentSection = append(detailContainer, $('div'));
		contentSection.style.cssText = `padding:12px 20px 20px;`;

		const lines = doc.content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.trim() === '') { continue; }

			const block = append(contentSection, $('div'));
			block.style.cssText = `cursor:text;padding:3px 4px;border-radius:${T.radiusSm};transition:background 0.1s;margin:1px 0;`;
			block.addEventListener('mouseenter', () => { block.style.background = T.surfaceHover; });
			block.addEventListener('mouseleave', () => { block.style.background = ''; });

			// Render styled text
			if (line.startsWith('## ')) {
				block.style.cssText += `font-size:14px;font-weight:600;color:${T.text};margin-top:12px;margin-bottom:4px;border-bottom:1px solid ${T.border};padding-bottom:4px;`;
				block.textContent = line.slice(3);
			} else if (line.startsWith('# ')) {
				block.style.cssText += `font-size:16px;font-weight:700;color:${T.text};margin-top:14px;margin-bottom:6px;`;
				block.textContent = line.slice(2);
			} else if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
				const isChecked = line.startsWith('- [x] ');
				const label = line.slice(6);
				block.style.cssText += `font-size:13px;color:${isChecked ? '#22c55e' : T.textMuted};cursor:pointer;`;
				block.textContent = (isChecked ? '\u2611 ' : '\u2610 ') + label;
				const cbIndex = i;
				block.addEventListener('click', () => {
					const wasChecked = lines[cbIndex].startsWith('- [x] ');
					const cbLabel = lines[cbIndex].slice(6);
					lines[cbIndex] = wasChecked ? `- [ ] ${cbLabel}` : `- [x] ${cbLabel}`;
					doc.content = lines.join('\n');
					block.textContent = (wasChecked ? '\u2610 ' : '\u2611 ') + cbLabel;
					block.style.color = wasChecked ? T.textMuted : '#22c55e';
				});
				continue; // Skip the generic click-to-edit handler below
			} else if (line.startsWith('- ')) {
				block.style.cssText += `font-size:13px;color:${T.text};padding-left:12px;`;
				block.textContent = '\u2022 ' + line.slice(2);
			} else if (/^\d+\. /.test(line)) {
				block.style.cssText += `font-size:13px;color:${T.text};padding-left:12px;`;
				block.textContent = line;
			} else {
				block.style.cssText += `font-size:13px;color:${T.text};line-height:1.6;`;
				block.textContent = line;
			}

			// Click to edit inline
			const lineIndex = i;
			block.addEventListener('click', () => {
				const isHeading = lines[lineIndex].startsWith('#');
				const input = isHeading ? document.createElement('input') : document.createElement('textarea');
				if (isHeading) {
					(input as HTMLInputElement).type = 'text';
				}
				input.value = lines[lineIndex];
				input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:4px 8px;border-radius:${T.radiusSm};font-size:13px;font-family:inherit;outline:none;${isHeading ? '' : 'min-height:60px;resize:vertical;'}`;
				block.textContent = '';
				block.style.background = '';
				block.appendChild(input);
				input.focus();

				const save = () => {
					lines[lineIndex] = input.value;
					doc.content = lines.join('\n');
					// Re-render this block
					block.textContent = '';
					const newLine = lines[lineIndex];
					if (newLine.startsWith('## ')) { block.textContent = newLine.slice(3); }
					else if (newLine.startsWith('# ')) { block.textContent = newLine.slice(2); }
					else if (newLine.startsWith('- [x] ')) { block.textContent = '\u2611 ' + newLine.slice(6); }
					else if (newLine.startsWith('- [ ] ')) { block.textContent = '\u2610 ' + newLine.slice(6); }
					else if (newLine.startsWith('- ')) { block.textContent = '\u2022 ' + newLine.slice(2); }
					else { block.textContent = newLine; }
				};
				input.addEventListener('blur', save);
				input.addEventListener('keydown', (ke) => {
					if (ke.key === 'Escape') { input.value = lines[lineIndex]; input.blur(); }
					if (ke.key === 'Enter' && isHeading) { input.blur(); }
				});
			});
		}

		// Attachments
		const attachSection = append(detailContainer, $('div'));
		attachSection.style.cssText = `padding:14px 20px;border-top:1px solid ${T.border};`;

		const attachTitle = append(attachSection, $('div'));
		attachTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		attachTitle.textContent = 'Attachments';

		const mockAttachments = [
			{ name: 'Figma Mockups', type: 'url', meta: 'figma.com/file/abc123', icon: '\u{1F517}' },
			{ name: 'Homepage Wireframe.png', type: 'image', meta: '2.4 MB', icon: '\u{1F5BC}' },
			{ name: 'Market Research Q1.pdf', type: 'pdf', meta: '1.8 MB', icon: '\u{1F4C4}' },
		];

		for (const att of mockAttachments) {
			const row = append(attachSection, $('div'));
			row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:${T.radiusSm};cursor:pointer;transition:background 0.1s;`;
			row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
			row.addEventListener('mouseleave', () => { row.style.background = ''; });

			const icon = append(row, $('span'));
			icon.style.cssText = 'font-size:14px;flex-shrink:0;';
			icon.textContent = att.icon;

			const info = append(row, $('div'));
			info.style.cssText = 'flex:1;min-width:0;';
			const fname = append(info, $('div'));
			fname.style.cssText = `font-size:12px;color:${T.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			fname.textContent = att.name;
			const fmeta = append(info, $('div'));
			fmeta.style.cssText = `font-size:10px;color:${T.textFaint};`;
			fmeta.textContent = att.meta;
		}

		const addAttachBtn = append(attachSection, $('div'));
		addAttachBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:6px;border-radius:${T.radiusSm};border:1px dashed ${T.border};cursor:pointer;font-size:11px;color:${T.textMuted};transition:all 0.12s;margin-top:8px;`;
		addAttachBtn.textContent = '+ Add Attachment';
		addAttachBtn.addEventListener('mouseenter', () => { addAttachBtn.style.color = T.text; addAttachBtn.style.borderColor = T.accent; addAttachBtn.style.background = T.surfaceHover; });
		addAttachBtn.addEventListener('mouseleave', () => { addAttachBtn.style.color = T.textMuted; addAttachBtn.style.borderColor = T.border; addAttachBtn.style.background = ''; });
	}

	// Initial render
	renderList();
}
