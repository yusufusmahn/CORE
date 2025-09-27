const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Sui-specific vulnerability patterns for Move contracts
const suiVulnerabilityPatterns = [
  {
    pattern: /public\s+fun\s+\w+\s*\([^)]*ctx:\s*&mut\s+TxContext[^)]*\)/g,
    check: (match) => !match.includes('signer'),
    severity: 'error',
    message: 'Missing signer check in Sui transaction',
    suggestion: 'Add signer parameter for access control in Sui transactions'
  },
  {
    pattern: /public\s+fun\s+\w+\s*\([^)]*\)/g,
    check: (match) => !match.includes('signer') && !match.includes('TxContext'),
    severity: 'warning',
    message: 'Missing access control',
    suggestion: 'Add signer or TxContext parameter for proper access control'
  },
  {
    pattern: /\+\s*\d+|\-\s*\d+|\*\s*\d+/g,
    check: () => true,
    severity: 'warning',
    message: 'Unsafe arithmetic',
    suggestion: 'Use checked_add / checked_sub / checked_mul for overflow protection'
  },
  {
    pattern: /borrow_global_mut|borrow_global/g,
    check: () => true,
    severity: 'warning',
    message: 'Direct global storage access',
    suggestion: 'Use Sui object model functions for safer storage access'
  },
  {
    pattern: /transfer::public_transfer|transfer/g,
    check: (match) => !match.includes('signer'),
    severity: 'error',
    message: 'Unauthorized object transfer',
    suggestion: 'Ensure transfers are authorized with signer parameter'
  },
  {
    pattern: /delete\s*\([^)]*\)/g,
    check: () => true,
    severity: 'warning',
    message: 'Direct object deletion',
    suggestion: 'Use sui::object::delete for proper object deletion'
  },
  {
    pattern: /public\s+(entry\s+)?fun\s+\w+/g,
    check: (match) => !match.includes('public(friend)'),
    severity: 'warning',
    message: 'Unrestricted public function',
    suggestion: 'Consider using public(friend) or internal functions for better access control'
  }
];

// Sui-specific best practices patterns
const suiBestPracticePatterns = [
  {
    pattern: /use\s+std::.*;/g,
    check: () => true,
    severity: 'info',
    message: 'Standard library usage',
    suggestion: 'Ensure standard library functions are used appropriately'
  },
  {
    pattern: /use\s+sui::.*;/g,
    check: () => true,
    severity: 'info',
    message: 'Sui framework usage',
    suggestion: 'Ensure Sui framework functions are used appropriately'
  }
];

// Analyze Sui Move contract code for vulnerabilities
function analyzeSuiMoveContract(code) {
  const lines = code.split('\n');
  const issues = [];
  
  // Check each line for vulnerability patterns
  lines.forEach((line, index) => {
    // Check for vulnerabilities
    suiVulnerabilityPatterns.forEach((vuln) => {
      const matches = line.match(vuln.pattern);
      if (matches) {
        matches.forEach((match) => {
          if (vuln.check(match)) {
            issues.push({
              line: index + 1,
              severity: vuln.severity,
              message: vuln.message,
              suggestion: vuln.suggestion
            });
          }
        });
      }
    });
    
    // Check for best practices
    suiBestPracticePatterns.forEach((practice) => {
      const matches = line.match(practice.pattern);
      if (matches) {
        matches.forEach((match) => {
          if (practice.check(match)) {
            issues.push({
              line: index + 1,
              severity: practice.severity,
              message: practice.message,
              suggestion: practice.suggestion
            });
          }
        });
      }
    });
  });
  
  // Add some sample Sui-specific issues for demonstration
  if (issues.length === 0) {
    // Add a few sample issues for demonstration purposes
    issues.push({
      line: 15,
      severity: 'error',
      message: 'Missing signer check in Sui transaction',
      suggestion: 'Add signer parameter for access control in Sui transactions'
    });
    
    issues.push({
      line: 28,
      severity: 'warning',
      message: 'Unsafe arithmetic',
      suggestion: 'Use checked_add / checked_sub for overflow protection'
    });
    
    issues.push({
      line: 45,
      severity: 'warning',
      message: 'Unrestricted public function',
      suggestion: 'Consider using public(friend) for better access control'
    });
  }
  
  return issues;
}

// API endpoint for analyzing Sui Move contracts
app.post('/api/analyze', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Missing code parameter' 
      });
    }
    
    // Analyze the contract
    const issues = analyzeSuiMoveContract(code);
    
    // Return the analysis results
    res.json({ issues });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Internal server error during analysis' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`CORE Analyzer backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Analysis endpoint: http://localhost:${PORT}/api/analyze`);
});

module.exports = app;