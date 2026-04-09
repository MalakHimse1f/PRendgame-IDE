/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Singleton vscode API handle
const vscode = acquireVsCodeApi();

export function postMessage(command, data) {
	vscode.postMessage({ command, ...data });
}

export function onMessage(handler) {
	window.addEventListener('message', (e) => handler(e.data));
}

export function getState() {
	return vscode.getState() || {};
}

export function setState(state) {
	vscode.setState(state);
}
