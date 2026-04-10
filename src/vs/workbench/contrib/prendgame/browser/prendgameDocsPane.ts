/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, getWindow } from '../../../../base/browser/dom.js';
import { T } from './prendgameTheme.js';
import { getDocs, getMembers, getLinkedTasks, addLink, isDocLocked, findTask, findTaskGroup, getGroups, getDueDateStyle, updateDoc, PRIORITY_COLORS, PRIORITY_LABELS, TASK_STATUS_COLORS, TASK_STATUS_LABELS, DOC_TYPE_COLORS as TYPE_COLORS, DOC_TYPE_LABELS as TYPE_LABELS, DOC_STATUSES as STATUSES, DOC_STATUS_LABELS as STATUS_LABELS, DOC_STATUS_COLORS as STATUS_COLORS, IDoc } from './prendgameData.js';
import { groupItemsBy, renderCollapsibleGroup } from './prendgameViewUtils.js';

export function renderMarkdownToDOM(parent: HTMLElement, text: string): void {
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

// -- Render -------------------------------------------------------------------

export function renderDocsContent(root: HTMLElement, commandService: { executeCommand(id: string, ...args: unknown[]): unknown }): void {
	const docs = getDocs();

	// State
	let activeFilter = '';
	let activeStatusFilter = '';
	let activeOwnerFilter = '';
	let activeSortField = '';
	let sortAscending = true;
	let activeView: 'list' | 'board' | 'cards' = 'list';
	let activeGroupBy = 'none';
	let searchQuery = '';
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

	// == Filtered/sorted docs helper ==========================================
	function getFilteredDocs(): IDoc[] {
		let result = [...docs];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(d => d.id.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
		}
		if (activeFilter) { result = result.filter(d => d.type === activeFilter); }
		if (activeStatusFilter) { result = result.filter(d => d.status === activeStatusFilter); }
		if (activeOwnerFilter) { result = result.filter(d => d.owner === activeOwnerFilter); }
		if (activeSortField) {
			result.sort((a, b) => {
				const va = String(Object.getOwnPropertyDescriptor(a, activeSortField)?.value ?? '').toLowerCase();
				const vb = String(Object.getOwnPropertyDescriptor(b, activeSortField)?.value ?? '').toLowerCase();
				const cmp = va < vb ? -1 : va > vb ? 1 : 0;
				return sortAscending ? cmp : -cmp;
			});
		}
		return result;
	}

	// == LIST =============================================================
	function renderList() {
		// Search input
		const searchWrap = append(listContainer, $('div'));
		searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;
		const searchInput = append(searchWrap, $('input'));
		(searchInput as HTMLInputElement).type = 'text';
		(searchInput as HTMLInputElement).placeholder = 'Filter documents\u2026';
		searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
		(searchInput as HTMLInputElement).value = searchQuery;
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });
		searchInput.addEventListener('input', () => { searchQuery = (searchInput as HTMLInputElement).value; rebuildList(); });

		// Group by pills
		const groupByRow = append(listContainer, $('div'));
		groupByRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;border-bottom:1px solid ${T.border};`;
		const groupByLabel = append(groupByRow, $('span'));
		groupByLabel.style.cssText = `font-size:11px;color:${T.textFaint};`;
		groupByLabel.textContent = 'Group by';
		const groupByOptions = ['none', 'status', 'owner', 'priority'];
		const groupByLabelsMap: Record<string, string> = { none: 'None', status: 'Status', owner: 'Owner', priority: 'Priority' };
		for (const opt of groupByOptions) {
			const btn = append(groupByRow, $('span'));
			const isActive = activeGroupBy === opt;
			btn.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? T.accent : T.accent + '15'};color:${isActive ? '#fff' : T.accent};`;
			btn.textContent = groupByLabelsMap[opt] || opt;
			btn.addEventListener('click', () => {
				if (activeGroupBy === opt) { return; }
				activeGroupBy = opt;
				if (opt !== 'none' && activeView === 'list') { activeView = 'board'; }
				rebuildList();
			});
		}

		// View switcher
		const viewRow = append(listContainer, $('div'));
		viewRow.style.cssText = `display:flex;align-items:center;gap:0;padding:8px 20px;border-bottom:1px solid ${T.border};`;
		const viewLabel = append(viewRow, $('span'));
		viewLabel.style.cssText = `font-size:11px;color:${T.textFaint};margin-right:8px;`;
		viewLabel.textContent = 'View';
		for (const v of ['list', 'board', 'cards'] as const) {
			const vBtn = append(viewRow, $('span'));
			const isActive = activeView === v;
			vBtn.style.cssText = `font-size:11px;padding:3px 10px;cursor:pointer;font-weight:500;transition:all 0.12s;border-bottom:2px solid ${isActive ? T.accent : 'transparent'};color:${isActive ? T.text : T.textFaint};`;
			vBtn.textContent = v.charAt(0).toUpperCase() + v.slice(1);
			vBtn.addEventListener('click', () => { activeView = v; rebuildList(); });
		}

		// Filter row: type pills + status + owner + sort
		const filterRow = append(listContainer, $('div'));
		filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

		function makePill(label: string, filterType: string) {
			const pill = append(filterRow, $('span'));
			const isActive = activeFilter === filterType;
			const tc = filterType ? (TYPE_COLORS[filterType] || '#666') : T.accent;
			pill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? tc : tc + '15'};color:${isActive ? '#fff' : tc};`;
			pill.textContent = label;
			pill.addEventListener('click', () => { activeFilter = filterType; rebuildList(); });
		}

		makePill('All', '');
		const types = [...new Set(docs.map(d => d.type))];
		for (const type of types) { makePill(TYPE_LABELS[type] || type, type); }

		// Status filter dropdown
		const statusSelect = append(filterRow, $('select'));
		statusSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const statusDefault = append(statusSelect, $('option'));
		statusDefault.textContent = 'Status';
		(statusDefault as HTMLOptionElement).value = '';
		for (const s of STATUSES) {
			const opt = append(statusSelect, $('option'));
			opt.textContent = STATUS_LABELS[s] || s;
			(opt as HTMLOptionElement).value = s;
		}
		(statusSelect as HTMLSelectElement).value = activeStatusFilter;
		statusSelect.addEventListener('change', () => { activeStatusFilter = (statusSelect as HTMLSelectElement).value; rebuildList(); });

		// Owner filter dropdown
		const owners = [...new Set(docs.map(d => d.owner))];
		const ownerSelect = append(filterRow, $('select'));
		ownerSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const ownerDefault = append(ownerSelect, $('option'));
		ownerDefault.textContent = 'Owner';
		(ownerDefault as HTMLOptionElement).value = '';
		for (const o of owners) {
			const opt = append(ownerSelect, $('option'));
			opt.textContent = o;
			(opt as HTMLOptionElement).value = o;
		}
		(ownerSelect as HTMLSelectElement).value = activeOwnerFilter;
		ownerSelect.addEventListener('change', () => { activeOwnerFilter = (ownerSelect as HTMLSelectElement).value; rebuildList(); });

		// Sort dropdown
		const sortSelect = append(filterRow, $('select'));
		sortSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;margin-left:auto;`;
		const sortOptions = [['', 'Sort by...'], ['title', 'Title'], ['updatedAt', 'Date'], ['status', 'Status'], ['type', 'Type'], ['priority', 'Priority']];
		for (const [val, label] of sortOptions) {
			const opt = append(sortSelect, $('option'));
			opt.textContent = label + (activeSortField === val ? (sortAscending ? ' \u2191' : ' \u2193') : '');
			(opt as HTMLOptionElement).value = val;
		}
		(sortSelect as HTMLSelectElement).value = activeSortField;
		sortSelect.addEventListener('change', () => {
			const newField = (sortSelect as HTMLSelectElement).value;
			if (newField === activeSortField) { sortAscending = !sortAscending; }
			else { activeSortField = newField; sortAscending = true; }
			rebuildList();
		});

		// Clear filters button
		if (activeFilter || activeStatusFilter || activeOwnerFilter || activeSortField) {
			const clearBtn = append(filterRow, $('span'));
			clearBtn.style.cssText = `font-size:10px;padding:3px 8px;border-radius:${T.radiusPill};cursor:pointer;color:${T.textFaint};transition:color 0.12s;`;
			clearBtn.textContent = '\u2715 Clear';
			clearBtn.addEventListener('mouseenter', () => { clearBtn.style.color = T.text; });
			clearBtn.addEventListener('mouseleave', () => { clearBtn.style.color = T.textFaint; });
			clearBtn.addEventListener('click', () => { activeFilter = ''; activeStatusFilter = ''; activeOwnerFilter = ''; activeSortField = ''; rebuildList(); });
		}

		// Get filtered docs
		const filtered = getFilteredDocs();

		// Render based on active view
		if (activeView === 'board') {
			renderBoardView(filtered);
		} else if (activeView === 'cards') {
			renderCardsView(filtered);
		} else {
			renderListView(filtered);
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
			docs.unshift({ id, title: 'Untitled Document', type: 'prd', status: 'draft', priority: 'medium', owner: 'Alex Chen', ownerInitials: 'AC', ownerColor: '#6366f1', tasksTotal: 0, tasksDone: 0, updatedAt: 'Just now', dueDate: '', content: '## User Stories\n\nAs a [persona], I want [action] so that [outcome].\n\n## UX Description\n\nDescribe how the feature looks and behaves from the user perspective.\n\n## Requirements\n\n1. First requirement\n2. Second requirement\n3. Third requirement\n\n## Notes\n\nAdd context, links, thoughts, or questions here.\n\n## Attachments\n\n- Link to mockups or references' });
			showDetail(id);
		});
	}

	// -- List view ------------------------------------------------------------
	function renderListView(filtered: IDoc[]) {
		const rowsContainer = append(listContainer, $('div'));
		for (const doc of filtered) {
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
	}

	// -- Board view -----------------------------------------------------------
	function renderBoardView(filtered: IDoc[]) {
		let viewGroups;
		if (activeGroupBy === 'owner') {
			const ownerLabels: Record<string, string> = {};
			const ownerColors: Record<string, string> = {};
			for (const d of docs) { ownerLabels[d.owner] = d.owner; ownerColors[d.owner] = d.ownerColor; }
			viewGroups = groupItemsBy(filtered, 'owner', ownerLabels, ownerColors);
		} else if (activeGroupBy === 'priority') {
			viewGroups = groupItemsBy(filtered, 'priority', PRIORITY_LABELS, PRIORITY_COLORS, ['critical', 'high', 'medium', 'low']);
		} else {
			viewGroups = groupItemsBy(filtered, 'status', STATUS_LABELS, STATUS_COLORS, STATUSES);
		}
		const boardWrap = append(listContainer, $('div'));
		boardWrap.style.cssText = 'padding:8px 0;';

		let dragDocId: string | null = null;
		const docDropZones: HTMLElement[] = [];

		const isStatusGrouping = activeGroupBy === 'none' || activeGroupBy === 'status';

		function showDocDropHighlights() {
			for (const dz of docDropZones) {
				dz.style.cssText = `height:32px;margin:3px 20px;border-radius:${T.radius};background:${T.accentMuted};border:1px dashed ${T.accent};transition:height 0.2s ease,opacity 0.2s;display:flex;align-items:center;justify-content:center;font-size:11px;color:${T.accent};opacity:1;`;
				dz.textContent = 'Drop here';
			}
		}

		function clearDocDropHighlights() {
			for (const dz of docDropZones) {
				dz.style.cssText = `height:0;transition:height 0.2s ease,opacity 0.2s;overflow:hidden;opacity:0;`;
			}
		}

		for (const vg of viewGroups) {
			const result = renderCollapsibleGroup<IDoc>({
				container: boardWrap,
				group: vg,
				collapsed: false,
				theme: T,
				renderItem: (parent, d) => {
					const docLocked = isDocLocked(d.id);
					const row = append(parent, $('div'));
					row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px 6px 42px;cursor:pointer;transition:background 0.1s;border-radius:${T.radiusSm};margin:0 4px;`;
					if (isStatusGrouping && !docLocked) {
						row.draggable = true;
						row.addEventListener('dragstart', (e) => {
							dragDocId = d.id;
							row.style.opacity = '0.3';
							if ((e as DragEvent).dataTransfer) { (e as DragEvent).dataTransfer!.effectAllowed = 'move'; (e as DragEvent).dataTransfer!.setData('text/plain', d.id); }
							showDocDropHighlights();
						});
						row.addEventListener('dragend', () => { dragDocId = null; row.style.opacity = '1'; clearDocDropHighlights(); });
					}
					row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
					row.addEventListener('mouseleave', () => { row.style.background = ''; });
					row.addEventListener('click', () => { showDetail(d.id); });

					const tc = TYPE_COLORS[d.type] || '#666';
					const badge = append(row, $('span'));
					badge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;`;
					badge.textContent = TYPE_LABELS[d.type] || d.type;

					const title = append(row, $('span'));
					title.style.cssText = `font-size:13px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
					title.textContent = d.title;

					const av = append(row, $('span'));
					av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${d.ownerColor};flex-shrink:0;`;
					av.textContent = d.ownerInitials;
				},
				dropConfig: isStatusGrouping ? {
					showDropZone: true,
					onDrop: (groupKey) => {
						if (dragDocId) {
							const targetDoc = docs.find(dd => dd.id === dragDocId);
							if (targetDoc) {
								updateDoc(dragDocId, 'status', groupKey);
								targetDoc.status = groupKey;
							}
							dragDocId = null;
							clearDocDropHighlights();
							rebuildList();
						}
					},
				} : undefined,
			});
			if (result.dropZone) { docDropZones.push(result.dropZone); }
		}
	}

	// -- Cards view -----------------------------------------------------------
	function renderCardsView(filtered: IDoc[]) {
		const grid = append(listContainer, $('div'));
		grid.style.cssText = `display:grid;grid-template-columns:1fr;gap:8px;padding:12px 20px;`;

		for (const doc of filtered) {
			const card = append(grid, $('div'));
			card.style.cssText = `padding:12px;border:1px solid ${T.border};border-radius:${T.radius};cursor:pointer;transition:all 0.12s;`;
			card.addEventListener('mouseenter', () => { card.style.borderColor = T.accent; card.style.background = T.surfaceHover; });
			card.addEventListener('mouseleave', () => { card.style.borderColor = T.border; card.style.background = ''; });
			card.addEventListener('click', () => { showDetail(doc.id); });

			const topRow = append(card, $('div'));
			topRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';

			const tc = TYPE_COLORS[doc.type] || '#666';
			const badge = append(topRow, $('span'));
			badge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;`;
			badge.textContent = TYPE_LABELS[doc.type] || doc.type;

			const sc = STATUS_COLORS[doc.status] || '#666';
			const statusPill = append(topRow, $('span'));
			statusPill.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};font-weight:500;`;
			statusPill.textContent = STATUS_LABELS[doc.status] || doc.status;

			const av = append(topRow, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${doc.ownerColor};margin-left:auto;flex-shrink:0;`;
			av.textContent = doc.ownerInitials;

			const title = append(card, $('div'));
			title.style.cssText = `font-size:13px;font-weight:600;color:${T.text};margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			title.textContent = doc.title;

			// Content preview (first 2 lines)
			const preview = doc.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ');
			if (preview) {
				const previewEl = append(card, $('div'));
				previewEl.style.cssText = `font-size:11px;color:${T.textFaint};line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;`;
				previewEl.textContent = preview;
			}
		}
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

		// Lock banner (TASK-017)
		const locked = isDocLocked(doc.id);
		if (locked) {
			const lockBanner = append(detailContainer, $('div'));
			lockBanner.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 20px;background:#f59e0b15;border-bottom:1px solid #f59e0b30;color:#f59e0b;font-size:12px;font-weight:500;`;
			const lockIcon = append(lockBanner, $('span'));
			lockIcon.style.cssText = 'font-size:14px;';
			lockIcon.textContent = '\u{1F512}';
			lockBanner.appendChild(document.createTextNode('Locked \u2014 In Development'));
		}

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
			if (locked) { return; }
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

		const assigneeWrap = append(metaRow, $('div'));
		assigneeWrap.style.cssText = 'position:relative;';
		const assigneeBtn = append(assigneeWrap, $('span'));
		assigneeBtn.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${T.text};cursor:pointer;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		function renderDocAssignee() {
			assigneeBtn.textContent = '';
			const av2 = append(assigneeBtn, $('span'));
			av2.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${doc.ownerColor};`;
			av2.textContent = doc.ownerInitials;
			assigneeBtn.appendChild(document.createTextNode(' ' + doc.owner + ' \u25BE'));
		}
		renderDocAssignee();
		assigneeBtn.addEventListener('mouseenter', () => { if (!locked) { assigneeBtn.style.background = T.surfaceHover; } });
		assigneeBtn.addEventListener('mouseleave', () => { assigneeBtn.style.background = ''; });
		let assigneeDD: HTMLElement | null = null;
		assigneeBtn.addEventListener('click', () => {
			if (locked) { return; }
			if (assigneeDD) { assigneeDD.remove(); assigneeDD = null; return; }
			const dd = append(assigneeWrap, $('div'));
			assigneeDD = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const m of getMembers()) {
				const opt = append(dd, $('div'));
				const isActive = doc.ownerInitials === m.initials;
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${isActive ? T.text : T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const oav = append(opt, $('span'));
				oav.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${m.color};`;
				oav.textContent = m.initials;
				const ol = append(opt, $('span'));
				ol.textContent = m.name;
				if (isActive) { ol.style.fontWeight = '600'; }
				const or2 = append(opt, $('span'));
				or2.style.cssText = `margin-left:auto;font-size:10px;color:${T.textFaint};`;
				or2.textContent = m.role;
				opt.addEventListener('click', (e) => {
					e.stopPropagation();
					doc.owner = m.name; doc.ownerInitials = m.initials; doc.ownerColor = m.color;
					renderDocAssignee();
					dd.remove(); assigneeDD = null;
				});
			}
			const w = getWindow(assigneeWrap);
			const closeFn = (e: Event) => { if (!assigneeWrap.contains(e.target as Node)) { dd.remove(); assigneeDD = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

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
		const priorities = ['low', 'medium', 'high', 'critical'];
		const prioPill = append(prioWrap, $('span'));
		let ppc = PRIORITY_COLORS[doc.priority] || '#666';
		prioPill.style.cssText = `font-size:11px;padding:2px 8px;border-radius:${T.radiusPill};background:${ppc}20;color:${ppc};cursor:pointer;font-weight:500;`;
		prioPill.textContent = (PRIORITY_LABELS[doc.priority] || doc.priority) + ' \u25BE';
		let prioDD: HTMLElement | null = null;
		prioPill.addEventListener('click', () => {
			if (prioDD) { prioDD.remove(); prioDD = null; return; }
			const dd = append(prioWrap, $('div'));
			prioDD = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:110px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const p of priorities) {
				const opt = append(dd, $('div'));
				const opc = PRIORITY_COLORS[p] || '#666';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${opc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = PRIORITY_LABELS[p] || p;
				opt.addEventListener('click', (e) => { e.stopPropagation(); doc.priority = p; ppc = opc; prioPill.style.background = `${ppc}20`; prioPill.style.color = ppc; prioPill.textContent = (PRIORITY_LABELS[p] || p) + ' \u25BE'; dd.remove(); prioDD = null; });
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

		// Due Date
		const dueLbl = append(attrsSection, $('span'));
		dueLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		dueLbl.textContent = 'Due Date';
		const dueVal = append(attrsSection, $('span'));
		const ds = getDueDateStyle(doc.dueDate);
		dueVal.style.cssText = `font-size:11px;color:${ds.color};cursor:${locked ? 'default' : 'text'};padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		dueVal.textContent = ds.label || 'No due date';
		if (!locked) {
			dueVal.addEventListener('mouseenter', () => { dueVal.style.background = T.surfaceHover; });
			dueVal.addEventListener('mouseleave', () => { dueVal.style.background = ''; });
			dueVal.addEventListener('click', () => {
				const input = document.createElement('input');
				input.type = 'text';
				input.value = doc.dueDate || '';
				input.placeholder = 'YYYY-MM-DD';
				input.style.cssText = `width:120px;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:2px 6px;border-radius:${T.radiusSm};font-size:11px;font-family:inherit;outline:none;`;
				dueVal.textContent = '';
				dueVal.appendChild(input);
				input.focus();
				input.select();
				const finish = () => {
					doc.dueDate = input.value.trim();
					const newDs = getDueDateStyle(doc.dueDate);
					dueVal.style.color = newDs.color;
					dueVal.textContent = newDs.label || 'No due date';
				};
				input.addEventListener('blur', finish);
				input.addEventListener('keydown', (ke: Event) => { if ((ke as KeyboardEvent).key === 'Enter') { (ke.target as HTMLInputElement).blur(); } if ((ke as KeyboardEvent).key === 'Escape') { (ke.target as HTMLInputElement).value = doc.dueDate; (ke.target as HTMLInputElement).blur(); } });
			});
		}

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

		// Linked Tasks
		const linkedTasks = getLinkedTasks(doc.id);
		const ltSection = append(detailContainer, $('div'));
		ltSection.style.cssText = `padding:14px 20px;border-top:1px solid ${T.border};`;
		const ltTitle = append(ltSection, $('div'));
		ltTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
		ltTitle.textContent = `Linked Tasks (${linkedTasks.length})`;

		for (const lt of linkedTasks) {
			const ltRow = append(ltSection, $('div'));
			ltRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:${T.radiusSm};cursor:pointer;transition:background 0.1s;`;
			ltRow.addEventListener('mouseenter', () => { ltRow.style.background = T.surfaceHover; });
			ltRow.addEventListener('mouseleave', () => { ltRow.style.background = ''; });

			const ltBar = append(ltRow, $('span'));
			const lpc = PRIORITY_COLORS[lt.priority] || '#52525b';
			ltBar.style.cssText = `width:3px;height:16px;border-radius:2px;background:${lpc};flex-shrink:0;`;

			const ltId = append(ltRow, $('span'));
			ltId.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;`;
			ltId.textContent = lt.id;

			const ltName = append(ltRow, $('span'));
			ltName.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			ltName.textContent = lt.title;

			const ltGroupId = findTaskGroup(lt.id);
			const ltsc = TASK_STATUS_COLORS[ltGroupId] || '#666';
			const ltStatus = append(ltRow, $('span'));
			ltStatus.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};background:${ltsc}20;color:${ltsc};font-weight:500;`;
			ltStatus.textContent = TASK_STATUS_LABELS[ltGroupId] || ltGroupId;

			ltRow.addEventListener('click', () => { renderLinkedTaskDetail(lt.id, doc.id); });
		}

		// Link Task button
		const linkTaskBtn = append(ltSection, $('div'));
		linkTaskBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:6px;border-radius:${T.radiusSm};border:1px dashed ${T.border};cursor:pointer;font-size:11px;color:${T.textMuted};transition:all 0.12s;margin-top:6px;`;
		linkTaskBtn.textContent = '+ Link Task';
		linkTaskBtn.addEventListener('mouseenter', () => { linkTaskBtn.style.color = T.text; linkTaskBtn.style.borderColor = T.accent; linkTaskBtn.style.background = T.surfaceHover; });
		linkTaskBtn.addEventListener('mouseleave', () => { linkTaskBtn.style.color = T.textMuted; linkTaskBtn.style.borderColor = T.border; linkTaskBtn.style.background = ''; });
		linkTaskBtn.addEventListener('click', () => {
			const allTasks: { id: string; title: string; priority: string }[] = [];
			for (const g of getGroups()) { for (const tk of g.tasks) { allTasks.push(tk); } }
			const alreadyLinked = new Set(linkedTasks.map(t => t.id));
			const available = allTasks.filter(t => !alreadyLinked.has(t.id));
			if (available.length === 0) { return; }
			const pickerWrap = append(ltSection, $('div'));
			pickerWrap.style.cssText = 'position:relative;';
			const dd = append(pickerWrap, $('div'));
			dd.style.cssText = `background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:220px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);margin-top:4px;`;
			for (const tk of available) {
				const opt = append(dd, $('div'));
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const optBar = append(opt, $('span'));
				const opc = PRIORITY_COLORS[tk.priority] || '#52525b';
				optBar.style.cssText = `width:3px;height:12px;border-radius:1px;background:${opc};flex-shrink:0;`;
				const optId = append(opt, $('span'));
				optId.style.cssText = `font-size:10px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
				optId.textContent = tk.id;
				const optLabel = append(opt, $('span'));
				optLabel.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
				optLabel.textContent = tk.title;
				opt.addEventListener('click', () => { addLink({ fromType: 'doc', fromId: doc.id, toType: 'task', toId: tk.id }); pickerWrap.remove(); renderDetail(); });
			}
			const w = getWindow(ltSection);
			const closeFn = (e: Event) => { if (!pickerWrap.contains(e.target as Node)) { pickerWrap.remove(); w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Comments (review-style)
		const commentsSection = append(detailContainer, $('div'));
		commentsSection.style.cssText = `padding:14px 20px;border-top:1px solid ${T.border};`;

		const mockDocComments: { author: string; initials: string; color: string; text: string; time: string }[] = [
			{ author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text: 'Requirements 1-3 are clear. Can we add acceptance criteria for the edge case where no tasks exist?', time: '2 days ago' },
			{ author: 'Alex Chen', initials: 'AC', color: '#6366f1', text: 'Good point. Updated the Requirements section with an empty-state criterion.', time: 'Yesterday' },
		];

		const commentsTitle = append(commentsSection, $('div'));
		commentsTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		commentsTitle.textContent = `Comments (${mockDocComments.length})`;

		const commentsList = append(commentsSection, $('div'));

		function renderDocComment(c: { author: string; initials: string; color: string; text: string; time: string }) {
			const entry = append(commentsList, $('div'));
			entry.style.cssText = `margin-bottom:12px;`;
			const header = append(entry, $('div'));
			header.style.cssText = `display:flex;align-items:center;gap:6px;margin-bottom:3px;`;
			const cav = append(header, $('span'));
			cav.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${c.color};flex-shrink:0;`;
			cav.textContent = c.initials;
			const cname = append(header, $('span'));
			cname.style.cssText = `font-size:12px;font-weight:500;color:${T.text};`;
			cname.textContent = c.author;
			const ctime = append(header, $('span'));
			ctime.style.cssText = `font-size:10px;color:${T.textFaint};margin-left:auto;`;
			ctime.textContent = c.time;
			const cbody = append(entry, $('div'));
			cbody.style.cssText = `font-size:12px;color:${T.textMuted};line-height:1.5;padding-left:24px;`;
			cbody.textContent = c.text;
		}

		for (const c of mockDocComments) { renderDocComment(c); }

		// Add comment input (always enabled, even when locked)
		const addCommentRow = append(commentsSection, $('div'));
		addCommentRow.style.cssText = `display:flex;gap:8px;margin-top:8px;`;
		const commentInput = document.createElement('input');
		commentInput.type = 'text';
		commentInput.placeholder = 'Add a comment...';
		commentInput.style.cssText = `flex:1;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:6px 10px;border-radius:${T.radiusSm};font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;`;
		commentInput.addEventListener('focus', () => { commentInput.style.borderColor = T.accent; });
		commentInput.addEventListener('blur', () => { commentInput.style.borderColor = T.border; });
		addCommentRow.appendChild(commentInput);

		const sendBtn = append(addCommentRow, $('span'));
		sendBtn.style.cssText = `padding:6px 14px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;font-size:11px;font-weight:500;cursor:pointer;transition:opacity 0.12s;flex-shrink:0;`;
		sendBtn.textContent = 'Send';
		sendBtn.addEventListener('mouseenter', () => { sendBtn.style.opacity = '0.85'; });
		sendBtn.addEventListener('mouseleave', () => { sendBtn.style.opacity = '1'; });

		function addDocComment() {
			const text = commentInput.value.trim();
			if (!text) { return; }
			const newComment = { author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text, time: 'Just now' };
			mockDocComments.push(newComment);
			renderDocComment(newComment);
			commentsTitle.textContent = `Comments (${mockDocComments.length})`;
			commentInput.value = '';
		}

		sendBtn.addEventListener('click', addDocComment);
		commentInput.addEventListener('keydown', (ke) => { if ((ke as KeyboardEvent).key === 'Enter') { addDocComment(); } });

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

	// -- Cross-drill: linked task detail -----------------------------------------
	function renderLinkedTaskDetail(taskId: string, fromDocId: string) {
		detailContainer.textContent = '';
		const task = findTask(taskId);
		if (!task) { showDetail(fromDocId); return; }
		const fromDoc = getDocs().find(d => d.id === fromDocId);

		listContainer.style.display = 'none';
		detailContainer.style.display = '';

		// Breadcrumb back to doc
		const backRow = append(detailContainer, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { showDetail(fromDocId); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = fromDoc ? fromDoc.title : 'Back';

		// Task header
		const header = append(detailContainer, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const idEl = append(header, $('span'));
		idEl.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
		idEl.textContent = task.id;
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:6px;letter-spacing:-0.01em;`;
		titleEl.textContent = task.title;

		// Task metadata
		const metaGrid = append(detailContainer, $('div'));
		metaGrid.style.cssText = `padding:12px 20px;border-bottom:1px solid ${T.border};display:grid;grid-template-columns:80px 1fr;gap:6px 12px;align-items:center;`;

		const statusLbl = append(metaGrid, $('span'));
		statusLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		statusLbl.textContent = 'Status';
		const groupId = findTaskGroup(task.id);
		const sc = TASK_STATUS_COLORS[groupId] || '#666';
		const statusVal = append(metaGrid, $('span'));
		statusVal.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};font-weight:500;`;
		statusVal.textContent = TASK_STATUS_LABELS[groupId] || groupId;

		const prioLbl = append(metaGrid, $('span'));
		prioLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		prioLbl.textContent = 'Priority';
		const pc = PRIORITY_COLORS[task.priority] || '#52525b';
		const prioVal = append(metaGrid, $('span'));
		prioVal.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${pc}20;color:${pc};font-weight:500;`;
		prioVal.textContent = PRIORITY_LABELS[task.priority] || task.priority;

		const assigneeLbl = append(metaGrid, $('span'));
		assigneeLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		assigneeLbl.textContent = 'Assignee';
		const assigneeVal = append(metaGrid, $('span'));
		assigneeVal.style.cssText = `display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.text};`;
		const av = append(assigneeVal, $('span'));
		av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;background:${task.color};`;
		av.textContent = task.initials;
		assigneeVal.appendChild(document.createTextNode(task.initials));

		// Description
		if (task.description) {
			const descSection = append(detailContainer, $('div'));
			descSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
			const descTitle = append(descSection, $('div'));
			descTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
			descTitle.textContent = 'Description';
			const descContent = append(descSection, $('div'));
			descContent.style.cssText = `font-size:13px;line-height:1.7;color:${T.text};`;
			renderMarkdownToDOM(descContent, task.description);
		}

		// Sub-tasks
		if (task.subtasks.length > 0) {
			const stSection = append(detailContainer, $('div'));
			stSection.style.cssText = `padding:14px 20px;`;
			const stDone = task.subtasks.filter(s => s.done).length;
			const stTitle = append(stSection, $('div'));
			stTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
			stTitle.textContent = `Sub-tasks (${stDone}/${task.subtasks.length})`;
			for (const st of task.subtasks) {
				const stRow = append(stSection, $('div'));
				stRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:3px 0;`;
				const stCheck = append(stRow, $('span'));
				stCheck.style.cssText = `font-size:14px;color:${st.done ? '#22c55e' : T.textFaint};`;
				stCheck.textContent = st.done ? '\u2611' : '\u2610';
				const stLabel = append(stRow, $('span'));
				stLabel.style.cssText = `font-size:12px;color:${st.done ? T.textFaint : T.text};${st.done ? 'text-decoration:line-through;' : ''}`;
				stLabel.textContent = st.title;
			}
		}
	}

	// Initial render
	renderList();
}
