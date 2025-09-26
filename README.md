# Core Auto-Scaffold Kit - Security-First Sui Move Generator

 **The only AI-powered Sui Move generator with advanced security intelligence**

##  **What Makes Core Different**

While Sui Prover focuses on post-hoc verification, **Core generates secure-by-design code** with:

- ⚡ **Real-time exploit intelligence** from latest Sui ecosystem attacks
- 🔍 **Multi-layer security analysis** (static, economic, MEV protection)
- 🚫 **Pre-deployment blocking** of critical vulnerabilities
- 📊 **Security scoring** with deployment readiness assessment
- 💰 **Economic attack prevention** (flash loans, oracle manipulation)
- 🔗 **Sui-specific protections** (consensus races, gas economics)

This project is a hackathon demo showcasing:
- A static security analyzer that scans generated Move contracts against a mock threat database.
- An AI-powered scaffolder that generates Sui Move dApps from natural language prompts.

Structure:
- threat-db/threats.json  -> Mock threat database (JSON)
- sui-contracts/sources/CoreToken.move -> Example Sui Move contract (Move language)
- backend/ -> Simple Node.js backend with:
  - POST /api/generate  -> placeholder endpoint that returns the example Move contract (simulate AI generation)
  - POST /api/analyze   -> runs a simple static analysis using threat-db/threats.json and returns inline warnings

## **Quick Start**

### ⚠️ **Security Setup First**
**IMPORTANT:** Set up environment variables before running!

1. Copy environment template: `cp .env.example backend/.env`
2. Add your OpenAI API key to `backend/.env` (optional - app works without it)
3. See `SECURITY_SETUP.md` for detailed instructions

### Backend Setup
1. `cd backend`
2. `npm install`
3. `npm start`

### API Endpoints

#### 🎨 **Generate Secure Code**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a fungible token with mint/burn"}'
```

#### 🔍 **Basic Security Analysis**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"move_source": "<your move code>"}'
```

#### 🛡️ **Comprehensive Security Audit** (NEW!)
```bash
curl -X POST http://localhost:3000/api/security-audit \
  -H "Content-Type: application/json" \
  -d '{"move_source": "<your move code>"}'
```

Returns:
- **Security score** (0-100)
- **Economic risk analysis**
- **MEV vulnerability assessment**
- **Deployment recommendations**
- **Specific fix suggestions**

## **Advanced Security Features**

### **Real-Time Threat Intelligence**
- **Live exploit database** with CVE references
- **Sui-specific attack patterns** (Cetus, Turbos, etc.)
- **Economic attack vectors** (flash loans, MEV)
- **Consensus finality races** and gas manipulation

### **Multi-Layer Protection**
1. **Static Analysis++**: Advanced pattern matching and call flow analysis
2. **Economic Security**: Flash loan and oracle manipulation detection
3. **MEV Protection**: Arbitrage and frontrunning risk assessment
4. **Sui-Specific**: Dynamic field confusion, parallel execution races

### **Security-First Generation**
Unlike traditional tools that verify after generation, Core generates **secure-by-design** code:

```move
// Every generated function includes:
assert!(tx_context::sender(ctx) == admin, E_UNAUTHORIZED);  
assert!(amount <= MAX_SUPPLY, E_EXCEEDS_CAP);              
assert!(!reentrancy_guard.locked, E_REENTRANCY);           
event::emit(SecureTransfer { from, to, amount });          
```


