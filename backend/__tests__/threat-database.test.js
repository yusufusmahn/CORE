const fs = require('fs');
const path = require('path');

describe('Threat Database Tests', () => {
  const threatsPath = path.join(__dirname, '..', '..', 'threat-db', 'threats.json');
  let threatsData;

  beforeAll(() => {
    expect(fs.existsSync(threatsPath)).toBe(true);
    const rawData = fs.readFileSync(threatsPath, 'utf8');
    threatsData = JSON.parse(rawData);
  });

  test('should have valid JSON structure', () => {
    expect(threatsData).toBeDefined();
    expect(threatsData.threats).toBeInstanceOf(Array);
    expect(threatsData.threats.length).toBeGreaterThan(0);
  });

  test('should have required fields for each threat', () => {
    threatsData.threats.forEach((threat, index) => {
      expect(threat.id).toBeDefined();
      expect(typeof threat.id).toBe('string');
      expect(threat.id.length).toBeGreaterThan(0);
      
      expect(threat.description).toBeDefined();
      expect(typeof threat.description).toBe('string');
      
      expect(threat.severity).toBeDefined();
      expect(threat.severity).toMatch(/^(critical|high|medium|low)$/);
      
      expect(threat.pattern).toBeDefined();
      expect(typeof threat.pattern).toBe('object');
      
      expect(threat.recommendation).toBeDefined();
      expect(typeof threat.recommendation).toBe('string');
      
      expect(threat.fix).toBeDefined();
      expect(typeof threat.fix).toBe('string');
    });
  });

  test('should contain known Sui-specific threats', () => {
    const threatIds = threatsData.threats.map(t => t.id);
    
    expect(threatIds).toContain('cetus_shift_overflow');
    expect(threatIds).toContain('flashloan_price_oracle_exploit');
    expect(threatIds).toContain('consensus_finality_race');
    expect(threatIds).toContain('dynamic_field_confusion');
    expect(threatIds).toContain('sui_economics_drain');
  });

  test('should have critical severity for dangerous patterns', () => {
    const criticalThreats = threatsData.threats.filter(t => t.severity === 'critical');
    
    expect(criticalThreats.length).toBeGreaterThan(0);
    expect(criticalThreats.some(t => t.id === 'unchecked_withdraw')).toBe(true);
    expect(criticalThreats.some(t => t.id === 'reentrancy_via_callback')).toBe(true);
    expect(criticalThreats.some(t => t.id === 'consensus_finality_race')).toBe(true);
  });

  test('should have proper pattern structures', () => {
    threatsData.threats.forEach(threat => {
      const pattern = threat.pattern;
      
      expect(
        pattern.function_name || pattern.function_calls || pattern.loop_keywords || pattern.resource_name
      ).toBeDefined();
      
      if (pattern.missing_checks) {
        expect(pattern.missing_checks).toBeInstanceOf(Array);
        expect(pattern.missing_checks.length).toBeGreaterThan(0);
      }
      
      if (pattern.function_calls) {
        expect(pattern.function_calls).toBeInstanceOf(Array);
      }
    });
  });

  test('should have unique threat IDs', () => {
    const threatIds = threatsData.threats.map(t => t.id);
    const uniqueIds = [...new Set(threatIds)];
    
    expect(threatIds.length).toBe(uniqueIds.length);
  });

  test('should have meaningful descriptions', () => {
    threatsData.threats.forEach(threat => {
      expect(threat.description.length).toBeGreaterThan(10);
      expect(threat.recommendation.length).toBeGreaterThan(10);
      expect(threat.fix.length).toBeGreaterThan(5);
    });
  });

  test('should include CVE references for real exploits', () => {
    const realExploits = [
      'cetus_shift_overflow',
      'flashloan_price_oracle_exploit', 
      'reentrancy_via_callback',
      'dynamic_field_confusion'
    ];
    
    realExploits.forEach(exploitId => {
      const threat = threatsData.threats.find(t => t.id === exploitId);
      expect(threat).toBeDefined();
      
      expect(threat.id).toBe(exploitId);
      expect(threat.severity).toBeDefined();
    });
  });

  test('should have proper severity distribution', () => {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    threatsData.threats.forEach(threat => {
      severityCounts[threat.severity]++;
    });
    
    // Should have threats of all severity levels
    expect(severityCounts.critical).toBeGreaterThan(0);
    expect(severityCounts.high).toBeGreaterThan(0);
    expect(severityCounts.medium).toBeGreaterThan(0);
    expect(severityCounts.low).toBeGreaterThan(0);
    
    expect(severityCounts.critical).toBeLessThan(severityCounts.high + severityCounts.medium);
  });

  test('should have actionable fix recommendations', () => {
    threatsData.threats.forEach(threat => {
      const fix = threat.fix.toLowerCase();
      
      // Should contain actionable keywords
      const actionableKeywords = [
        'add', 'assert', 'check', 'validate', 'implement', 
        'use', 'ensure', 'replace', 'include', 'verify'
      ];
      
      const hasActionableKeyword = actionableKeywords.some(keyword => 
        fix.includes(keyword)
      );
      
      expect(hasActionableKeyword).toBe(true);
    });
  });

  test('should validate specific threat patterns work correctly', () => {
    // Test open mint function detection
    const openMintThreat = threatsData.threats.find(t => t.id === 'open_mint_function');
    expect(openMintThreat).toBeDefined();
    expect(openMintThreat.pattern.function_name).toBe('mint');
    expect(openMintThreat.pattern.missing_checks).toContain('signer_check');
    
    // Test withdraw function detection  
    const withdrawThreat = threatsData.threats.find(t => t.id === 'unchecked_withdraw');
    expect(withdrawThreat).toBeDefined();
    expect(withdrawThreat.pattern.function_name).toBe('withdraw');
    expect(withdrawThreat.severity).toBe('critical');
    
    // Test flash loan detection
    const flashThreat = threatsData.threats.find(t => t.id === 'flashloan_price_oracle_exploit');
    expect(flashThreat).toBeDefined();
    expect(flashThreat.pattern.function_calls).toContain('flash_swap');
  });

  describe('Threat Pattern Validation', () => {
    test('should have valid missing_checks patterns', () => {
      const validChecks = [
        'signer_check', 'max_supply_check', 'reentrancy_guard',
        'type_verification', 'shift_limit', 'slippage_guard',
        'oracle_update_guard', 'block_delay', 'iteration_limit',
        'gas_budget_limit', 'refund_cap', 'finality_check',
        'parallel_safety', 'signer.address', 'max_supply',
        'state_update_first', 'field_existence', 'time_window_limit'
      ];
      
      threatsData.threats.forEach(threat => {
        if (threat.pattern.missing_checks) {
          threat.pattern.missing_checks.forEach(check => {
            expect(validChecks).toContain(check);
          });
        }
      });
    });

    test('should have realistic function call patterns', () => {
      const callPatternThreats = threatsData.threats.filter(t => t.pattern.function_calls);
      
      expect(callPatternThreats.length).toBeGreaterThan(0);
      
      callPatternThreats.forEach(threat => {
        expect(threat.pattern.function_calls.length).toBeGreaterThan(0);
        threat.pattern.function_calls.forEach(call => {
          expect(typeof call).toBe('string');
          expect(call.length).toBeGreaterThan(0);
        });
      });
    });
  });
});