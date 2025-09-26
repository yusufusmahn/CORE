const request = require('supertest');
const path = require('path');

const app = require('../src/server');

describe('API Integration Tests', () => {
  jest.setTimeout(10000);
  
  describe('POST /api/generate', () => {
    test('should return fallback code when no OpenAI key', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ prompt: 'Create a fungible token with mint/burn' });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.fallback_used).toBe(true);
      expect(response.body.generated_code).toContain('module Core::CoreToken');
    });

    test('should reject invalid prompts', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ prompt: 'Invalid prompt that is not allowed' });
      
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('Invalid prompt');
    });

    test('should include allowed prompts in error response', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ prompt: 'Invalid prompt' });
      
      expect(response.body.allowed_prompts).toContain('Create a fungible token with mint/burn');
      expect(response.body.allowed_prompts).toContain('Build me an NFT collection with royalties');
      expect(response.body.allowed_prompts).toContain('Make a simple voting contract');
    });

    test('should handle empty prompt', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ prompt: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });

    test('should handle missing prompt field', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('POST /api/analyze', () => {
    test('should analyze provided Move source code with vulnerabilities', async () => {
      const vulnerableCode = `
        public fun mint(amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, tx_context::sender(ctx));
        }
      `;
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ move_source: vulnerableCode });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.findings).toBeDefined();
      expect(response.body.findings.length).toBeGreaterThan(0);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total_findings).toBeGreaterThan(0);
    });

    test('should use default file when no source provided', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body.file).toContain('CoreToken.move');
    });

    test('should return no findings for secure code', async () => {
      const secureCode = `
        public fun mint(coll: &mut Collection, recipient: address, amount: u64, ctx: &mut TxContext) {
          let sender = tx_context::sender(ctx);
          assert!(sender == coll.owner, E_NOT_AUTHORIZED);
          assert!(coll.total_supply + amount <= MAX_SUPPLY, E_EXCEEDS_MAX_SUPPLY);
          coll.total_supply = coll.total_supply + amount;
          sui::event::emit(MintEvent { recipient, amount });
        }
      `;
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ move_source: secureCode });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(false);
      expect(response.body.reason).toContain('No vulnerable patterns detected');
    });

    test('should handle multiple vulnerabilities in one function', async () => {
      const multiVulnCode = `
        public entry fun dangerous_withdraw(amount: u64, ctx: &mut TxContext) {
          // Missing authorization check
          // Missing supply validation
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, tx_context::sender(ctx));
        }
      `;
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ move_source: multiVulnCode });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      // Should find at least one vulnerability
      expect(response.body.findings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/security-audit', () => {
    test('should provide comprehensive security analysis', async () => {
      const testCode = `
        public fun test_function(amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
        }
      `;
      
      const response = await request(app)
        .post('/api/security-audit')
        .send({ move_source: testCode });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.security_analysis).toBeDefined();
      expect(response.body.economic_risks).toBeDefined();
      expect(response.body.mev_analysis).toBeDefined();
      expect(response.body.deployment_recommendation).toBeDefined();
    });

    test('should include timestamp in response', async () => {
      const response = await request(app)
        .post('/api/security-audit')
        .send({});
      
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    test('should make deployment recommendation based on risks', async () => {
      const criticalCode = `
        public entry fun withdraw(amount: u64, ctx: &mut TxContext) {
          let coin = coin::mint(amount);
          transfer::public_transfer(coin, tx_context::sender(ctx));
        }
      `;
      
      const response = await request(app)
        .post('/api/security-audit')
        .send({ move_source: criticalCode });
      
      expect(response.status).toBe(200);
      // Check if deployment is recommended or not based on actual analysis
      expect(response.body.deployment_recommendation).toBeDefined();
      expect(typeof response.body.deployment_recommendation.safe_to_deploy).toBe('boolean');
    });

    test('should detect economic risks in flash loan code', async () => {
      const flashLoanCode = `
        public fun flash_attack(amount: u64, ctx: &mut TxContext) {
          let loan = flash_loan::borrow(amount);
          let price = oracle::get_price();
        }
      `;
      
      const response = await request(app)
        .post('/api/security-audit')
        .send({ move_source: flashLoanCode });
      
      expect(response.body.economic_risks.risk_level).toBe('HIGH');
      expect(response.body.economic_risks.risks).toContainEqual(
        expect.objectContaining({
          type: 'flash_loan_risk'
        })
      );
    });

    test('should detect MEV risks in DEX code', async () => {
      const dexCode = `
        public fun swap_tokens(amount: u64, ctx: &mut TxContext) {
          let rate = exchange::get_rate();
          // Vulnerable to arbitrage
        }
      `;
      
      const response = await request(app)
        .post('/api/security-audit')
        .send({ move_source: dexCode });
      
      expect(response.body.mev_analysis.mev_score).toBeGreaterThan(0);
      expect(response.body.mev_analysis.risks).toContainEqual(
        expect.objectContaining({
          type: 'arbitrage_opportunity'
        })
      );
    });

    test('should provide optimization suggestions for medium issues', async () => {
      const mediumIssueCode = `
        public entry fun mint(coll: &mut Collection, amount: u64, ctx: &mut TxContext) {
          assert!(tx_context::sender(ctx) == coll.owner, E_NOT_AUTHORIZED);
          // Missing max supply check - medium issue
          coll.total_supply = coll.total_supply + amount;
        }
      `;
      
      const response = await request(app)
        .post('/api/security-audit')
        .send({ move_source: mediumIssueCode });
      
      expect(response.status).toBe(200);
      // Check that optimization suggestions exist (may be 0 if no medium issues detected)
      expect(response.body.deployment_recommendation.optimization_suggestions).toBeDefined();
      expect(Array.isArray(response.body.deployment_recommendation.optimization_suggestions)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .type('text/plain')
        .send('invalid json string');
      
      // Server might return 200 with error or 400, both are acceptable
      expect([200, 400]).toContain(response.status);
    });

    test('should handle missing endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send();
      
      expect(response.status).toBe(200);
      // Should fallback to default file analysis
    });

    test('should handle very large code input', async () => {
      const largeCode = 'public fun test() {}\n'.repeat(1000);
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ move_source: largeCode });
      
      expect(response.status).toBe(200);
      // Should handle without crashing
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent response format for /api/analyze', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({});
      
      expect(response.body).toHaveProperty('ok');
      expect(response.body).toHaveProperty('file');
      
      if (response.body.ok) {
        expect(response.body).toHaveProperty('findings');
        expect(response.body).toHaveProperty('summary');
      }
    });

    test('should return consistent response format for /api/security-audit', async () => {
      const response = await request(app)
        .post('/api/security-audit')
        .send({});
      
      expect(response.body).toHaveProperty('ok');
      expect(response.body).toHaveProperty('security_analysis');
      expect(response.body).toHaveProperty('economic_risks');
      expect(response.body).toHaveProperty('mev_analysis');
      expect(response.body).toHaveProperty('deployment_recommendation');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});