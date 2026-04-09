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

interface IDoc { id: string; title: string; type: string; status: string; owner: string; ownerInitials: string; ownerColor: string; tasksTotal: number; tasksDone: number; updatedAt: string; content: string }

function getInitialDocs(): IDoc[] {
	return [
		{ id: 'doc-prd-v1', title: 'Core Task Management', type: 'prd', status: 'approved', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 4, tasksDone: 2, updatedAt: 'Mar 28', content: '## Overview\n\nThe foundational feature of PRendgame: a kanban-style task board embedded in the VS Code sidebar.\n\n## Goals\n\n1. Engineers can see and manage their tasks without opening a browser\n2. PMs can create and prioritize tasks in the same tool engineers use\n3. Task state is visible to AI agents via API/MCP\n\n## Requirements\n\n### Board View\n- Default columns: Backlog, To Do, In Progress, In Review, Done\n- Drag-and-drop between columns\n- Filter by: assignee, label, priority, sprint\n\n### Task Card\n- [x] Title, description, assignee, priority, labels\n- [x] Sprint assignment, linked documents\n- [ ] Comments thread\n- [ ] Activity log' },
		{ id: 'doc-prd-v2', title: 'Documentation & Diagrams', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 1, tasksDone: 0, updatedAt: 'Apr 1', content: '## Overview\n\nEmbed a rich document editor inside PRendgame for PRDs, specs, and meeting notes.\n\n## Goals\n\n1. PMs can author requirements without leaving the IDE\n2. Documents are first-class objects linked to tasks and code\n3. AI agents can read documents to understand context' },
		{ id: 'doc-prd-v3', title: 'AI-Native Integration (MCP)', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 2, tasksDone: 0, updatedAt: 'Apr 4', content: '## Overview\n\nPRendgame is NOT an AI agent. It is the project context layer that AI agents plug into via MCP.\n\n## MCP Tools\n\n- prendgame.tasks.list\n- prendgame.tasks.get\n- prendgame.tasks.create\n- prendgame.tasks.transition\n- prendgame.docs.list\n- prendgame.docs.get' },
		{ id: 'doc-prd-v4', title: 'Cloud Sync & Collaboration', type: 'prd', status: 'draft', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 5, tasksDone: 2, updatedAt: 'Apr 5', content: '## Overview\n\nSupabase-backed cloud sync for team collaboration. Free tier is local-only; paid tier adds sync.\n\n## Tiers\n\n| Feature | Free | Team | Enterprise |\n|---------|------|------|------------|\n| Local tasks | Yes | Yes | Yes |\n| Cloud sync | No | Yes | Yes |\n| File uploads | Local | 10GB | Unlimited |' },
		{ id: 'doc-prd-v5', title: 'Product Workspace', type: 'prd', status: 'ready_for_dev', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 9', content: '## Overview\n\nA Notion-style document workspace for Product Managers inside PRendgame.\n\n## Goals\n\n1. PMs can create rich documents inside PRendgame\n2. Documents have custom attributes and multiple views\n3. Documents can be converted into engineering tasks' },
		{ id: 'doc-spec-auth', title: 'Authentication Architecture', type: 'spec', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 1, tasksDone: 1, updatedAt: 'Mar 30', content: '## Approach\n\nSupabase Auth with email/password + GitHub OAuth.\n\n## Flow\n\n1. User clicks Sign In in status bar\n2. Extension opens browser for Supabase OAuth\n3. Redirect back to prendgame:// protocol handler\n4. Token stored in VS Code SecretStorage' },
		{ id: 'doc-story-onboard', title: 'PM Onboarding Flow', type: 'user_story', status: 'in_review', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 8', content: '## As a new PM\n\nI want to quickly understand how to create documents, assign tasks, and track sprint progress so that I can be productive on day one.\n\n## Acceptance Criteria\n\n- [ ] Welcome walkthrough for PMs\n- [ ] Template picker on first document creation\n- [ ] Sample project with pre-populated data' },
		{ id: 'doc-research-mcp', title: 'MCP Protocol Feasibility', type: 'research', status: 'approved', owner: 'Jordan Park', ownerInitials: 'JP', ownerColor: '#06b6d4', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 3', content: '## Summary\n\nMCP is viable for exposing PRendgame data to external AI agents.\n\n## Findings\n\n- Claude Code supports MCP natively\n- MCP servers can run as local processes\n- Tool definitions are straightforward JSON schema\n- Latency is acceptable (sub-100ms for local calls)' },
		{ id: 'doc-notes-retro', title: 'Sprint 1 Retrospective', type: 'meeting_notes', status: 'draft', owner: 'Taylor Reeves', ownerInitials: 'TR', ownerColor: '#8b5cf6', tasksTotal: 0, tasksDone: 0, updatedAt: 'Apr 4', content: '## What went well\n\n- Auth flow completed ahead of schedule\n- Supabase schema is solid\n\n## What could improve\n\n- Need better task estimation\n- PR reviews took too long\n\n## Action items\n\n- [ ] Set up review SLAs\n- [ ] Add story points to tasks' },
	];
}

// Simple markdown to HTML (for inline preview)
function md(text: string): string {
	return text
		.replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:600;margin:12px 0 4px;color:#e4e4e7">$1</h3>')
		.replace(/^## (.+)$/gm, '<h2 style="font-size:14px;font-weight:600;margin:14px 0 6px;color:#e4e4e7;border-bottom:1px solid #1e1e22;padding-bottom:4px">$1</h2>')
		.replace(/^# (.+)$/gm, '<h1 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#e4e4e7">$1</h1>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/`([^`]+)`/g, '<code style="background:#1e1e22;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
		.replace(/^- \[x\] (.+)$/gm, '<div style="margin:2px 0;color:#22c55e">\u2611 $1</div>')
		.replace(/^- \[ \] (.+)$/gm, '<div style="margin:2px 0;color:#71717a">\u2610 $1</div>')
		.replace(/^- (.+)$/gm, '<div style="margin:2px 0;padding-left:12px">\u2022 $1</div>')
		.replace(/^\|(.+)\|$/gm, (match) => {
			const cells = match.replace(/^\| /, '').replace(/ \|$/, '').split(' | ');
			return '<div style="display:flex;gap:8px;font-size:11px;padding:2px 0;border-bottom:1px solid #1e1e22">' + cells.map(c => `<span style="flex:1">${c.trim()}</span>`).join('') + '</div>';
		})
		.replace(/^\|[-|]+\|$/gm, '')
		.replace(/\n\n/g, '<br/>');
}

export class PRendgameDocsPane extends ViewPane {

	private root!: HTMLElement;
	private docs: IDoc[] = [];
	private activeFilter = '';
	private searchQuery = '';
	private activeDocId: string | null = null;

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
		this.render();
	}

	private render(): void {
		this.root.textContent = '';
		if (this.activeDocId) {
			this.renderDetail();
		} else {
			this.renderList();
		}
	}

	// == LIST VIEW =============================================================

	private renderList(): void {
		// Search
		const searchWrap = append(this.root, $('div'));
		searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;
		const searchInput = append(searchWrap, $('input'));
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter documents\u2026';
		searchInput.value = this.searchQuery;
		searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });
		searchInput.addEventListener('input', () => { this.searchQuery = searchInput.value; this.render(); });

		// Type filter pills
		const filterRow = append(this.root, $('div'));
		filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

		this.makePill(filterRow, 'All', '');
		const types = [...new Set(this.docs.map(d => d.type))];
		for (const type of types) { this.makePill(filterRow, TYPE_LABELS[type] || type, type); }

		// Filtered docs
		const q = this.searchQuery.toLowerCase().trim();
		const filtered = this.docs.filter(d => {
			if (this.activeFilter && d.type !== this.activeFilter) { return false; }
			if (q && !d.title.toLowerCase().includes(q) && !(TYPE_LABELS[d.type] || '').toLowerCase().includes(q) && !d.owner.toLowerCase().includes(q)) { return false; }
			return true;
		});

		// Doc rows
		for (const doc of filtered) {
			const row = append(this.root, $('div'));
			row.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid ${T.borderSubtle};`;
			row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
			row.addEventListener('mouseleave', () => { row.style.background = ''; });
			row.addEventListener('click', () => { this.activeDocId = doc.id; this.render(); });

			// Type badge
			const tc = TYPE_COLORS[doc.type] || '#666';
			const badge = append(row, $('span'));
			badge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;min-width:32px;text-align:center;`;
			badge.textContent = TYPE_LABELS[doc.type] || doc.type;

			// Info
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

			// Avatar
			const av = append(row, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;flex-shrink:0;background:${doc.ownerColor};`;
			av.textContent = doc.ownerInitials;
		}

		if (filtered.length === 0) {
			const empty = append(this.root, $('div'));
			empty.style.cssText = `padding:20px;text-align:center;font-size:12px;color:${T.textFaint};`;
			empty.textContent = 'No documents match';
		}

		// New doc button
		const wrap = append(this.root, $('div'));
		wrap.style.cssText = 'padding:12px 20px;';
		const btn = append(wrap, $('div'));
		btn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:7px;border-radius:${T.radius};border:1px dashed ${T.border};cursor:pointer;font-size:11px;font-weight:500;color:${T.textMuted};transition:all 0.15s;`;
		btn.textContent = '+ New Document';
		btn.addEventListener('mouseenter', () => { btn.style.color = T.text; btn.style.borderColor = T.accent; btn.style.background = T.surfaceHover; });
		btn.addEventListener('mouseleave', () => { btn.style.color = T.textMuted; btn.style.borderColor = T.border; btn.style.background = ''; });
		btn.addEventListener('click', () => { this.createDoc(); });
	}

	// == DETAIL VIEW ===========================================================

	private renderDetail(): void {
		const doc = this.docs.find(d => d.id === this.activeDocId);
		if (!doc) { this.activeDocId = null; this.render(); return; }

		// Back button
		const backRow = append(this.root, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { this.activeDocId = null; this.render(); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = 'Documents';

		// Header section
		const header = append(this.root, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		// Type badge
		const tc = TYPE_COLORS[doc.type] || '#666';
		const typeBadge = append(header, $('span'));
		typeBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;`;
		typeBadge.textContent = TYPE_LABELS[doc.type] || doc.type;

		// Title (click to edit)
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:8px;cursor:text;padding:2px 0;border-radius:${T.radiusSm};transition:background 0.1s;letter-spacing:-0.01em;`;
		titleEl.textContent = doc.title;
		titleEl.title = 'Click to rename';
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

		// Metadata row
		const metaRow = append(header, $('div'));
		metaRow.style.cssText = `display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;`;

		// Status (clickable)
		const statusBtn = append(metaRow, $('span'));
		const sc = STATUS_COLORS[doc.status] || '#666';
		statusBtn.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};cursor:pointer;font-weight:500;transition:all 0.12s;`;
		statusBtn.textContent = STATUS_LABELS[doc.status] || doc.status;
		statusBtn.title = 'Click to change status';
		statusBtn.addEventListener('click', () => {
			const idx = STATUSES.indexOf(doc.status);
			doc.status = STATUSES[(idx + 1) % STATUSES.length];
			const newSc = STATUS_COLORS[doc.status] || '#666';
			statusBtn.style.background = `${newSc}20`;
			statusBtn.style.color = newSc;
			statusBtn.textContent = STATUS_LABELS[doc.status] || doc.status;
		});

		// Owner
		const ownerEl = append(metaRow, $('span'));
		ownerEl.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${T.textMuted};`;
		const ownerAv = append(ownerEl, $('span'));
		ownerAv.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${doc.ownerColor};`;
		ownerAv.textContent = doc.ownerInitials;
		ownerEl.appendChild(document.createTextNode(doc.owner));

		// Updated
		const updEl = append(metaRow, $('span'));
		updEl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		updEl.textContent = doc.updatedAt;

		// Task progress
		if (doc.tasksTotal > 0) {
			const tp = append(metaRow, $('span'));
			const allDone = doc.tasksDone === doc.tasksTotal;
			tp.style.cssText = `font-size:11px;color:${allDone ? '#22c55e' : T.textFaint};`;
			tp.textContent = `${doc.tasksDone}/${doc.tasksTotal} tasks`;
		}

		// Content area (toggle between preview and edit)
		const contentWrap = append(this.root, $('div'));
		contentWrap.style.cssText = `padding:0 20px 20px;`;

		// Mode toggle
		const modeRow = append(contentWrap, $('div'));
		modeRow.style.cssText = `display:flex;gap:0;margin:12px 0 10px;`;

		let mode = 'preview';
		const contentArea = append(contentWrap, $('div'));

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

		const renderContent = () => {
			contentArea.textContent = '';
			if (mode === 'preview') {
				previewBtn.style.background = T.accent;
				previewBtn.style.color = '#fff';
				previewBtn.style.borderColor = T.accent;
				editBtn.style.background = 'transparent';
				editBtn.style.color = T.textMuted;
				editBtn.style.borderColor = T.border;
				editorBtn.style.background = 'transparent';
				editorBtn.style.color = T.textMuted;

				const preview = append(contentArea, $('div'));
				preview.style.cssText = `font-size:13px;line-height:1.7;color:${T.text};`;
				preview.innerHTML = md(doc.content);
			} else {
				editBtn.style.background = T.accent;
				editBtn.style.color = '#fff';
				editBtn.style.borderColor = T.accent;
				previewBtn.style.background = 'transparent';
				previewBtn.style.color = T.textMuted;
				previewBtn.style.borderColor = T.border;
				editorBtn.style.background = 'transparent';
				editorBtn.style.color = T.textMuted;

				const textarea = document.createElement('textarea');
				textarea.value = doc.content;
				textarea.style.cssText = `width:100%;box-sizing:border-box;min-height:300px;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:12px;border-radius:${T.radius};font-size:12px;font-family:var(--monaco-monospace-font);line-height:1.6;outline:none;resize:vertical;`;
				textarea.addEventListener('focus', () => { textarea.style.borderColor = T.accent; });
				textarea.addEventListener('blur', () => { textarea.style.borderColor = T.border; doc.content = textarea.value; });
				contentArea.appendChild(textarea);
			}
		};

		previewBtn.addEventListener('click', () => { mode = 'preview'; renderContent(); });
		editBtn.addEventListener('click', () => { mode = 'edit'; renderContent(); });
		editorBtn.addEventListener('click', () => { this.commandService.executeCommand('prendgame.openDocument', doc.id); });

		renderContent();
	}

	// == HELPERS ===============================================================

	private makePill(parent: HTMLElement, label: string, filterType: string): void {
		const pill = append(parent, $('span'));
		const isActive = this.activeFilter === filterType;
		if (filterType === '') {
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? T.accent : T.textFaint + '15'};color:${isActive ? '#fff' : T.textFaint};`;
		} else {
			const tc = TYPE_COLORS[filterType] || '#666';
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? tc : tc + '15'};color:${isActive ? '#fff' : tc};`;
		}
		pill.textContent = label;
		pill.addEventListener('click', () => { this.activeFilter = filterType; this.render(); });
	}

	private createDoc(): void {
		const id = `doc-new-${Date.now()}`;
		this.docs.unshift({
			id, title: 'Untitled Document', type: 'prd', status: 'draft',
			owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1',
			tasksTotal: 0, tasksDone: 0, updatedAt: 'Just now',
			content: '## Overview\n\nDescribe the purpose of this document.\n\n## Goals\n\n1. \n2. \n3. \n',
		});
		this.activeDocId = id;
		this.render();
	}
}
