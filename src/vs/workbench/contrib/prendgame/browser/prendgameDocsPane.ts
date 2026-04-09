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

		const docs = getInitialDocs();
		const commandService = this.commandService;

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

			const statusBtn = append(metaRow, $('span'));
			let sc = STATUS_COLORS[doc.status] || '#666';
			statusBtn.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};cursor:pointer;font-weight:500;transition:all 0.12s;`;
			statusBtn.textContent = STATUS_LABELS[doc.status] || doc.status;
			statusBtn.title = 'Click to change status';
			statusBtn.addEventListener('click', () => {
				const idx = STATUSES.indexOf(doc.status);
				doc.status = STATUSES[(idx + 1) % STATUSES.length];
				sc = STATUS_COLORS[doc.status] || '#666';
				statusBtn.style.background = `${sc}20`;
				statusBtn.style.color = sc;
				statusBtn.textContent = STATUS_LABELS[doc.status] || doc.status;
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

			// Mode toggle + content
			const contentSection = append(detailContainer, $('div'));
			contentSection.style.cssText = 'padding:0 20px 20px;';

			const modeRow = append(contentSection, $('div'));
			modeRow.style.cssText = 'display:flex;gap:0;margin:12px 0 10px;';
			let mode = 'preview';

			const previewBtn = append(modeRow, $('span'));
			const editBtn = append(modeRow, $('span'));
			const editorBtn = append(modeRow, $('span'));
			const btnBase = `padding:5px 14px;font-size:11px;cursor:pointer;font-weight:500;transition:all 0.12s;border:1px solid ${T.border};`;
			previewBtn.style.cssText = `${btnBase}border-radius:${T.radiusSm} 0 0 ${T.radiusSm};background:${T.accent};color:#fff;border-color:${T.accent};`;
			previewBtn.textContent = 'Preview';
			editBtn.style.cssText = `${btnBase}border-radius:0;background:transparent;color:${T.textMuted};border-left:none;`;
			editBtn.textContent = 'Edit';
			editorBtn.style.cssText = `${btnBase}border-radius:0 ${T.radiusSm} ${T.radiusSm} 0;background:transparent;color:${T.textMuted};border-left:none;`;
			editorBtn.textContent = 'Open in Editor';

			const contentArea = append(contentSection, $('div'));

			function renderContent() {
				contentArea.textContent = '';
				if (mode === 'preview') {
					previewBtn.style.cssText = `${btnBase}border-radius:${T.radiusSm} 0 0 ${T.radiusSm};background:${T.accent};color:#fff;border-color:${T.accent};`;
					editBtn.style.cssText = `${btnBase}border-radius:0;background:transparent;color:${T.textMuted};border-left:none;border-color:${T.border};`;
					const preview = append(contentArea, $('div'));
					preview.style.cssText = `font-size:13px;line-height:1.7;color:${T.text};`;
					renderMarkdownToDOM(preview, doc.content);
				} else {
					editBtn.style.cssText = `${btnBase}border-radius:0;background:${T.accent};color:#fff;border-color:${T.accent};border-left:none;`;
					previewBtn.style.cssText = `${btnBase}border-radius:${T.radiusSm} 0 0 ${T.radiusSm};background:transparent;color:${T.textMuted};border-color:${T.border};`;
					const textarea = document.createElement('textarea');
					textarea.value = doc.content;
					textarea.style.cssText = `width:100%;box-sizing:border-box;min-height:300px;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:12px;border-radius:${T.radius};font-size:12px;font-family:var(--monaco-monospace-font);line-height:1.6;outline:none;resize:vertical;`;
					textarea.addEventListener('focus', () => { textarea.style.borderColor = T.accent; });
					textarea.addEventListener('blur', () => { textarea.style.borderColor = T.border; doc.content = textarea.value; });
					contentArea.appendChild(textarea);
				}
			}

			previewBtn.addEventListener('click', () => { mode = 'preview'; renderContent(); });
			editBtn.addEventListener('click', () => { mode = 'edit'; renderContent(); });
			editorBtn.addEventListener('click', () => { commandService.executeCommand('prendgame.openDocumentInEditor', doc.id); });

			renderContent();
		}

		// Initial render
		renderList();
	}
}
