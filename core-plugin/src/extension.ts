import * as vscode from 'vscode';
import { CoreAnalyzer } from './analyzer';
import { CoreAnalysisProvider } from './panel';

let diagnosticCollection: vscode.DiagnosticCollection;
let analysisProvider: CoreAnalysisProvider;

export function activate(context: vscode.ExtensionContext) {
	// Create diagnostic collection for showing errors/warnings in the editor
	diagnosticCollection = vscode.languages.createDiagnosticCollection('core-analyzer');
	context.subscriptions.push(diagnosticCollection);

	// Create the analysis provider for the webview panel
	analysisProvider = new CoreAnalysisProvider(context.extensionUri);

	// Register the command to run CORE analysis
	let disposable = vscode.commands.registerCommand('core-analyzer.runAnalysis', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.languageId === 'move') {
			await runCoreAnalysis(editor.document);
		} else {
			vscode.window.showErrorMessage('Please open a .move file to analyze.');
		}
	});

	// Register the webview view provider for the sidebar panel
	const providerRegistration = vscode.window.registerWebviewViewProvider(
		CoreAnalysisProvider.viewType,
		analysisProvider
	);

	// Register event listener for when active text editor changes
	const changeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor && editor.document.languageId === 'move') {
			runCoreAnalysis(editor.document);
		}
	});

	// Register event listener for when document is saved
	const saveListener = vscode.workspace.onDidSaveTextDocument(document => {
		if (document.languageId === 'move' && vscode.window.activeTextEditor?.document === document) {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				runCoreAnalysis(editor.document);
			}
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(providerRegistration);
	context.subscriptions.push(changeListener);
	context.subscriptions.push(saveListener);

	// Also activate when a .move file is opened
	if (vscode.window.activeTextEditor && 
		vscode.window.activeTextEditor.document.languageId === 'move') {
		runCoreAnalysis(vscode.window.activeTextEditor.document);
	}
}

/**
 * Runs the CORE analysis on the provided document
 * @param document The VS Code text document to analyze
 */
async function runCoreAnalysis(document: vscode.TextDocument) {
	try {
		// Show progress indicator
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Running CORE Analysis",
			cancellable: false
		}, async (progress) => {
			progress.report({ message: "Analyzing Move contract..." });
			
			const analyzer = new CoreAnalyzer();
			const issues = await analyzer.analyzeContract(document.getText());
			
			// Clear previous diagnostics
			diagnosticCollection.clear();
			
			// Show diagnostics in the editor
			showDiagnostics(document.uri, issues);
			
			// Update the panel view with the analysis results
			analysisProvider.updateResults(issues);
			
			if (issues.length > 0) {
				vscode.window.showInformationMessage(`CORE Analysis found ${issues.length} issues.`);
			} else {
				vscode.window.showInformationMessage('CORE Analysis completed with no issues found.');
			}
		});
	} catch (error) {
		vscode.window.showErrorMessage(`CORE Analysis failed: ${error}`);
		console.error('CORE Analysis failed:', error);
	}
}

/**
 * Shows diagnostics (errors/warnings) in the editor
 * @param uri The URI of the document
 * @param issues The issues found by the analyzer
 */
function showDiagnostics(uri: vscode.Uri, issues: any[]) {
    console.log("=== CORE ANALYZER DIAGNOSTICS ===");
    console.log("File:", uri.fsPath);
    console.log("Issues received:", issues);

    const diagnostics: vscode.Diagnostic[] = [];
    
    for (const issue of issues) {
        console.log(`Adding diagnostic at line ${issue.line}: ${issue.message}`);

        const line = issue.line - 1; // VS Code uses 0-based indexing
        const range = new vscode.Range(line, 0, line, 1000);
        
        const diagnostic = new vscode.Diagnostic(
            range,
            `${issue.message}. ${issue.suggestion}`,
            issue.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        );
        
        diagnostic.code = 'core-analyzer';
        diagnostics.push(diagnostic);
    }
    
    diagnosticCollection.set(uri, diagnostics);
}


export function deactivate() {
	// Clean up when the extension is deactivated
	if (diagnosticCollection) {
		diagnosticCollection.clear();
		diagnosticCollection.dispose();
	}
}