const fs = require('fs');
const path = require('path');

const THREATS_PATH = path.join(__dirname, '..', '..', 'threat-db', 'threats.json');

function loadThreats() {
  try {
    return JSON.parse(fs.readFileSync(THREATS_PATH, 'utf8'));
  } catch (err) {
    console.error("Failed to load threats.json:", err.message);
    return { threats: [] };
  }
}

function scanMoveSource(source) {
  const threats = loadThreats().threats;
  const lines = source.split('\n').filter(ln => !ln.trim().startsWith('//') && !ln.trim().startsWith('///'));
  const results = [];

  // Advanced pattern matching with AST-like analysis
  threats.forEach(t => {
    if (t.pattern && t.pattern.function_name) {
      const fname = t.pattern.function_name;
      lines.forEach((ln, idx) => {
        if (ln.includes(fname)) {
          const context = lines.slice(Math.max(0, idx - 5), Math.min(lines.length, idx + 10)).join('\n');
          let missing = [];
          if (t.pattern.missing_checks) {
            t.pattern.missing_checks.forEach(mc => {
              if (mc === 'signer_check' && !context.includes('tx_context::sender') && !context.includes('signer::')) {
                missing.push('signer_check');
              }
              if (mc === 'max_supply_check' && !context.includes('MAX_SUPPLY') && !context.includes('total_supply')) {
                missing.push('max_supply_check');
              }
              if (mc === 'reentrancy_guard' && !context.includes('reentrancy_guard') && !context.includes('ReentrancyGuard')) {
                missing.push('reentrancy_guard');
              }
              if (mc === 'type_verification' && !context.includes('assert!') && !context.includes('dynamic_field::exists_with_type')) {
                missing.push('type_verification');
              }
            });
          }
          if (missing.length > 0) {
            results.push({
              id: t.id,
              severity: t.severity,
              line: idx + 1,
              function: fname,
              snippet: ln.trim(),
              missing_checks: missing,
              recommendation: t.recommendation,
              fix: t.fix,
              exploit_example: t.exploit_example || 'Unknown',
              cve_reference: t.cve_reference || 'None'
            });
          }
        }
      });
    }

    // Advanced call flow analysis
    if (t.pattern && t.pattern.function_calls) {
      const callPattern = t.pattern.function_calls;
      let foundCalls = 0;
      
      callPattern.forEach(call => {
        if (source.includes(call)) {
          foundCalls++;
        }
      });
      
      if (foundCalls >= callPattern.length * 0.7) { // 70% match threshold
        let missingChecks = [];
        if (t.pattern.missing_checks) {
          t.pattern.missing_checks.forEach(check => {
            if (!source.includes(check.replace('_', '')) && !source.includes(check)) {
              missingChecks.push(check);
            }
          });
        }
        
        if (missingChecks.length > 0) {
          results.push({
            id: t.id,
            severity: t.severity,
            line: 'Multiple',
            function: 'Call Pattern',
            snippet: callPattern.join(' + '),
            missing_checks: missingChecks,
            recommendation: t.recommendation,
            fix: t.fix,
            exploit_example: t.exploit_example || 'Unknown',
            cve_reference: t.cve_reference || 'None'
          });
        }
      }
    }
  });

  return results;
}

function performComprehensiveSecurityScan(code) {
  const findings = scanMoveSource(code);
  const criticalIssues = findings.filter(f => f.severity === 'critical').length;
  const highIssues = findings.filter(f => f.severity === 'high').length;
  const mediumIssues = findings.filter(f => f.severity === 'medium').length;
  
  // Advanced security scoring
  const securityScore = Math.max(0, 100 - (criticalIssues * 40) - (highIssues * 20) - (mediumIssues * 10));
  
  return {
    criticalIssues,
    highIssues,
    mediumIssues,
    securityScore,
    findings,
    deployment_ready: criticalIssues === 0 && highIssues <= 1,
    risk_level: criticalIssues > 0 ? 'CRITICAL' : highIssues > 2 ? 'HIGH' : mediumIssues > 3 ? 'MEDIUM' : 'LOW'
  };
}

function analyzeEconomicSecurity(source) {
  const risks = [];
  let riskLevel = 'LOW';
  
  // Check for economic attack vectors
  if (source.includes('flash_') || source.includes('borrow')) {
    risks.push({
      type: 'flash_loan_risk',
      description: 'Potential flash loan manipulation vulnerability',
      severity: 'high'
    });
    riskLevel = 'HIGH';
  }
  
  if (source.includes('price') || source.includes('oracle')) {
    risks.push({
      type: 'oracle_manipulation',
      description: 'Price oracle dependency detected - ensure TWAP protection',
      severity: 'medium'
    });
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }
  
  return { risks, risk_level: riskLevel };
}

function analyzeMEVRisks(source) {
  const mevRisks = [];
  let mevScore = 0;
  
  // Analyze for MEV opportunities
  if (source.includes('swap') || source.includes('exchange')) {
    mevRisks.push({
      type: 'arbitrage_opportunity',
      description: 'DEX interactions may create arbitrage opportunities',
      mitigation: 'Implement slippage protection and MEV-resistant ordering'
    });
    mevScore += 30;
  }
  
  if (source.includes('auction') || source.includes('bid')) {
    mevRisks.push({
      type: 'frontrunning_risk',
      description: 'Auction mechanism vulnerable to frontrunning',
      mitigation: 'Use commit-reveal schemes or time-locks'
    });
    mevScore += 40;
  }
  
  return {
    risks: mevRisks,
    mev_score: mevScore,
    risk_level: mevScore > 50 ? 'HIGH' : mevScore > 20 ? 'MEDIUM' : 'LOW'
  };
}

module.exports = {
  loadThreats,
  scanMoveSource,
  performComprehensiveSecurityScan,
  analyzeEconomicSecurity,
  analyzeMEVRisks
};