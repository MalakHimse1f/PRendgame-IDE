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
import { renderBoardContent } from './prendgameBoardPane.js';
import { renderDocsContent } from './prendgameDocsPane.js';
import { T } from './prendgameTheme.js';
import { getGroups, getDocs, getMembers, getOrgContext, updateOrgContext, getMcpLog, findTask, findTaskGroup, onTaskChanged, onDocChanged, PRIORITY_COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS, DOC_TYPE_COLORS, DOC_TYPE_LABELS, DOC_STATUS_COLORS, DOC_STATUS_LABELS } from './prendgameData.js';

export class PRendgameMainPane extends ViewPane {

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

		// -- Global search ----------------------------------------------------
		const searchWrap = append(root, $('div'));
		searchWrap.style.cssText = `padding:8px 14px;border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:8px;`;

		const searchInput = append(searchWrap, $('input'));
		(searchInput as HTMLInputElement).type = 'text';
		(searchInput as HTMLInputElement).placeholder = 'Search tasks, docs, people\u2026';
		searchInput.style.cssText = `flex:1;background:${T.surface};border:1px solid ${T.border};color:${T.text};padding:6px 10px;border-radius:${T.radius};font-size:12px;font-family:inherit;outline:none;transition:border-color 0.15s;`;
		searchInput.addEventListener('focus', () => { searchInput.style.borderColor = T.accent; });
		searchInput.addEventListener('blur', () => { searchInput.style.borderColor = T.border; });

		// Bell icon
		let unreadCount = 5;
		const bellWrap = append(searchWrap, $('div'));
		bellWrap.style.cssText = 'position:relative;cursor:pointer;flex-shrink:0;';
		const bellIcon = append(bellWrap, $('span'));
		bellIcon.style.cssText = `font-size:16px;color:${T.textMuted};transition:color 0.12s;`;
		bellIcon.textContent = '\u{1F514}';
		const bellBadge = append(bellWrap, $('span'));
		bellBadge.style.cssText = `position:absolute;top:-4px;right:-6px;font-size:9px;font-weight:600;background:#ef4444;color:#fff;padding:1px 4px;border-radius:8px;min-width:14px;text-align:center;`;
		bellBadge.textContent = String(unreadCount);
		function updateBellBadge() {
			bellBadge.textContent = String(unreadCount);
			bellBadge.style.display = unreadCount > 0 ? '' : 'none';
		}

		bellWrap.addEventListener('mouseenter', () => { bellIcon.style.color = T.text; });
		bellWrap.addEventListener('mouseleave', () => { bellIcon.style.color = T.textMuted; });

		// Search results + notification feed containers
		const searchResultsContainer = append(root, $('div'));
		searchResultsContainer.style.display = 'none';
		const notifContainer = append(root, $('div'));
		notifContainer.style.display = 'none';
		// Workspace content container (holds switcher + content)
		const workspaceWrap = append(root, $('div'));

		let showingSearch = false;
		let showingNotifs = false;

		function showWorkspace() {
			searchResultsContainer.style.display = 'none';
			notifContainer.style.display = 'none';
			workspaceWrap.style.display = '';
			showingSearch = false;
			showingNotifs = false;
		}

		// -- Search logic -----------------------------------------------------
		searchInput.addEventListener('input', () => {
			const q = (searchInput as HTMLInputElement).value.trim().toLowerCase();
			if (!q) { showWorkspace(); return; }
			showingSearch = true;
			showingNotifs = false;
			searchResultsContainer.style.display = '';
			notifContainer.style.display = 'none';
			workspaceWrap.style.display = 'none';
			renderSearchResults(q);
		});

		searchInput.addEventListener('keydown', (e) => {
			if ((e as KeyboardEvent).key === 'Escape') {
				(searchInput as HTMLInputElement).value = '';
				showWorkspace();
			}
		});

		function renderSearchResults(q: string) {
			searchResultsContainer.textContent = '';

			// Search tasks
			const allTasks: Array<{ id: string; title: string; priority: string; initials: string; color: string }> = [];
			for (const g of getGroups()) { for (const t of g.tasks) { allTasks.push(t); } }
			const matchedTasks = allTasks.filter(t => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));

