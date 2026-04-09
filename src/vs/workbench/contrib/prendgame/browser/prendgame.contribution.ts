/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { PRendgameBoardPane } from './prendgameBoardPane.js';

// --- PRendgame View Container Registration ---

const PRENDGAME_CONTAINER_ID = 'workbench.view.prendgame';
const PRENDGAME_BOARD_VIEW_ID = 'workbench.view.prendgame.board';

const prendgameIcon = registerIcon('prendgame-view-icon', Codicon.project, localize2('prendgameViewIcon', 'View icon of the PRendgame panel.'));

const prendgameViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: PRENDGAME_CONTAINER_ID,
	title: localize2('prendgame.viewContainer.label', "PRendgame"),
	icon: prendgameIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [PRENDGAME_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: PRENDGAME_CONTAINER_ID,
	hideIfEmpty: false,
	order: 10,
}, ViewContainerLocation.AuxiliaryBar, { isDefault: false });

// --- Board View ---

const boardViewDescriptor: IViewDescriptor = {
	id: PRENDGAME_BOARD_VIEW_ID,
	containerIcon: prendgameViewContainer.icon,
	containerTitle: prendgameViewContainer.title.value,
	singleViewPaneContainerTitle: localize2('prendgame.board', "PRendgame Board"),
	name: localize2('prendgame.board.name', "Board"),
	canToggleVisibility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(PRendgameBoardPane),
};

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([boardViewDescriptor], prendgameViewContainer);
