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

		// -- Workspace switcher ------------------------------------------------
		const switcher = append(root, $('div'));
		switcher.style.cssText = `display:flex;border-bottom:1px solid ${T.border};`;

		const engTab = append(switcher, $('div'));
		const prodTab = append(switcher, $('div'));

		const tabBase = `flex:1;text-align:center;padding:10px 0;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.12s;letter-spacing:0.02em;border-bottom:2px solid transparent;`;

		engTab.style.cssText = `${tabBase}color:${T.text};border-bottom-color:${T.accent};`;
		engTab.textContent = 'Engineering';
		prodTab.style.cssText = `${tabBase}color:${T.textFaint};`;
		prodTab.textContent = 'Product';

		// -- Content areas -----------------------------------------------------
		const engContent = append(root, $('div'));
		const prodContent = append(root, $('div'));
		prodContent.style.display = 'none';

		let activeWorkspace = 'engineering';

		function switchTo(workspace: string) {
			activeWorkspace = workspace;
			if (workspace === 'engineering') {
				engContent.style.display = '';
				prodContent.style.display = 'none';
				engTab.style.cssText = `${tabBase}color:${T.text};border-bottom-color:${T.accent};`;
				prodTab.style.cssText = `${tabBase}color:${T.textFaint};`;
			} else {
				engContent.style.display = 'none';
				prodContent.style.display = '';
				prodTab.style.cssText = `${tabBase}color:${T.text};border-bottom-color:${T.accent};`;
				engTab.style.cssText = `${tabBase}color:${T.textFaint};`;
			}
		}

		engTab.addEventListener('click', () => switchTo('engineering'));
		prodTab.addEventListener('click', () => switchTo('product'));

		// Hover effects
		engTab.addEventListener('mouseenter', () => { if (activeWorkspace !== 'engineering') { engTab.style.color = T.textMuted; } });
		engTab.addEventListener('mouseleave', () => { if (activeWorkspace !== 'engineering') { engTab.style.color = T.textFaint; } });
		prodTab.addEventListener('mouseenter', () => { if (activeWorkspace !== 'product') { prodTab.style.color = T.textMuted; } });
		prodTab.addEventListener('mouseleave', () => { if (activeWorkspace !== 'product') { prodTab.style.color = T.textFaint; } });

		// -- Render workspace content -----------------------------------------
		renderBoardContent(engContent, this.commandService);
		renderDocsContent(prodContent, this.commandService);
	}
}
