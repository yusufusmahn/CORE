# Test Files

This directory contains comprehensive tests for the CORE Auto-Scaffold Kit.

## Test Structure

- `security-engine.test.js` - Tests for core security analysis functions
- `api-integration.test.js` - Tests for API endpoints and integration
- `threat-database.test.js` - Tests for threat database validation

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Test Coverage Goals

- 90%+ function coverage
- 80%+ line coverage
- All critical security functions tested
- All API endpoints tested
- Error cases handled
- Real vulnerability patterns verified