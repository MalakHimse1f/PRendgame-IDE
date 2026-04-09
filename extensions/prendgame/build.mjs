/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

const entries = [
	'src/webviews/board/index.jsx',
	'src/webviews/task-detail/index.jsx',
	'src/webviews/document/index.jsx',
	'src/webviews/sprint-dashboard/index.jsx',
	'src/webviews/mcp-log/index.jsx',
];

const config = {
	entryPoints: entries,
	bundle: true,
	outdir: 'dist',
	format: 'iife',
	target: 'es2020',
	minify: !isWatch,
	sourcemap: isWatch,
	jsx: 'automatic',
	jsxImportSource: 'preact',
	loader: { '.jsx': 'jsx' },
	entryNames: '[dir]/[name]',
	// Flatten output: src/webviews/board/index.jsx -> dist/board.js
	outbase: 'src/webviews',
};

if (isWatch) {
	const ctx = await context(config);
	await ctx.watch();
	console.log('Watching for changes...');
} else {
	await build(config);
	console.log('Built all webviews.');
}
