/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { postMessage, onMessage } from '../shared/vscode-api.js';
import '../shared/theme.css';
import './mcp-log.css';

function LogEntry({ entry, isNew }) {
	return (
		<div class={`mcp-entry ${isNew ? 'mcp-entry--new' : ''}`}>
			<div class="mcp-entry__header">
				<span class="mcp-entry__time">{entry.timestamp}</span>
				<span class="mcp-entry__agent" style={{ background: entry.agentColor || '#666' }}>{entry.agent}</span>
				<span class="mcp-entry__tool">{entry.tool}</span>
			</div>
			<div class="mcp-entry__body">
				{entry.params && <div class="mcp-entry__params">{entry.params}</div>}
				<div class="mcp-entry__result">{entry.result}</div>
			</div>
		</div>
	);
}

function McpLog() {
	const [entries, setEntries] = useState([]);
	const [simulating, setSimulating] = useState(false);

	useEffect(() => {
		onMessage((msg) => {
			if (msg.command === 'init') {
				setEntries(msg.data.entries);
			} else if (msg.command === 'newEntry') {
				setEntries(prev => [...prev, { ...msg.data, _new: true }]);
			}
		});
		postMessage('ready');
	}, []);

	function simulateCall() {
		setSimulating(true);
		const fakeEntries = [
			{ agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.tasks.get', params: '{ id: "PRE-5" }', result: 'Returned task PRE-5: Create sidebar tree views (In Progress)', timestamp: new Date().toTimeString().slice(0, 8) },
			{ agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.docs.getStructured', params: '{ id: "doc-prd-v1" }', result: 'Returned PRD: Core Task Management (7 requirements, 3 user stories)', timestamp: new Date().toTimeString().slice(0, 8) },
			{ agent: 'Claude Code', agentColor: '#a855f7', tool: 'prendgame.tasks.transition', params: '{ id: "PRE-5", status: "in_review" }', result: 'Task PRE-5 moved to In Review', timestamp: new Date().toTimeString().slice(0, 8) },
		];

		let i = 0;
		const interval = setInterval(() => {
			if (i >= fakeEntries.length) {
				clearInterval(interval);
				setSimulating(false);
				return;
			}
			setEntries(prev => [...prev, { ...fakeEntries[i], _new: true }]);
			i++;
		}, 1200);
	}

	return (
		<div class="mcp">
			<div class="mcp-header">
				<div>
					<h1 class="mcp-title">MCP Activity Log</h1>
					<p class="mcp-subtitle">External AI agent interactions with PRendgame data</p>
				</div>
				<button class="pg-btn pg-btn--primary" onClick={simulateCall} disabled={simulating}>
					{simulating ? 'Simulating...' : 'Simulate Agent Call'}
				</button>
			</div>

			<div class="mcp-info">
				PRendgame does <strong>not</strong> include a built-in AI agent. This log shows tool calls from
				<strong> external agents</strong> (Claude Code, Copilot, Gemini, Codex) that connect via MCP.
			</div>

			<div class="mcp-status">
				<span class="mcp-status__dot" />
				MCP server running — {entries.length} tool calls recorded
			</div>

			<div class="mcp-entries">
				{entries.map((e, i) => <LogEntry key={i} entry={e} isNew={e._new} />)}
			</div>

			<div class="mcp-config">
				<h3 class="mcp-config__title">Agent Configuration</h3>
				<pre class="mcp-config__code">{
						'{\n' +
						'\t"mcpServers": {\n' +
						'\t\t"prendgame": {\n' +
						'\t\t\t"command": "prendgame",\n' +
						'\t\t\t"args": ["--mcp-server"],\n' +
						'\t\t\t"description": "PRendgame project context"\n' +
						'\t\t}\n' +
						'\t}\n' +
						'}'
					}</pre>
				<h3 class="mcp-config__title" style={{ marginTop: 12 }}>Available Tools</h3>
				<pre class="mcp-config__code">{
						'prendgame.org.getContext        — Get org tech stack, standards\n' +
						'prendgame.org.getAIInstructions — Get AI agent instructions\n' +
						'prendgame.docs.getStructured    — Get document with sections\n' +
						'prendgame.tasks.list            — List tasks with filters\n' +
						'prendgame.tasks.get             — Get task by ID\n' +
						'prendgame.tasks.create          — Create a task\n' +
						'prendgame.tasks.transition      — Change task status\n' +
						'prendgame.links.get             — Get linked items'
					}</pre>
			</div>
		</div>
	);
}

render(<McpLog />, document.getElementById('root'));
