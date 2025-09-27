import * as vscode from 'vscode';
import { CoreIssue } from '../analyzer';

/**
 * Provider for the CORE Analysis webview panel in the sidebar
 */
export class CoreAnalysisProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'coreAnalysisView';
	
	private _view?: vscode.WebviewView;
	private _issues: CoreIssue[] = [];
	
	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }
	
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		
		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};
		
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		
		// Listen for messages from the webview
		webviewView.webview.onDidReceiveMessage((data: any) => {
			switch (data.type) {
				case 'issueClicked':
					{
						// Handle when an issue is clicked in the panel
						this._revealIssueInEditor(data.line);
						break;
					}
				case 'refresh':
					{
						// Handle refresh request
						this._refreshAnalysis();
						break;
					}
			}
		});
		
		// Update with any existing results
		this._updateWebview();
	}
	
	/**
	 * Updates the panel with new analysis results
	 * @param issues The issues to display in the panel
	 */
	public updateResults(issues: CoreIssue[]) {
		this._issues = issues;
		this._updateWebview();
	}
	
	/**
	 * Updates the webview content with the current issues
	 */
	private _updateWebview() {
		if (this._view) {
			this._view.webview.html = this._getHtmlForWebview(this._view.webview);
		}
	}
	
	/**
	 * Generates the HTML content for the webview panel
	 * @param webview The webview to generate HTML for
	 * @returns The HTML content as a string
	 */
	private _getHtmlForWebview(webview: vscode.Webview) {
		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		
		// Count issues by severity
		const errorCount = this._issues.filter(issue => issue.severity === 'error').length;
		const warningCount = this._issues.filter(issue => issue.severity === 'warning').length;
		
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>CORE Analysis</title>
				<style>
					.container {
						padding: 10px;
						color: var(--vscode-foreground);
					}
					.header {
						display: flex;
					 justify-content: space-between;
						align-items: center;
						margin-bottom: 15px;
						padding-bottom: 10px;
						border-bottom: 1px solid var(--vscode-panel-border);
					}
					.title {
						font-size: 1.2em;
						font-weight: bold;
					}
					.refresh-btn {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						padding: 5px 10px;
						border-radius: 3px;
						cursor: pointer;
					}
					.refresh-btn:hover {
						background: var(--vscode-button-hoverBackground);
					}
					.stats {
						display: flex;
						margin-bottom: 15px;
						gap: 15px;
					}
					.stat-item {
						display: flex;
						align-items: center;
						gap: 5px;
					}
					.stat-error {
						color: #e51400;
					}
					.stat-warning {
						color: #e9a700;
					}
					.issue {
						padding: 10px;
						margin-bottom: 10px;
						border-radius: 4px;
						cursor: pointer;
						border: 1px solid var(--vscode-panel-border);
					}
					.issue:hover {
						background-color: var(--vscode-list-hoverBackground);
					}
					.issue.error {
						border-left: 3px solid #e51400;
						background-color: rgba(229, 20, 0, 0.1);
					}
					.issue.warning {
						border-left: 3px solid #e9a700;
						background-color: rgba(233, 167, 0, 0.1);
					}
					.issue-header {
						display: flex;
						justify-content: space-between;
						margin-bottom: 5px;
					}
					.issue-line {
						font-weight: bold;
						font-size: 0.9em;
						opacity: 0.7;
					}
					.issue-severity {
						font-weight: bold;
						font-size: 0.8em;
						padding: 2px 6px;
						border-radius: 3px;
					}
					.issue-severity.error {
						background-color: #e51400;
						color: white;
					}
					.issue-severity.warning {
						background-color: #e9a700;
						color: black;
					}
					.issue-message {
						margin: 4px 0;
						font-weight: 500;
					}
					.issue-suggestion {
						font-size: 0.9em;
						opacity: 0.8;
						margin-top: 5px;
						padding-top: 5px;
						border-top: 1px solid var(--vscode-panel-border);
					}
					.no-issues {
						text-align: center;
						opacity: 0.6;
						font-style: italic;
						padding: 20px;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<div class="title">CORE Analysis Results</div>
						<button class="refresh-btn" onclick="refreshAnalysis()">Refresh</button>
					</div>
					
					<div class="stats">
						<div class="stat-item">
							<span class="stat-error">●</span>
							<span>${errorCount} Errors</span>
						</div>
						<div class="stat-item">
							<span class="stat-warning">●</span>
							<span>${warningCount} Warnings</span>
						</div>
						<div class="stat-item">
							<span>Total: ${this._issues.length}</span>
						</div>
					</div>
					
					${this._issues.length > 0 ? 
						this._issues.map(issue => `
							<div class="issue ${issue.severity}" onclick="issueClicked(${issue.line})">
								<div class="issue-header">
									<div class="issue-line">Line ${issue.line}</div>
									<div class="issue-severity ${issue.severity}">${issue.severity.toUpperCase()}</div>
								</div>
								<div class="issue-message">${issue.message}</div>
								<div class="issue-suggestion"><strong>Suggestion:</strong> ${issue.suggestion}</div>
							</div>
						`).join('') : 
						'<div class="no-issues">No issues found. Run analysis on a .move file.</div>'
					}
				</div>
				
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					
					function issueClicked(line) {
						vscode.postMessage({
							type: 'issueClicked',
							line: line
						});
					}
					
					function refreshAnalysis() {
						vscode.postMessage({
							type: 'refresh'
						});
					}
				</script>
			</body>
			</html>`;
	}
	
	/**
	 * Reveals the specified line in the active editor
	 * @param line The line number to reveal
	 */
	private _revealIssueInEditor(line: number) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const position = new vscode.Position(line - 1, 0);
			editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
			editor.selection = new vscode.Selection(position, position);
		}
	}
	
	/**
	 * Refreshes the analysis by triggering it again
	 */
	private _refreshAnalysis() {
		// Send a command to refresh the analysis
		vscode.commands.executeCommand('core-analyzer.runAnalysis');
	}
}

/**
 * Generates a random nonce for Content Security Policy
 * @returns A random nonce string
 */
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}