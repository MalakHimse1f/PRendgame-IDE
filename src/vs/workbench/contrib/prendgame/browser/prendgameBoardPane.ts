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
		wrapper.style.padding = '12px';
		wrapper.style.color = 'var(--vscode-editor-foreground)';

		const title = append(wrapper, $('h2'));
		title.textContent = 'PRendgame Board';
		title.style.marginBottom = '8px';

		const subtitle = append(wrapper, $('p'));
		subtitle.textContent = 'If you can see this, the ViewPane works.';
		subtitle.style.opacity = '0.7';
		subtitle.style.marginBottom = '16px';

		// Minimal kanban test
		const board = append(wrapper, $('div'));
		board.style.display = 'flex';
		board.style.gap = '8px';
		board.style.overflowX = 'auto';

		const columns = [
			{ name: 'Backlog', count: 6 },
			{ name: 'To Do', count: 5 },
			{ name: 'In Progress', count: 3 },
			{ name: 'In Review', count: 0 },
			{ name: 'Done', count: 2 },
		];

		for (const col of columns) {
			const colEl = append(board, $('div'));
			colEl.style.minWidth = '160px';
			colEl.style.flex = '1';

			const header = append(colEl, $('div'));
			header.style.fontSize = '11px';
			header.style.textTransform = 'uppercase';
			header.style.opacity = '0.6';
			header.style.marginBottom = '6px';
			header.style.display = 'flex';
			header.style.justifyContent = 'space-between';

			const name = append(header, $('span'));
			name.textContent = col.name;

			const count = append(header, $('span'));
			count.textContent = String(col.count);
			count.style.background = 'var(--vscode-badge-background)';
			count.style.color = 'var(--vscode-badge-foreground)';
			count.style.padding = '0 5px';
			count.style.borderRadius = '8px';
			count.style.fontSize = '10px';

			// Sample cards
			for (let i = 0; i < Math.min(col.count, 3); i++) {
				const card = append(colEl, $('div'));
				card.style.background = 'var(--vscode-editorWidget-background)';
				card.style.border = '1px solid var(--vscode-panel-border)';
				card.style.borderRadius = '4px';
				card.style.padding = '8px';
				card.style.marginBottom = '4px';
				card.style.fontSize = '12px';
				card.style.cursor = 'pointer';
				card.textContent = `PRE-${i + 1}: Sample task in ${col.name}`;
			}
		}
	}
}
