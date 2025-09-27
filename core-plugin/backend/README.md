# CORE Analyzer Backend

This is the backend API for the CORE Analyzer VS Code extension. It provides static analysis capabilities for Move smart contracts, with special support for Sui Move contracts.

## Features

- Static analysis of Move smart contracts
- Sui-specific vulnerability detection
- RESTful API for integration with the VS Code extension
- Pattern matching for common security issues
- Best practices recommendations

## Sui Integration

The backend includes specialized analysis for Sui Move contracts:

1. **Sui Object Model**: Detection of improper object handling
2. **Access Control**: Identification of missing signer checks
3. **Transfer Security**: Validation of object transfers
4. **Framework Usage**: Best practices for Sui framework functions
5. **Transaction Context**: Proper use of TxContext

## API Endpoints

### POST /api/analyze
Analyzes Move contract code for vulnerabilities.

**Request Body:**
```json
{
  "code": "string with contract code"
}
```

**Response:**
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

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-26T10:00:00.000Z",
  "version": "1.0.0"
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. For development with auto-reload:
  bash
   npm run dev
   ```

## Vulnerability Detection

The analyzer detects common vulnerabilities in Move contracts:

- Missing signer checks
- Unsafe arithmetic operations
- Unrestricted public functions
- Direct global storage access
- Unauthorized object transfers
- Improper object deletion

## Sui-Specific Patterns

The analyzer recognizes Sui-specific patterns:

- Proper use of TxContext
- Sui object model compliance
- Transfer function security
- Framework function usage
- Entry function patterns

## Extending the Analyzer

To add new vulnerability patterns:

1. Add new patterns to the `suiVulnerabilityPatterns` array
2. Define the pattern regex, severity, message, and suggestion
3. Implement custom check functions if needed

## License

MIT