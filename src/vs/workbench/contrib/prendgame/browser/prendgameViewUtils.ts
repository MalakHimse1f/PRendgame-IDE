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
