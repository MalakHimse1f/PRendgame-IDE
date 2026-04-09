/*---------------------------------------------------------------------------------------------
 *  Copyright (c) PRendgame. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
module.exports = function mcpLogHTML(mcpLogData) {
	const entries = mcpLogData.entries;

	function agentBadge(agent) {
		const colors = {
			'Claude Code': '#d97706',
			'GitHub Copilot': '#6366f1',
			'Gemini Code Assist': '#06b6d4',
			'OpenAI Codex': '#10b981'
		};
		return `<span class="agent-badge" style="background:${colors[agent] || '#666'}">${agent}</span>`;
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
:root {
	--bg: var(--vscode-editor-background, #1e1e1e);
	--fg: var(--vscode-editor-foreground, #cccccc);
	--border: var(--vscode-panel-border, #333);
	--card-bg: var(--vscode-editorWidget-background, #252526);
	--accent: var(--vscode-focusBorder, #007acc);
	--muted: var(--vscode-descriptionForeground, #888);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--vscode-font-family, system-ui); color: var(--fg); background: var(--bg); padding: 16px; }

.log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.log-title { font-size: 16px; font-weight: 600; }
.log-subtitle { font-size: 12px; color: var(--muted); }

.log-info { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; line-height: 1.6; }
.log-info code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; }

.log-entry { border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; overflow: hidden; }
.log-entry-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--card-bg); font-size: 12px; }
.log-timestamp { font-family: monospace; color: var(--muted); font-size: 11px; }
.agent-badge { padding: 2px 8px; border-radius: 3px; font-size: 10px; color: #fff; font-weight: 500; }
.log-tool { font-family: monospace; color: var(--accent); }
.log-duration { margin-left: auto; font-size: 11px; color: var(--muted); }
.log-entry-body { padding: 8px 12px; font-size: 12px; }
.log-params { font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; margin-bottom: 6px; }
.log-result { color: #86efac; font-size: 12px; }

.log-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 6px; margin-bottom: 16px; font-size: 12px; }
.status-dot-lg { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }

.config-section { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-top: 20px; }
.config-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.config-code { font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; white-space: pre; overflow-x: auto; line-height: 1.6; }
</style>
</head>
<body>
	<div class="log-header">
		<div>
			<div class="log-title">MCP Activity Log</div>
			<div class="log-subtitle">External AI agent interactions with PRendgame data</div>
		</div>
	</div>

	<div class="log-status">
		<span class="status-dot-lg"></span>
		MCP server running on localhost:3100 — ${entries.length} tool calls recorded
	</div>

	<div class="log-info">
		PRendgame does <strong>not</strong> include a built-in AI agent. This log shows tool calls from
		<strong>external agents</strong> (Claude Code, Copilot, Gemini, Codex, etc.) that connect via MCP.
		Configure your agent to use the PRendgame MCP server at <code>localhost:3100</code>.
	</div>

	${entries.map(e => `
	<div class="log-entry">
		<div class="log-entry-header">
			<span class="log-timestamp">${e.timestamp.slice(11, 19)}</span>
			${agentBadge(e.agent)}
			<span class="log-tool">${e.tool}</span>
			<span class="log-duration">${e.duration}</span>
		</div>
		<div class="log-entry-body">
			<div class="log-params">${JSON.stringify(e.params)}</div>
			<div class="log-result">-> ${e.result}</div>
		</div>
	</div>
	`).join('')}

	<div class="config-section">
		<div class="config-title">Agent Configuration</div>
		<div class="config-code">{
	"mcpServers": {
		"prendgame": {
			"command": "prendgame",
			"args": ["--mcp-server"],
			"description": "PRendgame project context"
		}
	}
}</div>
	</div>
</body>
</html>`;
};
