const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const {
  scanMoveSource,
  performComprehensiveSecurityScan,
  analyzeEconomicSecurity,
  analyzeMEVRisks
} = require('./security-engine');

const app = express();
app.use(bodyParser.json());

const SOURCES_DIR = path.join(__dirname, '..', '..', 'sui-contracts', 'sources');
const DEFAULT_MOVE_PATH = path.join(SOURCES_DIR, 'CoreToken.move');

const ALLOWED_PROMPTS = {
  "Build me an NFT collection with royalties": "nft_collection_royalties",
  "Create a fungible token with mint/burn": "fungible_token_mint_burn",
  "Make a simple voting contract": "simple_voting_contract"
};

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!OPENAI_KEY) {
  console.warn("OPENAI_API_KEY not set in .env — /api/generate will fall back.");
}

function extractCode(text) {
  const match = text.match(/```(?:move)?\n([\s\S]*?)```/i);
  if (match && match[1]) return match[1].trim();
  return text.trim();
}

// Generate Move code endpoint
app.post('/api/generate', async (req, res) => {
  const promptText = (req.body.prompt || '').trim();

  if (!ALLOWED_PROMPTS[promptText]) {
    return res.status(400).json({
      ok: false,
      error: "Invalid prompt. Use one of the allowed prompts.",
      allowed_prompts: Object.keys(ALLOWED_PROMPTS)
    });
  }

  if (!OPENAI_KEY) {
    return res.status(200).json({
      ok: true,
      file: DEFAULT_MOVE_PATH,
      generated_code: fs.readFileSync(DEFAULT_MOVE_PATH, "utf8"),
      fallback_used: true,
      note: "No API key set, returning fallback code."
    });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: OPENAI_MODEL,
        messages: [
          { 
            role: "system", 
            content: `You are a security-first Sui Move smart contract generator. 
            CRITICAL SECURITY REQUIREMENTS:
            1. ALWAYS include proper access controls (assert sender checks)
            2. ALWAYS implement supply caps and overflow protection
            3. ALWAYS add reentrancy guards for external calls
            4. ALWAYS emit events for state changes
            5. ALWAYS validate input parameters
            6. NEVER create functions without proper authorization
            7. Include error constants for all assertions
            
            Generate secure, production-ready Move code with comprehensive security checks.`
          },
          { role: "user", content: promptText }
        ],
        temperature: 0.2,
        max_tokens: 1500
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" }
      }
    );

    const raw = response.data.choices?.[0]?.message?.content || "";
    const code = extractCode(raw);

    // Multi-layer security analysis before deployment
    const securityAnalysis = performComprehensiveSecurityScan(code);
    
    if (securityAnalysis.criticalIssues > 0) {
      return res.status(400).json({
        ok: false,
        error: "Generated code contains critical security vulnerabilities",
        security_report: securityAnalysis,
        recommendation: "Please regenerate with different parameters or review manually"
      });
    }

    const slug = ALLOWED_PROMPTS[promptText];
    const filename = `${slug}-${Date.now()}.move`;
    const filePath = path.join(SOURCES_DIR, filename);

    fs.mkdirSync(SOURCES_DIR, { recursive: true });
    fs.writeFileSync(filePath, code, "utf8");

    res.json({
      ok: true,
      file: filePath,
      generated_code: code,
      fallback_used: false,
      note: "Generated Move code saved to sui-contracts/sources/"
    });
  } catch (err) {
    console.error("OpenAI generation failed:", err?.response?.data || err.message);

    return res.status(200).json({
      ok: true,
      file: DEFAULT_MOVE_PATH,
      generated_code: fs.readFileSync(DEFAULT_MOVE_PATH, "utf8"),
      fallback_used: true,
      note: `Fallback used because generation failed: ${
        err.response?.data?.error?.message || err.message
      }`
    });
  }
});

// Basic security analysis endpoint
app.post('/api/analyze', (req, res) => {
  let source, filePath;

  if (req.body.move_source) {
    source = req.body.move_source;
    filePath = "raw_input";
  } else {
    try {
      filePath = DEFAULT_MOVE_PATH;
      source = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      return res.status(500).json({ ok: false, error: `Could not read file: ${filePath}`, details: err.message });
    }
  }

  const findings = scanMoveSource(source);

  if (findings.length === 0) {
    return res.json({ ok: false, file: filePath, reason: "No vulnerable patterns detected " });
  }

  res.json({
    ok: true,
    file: filePath,
    findings,
    summary: {
      total_findings: findings.length,
      by_severity: findings.reduce((acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// Advanced security analysis endpoint
app.post('/api/security-audit', (req, res) => {
  let source, filePath;

  if (req.body.move_source) {
    source = req.body.move_source;
    filePath = "raw_input";
  } else {
    try {
      filePath = DEFAULT_MOVE_PATH;
      source = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      return res.status(500).json({ ok: false, error: `Could not read file: ${filePath}`, details: err.message });
    }
  }

  const comprehensiveAnalysis = performComprehensiveSecurityScan(source);
  
  // Additional economic security analysis
  const economicRisks = analyzeEconomicSecurity(source);
  
  // MEV (Maximal Extractable Value) analysis
  const mevAnalysis = analyzeMEVRisks(source);
  
  res.json({
    ok: true,
    file: filePath,
    timestamp: new Date().toISOString(),
    security_analysis: comprehensiveAnalysis,
    economic_risks: economicRisks,
    mev_analysis: mevAnalysis,
    deployment_recommendation: {
      safe_to_deploy: comprehensiveAnalysis.deployment_ready && economicRisks.risk_level !== 'HIGH',
      required_fixes: comprehensiveAnalysis.findings.filter(f => f.severity === 'critical'),
      optimization_suggestions: comprehensiveAnalysis.findings.filter(f => f.severity === 'medium')
    }
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Core Auto-Scaffold backend listening on port ${PORT}`);
  });
}

module.exports = app;