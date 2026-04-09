/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// -- Shared view utilities ----------------------------------------------------
// Generic grouping and sorting for both task and document views.

export interface IViewGroup<T> {
	key: string;
	name: string;
	items: T[];
	color?: string;
}

/**
 * Group items by a string field. Returns groups in the order defined by
 * `orderedKeys` (if provided), or in first-seen order otherwise.
 * Items whose field value is not in `orderedKeys` are appended at the end.
 */
export function groupItemsBy<T>(
	items: T[],
	field: keyof T,
	labels: Record<string, string>,
	colors?: Record<string, string>,
	orderedKeys?: string[],
): IViewGroup<T>[] {
	const map = new Map<string, T[]>();

	for (const item of items) {
		const key = String(item[field] || '');
		let arr = map.get(key);
		if (!arr) { arr = []; map.set(key, arr); }
		arr.push(item);
	}

	const keys = orderedKeys
		? [...orderedKeys, ...Array.from(map.keys()).filter(k => !orderedKeys.includes(k))]
		: Array.from(map.keys());

	return keys
		.filter(k => map.has(k))
		.map(k => ({
			key: k,
			name: labels[k] || k,
			items: map.get(k) || [],
			color: colors ? colors[k] : undefined,
		}));
}

/**
 * Sort items by a string field. Returns a new sorted array.
 */
// -- Shared collapsible group renderer ----------------------------------------

export interface IGroupRenderOptions<T> {
	container: HTMLElement;
	group: IViewGroup<T>;
	collapsed: boolean;
	theme: { surfaceHover: string; textFaint: string; textMuted: string; border: string; borderSubtle: string; radiusPill: string; radiusSm: string; accent: string; accentMuted: string };
	renderItem: (parent: HTMLElement, item: T) => void;
	dropConfig?: {
		onDrop: (groupKey: string) => void;
		showDropZone: boolean;
	};
}

export interface IGroupRenderResult {
	twistie: HTMLElement;
	badge: HTMLElement;
	cards: HTMLElement;
	dropZone?: HTMLElement;
}

/**
 * Renders a collapsible group section: header (twistie + color + label + badge),
 * optional drop zone, item container, and separator. Both task and doc views
 * use this so the UI pattern is identical.
 */
export function renderCollapsibleGroup<T>(opts: IGroupRenderOptions<T>): IGroupRenderResult {
	const { container, group, collapsed, theme: t, renderItem, dropConfig } = opts;

	// Use VS Code dom utilities via the passed container's ownerDocument
	const doc = container.ownerDocument;
	function el(tag: string): HTMLElement { return doc.createElement(tag); }
	function ap(parent: HTMLElement, child: HTMLElement): HTMLElement { parent.appendChild(child); return child; }

	// Header
	const hdr = ap(container, el('div'));
	hdr.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 20px;cursor:pointer;user-select:none;transition:background 0.1s;`;
	hdr.addEventListener('mouseenter', () => { hdr.style.background = t.surfaceHover; });
	hdr.addEventListener('mouseleave', () => { hdr.style.background = ''; });

	// Twistie
	const twistie = ap(hdr, el('span'));
	twistie.style.cssText = `width:16px;font-size:10px;text-align:center;color:${t.textFaint};transition:transform 0.15s ease;`;
	twistie.textContent = '\u25B6';
	if (!collapsed) { twistie.style.transform = 'rotate(90deg)'; }

	// Color indicator
	const colorSquare = ap(hdr, el('span'));
	const sc = group.color || '#52525b';
	colorSquare.style.cssText = `width:8px;height:8px;border-radius:2px;background:${sc};flex-shrink:0;`;

	// Label
	const label = ap(hdr, el('span'));
	label.style.cssText = `font-size:12px;font-weight:600;color:${t.textMuted};text-transform:uppercase;letter-spacing:0.06em;`;
	label.textContent = group.name;

	// Count badge
	const badge = ap(hdr, el('span'));
	badge.style.cssText = `font-size:10px;background:${t.border};color:${t.textMuted};padding:1px 7px;border-radius:${t.radiusPill};margin-left:auto;min-width:20px;text-align:center;font-weight:500;`;
	badge.textContent = String(group.items.length);

	// Drop zone (optional)
	let dropZone: HTMLElement | undefined;
	if (dropConfig && dropConfig.showDropZone) {
		dropZone = ap(container, el('div'));
		dropZone.style.cssText = `height:0;transition:height 0.2s ease,opacity 0.2s;overflow:hidden;opacity:0;`;
		dropZone.addEventListener('dragover', (e) => {
			e.preventDefault();
			if ((e as DragEvent).dataTransfer) { (e as DragEvent).dataTransfer!.dropEffect = 'move'; }
			dropZone!.style.background = `${t.accent}30`;
		});
		dropZone.addEventListener('dragleave', () => { dropZone!.style.background = t.accentMuted; });
		dropZone.addEventListener('drop', (e) => {
			e.preventDefault();
			dropConfig.onDrop(group.key);
		});
	}

	// Cards container
	const cards = ap(container, el('div'));
	cards.style.cssText = 'padding:2px 0;';
	if (collapsed) { cards.style.display = 'none'; }

	// Separator
	const sep = ap(container, el('div'));
	sep.style.cssText = `height:1px;background:${t.borderSubtle};margin:0 20px;`;

	// Toggle collapse
	hdr.addEventListener('click', () => {
		const wasHidden = cards.style.display === 'none';
		cards.style.display = wasHidden ? '' : 'none';
		twistie.style.transform = wasHidden ? 'rotate(90deg)' : 'rotate(0deg)';
	});

	// Render items
	for (const item of group.items) {
		renderItem(cards, item);
	}

	return { twistie, badge, cards, dropZone };
}

export function sortItems<T>(items: T[], field: keyof T, ascending: boolean = true): T[] {
	const sorted = [...items];
	sorted.sort((a, b) => {
		const va = String(a[field] || '').toLowerCase();
		const vb = String(b[field] || '').toLowerCase();
		const cmp = va < vb ? -1 : va > vb ? 1 : 0;
		return ascending ? cmp : -cmp;
	});
	return sorted;
}
