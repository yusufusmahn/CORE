import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * Represents an issue found by the CORE analyzer
 */
export interface CoreIssue {
	line: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
	suggestion: string;
}

/**
 * CoreAnalyzer handles communication with the backend API
 * and processes the analysis results
 */
export class CoreAnalyzer {
	private apiUrl: string;

	constructor() {
		// Get API URL from configuration or use default
		const config = vscode.workspace.getConfiguration('coreAnalyzer');
		this.apiUrl = config.get('apiUrl', 'http://localhost:4000/api/analyze');
	}

	/**
	 * Analyzes a Move smart contract by sending it to the backend API
	 * @param code The contract code to analyze
	 * @returns A promise that resolves to an array of issues found
	 */
	async analyzeContract(code: string): Promise<CoreIssue[]> {
		try {
			// Try to call the real API
			const issues = await this.callAnalyzerAPI(code);
			vscode.window.showInformationMessage(`CORE Analysis completed with ${issues.length} issues found.`);
			return issues;
		} catch (error) {
			// If the API is not available, return mock data for demonstration
			vscode.window.showWarningMessage('API not available, using mock data for demonstration.');
			console.warn('API not available, using mock data:', error);
			return this.getMockIssues();
		}
	}

	/**
	 * Calls the backend API to analyze the contract
	 * @param code The contract code to analyze
	 * @returns A promise that resolves to an array of issues found
	 */
	private async callAnalyzerAPI(code: string): Promise<CoreIssue[]> {
		return new Promise((resolve, reject) => {
			const postData = JSON.stringify({ code });

			const url = new URL(this.apiUrl);
			const options = {
				hostname: url.hostname,
				port: url.port,
				path: url.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData)
				}
			};

			// Use https or http based on the URL
			const client = url.protocol === 'https:' ? https : http;

			const req = client.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					try {
						const response = JSON.parse(data);
						resolve(response.issues || []);
					} catch (error) {
						reject(new Error(`Failed to parse API response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				reject(new Error(`API request failed: ${error.message}`));
			});

			req.write(postData);
			req.end();
		});
	}

	/**
	 * Provides mock issues for demonstration when the API is not available
	 * @returns An array of mock issues
	 */
	private getMockIssues(): CoreIssue[] {
		return [
			{ line: 1, message: "TEST", suggestion: "check here", severity: "error" },
			{
				line: 13,
				severity: 'error',
				message: 'Missing signer check in Sui transaction',
				suggestion: 'Add signer parameter for access control in Sui transactions'
			},
			{
				line: 24,
				severity: 'warning',
				message: 'Unsafe arithmetic',
				suggestion: 'Use checked_add / checked_sub for overflow protection'
			},
			{
				line: 28,
				severity: 'warning',
				message: 'Unrestricted public function',
				suggestion: 'Consider using public(friend) for better access control'
			},
			{
				line: 35,
				severity: 'error',
				message: 'Unauthorized object transfer',
				suggestion: 'Ensure transfers are authorized with signer parameter'
			},
			{
				line: 42,
				severity: 'warning',
				message: 'Direct object deletion',
				suggestion: 'Use sui::object::delete for proper object deletion'
			}
		];
	}

}