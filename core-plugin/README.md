# CORE Analyzer

A VS Code extension for analyzing Move smart contracts for vulnerabilities, with special support for Sui Move contracts.

## Features

- Analyzes Move smart contracts for security vulnerabilities
- Sui-specific vulnerability detection
- Inline diagnostics with red/yellow squiggly underlines
- Sidebar panel view for detailed issue reporting
- Right-click context menu option for quick analysis
- Automatic analysis when opening or saving .move files
- Progress indicator during analysis
- Issue statistics in the panel view
- Refresh button to re-run analysis
- Clickable issues in panel to navigate to code

## Sui Integration

The CORE Analyzer has specialized support for Sui Move contracts:

1. **Sui Object Model**: Detection of improper object handling
2. **Access Control**: Identification of missing signer checks
3. **Transfer Security**: Validation of object transfers
4. **Framework Usage**: Best practices for Sui framework functions
5. **Transaction Context**: Proper use of TxContext

## Usage

1. **Start the Backend Server** (required for real analysis):
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Install the Extension**:
   - Install the [core-analyzer-0.0.2.vsix](file://c:\Users\DELL\core-plugin\core-analyzer-0.0.2.vsix) file in VS Code
   - Or publish to the marketplace and install from there

3. **Open a `.move` file** in VS Code:
   - The extension will automatically analyze the file when opened
   - Alternatively, use the command palette (`Ctrl+Shift+P`) and run "Run CORE Analysis"
   - Or right-click in the editor and select "Analyze with CORE"

4. **View Results**:
   - View results in the editor (inline diagnostics)
   - View detailed results in the CORE Analysis sidebar panel
   - Click on issues in the panel to navigate to the relevant line in the code
   - Use the Refresh button in the panel to re-run the analysis

## Backend API

The extension communicates with a backend API for real analysis:

### POST /api/analyze
```json
{
  "code": "string with contract code"
}
```

Response:
```json
{
  "issues": [
    {
      "line": 12,
      "severity": "error",
      "message": "Missing signer check",
      "suggestion": "Add signer parameter to function"
    }
  ]
}
```

## Requirements

- VS Code version 1.74.0 or higher
- Node.js for running the backend API
- A running instance of the CORE Analyzer backend API (included in the backend directory)

## Extension Settings

This extension does not contribute any settings.

## Known Issues

- Only supports basic Move contract analysis
- Requires backend API for real analysis (uses mock data when unavailable)

## Release Notes

### 0.0.2

Enhanced release with backend API and Sui integration:
- Added backend API for real Move contract analysis
- Sui-specific vulnerability detection
- Improved panel UI with statistics
- Automatic analysis on file open/save
- Progress indicator during analysis

### 0.0.1

Initial release of CORE Analyzer with enhanced features:
- Automatic analysis on file open/save
- Improved panel UI with statistics
- Progress indicator during analysis
- Refresh functionality