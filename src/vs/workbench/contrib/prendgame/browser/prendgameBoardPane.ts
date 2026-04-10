/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { $, append, getWindow } from '../../../../base/browser/dom.js';
import { T } from './prendgameTheme.js';
import { getGroups, getMembers, getDocs, findTask, findTaskGroup, getDueDateStyle, getLinkedDocs, getLinkedTasks, addLink, getReadyForDevDocs, createTasksFromDoc, onTaskChanged, onDataChanged, PRIORITY_COLORS, PRIORITY_LABELS, TASK_STATUS_COLORS as STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUSES, DOC_TYPE_COLORS, DOC_TYPE_LABELS, DOC_STATUS_COLORS, DOC_STATUS_LABELS, ITask, ISubtask, IDoc } from './prendgameData.js';
import { renderMarkdownToDOM } from './prendgameDocsPane.js';
import { groupItemsBy, renderCollapsibleGroup, IViewGroup } from './prendgameViewUtils.js';

// -- Render -------------------------------------------------------------------

export function renderBoardContent(root: HTMLElement, commandService: { executeCommand(id: string, ...args: unknown[]): unknown }): void {

	const groups = getGroups();
	const members = getMembers();
	const selectedTaskIds = new Set<string>();
	let bulkBar: HTMLElement | null = null;

	// Drill-in containers
	const boardContainer = append(root, $('div'));
	const detailContainer = append(root, $('div'));
	detailContainer.style.display = 'none';
	let activeTaskId: string | null = null;

	function showBoard() {
		activeTaskId = null;
		boardContainer.style.display = '';
		detailContainer.style.display = 'none';
	}

	function showDetail(taskId: string) {
		activeTaskId = taskId;
		boardContainer.style.display = 'none';
		detailContainer.style.display = '';
		renderTaskDetail();
	}

	function renderTaskDetail() {
		detailContainer.textContent = '';
		const task = findTask(activeTaskId || '');
		if (!task) { showBoard(); return; }
		const groupId = findTaskGroup(task.id);
		const statusLabel = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }[groupId] || groupId;

		// Back
		const backRow = append(detailContainer, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { showBoard(); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = 'Board';

		// Header
		const header = append(detailContainer, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		// Task ID
		const idEl = append(header, $('span'));
		idEl.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
		idEl.textContent = task.id;

		// Editable title
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:6px;cursor:text;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;letter-spacing:-0.01em;`;
		titleEl.textContent = task.title;
		titleEl.addEventListener('mouseenter', () => { titleEl.style.background = T.surfaceHover; });
		titleEl.addEventListener('mouseleave', () => { titleEl.style.background = ''; });
		titleEl.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = task.title;
			input.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:4px 8px;border-radius:${T.radiusSm};font-size:16px;font-weight:600;font-family:inherit;outline:none;`;
			titleEl.textContent = '';
			titleEl.appendChild(input);
			input.focus();
			input.select();
			const finish = () => { const v = input.value.trim(); if (v) { task.title = v; } titleEl.textContent = task.title; };
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { input.blur(); } if (ke.key === 'Escape') { input.value = task.title; input.blur(); } });
		});

		// Metadata grid
		const metaGrid = append(detailContainer, $('div'));
		metaGrid.style.cssText = `padding:12px 20px;border-bottom:1px solid ${T.border};display:grid;grid-template-columns:80px 1fr;gap:6px 12px;align-items:center;`;

		// Status
		const statusLbl = append(metaGrid, $('span'));
		statusLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		statusLbl.textContent = 'Status';
		const statusWrap = append(metaGrid, $('div'));
		statusWrap.style.cssText = 'position:relative;';
		const statusPill = append(statusWrap, $('span'));
		let sc = STATUS_COLORS[groupId] || '#666';
		const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
		const taskStatusLabels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
		statusPill.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};cursor:pointer;font-weight:500;`;
		statusPill.textContent = statusLabel + ' \u25BE';
		let statusDropdown: HTMLElement | null = null;
		statusPill.addEventListener('click', () => {
			if (statusDropdown) { statusDropdown.remove(); statusDropdown = null; return; }
			const dd = append(statusWrap, $('div'));
			statusDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:130px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const s of taskStatuses) {
				const opt = append(dd, $('div'));
				const osc = STATUS_COLORS[s] || '#666';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${osc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = taskStatusLabels[s] || s;
				opt.addEventListener('click', (e) => { e.stopPropagation(); moveTask(task.id, s); sc = osc; statusPill.style.background = `${sc}20`; statusPill.style.color = sc; statusPill.textContent = (taskStatusLabels[s] || s) + ' \u25BE'; dd.remove(); statusDropdown = null; });
			}
			const w = getWindow(statusWrap);
			const closeFn = (e: Event) => { if (!statusWrap.contains(e.target as Node)) { dd.remove(); statusDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Priority
		const prioLbl = append(metaGrid, $('span'));
		prioLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		prioLbl.textContent = 'Priority';
		const prioWrap = append(metaGrid, $('div'));
		prioWrap.style.cssText = 'position:relative;';
		const prioPill = append(prioWrap, $('span'));
		let pc = PRIORITY_COLORS[task.priority] || '#52525b';
		const prioLabels: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
		const priorities = ['low', 'medium', 'high', 'critical'];
		prioPill.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${pc}20;color:${pc};cursor:pointer;font-weight:500;`;
		prioPill.textContent = (prioLabels[task.priority] || task.priority) + ' \u25BE';
		let prioDropdown: HTMLElement | null = null;
		prioPill.addEventListener('click', () => {
			if (prioDropdown) { prioDropdown.remove(); prioDropdown = null; return; }
			const dd = append(prioWrap, $('div'));
			prioDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:110px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const p of priorities) {
				const opt = append(dd, $('div'));
				const opc = PRIORITY_COLORS[p] || '#52525b';
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const od = append(opt, $('span'));
				od.style.cssText = `width:6px;height:6px;border-radius:50%;background:${opc};flex-shrink:0;`;
				const ol = append(opt, $('span'));
				ol.textContent = prioLabels[p] || p;
				opt.addEventListener('click', (e) => { e.stopPropagation(); task.priority = p; pc = opc; prioPill.style.background = `${pc}20`; prioPill.style.color = pc; prioPill.textContent = (prioLabels[p] || p) + ' \u25BE'; dd.remove(); prioDropdown = null; });
			}
			const w = getWindow(prioWrap);
			const closeFn = (e: Event) => { if (!prioWrap.contains(e.target as Node)) { dd.remove(); prioDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Assignee (dropdown)
		const assigneeLbl = append(metaGrid, $('span'));
		assigneeLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		assigneeLbl.textContent = 'Assignee';
		const assigneeWrap = append(metaGrid, $('div'));
		assigneeWrap.style.cssText = 'position:relative;';
		const assigneeBtn = append(assigneeWrap, $('span'));
		assigneeBtn.style.cssText = `display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${T.text};cursor:pointer;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		const memberMatch = members.find(m => m.initials === task.initials);

		function renderAssignee() {
			assigneeBtn.textContent = '';
			const av = append(assigneeBtn, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;background:${task.color};`;
			av.textContent = task.initials;
			const nm = append(assigneeBtn, $('span'));
			const m = members.find(mm => mm.initials === task.initials);
			nm.textContent = (m ? m.name : task.initials) + ' \u25BE';
		}
		renderAssignee();

		assigneeBtn.addEventListener('mouseenter', () => { assigneeBtn.style.background = T.surfaceHover; });
		assigneeBtn.addEventListener('mouseleave', () => { assigneeBtn.style.background = ''; });

		let assigneeDropdown: HTMLElement | null = null;
		assigneeBtn.addEventListener('click', () => {
			if (assigneeDropdown) { assigneeDropdown.remove(); assigneeDropdown = null; return; }
			const dd = append(assigneeWrap, $('div'));
			assigneeDropdown = dd;
			dd.style.cssText = `position:absolute;top:100%;left:0;margin-top:4px;background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
			for (const m of members) {
				const opt = append(dd, $('div'));
				const isActive = task.initials === m.initials;
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${isActive ? T.text : T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const oav = append(opt, $('span'));
				oav.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${m.color};`;
				oav.textContent = m.initials;
				const ol = append(opt, $('span'));
				ol.textContent = m.name;
				if (isActive) { ol.style.fontWeight = '600'; }
				const or = append(opt, $('span'));
				or.style.cssText = `margin-left:auto;font-size:10px;color:${T.textFaint};`;
				or.textContent = m.role;
				opt.addEventListener('click', (e) => {
					e.stopPropagation();
					task.initials = m.initials;
					task.color = m.color;
					renderAssignee();
					dd.remove();
					assigneeDropdown = null;
				});
			}
			const w = getWindow(assigneeWrap);
			const closeFn = (e: Event) => { if (!assigneeWrap.contains(e.target as Node)) { dd.remove(); assigneeDropdown = null; w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Labels
		const labelsLbl = append(metaGrid, $('span'));
		labelsLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		labelsLbl.textContent = 'Tags';
		const labelsEl = append(metaGrid, $('div'));
		labelsEl.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
		for (const l of task.tags) {
			const lbl = append(labelsEl, $('span'));
			lbl.style.cssText = `font-size:10px;padding:2px 8px;border-radius:${T.radiusPill};background:${T.border};color:${T.textMuted};`;
			lbl.textContent = l;
		}

		// Due Date
		const dueLbl = append(metaGrid, $('span'));
		dueLbl.style.cssText = `font-size:11px;color:${T.textFaint};`;
		dueLbl.textContent = 'Due Date';
		const dueVal = append(metaGrid, $('span'));
		const ds = getDueDateStyle(task.dueDate);
		dueVal.style.cssText = `font-size:11px;color:${ds.color};cursor:text;padding:2px 4px;border-radius:${T.radiusSm};transition:background 0.1s;`;
		dueVal.textContent = ds.label || 'No due date';
		dueVal.addEventListener('mouseenter', () => { dueVal.style.background = T.surfaceHover; });
		dueVal.addEventListener('mouseleave', () => { dueVal.style.background = ''; });
		dueVal.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = task.dueDate || '';
			input.placeholder = 'YYYY-MM-DD';
			input.style.cssText = `width:120px;box-sizing:border-box;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:2px 6px;border-radius:${T.radiusSm};font-size:11px;font-family:inherit;outline:none;`;
			dueVal.textContent = '';
			dueVal.appendChild(input);
			input.focus();
			input.select();
			const finish = () => {
				task.dueDate = input.value.trim();
				const newDs = getDueDateStyle(task.dueDate);
				dueVal.style.color = newDs.color;
				dueVal.textContent = newDs.label || 'No due date';
			};
			input.addEventListener('blur', finish);
			input.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { input.blur(); } if (ke.key === 'Escape') { input.value = task.dueDate; input.blur(); } });
		});

		// Description
		const descSection = append(detailContainer, $('div'));
		descSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const descTitle = append(descSection, $('div'));
		descTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
		descTitle.textContent = 'Description';
		const descContent = append(descSection, $('div'));
		descContent.style.cssText = `font-size:13px;line-height:1.7;color:${T.text};cursor:text;padding:4px;border-radius:${T.radiusSm};transition:background 0.1s;min-height:40px;`;
		const descText = task.description || 'Click to add a description...';

		function renderDesc() {
			descContent.textContent = '';
			const lines = (task.description || descText).split('\n');
			for (const line of lines) {
				if (line.startsWith('- ')) {
					const el = append(descContent, $('div'));
					el.style.cssText = `margin:2px 0;padding-left:12px;`;
					el.textContent = '\u2022 ' + line.slice(2);
				} else if (line.trim() === '') {
					append(descContent, $('br'));
				} else {
					const el = append(descContent, $('div'));
					el.style.cssText = 'margin:2px 0;';
					el.textContent = line;
				}
			}
		}
		renderDesc();

		descContent.addEventListener('mouseenter', () => { descContent.style.background = T.surfaceHover; });
		descContent.addEventListener('mouseleave', () => { descContent.style.background = ''; });
		descContent.addEventListener('click', () => {
			const textarea = document.createElement('textarea');
			textarea.value = task.description || '';
			textarea.style.cssText = `width:100%;box-sizing:border-box;min-height:120px;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:8px;border-radius:${T.radius};font-size:13px;font-family:inherit;line-height:1.6;outline:none;resize:vertical;`;
			descContent.textContent = '';
			descContent.appendChild(textarea);
			textarea.focus();
			textarea.addEventListener('blur', () => { task.description = textarea.value; renderDesc(); });
			textarea.addEventListener('keydown', (ke) => { if (ke.key === 'Escape') { renderDesc(); } });
		});

		// Linked Documents
		const linkedDocs = getLinkedDocs(task.id);
		const linkedDocsSection = append(detailContainer, $('div'));
		linkedDocsSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const linkedDocsTitle = append(linkedDocsSection, $('div'));
		linkedDocsTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
		linkedDocsTitle.textContent = `Linked Documents (${linkedDocs.length})`;

		if (linkedDocs.length === 0) {
			const emptyMsg = append(linkedDocsSection, $('div'));
			emptyMsg.style.cssText = `font-size:11px;color:${T.textFaint};padding:6px 8px;font-style:italic;`;
			emptyMsg.textContent = 'No linked documents. Link a PRD to connect requirements.';
		}

		for (const ld of linkedDocs) {
			const ldRow = append(linkedDocsSection, $('div'));
			ldRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:${T.radiusSm};cursor:pointer;transition:background 0.1s;`;
			ldRow.addEventListener('mouseenter', () => { ldRow.style.background = T.surfaceHover; });
			ldRow.addEventListener('mouseleave', () => { ldRow.style.background = ''; });

			const ldBadge = append(ldRow, $('span'));
			const ldc = DOC_TYPE_COLORS[ld.type] || '#666';
			ldBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${ldc}20;color:${ldc};text-transform:uppercase;letter-spacing:0.04em;`;
			ldBadge.textContent = DOC_TYPE_LABELS[ld.type] || ld.type;

			const ldTitle = append(ldRow, $('span'));
			ldTitle.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			ldTitle.textContent = ld.title;

			const ldStatus = append(ldRow, $('span'));
			const ldsc = DOC_STATUS_COLORS[ld.status] || '#666';
			ldStatus.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};background:${ldsc}20;color:${ldsc};font-weight:500;`;
			ldStatus.textContent = DOC_STATUS_LABELS[ld.status] || ld.status;

			ldRow.addEventListener('click', () => { renderLinkedDocDetail(ld.id, task.id); });
		}

		// Link Document button
		const linkDocBtn = append(linkedDocsSection, $('div'));
		linkDocBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:6px;border-radius:${T.radiusSm};border:1px dashed ${T.border};cursor:pointer;font-size:11px;color:${T.textMuted};transition:all 0.12s;margin-top:6px;`;
		linkDocBtn.textContent = '+ Link Document';
		linkDocBtn.addEventListener('mouseenter', () => { linkDocBtn.style.color = T.text; linkDocBtn.style.borderColor = T.accent; linkDocBtn.style.background = T.surfaceHover; });
		linkDocBtn.addEventListener('mouseleave', () => { linkDocBtn.style.color = T.textMuted; linkDocBtn.style.borderColor = T.border; linkDocBtn.style.background = ''; });
		linkDocBtn.addEventListener('click', () => {
			const allDocs = getDocs();
			const alreadyLinked = new Set(linkedDocs.map(d => d.id));
			const available = allDocs.filter(d => !alreadyLinked.has(d.id));
			if (available.length === 0) { return; }
			const pickerWrap = append(linkedDocsSection, $('div'));
			pickerWrap.style.cssText = 'position:relative;';
			const dd = append(pickerWrap, $('div'));
			dd.style.cssText = `background:${T.surface};border:1px solid ${T.border};border-radius:${T.radius};padding:4px 0;z-index:1000;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,0.3);margin-top:4px;`;
			for (const d of available) {
				const opt = append(dd, $('div'));
				opt.style.cssText = `display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;font-size:11px;color:${T.textMuted};transition:background 0.1s;`;
				opt.addEventListener('mouseenter', () => { opt.style.background = T.surfaceHover; });
				opt.addEventListener('mouseleave', () => { opt.style.background = ''; });
				const optBadge = append(opt, $('span'));
				const otc = DOC_TYPE_COLORS[d.type] || '#666';
				optBadge.style.cssText = `font-size:8px;padding:1px 5px;border-radius:2px;background:${otc}20;color:${otc};font-weight:600;`;
				optBadge.textContent = DOC_TYPE_LABELS[d.type] || d.type;
				const optLabel = append(opt, $('span'));
				optLabel.textContent = d.title;
				opt.addEventListener('click', () => { addLink({ fromType: 'task', fromId: task.id, toType: 'doc', toId: d.id }); pickerWrap.remove(); renderTaskDetail(); });
			}
			const w = getWindow(linkedDocsSection);
			const closeFn = (e: Event) => { if (!pickerWrap.contains(e.target as Node)) { pickerWrap.remove(); w.document.removeEventListener('click', closeFn); } };
			setTimeout(() => w.document.addEventListener('click', closeFn), 0);
		});

		// Sub-tasks
		if (task.subtasks.length > 0) {
			const stSection = append(detailContainer, $('div'));
			stSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

			const stDone = task.subtasks.filter(s => s.done).length;
			const stTotal = task.subtasks.length;
			const stPct = Math.round((stDone / stTotal) * 100);

			const stHeader = append(stSection, $('div'));
			stHeader.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;`;
			const stTitle = append(stHeader, $('div'));
			stTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;`;
			stTitle.textContent = `Sub-tasks (${stDone}/${stTotal})`;
			const stPctEl = append(stHeader, $('span'));
			stPctEl.style.cssText = `font-size:10px;color:${stDone === stTotal ? '#22c55e' : T.textFaint};`;
			stPctEl.textContent = `${stPct}%`;

			// Progress bar
			const stBarBg = append(stSection, $('div'));
			stBarBg.style.cssText = `height:4px;border-radius:2px;background:${T.border};overflow:hidden;margin-bottom:10px;`;
			const stBarFill = append(stBarBg, $('div'));
			stBarFill.style.cssText = `height:100%;border-radius:2px;background:#22c55e;width:${stPct}%;transition:width 0.3s;`;

			function updateProgress() {
				const d = task.subtasks.filter(s => s.done).length;
				const p = Math.round((d / stTotal) * 100);
				stTitle.textContent = `Sub-tasks (${d}/${stTotal})`;
				stPctEl.textContent = `${p}%`;
				stPctEl.style.color = d === stTotal ? '#22c55e' : T.textFaint;
				stBarFill.style.width = `${p}%`;
			}

			// Render sub-task items
			for (const st of task.subtasks) {
				const stRow = append(stSection, $('div'));
				stRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;`;

				const stCheck = append(stRow, $('span'));
				stCheck.style.cssText = `font-size:14px;cursor:pointer;flex-shrink:0;color:${st.done ? '#22c55e' : T.textFaint};`;
				stCheck.textContent = st.done ? '\u2611' : '\u2610';

				const stLabel = append(stRow, $('span'));
				stLabel.style.cssText = `font-size:12px;color:${st.done ? T.textFaint : T.text};flex:1;${st.done ? 'text-decoration:line-through;' : ''}`;
				stLabel.textContent = st.title;

				if (st.assignee) {
					const stAv = append(stRow, $('span'));
					const stMember = members.find(m => m.initials === st.assignee);
					stAv.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${stMember ? stMember.color : '#52525b'};flex-shrink:0;`;
					stAv.textContent = st.assignee;
				}

				stCheck.addEventListener('click', () => {
					st.done = !st.done;
					stCheck.textContent = st.done ? '\u2611' : '\u2610';
					stCheck.style.color = st.done ? '#22c55e' : T.textFaint;
					stLabel.style.color = st.done ? T.textFaint : T.text;
					stLabel.style.textDecoration = st.done ? 'line-through' : 'none';
					updateProgress();
				});
			}

			// Add sub-task input
			const stAddRow = append(stSection, $('div'));
			stAddRow.style.cssText = `display:flex;gap:6px;margin-top:8px;`;
			const stInput = document.createElement('input');
			stInput.type = 'text';
			stInput.placeholder = 'Add sub-task...';
			stInput.style.cssText = `flex:1;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:4px 8px;border-radius:${T.radiusSm};font-size:11px;font-family:inherit;outline:none;box-sizing:border-box;`;
			stInput.addEventListener('focus', () => { stInput.style.borderColor = T.accent; });
			stInput.addEventListener('blur', () => { stInput.style.borderColor = T.border; });
			stAddRow.appendChild(stInput);

			const stAddBtn = append(stAddRow, $('span'));
			stAddBtn.style.cssText = `padding:4px 10px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;font-size:10px;font-weight:500;cursor:pointer;flex-shrink:0;`;
			stAddBtn.textContent = 'Add';

			function addSubtask() {
				const text = stInput.value.trim();
				if (!text) { return; }
				const newSt: ISubtask = { title: text, done: false };
				task.subtasks.push(newSt);
				stInput.value = '';

				// Render new item
				const stRow = document.createElement('div');
				stRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;`;
				const stCheck = document.createElement('span');
				stCheck.style.cssText = `font-size:14px;cursor:pointer;flex-shrink:0;color:${T.textFaint};`;
				stCheck.textContent = '\u2610';
				const stLabel = document.createElement('span');
				stLabel.style.cssText = `font-size:12px;color:${T.text};flex:1;`;
				stLabel.textContent = text;
				stRow.appendChild(stCheck);
				stRow.appendChild(stLabel);
				stSection.insertBefore(stRow, stAddRow);

				stCheck.addEventListener('click', () => {
					newSt.done = !newSt.done;
					stCheck.textContent = newSt.done ? '\u2611' : '\u2610';
					stCheck.style.color = newSt.done ? '#22c55e' : T.textFaint;
					stLabel.style.color = newSt.done ? T.textFaint : T.text;
					stLabel.style.textDecoration = newSt.done ? 'line-through' : 'none';
					updateProgress();
				});
				updateProgress();
			}

			stAddBtn.addEventListener('click', addSubtask);
			stInput.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { addSubtask(); } });
		}

		// Comments
		const commentsSection = append(detailContainer, $('div'));
		commentsSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		const mockComments: { author: string; initials: string; color: string; text: string; time: string }[] = [
			{ author: 'Alex Chen', initials: 'AC', color: '#6366f1', text: 'Please make sure the acceptance criteria cover edge cases for empty states.', time: '2 days ago' },
			{ author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text: 'Good call. I will add handling for the zero-task state and loading skeleton.', time: 'Yesterday' },
			{ author: 'Avery Quinn', initials: 'AQ', color: '#ec4899', text: 'Adding this to my QA checklist.', time: '3 hours ago' },
		];

		const commentsTitle = append(commentsSection, $('div'));
		commentsTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		commentsTitle.textContent = `Comments (${mockComments.length})`;

		const commentsList = append(commentsSection, $('div'));

		function renderComment(c: { author: string; initials: string; color: string; text: string; time: string }) {
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

		for (const c of mockComments) { renderComment(c); }

		// Add comment input
		const addRow = append(commentsSection, $('div'));
		addRow.style.cssText = `display:flex;gap:8px;margin-top:8px;`;

		const commentInput = document.createElement('input');
		commentInput.type = 'text';
		commentInput.placeholder = 'Add a comment...';
		commentInput.style.cssText = `flex:1;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:6px 10px;border-radius:${T.radiusSm};font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;`;
		commentInput.addEventListener('focus', () => { commentInput.style.borderColor = T.accent; });
		commentInput.addEventListener('blur', () => { commentInput.style.borderColor = T.border; });
		addRow.appendChild(commentInput);

		const sendBtn = append(addRow, $('span'));
		sendBtn.style.cssText = `padding:6px 14px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;font-size:11px;font-weight:500;cursor:pointer;transition:opacity 0.12s;flex-shrink:0;`;
		sendBtn.textContent = 'Send';
		sendBtn.addEventListener('mouseenter', () => { sendBtn.style.opacity = '0.85'; });
		sendBtn.addEventListener('mouseleave', () => { sendBtn.style.opacity = '1'; });

		function addComment() {
			const text = commentInput.value.trim();
			if (!text) { return; }
			const newComment = { author: 'Jordan Park', initials: 'JP', color: '#06b6d4', text, time: 'Just now' };
			mockComments.push(newComment);
			renderComment(newComment);
			commentsTitle.textContent = `Comments (${mockComments.length})`;
			commentInput.value = '';
		}

		sendBtn.addEventListener('click', addComment);
		commentInput.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { addComment(); } });

		// Activity Log
		const actSection = append(detailContainer, $('div'));
		actSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const actTitle = append(actSection, $('div'));
		actTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		actTitle.textContent = 'Activity';

		const actList = append(actSection, $('div'));

		const mockActivity: { initials: string; color: string; text: string; time: string }[] = [
			{ initials: 'AC', color: '#6366f1', text: 'Alex Chen created this task', time: 'Mar 25' },
			{ initials: 'TR', color: '#8b5cf6', text: 'Taylor Reeves assigned to Morgan Liu', time: 'Apr 1' },
			{ initials: 'ML', color: '#10b981', text: 'Morgan Liu changed status to In Progress', time: 'Apr 7' },
			{ initials: 'JP', color: '#06b6d4', text: 'Jordan Park linked PRD v1', time: 'Apr 7' },
			{ initials: 'AI', color: '#a855f7', text: 'Claude Code changed status to In Review via MCP', time: 'Apr 8' },
		];

		function renderActivityEntry(a: { initials: string; color: string; text: string; time: string }, prepend?: boolean) {
			const entry = document.createElement('div');
			entry.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:3px 0;`;
			const dot = document.createElement('span');
			dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${a.color};flex-shrink:0;margin-top:5px;`;
			entry.appendChild(dot);
			const content = document.createElement('span');
			content.style.cssText = `font-size:11px;color:${T.textMuted};flex:1;line-height:1.4;`;
			content.textContent = a.text;
			entry.appendChild(content);
			const time = document.createElement('span');
			time.style.cssText = `font-size:10px;color:${T.textFaint};white-space:nowrap;flex-shrink:0;`;
			time.textContent = a.time;
			entry.appendChild(time);
			if (prepend && actList.firstChild) { actList.insertBefore(entry, actList.firstChild); }
			else { actList.appendChild(entry); }
		}

		for (const a of mockActivity) { renderActivityEntry(a); }

		// Subscribe to live task changes for this task
		const taskActivityDisposable = onTaskChanged((e) => {
			if (e.taskId === task.id) {
				const label = e.field === 'status' ? `You changed status` : e.field === 'priority' ? `You changed priority` : `You updated ${e.field}`;
				renderActivityEntry({ initials: 'JP', color: '#06b6d4', text: label, time: 'Just now' }, true);
			}
		});

		// Linked Code
		const codeSection = append(detailContainer, $('div'));
		codeSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;

		const codeTitle = append(codeSection, $('div'));
		codeTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
		codeTitle.textContent = 'Linked Code';

		const mockSnippets = [
			{ file: 'src/vs/workbench/contrib/prendgame/browser/prendgameBoardPane.ts', lines: '117-238', code: 'export function renderBoardContent(\n  root: HTMLElement,\n  commandService: { ... }\n): void {\n  const groups = getGroups();' },
			{ file: 'extensions/prendgame/src/extension.js', lines: '236-265', code: 'context.subscriptions.push(\n  vscode.commands.registerCommand(\n    \'prendgame.openTaskDetail\',\n    (taskId) => { ... }\n  )\n);' },
		];

		for (const snip of mockSnippets) {
			const snippetEl = append(codeSection, $('div'));
			snippetEl.style.cssText = `margin-bottom:10px;border:1px solid ${T.border};border-radius:${T.radius};overflow:hidden;`;

			const snippetHeader = append(snippetEl, $('div'));
			snippetHeader.style.cssText = `display:flex;align-items:center;gap:6px;padding:6px 10px;background:${T.surface};border-bottom:1px solid ${T.border};`;

			const fileIcon = append(snippetHeader, $('span'));
			fileIcon.style.cssText = `font-size:12px;color:${T.textFaint};`;
			fileIcon.textContent = '\u{1F4C4}';

			const fileName = append(snippetHeader, $('span'));
			fileName.style.cssText = `font-size:11px;color:${T.text};font-family:var(--monaco-monospace-font);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			fileName.textContent = snip.file;

			const lineRange = append(snippetHeader, $('span'));
			lineRange.style.cssText = `font-size:10px;color:${T.textFaint};white-space:nowrap;`;
			lineRange.textContent = `L${snip.lines}`;

			const codeBlock = append(snippetEl, $('div'));
			codeBlock.style.cssText = `padding:8px 10px;font-family:var(--monaco-monospace-font);font-size:11px;line-height:1.5;color:#a5b4fc;white-space:pre;overflow-x:auto;`;
			codeBlock.textContent = snip.code;
		}

		const linkCodeBtn = append(codeSection, $('div'));
		linkCodeBtn.style.cssText = `display:flex;align-items:center;justify-content:center;padding:6px;border-radius:${T.radiusSm};border:1px dashed ${T.border};cursor:pointer;font-size:11px;color:${T.textMuted};transition:all 0.12s;margin-top:6px;`;
		linkCodeBtn.textContent = '+ Link Code';
		linkCodeBtn.addEventListener('mouseenter', () => { linkCodeBtn.style.color = T.text; linkCodeBtn.style.borderColor = T.accent; linkCodeBtn.style.background = T.surfaceHover; });
		linkCodeBtn.addEventListener('mouseleave', () => { linkCodeBtn.style.color = T.textMuted; linkCodeBtn.style.borderColor = T.border; linkCodeBtn.style.background = ''; });

	}

	// -- Cross-drill: linked doc detail -------------------------------------------
	function renderLinkedDocDetail(docId: string, fromTaskId: string) {
		detailContainer.textContent = '';
		const doc = getDocs().find(d => d.id === docId);
		if (!doc) { showDetail(fromTaskId); return; }
		const fromTask = findTask(fromTaskId);

		// Breadcrumb back to task
		const backRow = append(detailContainer, $('div'));
		backRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 20px;cursor:pointer;border-bottom:1px solid ${T.border};transition:background 0.1s;`;
		backRow.addEventListener('mouseenter', () => { backRow.style.background = T.surfaceHover; });
		backRow.addEventListener('mouseleave', () => { backRow.style.background = ''; });
		backRow.addEventListener('click', () => { showDetail(fromTaskId); });
		const backArrow = append(backRow, $('span'));
		backArrow.style.cssText = `font-size:14px;color:${T.textMuted};`;
		backArrow.textContent = '\u2190';
		const backLabel = append(backRow, $('span'));
		backLabel.style.cssText = `font-size:12px;color:${T.textMuted};`;
		backLabel.textContent = fromTask ? `${fromTask.id}: ${fromTask.title}` : 'Back';

		// Doc header
		const header = append(detailContainer, $('div'));
		header.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const tc = DOC_TYPE_COLORS[doc.type] || '#666';
		const typeBadge = append(header, $('span'));
		typeBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${tc}20;color:${tc};text-transform:uppercase;letter-spacing:0.04em;`;
		typeBadge.textContent = DOC_TYPE_LABELS[doc.type] || doc.type;
		const titleEl = append(header, $('div'));
		titleEl.style.cssText = `font-size:16px;font-weight:600;color:${T.text};margin-top:8px;letter-spacing:-0.01em;`;
		titleEl.textContent = doc.title;
		const metaRow = append(header, $('div'));
		metaRow.style.cssText = `display:flex;align-items:center;gap:10px;margin-top:8px;`;
		const sc = DOC_STATUS_COLORS[doc.status] || '#666';
		const statusPill = append(metaRow, $('span'));
		statusPill.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};font-weight:500;`;
		statusPill.textContent = DOC_STATUS_LABELS[doc.status] || doc.status;
		const ownerEl = append(metaRow, $('span'));
		ownerEl.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${T.textMuted};`;
		const ownerAv = append(ownerEl, $('span'));
		ownerAv.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${doc.ownerColor};`;
		ownerAv.textContent = doc.ownerInitials;
		ownerEl.appendChild(document.createTextNode(doc.owner));

		// Doc content
		const contentSection = append(detailContainer, $('div'));
		contentSection.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		renderMarkdownToDOM(contentSection, doc.content);

		// Linked tasks in this doc
		const docLinkedTasks = getLinkedTasks(doc.id);
		if (docLinkedTasks.length > 0) {
			const ltSection = append(detailContainer, $('div'));
			ltSection.style.cssText = `padding:14px 20px;`;
			const ltTitle = append(ltSection, $('div'));
			ltTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
			ltTitle.textContent = `Linked Tasks (${docLinkedTasks.length})`;
			for (const lt of docLinkedTasks) {
				const ltRow = append(ltSection, $('div'));
				ltRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 0;`;
				const ltBar = append(ltRow, $('span'));
				const lpc = PRIORITY_COLORS[lt.priority] || '#52525b';
				ltBar.style.cssText = `width:3px;height:16px;border-radius:2px;background:${lpc};flex-shrink:0;`;
				const ltId = append(ltRow, $('span'));
				ltId.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;`;
				ltId.textContent = lt.id;
				const ltName = append(ltRow, $('span'));
				ltName.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
				ltName.textContent = lt.title;
				const ltStatusId = findTaskGroup(lt.id);
				const ltsc = STATUS_COLORS[ltStatusId] || '#666';
				const ltStatus = append(ltRow, $('span'));
				ltStatus.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};background:${ltsc}20;color:${ltsc};font-weight:500;`;
				const taskStatusLabels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
				ltStatus.textContent = taskStatusLabels[ltStatusId] || ltStatusId;
			}
		}
	}

	// Drag state
	let dragTaskId: string | null = null;
	let dragSourceGroup: string | null = null;
	const dropZones: { el: HTMLElement; groupId: string }[] = [];
	const cardsContainers: { el: HTMLElement; groupId: string }[] = [];
	const badges: { el: HTMLElement; groupId: string }[] = [];
	const twisties: { el: HTMLElement; groupId: string }[] = [];
	const taskRows: { el: HTMLElement; task: ITask; groupId: string }[] = [];

	function clearDropHighlights() {
		for (const dz of dropZones) {
			dz.el.style.cssText = `height:0;transition:height 0.2s ease,opacity 0.2s;overflow:hidden;opacity:0;`;
		}
	}

	function showDropHighlights() {
		for (const dz of dropZones) {
			if (dz.groupId !== dragSourceGroup) {
				dz.el.style.cssText = `height:32px;margin:3px 20px;border-radius:${T.radius};background:${T.accentMuted};border:1px dashed ${T.accent};transition:height 0.2s ease,opacity 0.2s;display:flex;align-items:center;justify-content:center;font-size:11px;color:${T.accent};opacity:1;`;
				dz.el.textContent = 'Drop here';
			}
		}
	}

	function moveTask(taskId: string, targetGroupId: string) {
		let task: ITask | undefined;
		for (const g of groups) {
			const idx = g.tasks.findIndex(tt => tt.id === taskId);
			if (idx !== -1) {
				task = g.tasks.splice(idx, 1)[0];
				const srcContainer = cardsContainers.find(c => c.groupId === g.id);
				const srcBadge = badges.find(b => b.groupId === g.id);
				if (srcContainer) {
					const rows = srcContainer.el.children;
					for (let i = 0; i < rows.length; i++) {
						if ((rows[i] as HTMLElement).dataset.taskId === taskId) {
							srcContainer.el.removeChild(rows[i]);
							break;
						}
					}
				}
				if (srcBadge) { srcBadge.el.textContent = String(g.tasks.length); }
				break;
			}
		}
		if (!task) { return; }
		const targetGroup = groups.find(g => g.id === targetGroupId);
		if (!targetGroup) { return; }
		targetGroup.tasks.push(task);
		const tgtContainer = cardsContainers.find(c => c.groupId === targetGroupId);
		const tgtBadge = badges.find(b => b.groupId === targetGroupId);
		const tgtTwistie = twisties.find(tw => tw.groupId === targetGroupId);
		if (tgtBadge) { tgtBadge.el.textContent = String(targetGroup.tasks.length); }
		if (tgtContainer && tgtContainer.el.style.display === 'none') {
			tgtContainer.el.style.display = '';
			if (tgtTwistie) { tgtTwistie.el.style.transform = 'rotate(90deg)'; }
		}
		if (tgtContainer) {
			renderTaskRow(tgtContainer.el, task, targetGroupId);
			// Highlight animation on the dropped task
			const newRow = tgtContainer.el.lastElementChild as HTMLElement;
			if (newRow) {
				newRow.style.background = `${T.accent}25`;
				newRow.style.transition = 'background 0.8s ease';
				setTimeout(() => { newRow.style.background = ''; }, 800);
			}
		}
	}

	function renderTaskRow(parent: HTMLElement, task: ITask, groupId?: string) {
		const row = append(parent, $('div'));
		row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px 6px 24px;cursor:pointer;transition:background 0.1s;border-radius:${T.radiusSm};margin:0 4px;`;
		row.dataset.taskId = task.id;
		row.draggable = true;
		taskRows.push({ el: row, task, groupId: groupId || '' });

		// Bulk select checkbox
		const checkbox = append(row, $('span'));
		checkbox.style.cssText = `font-size:13px;cursor:pointer;flex-shrink:0;color:${T.textFaint};width:16px;text-align:center;`;
		checkbox.textContent = selectedTaskIds.has(task.id) ? '\u2611' : '\u2610';
		checkbox.addEventListener('click', (e) => {
			e.stopPropagation();
			if (selectedTaskIds.has(task.id)) { selectedTaskIds.delete(task.id); checkbox.textContent = '\u2610'; checkbox.style.color = T.textFaint; }
			else { selectedTaskIds.add(task.id); checkbox.textContent = '\u2611'; checkbox.style.color = T.accent; }
			updateBulkBar();
		});

		row.addEventListener('mouseenter', () => { if (!dragTaskId) { row.style.background = T.surfaceHover; } });
		row.addEventListener('mouseleave', () => { row.style.background = ''; });

		let didDrag = false;
		row.addEventListener('click', () => {
			if (!didDrag) { showDetail(task.id); }
			didDrag = false;
		});

		row.addEventListener('dragstart', (e) => {
			didDrag = true;
			dragTaskId = task.id;
			for (const g of groups) {
				if (g.tasks.some(tt => tt.id === task.id)) { dragSourceGroup = g.id; break; }
			}
			row.style.opacity = '0.3';
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', task.id);
			}
			showDropHighlights();
		});
		row.addEventListener('dragend', () => {
			dragTaskId = null;
			dragSourceGroup = null;
			row.style.opacity = '1';
			clearDropHighlights();
		});

		// Priority bar
		const pBar = append(row, $('span'));
		const pc = PRIORITY_COLORS[task.priority] || '#52525b';
		pBar.style.cssText = `width:3px;height:16px;border-radius:2px;background:${pc};flex-shrink:0;`;

		// Task ID
		const tid = append(row, $('span'));
		tid.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;min-width:42px;`;
		tid.textContent = task.id;

		// Task title
		const title = append(row, $('span'));
		title.style.cssText = `font-size:13px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.01em;`;
		title.textContent = task.title;
		title.title = task.title;

		// Assignee
		const av = append(row, $('span'));
		av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;flex-shrink:0;background:${task.color};letter-spacing:0;`;
		av.textContent = task.initials;
		av.title = task.initials;

		// Due date
		if (task.dueDate) {
			const ds = getDueDateStyle(task.dueDate);
			const dueEl = append(row, $('span'));
			dueEl.style.cssText = `font-size:10px;color:${ds.color};white-space:nowrap;flex-shrink:0;`;
			dueEl.textContent = task.dueDate.slice(5);
		}

		// Sub-task progress
		if (task.subtasks.length > 0) {
			const stDone = task.subtasks.filter(s => s.done).length;
			const stEl = append(row, $('span'));
			stEl.style.cssText = `font-size:10px;color:${stDone === task.subtasks.length ? '#22c55e' : T.textFaint};white-space:nowrap;flex-shrink:0;`;
			stEl.textContent = `${stDone}/${task.subtasks.length}`;
		}
	}

	// == Workflow mode + View switcher ========================================
	let workflowMode: 'sprint' | 'continuous' = 'sprint';
	let activeEngView: 'board' | 'planning' | 'workload' = 'board';

	const modeRow = append(boardContainer, $('div'));
	modeRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;border-bottom:1px solid ${T.border};`;
	const modeLabel = append(modeRow, $('span'));
	modeLabel.style.cssText = `font-size:11px;color:${T.textFaint};`;
	modeLabel.textContent = 'Workflow';
	const modeBtns: HTMLElement[] = [];
	for (const m of ['sprint', 'continuous'] as const) {
		const btn = append(modeRow, $('span'));
		modeBtns.push(btn);
		const isActive = workflowMode === m;
		btn.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? T.accent : T.accent + '15'};color:${isActive ? '#fff' : T.accent};`;
		btn.textContent = m === 'sprint' ? 'Sprint' : 'Continuous';
		btn.addEventListener('click', () => {
			if (workflowMode === m) { return; }
			workflowMode = m;
			if (m === 'continuous' && activeEngView === 'planning') { activeEngView = 'board'; }
			rebuildEngView();
		});
	}

	// Separator
	const modeSep = append(modeRow, $('span'));
	modeSep.style.cssText = `width:1px;height:16px;background:${T.border};margin:0 4px;`;

	const viewBtns: HTMLElement[] = [];
	function renderViewSwitcher() {
		for (const b of viewBtns) { b.remove(); }
		viewBtns.length = 0;
		const views: Array<'board' | 'planning' | 'workload'> = workflowMode === 'sprint' ? ['board', 'planning', 'workload'] : ['board', 'workload'];
		const viewLabels: Record<string, string> = { board: 'Board', planning: 'Sprint Planning', workload: 'Workload' };
		for (const v of views) {
			const btn = append(modeRow, $('span'));
			viewBtns.push(btn);
			const isActive = activeEngView === v;
			btn.style.cssText = `font-size:11px;padding:3px 10px;cursor:pointer;font-weight:500;transition:all 0.12s;border-bottom:2px solid ${isActive ? T.accent : 'transparent'};color:${isActive ? T.text : T.textFaint};`;
			btn.textContent = viewLabels[v];
			btn.addEventListener('click', () => {
				if (activeEngView === v) { return; }
				activeEngView = v;
				rebuildEngView();
			});
		}
	}
	renderViewSwitcher();

	// Content containers for each view
	const boardViewContainer = append(boardContainer, $('div'));
	const planningViewContainer = append(boardContainer, $('div'));
	planningViewContainer.style.display = 'none';
	const workloadViewContainer = append(boardContainer, $('div'));
	workloadViewContainer.style.display = 'none';

	function rebuildEngView() {
		// Update mode buttons
		for (let i = 0; i < modeBtns.length; i++) {
			const isActive = ['sprint', 'continuous'][i] === workflowMode;
			modeBtns[i].style.background = isActive ? T.accent : T.accent + '15';
			modeBtns[i].style.color = isActive ? '#fff' : T.accent;
		}
		renderViewSwitcher();
		// Show/hide containers
		boardViewContainer.style.display = activeEngView === 'board' ? '' : 'none';
		planningViewContainer.style.display = activeEngView === 'planning' ? '' : 'none';
		workloadViewContainer.style.display = activeEngView === 'workload' ? '' : 'none';
		// Render planning/workload if switching to them
		if (activeEngView === 'planning') { renderSprintPlanning(); }
		if (activeEngView === 'workload') { renderWorkload(); }
	}

	// == Sprint bar (inside boardViewContainer) ===============================
	const sprintBar = append(boardViewContainer, $('div'));

	function renderSprintBar() {
		sprintBar.textContent = '';
		if (workflowMode !== 'sprint') { sprintBar.style.display = 'none'; return; }
		sprintBar.style.display = '';
		sprintBar.style.cssText = `display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const sprintIndicator = append(sprintBar, $('span'));
		sprintIndicator.style.cssText = `width:8px;height:8px;border-radius:50%;background:${T.accent};flex-shrink:0;`;
		const sprintInfo = append(sprintBar, $('div'));
		sprintInfo.style.cssText = 'display:flex;flex-direction:column;gap:1px;flex:1;';
		const sName = append(sprintInfo, $('span'));
		sName.style.cssText = `font-size:13px;font-weight:600;color:${T.text};letter-spacing:-0.01em;`;
		sName.textContent = 'Sprint 2 \u00B7 Core UI';
		const sDates = append(sprintInfo, $('span'));
		sDates.style.cssText = `font-size:11px;color:${T.textMuted};`;
		sDates.textContent = 'April 7 \u2013 18, 2026';
	}
	renderSprintBar();

	// == Search ===============================================================
	const searchWrap = append(boardViewContainer, $('div'));
	searchWrap.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};`;

	const searchInput = append(searchWrap, $('input'));
	searchInput.type = 'text';
	searchInput.placeholder = 'Filter tasks\u2026';
	searchInput.style.cssText = `width:100%;box-sizing:border-box;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:7px 12px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
	searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
	searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });

	searchInput.addEventListener('input', () => { rebuildBoard(); });

	// == Group by =============================================================
	let activeGroupBy = 'status';
	const groupByRow = append(boardViewContainer, $('div'));
	groupByRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;border-bottom:1px solid ${T.border};`;
	const groupByLabel = append(groupByRow, $('span'));
	groupByLabel.style.cssText = `font-size:11px;color:${T.textFaint};`;
	groupByLabel.textContent = 'Group by';
	const groupByOptions = ['status', 'assignee', 'priority'];
	const groupByLabelsMap: Record<string, string> = { status: 'Status', assignee: 'Assignee', priority: 'Priority' };
	const groupByBtns: HTMLElement[] = [];
	for (const opt of groupByOptions) {
		const btn = append(groupByRow, $('span'));
		groupByBtns.push(btn);
		const isActive = opt === activeGroupBy;
		btn.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};cursor:pointer;font-weight:500;transition:all 0.12s;background:${isActive ? T.accent : T.accent + '15'};color:${isActive ? '#fff' : T.accent};`;
		btn.textContent = groupByLabelsMap[opt] || opt;
		btn.addEventListener('click', () => {
			if (activeGroupBy === opt) { return; }
			activeGroupBy = opt;
			rebuildBoard();
		});
	}

	// == Filter row (status, assignee, sort) ===================================
	let activeStatusFilter = '';
	let activeAssigneeFilter = '';
	let activeSortField = '';
	let sortAscending = true;

	const filterRow = append(boardViewContainer, $('div'));
	filterRow.style.cssText = `display:flex;gap:6px;padding:8px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;

	function rebuildFilterRow() {
		filterRow.textContent = '';

		// Status filter
		const statusSelect = append(filterRow, $('select'));
		statusSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const statusDefault = append(statusSelect, $('option'));
		statusDefault.textContent = 'Status';
		(statusDefault as HTMLOptionElement).value = '';
		for (const s of TASK_STATUSES) {
			const opt = append(statusSelect, $('option'));
			opt.textContent = TASK_STATUS_LABELS[s] || s;
			(opt as HTMLOptionElement).value = s;
		}
		(statusSelect as HTMLSelectElement).value = activeStatusFilter;
		statusSelect.addEventListener('change', () => { activeStatusFilter = (statusSelect as HTMLSelectElement).value; rebuildBoard(); });

		// Assignee filter
		const assigneeSelect = append(filterRow, $('select'));
		assigneeSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const assigneeDefault = append(assigneeSelect, $('option'));
		assigneeDefault.textContent = 'Assignee';
		(assigneeDefault as HTMLOptionElement).value = '';
		for (const m of members) {
			const opt = append(assigneeSelect, $('option'));
			opt.textContent = m.name;
			(opt as HTMLOptionElement).value = m.initials;
		}
		(assigneeSelect as HTMLSelectElement).value = activeAssigneeFilter;
		assigneeSelect.addEventListener('change', () => { activeAssigneeFilter = (assigneeSelect as HTMLSelectElement).value; rebuildBoard(); });

		// Sort
		const sortSelect = append(filterRow, $('select'));
		sortSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;margin-left:auto;`;
		const sortOptions = [['', 'Sort by...'], ['title', 'Title'], ['dueDate', 'Due Date'], ['priority', 'Priority']];
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
			rebuildBoard();
		});

		// Clear
		if (activeStatusFilter || activeAssigneeFilter || activeSortField) {
			const clearBtn = append(filterRow, $('span'));
			clearBtn.style.cssText = `font-size:10px;padding:3px 8px;border-radius:${T.radiusPill};cursor:pointer;color:${T.textFaint};transition:color 0.12s;`;
			clearBtn.textContent = '\u2715 Clear';
			clearBtn.addEventListener('mouseenter', () => { clearBtn.style.color = T.text; });
			clearBtn.addEventListener('mouseleave', () => { clearBtn.style.color = T.textFaint; });
			clearBtn.addEventListener('click', () => { activeStatusFilter = ''; activeAssigneeFilter = ''; activeSortField = ''; rebuildFilterRow(); rebuildBoard(); });
		}
	}
	rebuildFilterRow();

	// == Dynamic board content (rebuilt on group-by change) ====================
	const dynamicContainer = append(boardViewContainer, $('div'));

	function rebuildBoard() {
		dynamicContainer.textContent = '';
		taskRows.length = 0;
		badges.length = 0;
		twisties.length = 0;
		cardsContainers.length = 0;
		dropZones.length = 0;

		// Update group-by button styles
		for (let i = 0; i < groupByBtns.length; i++) {
			const isActive = groupByOptions[i] === activeGroupBy;
			groupByBtns[i].style.background = isActive ? T.accent : T.accent + '15';
			groupByBtns[i].style.color = isActive ? '#fff' : T.accent;
		}

		// Build filtered task list
		let allTasks: ITask[] = [];
		for (const g of groups) { allTasks.push(...g.tasks); }
		if (activeStatusFilter) { allTasks = allTasks.filter(t => findTaskGroup(t.id) === activeStatusFilter); }
		if (activeAssigneeFilter) { allTasks = allTasks.filter(t => t.initials === activeAssigneeFilter); }
		// Also apply search filter
		const q = searchInput.value.toLowerCase().trim();
		if (q) { allTasks = allTasks.filter(t => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.tags.some(tg => tg.toLowerCase().includes(q)) || t.initials.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q)); }
		if (activeSortField) {
			allTasks.sort((a, b) => {
				const va = String(Object.getOwnPropertyDescriptor(a, activeSortField)?.value ?? '').toLowerCase();
				const vb = String(Object.getOwnPropertyDescriptor(b, activeSortField)?.value ?? '').toLowerCase();
				const cmp = va < vb ? -1 : va > vb ? 1 : 0;
				return sortAscending ? cmp : -cmp;
			});
		}

		// Build view groups based on activeGroupBy
		let viewGroups: IViewGroup<ITask>[];

		if (activeGroupBy === 'assignee') {
			const memberLabels: Record<string, string> = {};
			const memberColors: Record<string, string> = {};
			for (const m of members) { memberLabels[m.initials] = m.name; memberColors[m.initials] = m.color; }
			viewGroups = groupItemsBy(allTasks, 'initials', memberLabels, memberColors);
		} else if (activeGroupBy === 'priority') {
			viewGroups = groupItemsBy(allTasks, 'priority', PRIORITY_LABELS, PRIORITY_COLORS, ['critical', 'high', 'medium', 'low']);
		} else {
			// Status: use the original groups structure (preserves drag-drop group IDs)
			viewGroups = groups.map(g => ({ key: g.id, name: g.name, items: g.tasks, color: STATUS_COLORS[g.id] }));
		}

		// Summary pills
		const pills = append(dynamicContainer, $('div'));
		pills.style.cssText = `display:flex;gap:8px;padding:10px 20px;border-bottom:1px solid ${T.border};flex-wrap:wrap;align-items:center;`;
		for (const vg of viewGroups) {
			if (vg.items.length === 0) { continue; }
			const pill = append(pills, $('span'));
			const sc = vg.color || '#52525b';
			pill.style.cssText = `display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 10px;border-radius:${T.radiusPill};background:${sc}15;color:${sc};font-weight:500;letter-spacing:0;`;
			const pillDot = append(pill, $('span'));
			pillDot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sc};`;
			pill.appendChild(document.createTextNode(`${vg.items.length} ${vg.name.toLowerCase()}`));
		}
		const totalLabel = append(pills, $('span'));
		totalLabel.style.cssText = `font-size:11px;color:${T.textFaint};margin-left:auto;`;
		totalLabel.textContent = `${allTasks.length} total`;

		// Incoming from Product (only in status view)
		if (activeGroupBy === 'status') {
			renderIncoming(dynamicContainer);
		}

		// Render groups
		for (const vg of viewGroups) {
			const collapsed = activeGroupBy === 'status' ? (groups.find(g => g.id === vg.key)?.collapsed || false) : false;
			renderGroupSection(dynamicContainer, vg, collapsed);
		}
	}

	function renderIncoming(container: HTMLElement) {
		const readyDocs = getReadyForDevDocs();
		if (readyDocs.length === 0) { return; }
		const incomingSection = append(container, $('div'));
		incomingSection.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.border};background:${T.accent}08;border-left:3px solid ${T.accent};`;
		const incomingHeader = append(incomingSection, $('div'));
		incomingHeader.style.cssText = `font-size:11px;font-weight:600;color:${T.accent};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;`;
		incomingHeader.textContent = `Incoming from Product (${readyDocs.length})`;
		for (const rd of readyDocs) {
			const rdRow = append(incomingSection, $('div'));
			rdRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:${T.radiusSm};transition:background 0.1s;`;
			rdRow.addEventListener('mouseenter', () => { rdRow.style.background = T.surfaceHover; });
			rdRow.addEventListener('mouseleave', () => { rdRow.style.background = ''; });
			const rdBadge = append(rdRow, $('span'));
			const rdc = DOC_TYPE_COLORS[rd.type] || '#666';
			rdBadge.style.cssText = `font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;background:${rdc}20;color:${rdc};text-transform:uppercase;`;
			rdBadge.textContent = DOC_TYPE_LABELS[rd.type] || rd.type;
			const rdTitle = append(rdRow, $('span'));
			rdTitle.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
			rdTitle.textContent = rd.title;
			const rdOwner = append(rdRow, $('span'));
			rdOwner.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${rd.ownerColor};`;
			rdOwner.textContent = rd.ownerInitials;
			const createBtn = append(rdRow, $('span'));
			createBtn.style.cssText = `font-size:10px;padding:3px 10px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;cursor:pointer;font-weight:500;flex-shrink:0;transition:opacity 0.12s;`;
			createBtn.textContent = 'Create Tasks';
			createBtn.addEventListener('mouseenter', () => { createBtn.style.opacity = '0.85'; });
			createBtn.addEventListener('mouseleave', () => { createBtn.style.opacity = '1'; });
			createBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				const newTasks = createTasksFromDoc(rd.id);
				if (newTasks.length > 0) {
					createBtn.textContent = `${newTasks.length} tasks created`;
					createBtn.style.background = '#22c55e';
					createBtn.style.cursor = 'default';
					rebuildBoard();
				}
			});
		}
	}

	function renderGroupSection(container: HTMLElement, vg: IViewGroup<ITask>, collapsed: boolean) {
		const useDropZone = activeGroupBy === 'status';
		const result = renderCollapsibleGroup({
			container,
			group: vg,
			collapsed,
			theme: T,
			renderItem: (parent, task) => { renderTaskRow(parent, task, vg.key); },
			dropConfig: useDropZone ? {
				showDropZone: true,
				onDrop: (groupKey) => { if (dragTaskId) { moveTask(dragTaskId, groupKey); } clearDropHighlights(); },
			} : undefined,
		});
		twisties.push({ el: result.twistie, groupId: vg.key });
		badges.push({ el: result.badge, groupId: vg.key });
		cardsContainers.push({ el: result.cards, groupId: vg.key });
		if (result.dropZone) { dropZones.push({ el: result.dropZone, groupId: vg.key }); }
	}

	// Initial board render
	rebuildBoard();

	// Subscribe to data changes for reactive updates
	onDataChanged(() => { rebuildBoard(); });

	// == Sprint progress ======================================================
	const progressSection = append(boardViewContainer, $('div'));
	progressSection.style.cssText = `padding:16px 20px;border-top:1px solid ${T.border};`;

	const progressLabel = append(progressSection, $('div'));
	progressLabel.style.cssText = `font-size:11px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
	progressLabel.textContent = 'Sprint Progress';

	const allTaskCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);
	const doneTasks = groups.find(g => g.id === 'done')?.tasks.length || 0;
	const pct = allTaskCount > 0 ? Math.round((doneTasks / allTaskCount) * 100) : 0;

	const barBg = append(progressSection, $('div'));
	barBg.style.cssText = `height:6px;border-radius:3px;background:${T.border};overflow:hidden;margin-bottom:6px;`;

	const barFill = append(barBg, $('div'));
	barFill.style.cssText = `height:100%;border-radius:3px;background:${STATUS_COLORS.done};width:${pct}%;transition:width 0.4s ease;`;

	const barText = append(progressSection, $('div'));
	barText.style.cssText = `font-size:11px;color:${T.textFaint};`;
	barText.textContent = `${doneTasks} of ${allTaskCount} complete (${pct}%)`;


	// == Sprint Planning View =================================================
	function renderSprintPlanning() {
		planningViewContainer.textContent = '';
		const allTasks: ITask[] = [];
		for (const g of groups) { allTasks.push(...g.tasks); }

		// Split into sprint tasks (in_progress, todo, in_review) vs backlog
		const sprintTasks = allTasks.filter(t => { const g = findTaskGroup(t.id); return g === 'in_progress' || g === 'todo' || g === 'in_review' || g === 'done'; });
		const backlogTasks = allTasks.filter(t => findTaskGroup(t.id) === 'backlog');

		// Sprint header
		const sprintHeader = append(planningViewContainer, $('div'));
		sprintHeader.style.cssText = `padding:14px 20px;border-bottom:1px solid ${T.border};`;
		const shName = append(sprintHeader, $('div'));
		shName.style.cssText = `font-size:14px;font-weight:600;color:${T.text};margin-bottom:4px;`;
		shName.textContent = 'Sprint 2 \u00B7 Core UI';
		const shMeta = append(sprintHeader, $('div'));
		shMeta.style.cssText = `font-size:11px;color:${T.textMuted};display:flex;gap:12px;`;
		shMeta.appendChild(document.createTextNode('April 7 \u2013 18, 2026'));
		const shCount = append(shMeta, $('span'));
		shCount.textContent = `\u00B7 ${sprintTasks.length} tasks`;
		const shDone = sprintTasks.filter(t => findTaskGroup(t.id) === 'done').length;
		const shPct = sprintTasks.length > 0 ? Math.round((shDone / sprintTasks.length) * 100) : 0;
		const shProgress = append(shMeta, $('span'));
		shProgress.textContent = `\u00B7 ${shPct}% complete`;

		// Sprint actions
		const sprintActions = append(planningViewContainer, $('div'));
		sprintActions.style.cssText = `display:flex;gap:8px;padding:10px 20px;border-bottom:1px solid ${T.border};`;
		const startBtn = append(sprintActions, $('span'));
		startBtn.style.cssText = `font-size:11px;padding:5px 14px;border-radius:${T.radiusSm};background:${T.accent};color:#fff;cursor:pointer;font-weight:500;`;
		startBtn.textContent = 'End Sprint';
		startBtn.addEventListener('click', () => { startBtn.textContent = 'Sprint ended'; startBtn.style.background = '#22c55e'; });
		const goalBtn = append(sprintActions, $('span'));
		goalBtn.style.cssText = `font-size:11px;padding:5px 14px;border-radius:${T.radiusSm};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;`;
		goalBtn.textContent = 'Edit Goal';

		// Current Sprint section
		const sprintSection = append(planningViewContainer, $('div'));
		sprintSection.style.cssText = `padding:10px 0;`;
		const sprintLabel = append(sprintSection, $('div'));
		sprintLabel.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;padding:6px 20px;`;
		sprintLabel.textContent = `Current Sprint (${sprintTasks.length})`;
		for (const task of sprintTasks) {
			renderPlanningRow(sprintSection, task, false);
		}

		// Backlog section
		const backlogSection = append(planningViewContainer, $('div'));
		backlogSection.style.cssText = `padding:10px 0;border-top:2px solid ${T.border};`;
		const backlogLabel = append(backlogSection, $('div'));
		backlogLabel.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;padding:6px 20px;`;
		backlogLabel.textContent = `Backlog (${backlogTasks.length})`;
		for (const task of backlogTasks) {
			renderPlanningRow(backlogSection, task, true);
		}
	}

	function renderPlanningRow(container: HTMLElement, task: ITask, isBacklog: boolean) {
		const row = append(container, $('div'));
		row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px;cursor:pointer;transition:background 0.1s;`;
		row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
		row.addEventListener('mouseleave', () => { row.style.background = ''; });
		row.addEventListener('click', () => { showDetail(task.id); });

		const pBar = append(row, $('span'));
		const pc = PRIORITY_COLORS[task.priority] || '#52525b';
		pBar.style.cssText = `width:3px;height:16px;border-radius:2px;background:${pc};flex-shrink:0;`;

		const tid = append(row, $('span'));
		tid.style.cssText = `font-size:11px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;min-width:42px;`;
		tid.textContent = task.id;

		const title = append(row, $('span'));
		title.style.cssText = `font-size:13px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
		title.textContent = task.title;

		const groupId = findTaskGroup(task.id);
		const sc = STATUS_COLORS[groupId] || '#666';
		const statusPill = append(row, $('span'));
		statusPill.style.cssText = `font-size:10px;padding:2px 6px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};font-weight:500;`;
		statusPill.textContent = TASK_STATUS_LABELS[groupId] || groupId;

		const av = append(row, $('span'));
		av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:7px;font-weight:600;color:#fff;background:${task.color};flex-shrink:0;`;
		av.textContent = task.initials;

		// Move to/from sprint button
		const moveBtn = append(row, $('span'));
		moveBtn.style.cssText = `font-size:10px;padding:2px 8px;border-radius:${T.radiusSm};border:1px solid ${T.border};color:${T.textFaint};cursor:pointer;flex-shrink:0;transition:all 0.12s;`;
		moveBtn.textContent = isBacklog ? '\u2191 Sprint' : '\u2193 Backlog';
		moveBtn.addEventListener('mouseenter', () => { moveBtn.style.color = T.text; moveBtn.style.borderColor = T.accent; });
		moveBtn.addEventListener('mouseleave', () => { moveBtn.style.color = T.textFaint; moveBtn.style.borderColor = T.border; });
		moveBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			// Move task between backlog and todo
			const targetGroup = isBacklog ? 'todo' : 'backlog';
			moveTask(task.id, targetGroup);
			renderSprintPlanning();
		});
	}

	// == Workload View ========================================================
	function renderWorkload() {
		workloadViewContainer.textContent = '';

		const allTasks: ITask[] = [];
		for (const g of groups) { allTasks.push(...g.tasks); }

		const wlTitle = append(workloadViewContainer, $('div'));
		wlTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;padding:14px 20px 8px;`;
		wlTitle.textContent = 'Team Workload';

		for (const member of members) {
			const memberTasks = allTasks.filter(t => t.initials === member.initials);
			const doneTasks = memberTasks.filter(t => findTaskGroup(t.id) === 'done').length;
			const isOverloaded = memberTasks.length > 5;
			const isEmpty = memberTasks.length === 0;

			const row = append(workloadViewContainer, $('div'));
			row.style.cssText = `padding:10px 20px;border-bottom:1px solid ${T.borderSubtle};${isOverloaded ? 'background:#f59e0b08;' : ''}`;

			// Member header
			const headerRow = append(row, $('div'));
			headerRow.style.cssText = `display:flex;align-items:center;gap:8px;cursor:pointer;`;

			const av = append(headerRow, $('span'));
			av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:9px;font-weight:600;color:#fff;background:${member.color};flex-shrink:0;`;
			av.textContent = member.initials;

			const nameWrap = append(headerRow, $('div'));
			nameWrap.style.cssText = 'flex:1;';
			const name = append(nameWrap, $('div'));
			name.style.cssText = `font-size:13px;font-weight:500;color:${isEmpty ? T.textFaint : T.text};`;
			name.textContent = member.name;
			const role = append(nameWrap, $('div'));
			role.style.cssText = `font-size:10px;color:${T.textFaint};`;
			role.textContent = member.role;

			// Status breakdown pills
			const pillsWrap = append(headerRow, $('div'));
			pillsWrap.style.cssText = 'display:flex;gap:4px;';
			const statusCounts: Record<string, number> = {};
			for (const t of memberTasks) { const g = findTaskGroup(t.id); statusCounts[g] = (statusCounts[g] || 0) + 1; }
			for (const [sid, count] of Object.entries(statusCounts)) {
				const pill = append(pillsWrap, $('span'));
				const sc = STATUS_COLORS[sid] || '#52525b';
				pill.style.cssText = `font-size:9px;padding:1px 6px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};font-weight:500;`;
				pill.textContent = `${count}`;
			}

			// Count + progress
			const countEl = append(headerRow, $('span'));
			countEl.style.cssText = `font-size:11px;color:${isOverloaded ? '#f59e0b' : isEmpty ? T.textFaint : T.textMuted};font-weight:${isOverloaded ? '600' : '400'};white-space:nowrap;`;
			countEl.textContent = `${memberTasks.length} tasks`;

			// Progress bar
			if (memberTasks.length > 0) {
				const barBg = append(row, $('div'));
				barBg.style.cssText = `height:3px;border-radius:2px;background:${T.border};overflow:hidden;margin-top:6px;`;
				const pct = Math.round((doneTasks / memberTasks.length) * 100);
				const barFill = append(barBg, $('div'));
				barFill.style.cssText = `height:100%;border-radius:2px;background:#22c55e;width:${pct}%;`;
			}

			// Expandable task list
			const taskList = append(row, $('div'));
			taskList.style.cssText = 'display:none;padding-top:6px;';

			headerRow.addEventListener('click', () => {
				const hidden = taskList.style.display === 'none';
				taskList.style.display = hidden ? '' : 'none';
			});

			for (const t of memberTasks) {
				const tRow = append(taskList, $('div'));
				tRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 0 4px 32px;cursor:pointer;transition:background 0.1s;border-radius:${T.radiusSm};`;
				tRow.addEventListener('mouseenter', () => { tRow.style.background = T.surfaceHover; });
				tRow.addEventListener('mouseleave', () => { tRow.style.background = ''; });
				tRow.addEventListener('click', (e) => { e.stopPropagation(); showDetail(t.id); });

				const tBar = append(tRow, $('span'));
				const tpc = PRIORITY_COLORS[t.priority] || '#52525b';
				tBar.style.cssText = `width:3px;height:14px;border-radius:1px;background:${tpc};flex-shrink:0;`;
				const tId = append(tRow, $('span'));
				tId.style.cssText = `font-size:10px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
				tId.textContent = t.id;
				const tTitle = append(tRow, $('span'));
				tTitle.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
				tTitle.textContent = t.title;
				const tGroupId = findTaskGroup(t.id);
				const tsc = STATUS_COLORS[tGroupId] || '#666';
				const tStatus = append(tRow, $('span'));
				tStatus.style.cssText = `font-size:9px;padding:1px 5px;border-radius:${T.radiusPill};background:${tsc}20;color:${tsc};`;
				tStatus.textContent = TASK_STATUS_LABELS[tGroupId] || tGroupId;
			}
		}
	}

	// == Bulk Actions =========================================================

	function updateBulkBar() {
		if (selectedTaskIds.size === 0) {
			if (bulkBar) { bulkBar.remove(); bulkBar = null; }
			return;
		}
		if (!bulkBar) {
			bulkBar = append(boardViewContainer, $('div'));
			// Insert at top of boardViewContainer
			boardViewContainer.insertBefore(bulkBar, boardViewContainer.firstChild);
		}
		bulkBar.textContent = '';
		bulkBar.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;background:${T.accent}15;border-bottom:1px solid ${T.accent}40;`;

		const countLabel = append(bulkBar, $('span'));
		countLabel.style.cssText = `font-size:12px;font-weight:600;color:${T.accent};`;
		countLabel.textContent = `${selectedTaskIds.size} selected`;

		// Status change
		const statusSelect = append(bulkBar, $('select'));
		statusSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const statusDef = append(statusSelect, $('option'));
		statusDef.textContent = 'Set status...';
		(statusDef as HTMLOptionElement).value = '';
		for (const s of TASK_STATUSES) {
			const opt = append(statusSelect, $('option'));
			opt.textContent = TASK_STATUS_LABELS[s] || s;
			(opt as HTMLOptionElement).value = s;
		}
		statusSelect.addEventListener('change', () => {
			const newStatus = (statusSelect as HTMLSelectElement).value;
			if (!newStatus) { return; }
			for (const id of selectedTaskIds) { moveTask(id, newStatus); }
			selectedTaskIds.clear();
			updateBulkBar();
			rebuildBoard();
		});

		// Assignee change
		const assigneeSelect = append(bulkBar, $('select'));
		assigneeSelect.style.cssText = `font-size:11px;padding:3px 6px;border-radius:${T.radiusSm};background:${T.surface};border:1px solid ${T.border};color:${T.textMuted};cursor:pointer;outline:none;`;
		const assigneeDef = append(assigneeSelect, $('option'));
		assigneeDef.textContent = 'Set assignee...';
		(assigneeDef as HTMLOptionElement).value = '';
		for (const m of members) {
			const opt = append(assigneeSelect, $('option'));
			opt.textContent = m.name;
			(opt as HTMLOptionElement).value = m.initials + '|' + m.color;
		}
		assigneeSelect.addEventListener('change', () => {
			const val = (assigneeSelect as HTMLSelectElement).value;
			if (!val) { return; }
			const [initials, color] = val.split('|');
			for (const id of selectedTaskIds) {
				const task = findTask(id);
				if (task) { task.initials = initials; task.color = color; }
			}
			selectedTaskIds.clear();
			updateBulkBar();
			rebuildBoard();
		});

		// Cancel
		const cancelBtn = append(bulkBar, $('span'));
		cancelBtn.style.cssText = `font-size:11px;padding:3px 10px;border-radius:${T.radiusSm};cursor:pointer;color:${T.textFaint};margin-left:auto;transition:color 0.12s;`;
		cancelBtn.textContent = 'Cancel';
		cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.color = T.text; });
		cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.color = T.textFaint; });
		cancelBtn.addEventListener('click', () => {
			selectedTaskIds.clear();
			updateBulkBar();
			rebuildBoard();
		});
	}
}
