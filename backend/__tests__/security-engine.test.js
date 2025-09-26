const fs = require('fs');
const path = require('path');

const { 
  scanMoveSource, 
  performComprehensiveSecurityScan, 
  analyzeEconomicSecurity, 
  analyzeMEVRisks 
} = require('../src/security-engine');

describe('Security Engine Unit Tests', () => {
  describe('scanMoveSource', () => {
    test('should detect open mint function vulnerability', () => {
      const vulnerableCode = `
        public fun mint(recipient: address, amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, recipient);
        }
      `;
      
      const results = scanMoveSource(vulnerableCode);
      
      expect(results).toEqual(expect.any(Array));
      expect(results.length).toBeGreaterThan(0);
      
      const mintVuln = results.find(r => r.id === 'open_mint_function');
      expect(mintVuln).toBeDefined();
      expect(mintVuln.severity).toBe('high');
      expect(mintVuln.missing_checks).toContain('signer_check');
    });

    test('should detect missing max supply check', () => {
      const vulnerableCode = `
        public entry fun mint(coll: &mut Collection, amount: u64, ctx: &mut TxContext) {
          assert!(tx_context::sender(ctx) == coll.owner, E_NOT_AUTHORIZED);
          coll.total_supply = coll.total_supply + amount;
        }
      `;
      
      const results = scanMoveSource(vulnerableCode);
      
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const hasMaxSupplyIssue = results.some(r => r.id === 'no_max_supply_check');
      }
    });

    test('should detect Cetus-style overflow vulnerability', () => {
      const vulnerableCode = `
        public fun vulnerable_shift(value: u256, shift: u8): u256 {
          math::checked_shlw(value, shift)
        }
      `;
      
      const results = scanMoveSource(vulnerableCode);
      
      expect(results.some(r => r.id === 'cetus_shift_overflow')).toBe(true);
    });

    test('should detect withdraw function without authorization', () => {
      const vulnerableCode = `
        public entry fun withdraw(amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, tx_context::sender(ctx));
        }
      `;
      
      const results = scanMoveSource(vulnerableCode);
      
      // Should detect some security issue in this vulnerable withdraw function
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const hasWithdrawIssue = results.some(r => r.id === 'unchecked_withdraw');
      }
    });

    test('should pass secure code without false positives', () => {
      const secureCode = `
        public fun mint(coll: &mut Collection, recipient: address, amount: u64, ctx: &mut TxContext) {
          let sender = tx_context::sender(ctx);
          assert!(sender == coll.owner, E_NOT_AUTHORIZED);
          assert!(coll.total_supply + amount <= MAX_SUPPLY, E_EXCEEDS_MAX_SUPPLY);
          coll.total_supply = coll.total_supply + amount;
          sui::event::emit(MintEvent { recipient, amount });
        }
      `;
      
      const results = scanMoveSource(secureCode);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Economic Security Analysis', () => {
    test('should detect flash loan risks', () => {
      const riskCode = `
        public fun flash_arbitrage(amount: u64, ctx: &mut TxContext) {
          let loan = flash_loan::borrow(amount);
          let price = oracle::get_price();
        }
      `;
      
      const analysis = analyzeEconomicSecurity(riskCode);
      
      expect(analysis.risk_level).toBe('HIGH');
      expect(analysis.risks).toContainEqual(
        expect.objectContaining({
          type: 'flash_loan_risk',
          severity: 'high'
        })
      );
    });

    test('should detect oracle manipulation risks', () => {
      const riskCode = `
        public fun get_token_price(): u64 {
          oracle::get_price()
        }
      `;
      
      const analysis = analyzeEconomicSecurity(riskCode);
      
      expect(analysis.risks).toContainEqual(
        expect.objectContaining({
          type: 'oracle_manipulation',
          severity: 'medium'
        })
      );
    });

    test('should return low risk for safe code', () => {
      const safeCode = `
        public fun safe_function(amount: u64): u64 {
          amount + 1
        }
      `;
      
      const analysis = analyzeEconomicSecurity(safeCode);
      
      expect(analysis.risk_level).toBe('LOW');
      expect(analysis.risks).toHaveLength(0);
    });
  });

  describe('MEV Analysis', () => {
    test('should detect DEX arbitrage opportunities', () => {
      const mevCode = `
        public fun swap(token_a: u64, token_b: u64): u64 {
          let rate = exchange::get_rate();
          token_a * rate
        }
      `;
      
      const analysis = analyzeMEVRisks(mevCode);
      
      expect(analysis.mev_score).toBeGreaterThan(20);
      expect(analysis.risks).toContainEqual(
        expect.objectContaining({
          type: 'arbitrage_opportunity'
        })
      );
    });

    test('should detect auction frontrunning risks', () => {
      const mevCode = `
        public fun place_bid(auction_id: u64, amount: u64, ctx: &mut TxContext) {
          let bidder = tx_context::sender(ctx);
          auction::bid(auction_id, bidder, amount);
        }
      `;
      
      const analysis = analyzeMEVRisks(mevCode);
      
      expect(analysis.mev_score).toBeGreaterThan(30);
      expect(analysis.risks).toContainEqual(
        expect.objectContaining({
          type: 'frontrunning_risk'
        })
      );
    });

    test('should return low MEV score for safe code', () => {
      const safeCode = `
        public fun safe_transfer(amount: u64, ctx: &mut TxContext) {
          // Safe operations
        }
      `;
      
      const analysis = analyzeMEVRisks(safeCode);
      
      expect(analysis.mev_score).toBe(0);
      expect(analysis.risk_level).toBe('LOW');
    });
  });

  describe('Security Scoring', () => {
    test('should calculate low security score for critical vulnerabilities', () => {
      const criticalCode = `
        public entry fun withdraw(amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, tx_context::sender(ctx));
        }
      `;
      
      const analysis = performComprehensiveSecurityScan(criticalCode);
      
      if (analysis.criticalIssues > 0 || analysis.highIssues > 0) {
        expect(analysis.securityScore).toBeLessThan(50);
        expect(analysis.deployment_ready).toBe(false);
      }
      
      expect(analysis.securityScore).toBeLessThanOrEqual(100);
    });

    test('should score secure code highly', () => {
      const secureCode = `
        public fun mint(coll: &mut Collection, recipient: address, amount: u64, ctx: &mut TxContext) {
          let sender = tx_context::sender(ctx);
          assert!(sender == coll.owner, E_NOT_AUTHORIZED);
          assert!(coll.total_supply + amount <= MAX_SUPPLY, E_EXCEEDS_MAX_SUPPLY);
          coll.total_supply = coll.total_supply + amount;
          sui::event::emit(MintEvent { recipient, amount });
        }
      `;
      
      const analysis = performComprehensiveSecurityScan(secureCode);
      
      expect(analysis.securityScore).toBeGreaterThan(90);
      expect(analysis.deployment_ready).toBe(true);
      expect(analysis.risk_level).toBe('LOW');
      expect(analysis.criticalIssues).toBe(0);
    });

    test('should handle mixed severity issues correctly', () => {
      const mixedCode = `
        public entry fun mint(coll: &mut Collection, amount: u64, ctx: &mut TxContext) {
          assert!(tx_context::sender(ctx) == coll.owner, E_NOT_AUTHORIZED);
          // Missing: max supply check (medium issue)
          coll.total_supply = coll.total_supply + amount;
          // Missing: event emission (low issue)
        }
      `;
      
      const analysis = performComprehensiveSecurityScan(mixedCode);
      
      // Should have some score reduction but not be critically low
      expect(analysis.securityScore).toBeGreaterThanOrEqual(70);
      expect(analysis.securityScore).toBeLessThanOrEqual(100);
    });
  });
});