			// Search docs
			const matchedDocs = getDocs().filter(d => d.id.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));

			// Search people
			const matchedPeople = getMembers().filter(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));

			if (matchedTasks.length === 0 && matchedDocs.length === 0 && matchedPeople.length === 0) {
				const empty = append(searchResultsContainer, $('div'));
				empty.style.cssText = `padding:20px;text-align:center;font-size:12px;color:${T.textFaint};`;
				empty.textContent = `No results for "${q}"`;
				return;
			}

			function renderGroup(label: string, count: number) {
				const hdr = append(searchResultsContainer, $('div'));
				hdr.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;padding:10px 20px 4px;`;
				hdr.textContent = `${label} (${count})`;
			}

			if (matchedTasks.length > 0) {
				renderGroup('Tasks', matchedTasks.length);
				for (const t of matchedTasks.slice(0, 8)) {
					const row = append(searchResultsContainer, $('div'));
					row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px;cursor:pointer;transition:background 0.1s;`;
					row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
					row.addEventListener('mouseleave', () => { row.style.background = ''; });
					row.addEventListener('click', () => { (searchInput as HTMLInputElement).value = ''; showWorkspace(); switchTo('engineering'); });

					const pb = append(row, $('span'));
					pb.style.cssText = `width:3px;height:14px;border-radius:1px;background:${PRIORITY_COLORS[t.priority] || '#52525b'};flex-shrink:0;`;
					const tid = append(row, $('span'));
					tid.style.cssText = `font-size:10px;color:${T.textFaint};font-family:var(--monaco-monospace-font);`;
					tid.textContent = t.id;
					const ttl = append(row, $('span'));
					ttl.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
					ttl.textContent = t.title;
					const gid = findTaskGroup(t.id);
					const sc = TASK_STATUS_COLORS[gid] || '#666';
					const sp = append(row, $('span'));
					sp.style.cssText = `font-size:9px;padding:1px 5px;border-radius:${T.radiusPill};background:${sc}20;color:${sc};`;
					sp.textContent = TASK_STATUS_LABELS[gid] || gid;
				}
			}

			if (matchedDocs.length > 0) {
				renderGroup('Documents', matchedDocs.length);
				for (const d of matchedDocs.slice(0, 8)) {
					const row = append(searchResultsContainer, $('div'));
					row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px;cursor:pointer;transition:background 0.1s;`;
					row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
					row.addEventListener('mouseleave', () => { row.style.background = ''; });
					row.addEventListener('click', () => { (searchInput as HTMLInputElement).value = ''; showWorkspace(); switchTo('product'); });

					const tc = DOC_TYPE_COLORS[d.type] || '#666';
					const badge = append(row, $('span'));
					badge.style.cssText = `font-size:8px;font-weight:600;padding:1px 5px;border-radius:2px;background:${tc}20;color:${tc};text-transform:uppercase;`;
					badge.textContent = DOC_TYPE_LABELS[d.type] || d.type;
					const ttl = append(row, $('span'));
					ttl.style.cssText = `font-size:12px;color:${T.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
					ttl.textContent = d.title;
					const dsc = DOC_STATUS_COLORS[d.status] || '#666';
					const sp = append(row, $('span'));
					sp.style.cssText = `font-size:9px;padding:1px 5px;border-radius:${T.radiusPill};background:${dsc}20;color:${dsc};`;
					sp.textContent = DOC_STATUS_LABELS[d.status] || d.status;
				}
			}

			if (matchedPeople.length > 0) {
				renderGroup('People', matchedPeople.length);
				for (const m of matchedPeople) {
					const row = append(searchResultsContainer, $('div'));
					row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 20px;`;
					const av = append(row, $('span'));
					av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;background:${m.color};flex-shrink:0;`;
					av.textContent = m.initials;
					const nm = append(row, $('span'));
					nm.style.cssText = `font-size:12px;color:${T.text};flex:1;`;
					nm.textContent = m.name;
					const rl = append(row, $('span'));
					rl.style.cssText = `font-size:10px;color:${T.textFaint};`;
					rl.textContent = m.role;
				}
			}
		}

		// -- Notification feed ------------------------------------------------
		const notifications: Array<{ initials: string; color: string; text: string; time: string; unread: boolean; targetType?: 'task' | 'doc'; targetId?: string }> = [
			{ initials: 'AC', color: '#6366f1', text: 'Alex Chen assigned PRE-6 to you', time: '10 min ago', unread: true, targetType: 'task', targetId: 'PRE-6' },
			{ initials: 'TR', color: '#8b5cf6', text: `Taylor Reeves commented on PRE-3: 'Looks good, merging'`, time: '1 hour ago', unread: true, targetType: 'task', targetId: 'PRE-3' },
			{ initials: 'ML', color: '#10b981', text: 'Morgan Liu moved PRE-4 to In Review', time: '2 hours ago', unread: true, targetType: 'task', targetId: 'PRE-4' },
			{ initials: 'AC', color: '#6366f1', text: `Alex Chen set 'Cloud Sync PRD' to Ready for Development`, time: 'Yesterday', unread: true, targetType: 'doc', targetId: 'doc-prd-v4' },
			{ initials: 'AQ', color: '#ec4899', text: `Avery Quinn mentioned you in PRE-16: '@Jordan can you review?'`, time: 'Yesterday', unread: true, targetType: 'task', targetId: 'PRE-16' },
		];

		// Subscribe to live events
		onTaskChanged((e) => {
			const task = findTask(e.taskId);
			if (!task) { return; }
			const label = e.field === 'status' ? `You moved ${e.taskId} to ${TASK_STATUS_LABELS[findTaskGroup(e.taskId)] || 'new status'}` : `You updated ${e.taskId}`;
			notifications.unshift({ initials: 'JP', color: '#06b6d4', text: label, time: 'Just now', unread: true, targetType: 'task', targetId: e.taskId });
			if (!showingNotifs) { unreadCount++; updateBellBadge(); }
			if (showingNotifs) { renderNotifFeed(); }
		});
		onDocChanged((e) => {
			const doc = getDocs().find(d => d.id === e.docId);
			if (!doc) { return; }
			const label = `You updated '${doc.title}'`;
			notifications.unshift({ initials: 'JP', color: '#06b6d4', text: label, time: 'Just now', unread: true, targetType: 'doc', targetId: e.docId });
			if (!showingNotifs) { unreadCount++; updateBellBadge(); }
			if (showingNotifs) { renderNotifFeed(); }
		});

		bellWrap.addEventListener('click', () => {
			if (showingNotifs) { showWorkspace(); return; }
			showingNotifs = true;
			showingSearch = false;
			notifContainer.style.display = '';
			searchResultsContainer.style.display = 'none';
			workspaceWrap.style.display = 'none';
			renderNotifFeed();
		});

		function renderNotifFeed() {
			notifContainer.textContent = '';

			// Header
			const hdr = append(notifContainer, $('div'));
			hdr.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid ${T.border};`;
			const backBtn = append(hdr, $('span'));
			backBtn.style.cssText = `font-size:14px;color:${T.textMuted};cursor:pointer;`;
			backBtn.textContent = '\u2190';
			backBtn.addEventListener('click', () => { showWorkspace(); });
			const hdrTitle = append(hdr, $('span'));
			hdrTitle.style.cssText = `font-size:13px;font-weight:600;color:${T.text};flex:1;`;
			hdrTitle.textContent = 'Notifications';
			const markReadBtn = append(hdr, $('span'));
			markReadBtn.style.cssText = `font-size:10px;color:${T.accent};cursor:pointer;transition:opacity 0.12s;`;
			markReadBtn.textContent = 'Mark all read';
			markReadBtn.addEventListener('click', () => {
				for (const n of notifications) { n.unread = false; }
				unreadCount = 0;
				updateBellBadge();
				renderNotifFeed();
			});

			// Entries
			for (const n of notifications) {
				const row = append(notifContainer, $('div'));
				row.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:10px 20px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid ${T.borderSubtle};${n.unread ? `background:${T.accent}08;` : ''}`;
				row.addEventListener('mouseenter', () => { row.style.background = T.surfaceHover; });
				row.addEventListener('mouseleave', () => { row.style.background = n.unread ? `${T.accent}08` : ''; });
				row.addEventListener('click', () => {
					n.unread = false;
					showWorkspace();
					if (n.targetType === 'task') { switchTo('engineering'); }
					else if (n.targetType === 'doc') { switchTo('product'); }
				});

				if (n.unread) {
					const dot = append(row, $('span'));
					dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${T.accent};flex-shrink:0;margin-top:5px;`;
				}

				const av = append(row, $('span'));
				av.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:8px;font-weight:600;color:#fff;background:${n.color};flex-shrink:0;`;
				av.textContent = n.initials;

				const info = append(row, $('div'));
				info.style.cssText = 'flex:1;min-width:0;';
				const txt = append(info, $('div'));
				txt.style.cssText = `font-size:12px;color:${T.text};line-height:1.4;`;
				txt.textContent = n.text;
				const tm = append(info, $('div'));
				tm.style.cssText = `font-size:10px;color:${T.textFaint};margin-top:2px;`;
				tm.textContent = n.time;
			}
		}

		// -- Workspace switcher ------------------------------------------------
		const switcher = append(workspaceWrap, $('div'));
		switcher.style.cssText = `display:flex;border-bottom:1px solid ${T.border};`;

		const tabs: HTMLElement[] = [];
		const tabNames = ['Engineering', 'Product', 'Settings'];
		const tabBase = `flex:1;text-align:center;padding:10px 0;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.12s;letter-spacing:0.02em;border-bottom:2px solid transparent;`;

		for (const name of tabNames) {
			const tab = append(switcher, $('div'));
			tabs.push(tab);
			tab.style.cssText = `${tabBase}color:${name === 'Engineering' ? T.text : T.textFaint};${name === 'Engineering' ? `border-bottom-color:${T.accent};` : ''}`;
			tab.textContent = name;
		}

		// -- Content areas -----------------------------------------------------
		const engContent = append(workspaceWrap, $('div'));
		const prodContent = append(workspaceWrap, $('div'));
		prodContent.style.display = 'none';
		const settingsContent = append(workspaceWrap, $('div'));
		settingsContent.style.display = 'none';

		const contentAreas = [engContent, prodContent, settingsContent];
		let activeWorkspace = 'engineering';

		function switchTo(workspace: string) {
			activeWorkspace = workspace;
			const idx = workspace === 'engineering' ? 0 : workspace === 'product' ? 1 : 2;
			for (let i = 0; i < tabs.length; i++) {
				const isActive = i === idx;
				tabs[i].style.cssText = `${tabBase}color:${isActive ? T.text : T.textFaint};${isActive ? `border-bottom-color:${T.accent};` : ''}`;
				contentAreas[i].style.display = isActive ? '' : 'none';
			}
			if (workspace === 'settings' && settingsContent.childElementCount === 0) {
				renderSettings();
			}
		}

		for (let i = 0; i < tabs.length; i++) {
			const ws = ['engineering', 'product', 'settings'][i];
			tabs[i].addEventListener('click', () => switchTo(ws));
			tabs[i].addEventListener('mouseenter', () => { if (activeWorkspace !== ws) { tabs[i].style.color = T.textMuted; } });
			tabs[i].addEventListener('mouseleave', () => { if (activeWorkspace !== ws) { tabs[i].style.color = T.textFaint; } });
		}

		// -- Settings content (org context + MCP log) -------------------------
		function renderSettings() {
			settingsContent.textContent = '';

			// MCP disclosure
			const disclosure = append(settingsContent, $('div'));
			disclosure.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 20px;background:${T.accent}08;border-bottom:1px solid ${T.accent}20;font-size:11px;color:${T.accent};`;
			disclosure.textContent = '\u{1F50C} This context is shared with AI agents via MCP';

			// Org context sections
			const ctx = getOrgContext();
			const sections: Array<{ key: keyof typeof ctx; label: string }> = [
				{ key: 'techStack', label: 'Tech Stack' },
				{ key: 'codingStandards', label: 'Coding Standards' },
				{ key: 'cicd', label: 'CI/CD Workflow' },
				{ key: 'testing', label: 'Testing Standards' },
				{ key: 'commenting', label: 'Commenting Practices' },
				{ key: 'aiInstructions', label: 'AI Agent Instructions' },
			];

			for (const sec of sections) {
				const section = append(settingsContent, $('div'));
				section.style.cssText = `border-bottom:1px solid ${T.border};`;

				const hdr = append(section, $('div'));
				hdr.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 20px;cursor:pointer;transition:background 0.1s;`;
				hdr.addEventListener('mouseenter', () => { hdr.style.background = T.surfaceHover; });
				hdr.addEventListener('mouseleave', () => { hdr.style.background = ''; });

				const twistie = append(hdr, $('span'));
				twistie.style.cssText = `font-size:10px;color:${T.textFaint};transition:transform 0.15s;transform:rotate(90deg);`;
				twistie.textContent = '\u25B6';

				const label = append(hdr, $('span'));
				label.style.cssText = `font-size:12px;font-weight:600;color:${T.text};`;
				label.textContent = sec.label;

				const body = append(section, $('div'));
				body.style.cssText = `padding:0 20px 12px 36px;`;

				const content = append(body, $('div'));
				content.style.cssText = `font-size:12px;color:${T.textMuted};line-height:1.6;cursor:text;padding:4px;border-radius:${T.radiusSm};transition:background 0.1s;white-space:pre-wrap;`;
				content.textContent = ctx[sec.key];
				content.addEventListener('mouseenter', () => { content.style.background = T.surfaceHover; });
				content.addEventListener('mouseleave', () => { content.style.background = ''; });
				content.addEventListener('click', () => {
					const textarea = document.createElement('textarea');
					textarea.value = ctx[sec.key];
					textarea.style.cssText = `width:100%;box-sizing:border-box;min-height:80px;background:${T.surface};border:1px solid ${T.accent};color:${T.text};padding:8px;border-radius:${T.radius};font-size:12px;font-family:inherit;line-height:1.6;outline:none;resize:vertical;`;
					content.textContent = '';
					content.appendChild(textarea);
					textarea.focus();
					textarea.addEventListener('blur', () => {
						updateOrgContext(sec.key, textarea.value);
						content.textContent = textarea.value;
					});
				});

				hdr.addEventListener('click', () => {
					const hidden = body.style.display === 'none';
					body.style.display = hidden ? '' : 'none';
					twistie.style.transform = hidden ? 'rotate(90deg)' : 'rotate(0deg)';
				});
			}

			// MCP Activity Log section
			const mcpSection = append(settingsContent, $('div'));
			mcpSection.style.cssText = `padding:14px 20px;`;
			const mcpTitle = append(mcpSection, $('div'));
			mcpTitle.style.cssText = `font-size:11px;font-weight:600;color:${T.textFaint};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;`;
			mcpTitle.textContent = 'MCP Activity Log';

			// Tool definitions
			const toolDefs = append(mcpSection, $('div'));
			toolDefs.style.cssText = `font-size:11px;color:${T.textFaint};margin-bottom:12px;padding:8px;border:1px solid ${T.border};border-radius:${T.radiusSm};font-family:var(--monaco-monospace-font);white-space:pre;overflow-x:auto;`;
			toolDefs.textContent = 'prendgame.org.getContext        \u2014 Get org tech stack, standards\nprendgame.org.getAIInstructions \u2014 Get AI agent instructions\nprendgame.docs.getStructured    \u2014 Get document with sections\nprendgame.tasks.list            \u2014 List tasks with filters\nprendgame.tasks.get             \u2014 Get task by ID\nprendgame.tasks.transition      \u2014 Change task status';

			// Log entries
			const log = getMcpLog();
			for (const entry of log) {
				const row = append(mcpSection, $('div'));
				row.style.cssText = `display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid ${T.borderSubtle};`;

				const ts = append(row, $('span'));
				ts.style.cssText = `font-size:10px;color:${T.textFaint};font-family:var(--monaco-monospace-font);white-space:nowrap;min-width:55px;`;
				ts.textContent = entry.timestamp;

				const agentBadge = append(row, $('span'));
				agentBadge.style.cssText = `font-size:9px;font-weight:600;padding:1px 6px;border-radius:3px;background:${entry.agentColor}20;color:${entry.agentColor};white-space:nowrap;flex-shrink:0;`;
				agentBadge.textContent = entry.agent;

				const info = append(row, $('div'));
				info.style.cssText = 'flex:1;min-width:0;';
				const toolName = append(info, $('div'));
				toolName.style.cssText = `font-size:11px;color:${T.text};font-family:var(--monaco-monospace-font);`;
				toolName.textContent = entry.tool + (entry.params ? ` ${entry.params}` : '');
				const result = append(info, $('div'));
				result.style.cssText = `font-size:10px;color:${T.textFaint};margin-top:2px;`;
				result.textContent = entry.result;
			}
		}

		// -- Render workspace content -----------------------------------------
		renderBoardContent(engContent, this.commandService);
		renderDocsContent(prodContent, this.commandService);
	}
}
