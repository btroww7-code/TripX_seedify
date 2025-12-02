# 🌍 TripX - AI-Powered Travel Platform with Web3 Gamification

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_App-success?style=for-the-badge)](https://btroww7-code-tripx-nxl3.bolt.host/)
[![Demo Video](https://img.shields.io/badge/📹_Demo_Video-Watch_on_YouTube-red?style=for-the-badge)](https://www.youtube.com/watch?v=VjlLifLm4l4)
[![Built with Vibe Coding](https://img.shields.io/badge/Built_with-Vibe_Coding_🤖-purple?style=for-the-badge)]()

**Earn tokens while you travel. Complete GPS-verified quests. Build your NFT Passport.**

[Live Demo](https://btroww7-code-tripx-nxl3.bolt.host/) • [Watch Video](https://www.youtube.com/watch?v=VjlLifLm4l4) • [Documentation](#-documentation)

</div>

---

## 📋 Project Description

> **150 words**

TripX revolutionizes travel by transforming every journey into a rewarding adventure. Traditional travel apps lack engagement and incentives—users plan trips but have no motivation to explore beyond the basics.

**Our Solution:** A gamified travel platform that rewards users with TPX tokens and NFT achievements for completing GPS-verified location quests. Users explore cities, visit landmarks, and earn real cryptocurrency rewards.

**Key Features:**
- 🤖 AI-powered trip planning using Google Gemini
- 📍 GPS-verified quests with photo verification
- 💰 TPX token rewards on Base blockchain
- 🎫 Soulbound NFT Passport with tier upgrades
- 🗺️ Real-time transit routing with ticket booking

**Revenue Model:** Free for users. Revenue from sponsored quests (hotels, restaurants, museums pay to be featured), advertising, and affiliate commissions.

**Target Users:** Travelers, tourists, urban explorers, and gamification enthusiasts who want to earn while they discover new places.

---

## 👤 Team Info

> **150 words**

**Solo Developer Project**

I'm a full-stack developer with 5+ years of experience building web applications, specializing in React, TypeScript, and blockchain integration. This project was built entirely using **Vibe Coding** methodology—leveraging AI tools (Cursor, Claude, GitHub Copilot) to accelerate development from concept to production in just 3 weeks.

**Technical Expertise:**
- Frontend: React, TypeScript, TailwindCSS
- Backend: Node.js, Supabase, PostgreSQL
- Blockchain: Solidity, Hardhat, Base/Ethereum
- AI Integration: Google Gemini, Vision APIs
- DevOps: Vercel, Docker, CI/CD

**Why TripX?** I noticed that travel apps lack gamification and real rewards. As both a developer and traveler, I built the app I wanted to use—one that makes exploration fun and financially rewarding.

The entire codebase demonstrates the power of Vibe Coding: AI-assisted development that delivers production-ready applications at unprecedented speed.

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| 🚀 **Live Demo** | https://btroww7-code-tripx-nxl3.bolt.host/ |
| 📹 **Demo Video** | https://www.youtube.com/watch?v=VjlLifLm4l4 |
| 🧪 **Testing Guide** | [TESTING_PRODUCTION.md](./TESTING_PRODUCTION.md) |
| 🗺️ **Roadmap** | [ROADMAP.md](./ROADMAP.md) |
| 🤖 **AI Prompts** | [prompts.md](./prompts.md) |
| 📝 **AI Logs** | [ai_logs/](./ai_logs/) |

---

## ⛓️ Smart Contracts (Base Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| **TPX Token** (ERC-20) | `0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd` | [BaseScan](https://sepolia.basescan.org/address/0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd) |
| **NFT Passport** (ERC-721) | `0xFc22556bb4ae5740610bE43457d46AdA5200b994` | [BaseScan](https://sepolia.basescan.org/address/0xFc22556bb4ae5740610bE43457d46AdA5200b994) |

**Network:** Base Sepolia (Chain ID: 84532)

---

## 💰 Revenue Model

TripX is **free for all users**. Revenue is generated through:

| Stream | Description | % of Revenue |
|--------|-------------|--------------|
| **Sponsored Quests** | Hotels, restaurants, museums pay to be featured as quests | 40% |
| **Advertising** | Non-intrusive ads, promoted locations | 25% |
| **Premium Subscriptions** | Higher rewards, exclusive quests | 20% |
| **Affiliate Commissions** | Hotel/flight booking referrals | 15% |

---

## ✨ What is TripX?

TripX is a **production-ready** travel platform that combines:

🗺️ **Smart Transit Planning** - Real-time multi-modal routing with Google Maps
🎫 **Direct Ticket Booking** - One-click ticket purchase from local operators
🗺️ **Interactive Maps** - Beautiful Mapbox visualizations with dark theme
🤖 **AI Trip Generation** - Smart itineraries powered by Google Gemini
🎮 **Gamification** - Quests, achievements, and blockchain rewards
⛓️ **Web3 Integration** - NFT passports and token rewards on Base

---

## 🎯 Key Features

### Transit Planner
- Real-time route search across multiple operators
- Fastest route / Fewest transfers / Alternative options
- Per-leg ticket purchase links (operator-specific)
- Mapbox 2D dark maps with animated routes
- Save routes for later (authenticated users)

### Supported Transit Operators
- 🚇 ZTM Warszawa (Warsaw)
- 🚂 PKP Intercity (Poland)
- 🚊 Metro Warszawskie
- 🚄 Koleje Mazowieckie
- 🚌 MZK/MPK (local)
- 🔄 More via fallback providers

### Authentication
- 📧 Email/Password (Supabase)
- 👛 Web3 Wallets (MetaMask, WalletConnect)

### Gamification
- 🎯 Daily/Weekly/Global quests
- 🏆 Achievement system
- 📊 Global leaderboard
- 💎 TPX token rewards
- 🎫 NFT passport on Base Sepolia

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Clone
git clone <repository-url>
cd tripx

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your API keys

# 4. Run
npm run dev
```

**Visit:** http://localhost:5173

**Need help?** → See [QUICK_START.md](QUICK_START.md)

---

## 📋 Prerequisites

**All services have FREE tiers - no credit card required for development:**

| Service | Purpose | Free Tier | Get it from |
|---------|---------|-----------|-------------|
| **Supabase** | Database + Auth | ✅ 500MB DB, 50K users | https://supabase.com |
| **Google Maps** | Transit routing | ✅ $200/mo credit | https://console.cloud.google.com |
| **Mapbox** | Map visualization | ✅ 50K loads/mo | https://mapbox.com |
| **Google Gemini** | AI trip planning | ✅ 60 req/min | https://makersuite.google.com |

**Setup time:** ~20 minutes total
**Detailed instructions:** [API_SETUP.md](API_SETUP.md)

---

## 🗂️ Project Structure

```
tripx/
├── 📚 Documentation
│   ├── README.md                    ← You are here
│   ├── START_HERE.md                ← Start here first! ⭐
│   ├── SETUP_GUIDE.md               ← Complete setup (20 min)
│   ├── FEATURES.md                  ← Feature documentation
│   ├── API_SETUP.md                 ← API configuration guide
│   ├── QUICK_START.md               ← Fast setup (5 min)
│   └── CURRENT_STATE.md             ← Current config reference
│
├── ⚙️ Configuration
│   ├── .env.example                 ← Environment template
│   ├── package.json                 ← Dependencies
│   └── vite.config.ts               ← Build config
│
├── 🎨 Source Code
│   ├── components/                  ← React components
│   │   ├── pages/                   ← Page components
│   │   │   ├── Transit/             ← Transit planner ⭐
│   │   │   ├── MyQuests/            ← Quest system
│   │   │   ├── MyTrips/             ← Trip management
│   │   │   ├── CreateTrip/          ← AI trip generator
│   │   │   └── ...
│   │   ├── InlineTransitMap.tsx     ← Transit map (Mapbox)
│   │   └── QuestMap.tsx             ← Quest map visualization
│   │
│   ├── services/                    ← Business logic
│   │   ├── transitService.ts        ← Google Directions API
│   │   ├── questService.ts          ← Quest CRUD & GPS verification
│   │   ├── sponsoredQuestService.ts ← Sponsored quests
│   │   ├── ticketLinkService.ts     ← Ticket URL mapping
│   │   ├── aiTripService.ts         ← Gemini AI integration
│   │   └── ...
│   │
│   └── hooks/                       ← React hooks
│       ├── useEmailAuth.ts          ← Email authentication
│       └── useWalletAuth.ts         ← Web3 wallet auth
│
└── 🗄️ Database
    └── supabase/
        ├── migrations/              ← SQL schemas
        │   ├── 20251122120151_complete_tripx_database.sql
        │   └── 20251122_enhance_quest_system.sql
        └── functions/               ← Edge functions (optional)
```

---

## 🔑 Environment Variables

**Required (4 variables):**

```env
# Supabase (Database & Auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps (Transit & Places)
VITE_GOOGLE_MAPS_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Gemini (AI Trip Planning)
VITE_GOOGLE_AI_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Mapbox (Map Visualization)
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0.XXXXX
```

**See [API_SETUP.md](API_SETUP.md) for detailed setup instructions**

---

## 🗄️ Database Setup

### Quick Setup

1. Create Supabase project
2. Go to SQL Editor
3. Run migrations from `supabase/migrations/`:
   - `20251122120151_complete_tripx_database.sql` (main)
   - `20251122_create_saved_routes.sql` (routes)

**Result:** 10 tables with RLS enabled

**Detailed guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#database-setup)

---

## 🚀 Development

### Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Testing Features

After `npm run dev`:

1. ✅ **Transit Search**
   - Go to /transit
   - Search route between two locations
   - View map, check ticket links

2. ✅ **Authentication**
   - Sign up with email
   - Or connect Web3 wallet

3. ✅ **Save Routes**
   - Login first
   - Search route
   - Click "Save" button

4. ✅ **View Saved**
   - Go to My Trips
   - See saved routes

---

## 🚀 Deployment Instructions

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-username/tripx.git
cd tripx

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5173
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google APIs
VITE_GOOGLE_MAPS_KEY=your_google_maps_key
VITE_GOOGLE_AI_KEY=your_gemini_api_key

# Mapbox
VITE_MAPBOX_TOKEN=your_mapbox_token

# Blockchain (Base Sepolia)
VITE_TPX_CONTRACT_ADDRESS=0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd
VITE_NFT_PASSPORT_CONTRACT_ADDRESS=0xFc22556bb4ae5740610bE43457d46AdA5200b994
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel deploy --prod
```

---

## 🧪 Testing

### Run Tests
```bash
# System health check
node tests/test-system.js

# NFT minting test
node tests/test-mint-passport.js

# Full flow test
node tests/test-full-flow.js
```

### Testing in Production
See [TESTING_PRODUCTION.md](./TESTING_PRODUCTION.md) for step-by-step TIP instructions.

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Framer Motion |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Blockchain** | Base Sepolia, Solidity, Hardhat, wagmi, viem, RainbowKit |
| **AI** | Google Gemini 2.0 Flash, Vision API |
| **Maps** | Google Maps API, Mapbox GL |

---

## 📂 Project Structure

```
tripx/
├── 📁 ai_logs/           # Vibe Coding iteration history
├── 📁 components/        # React components
├── 📁 contracts/         # Solidity smart contracts
├── 📁 hooks/             # React hooks
├── 📁 lib/               # Utilities (Supabase client)
├── 📁 services/          # Business logic
├── 📁 supabase/          # Database migrations
├── 📁 tests/             # Test scripts
├── 📁 types/             # TypeScript definitions
├── 📄 prompts.md         # AI prompts documentation
├── 📄 ROADMAP.md         # 12-month roadmap
├── 📄 TESTING_PRODUCTION.md  # TIP instructions
└── 📄 README.md          # This file
```

---

## 🤖 Vibe Coding Documentation

This project was built using **Vibe Coding** - AI-assisted development methodology.

### Tools Used
- **Visual Studio Code** - Primary IDE with extensions
- **Cursor AI** - AI-powered code editor with chat
- **GitHub Copilot** - Real-time code suggestions
- **Kiro (AWS)** - AI coding assistant for architecture
- **Bolt.new** - Rapid prototyping and instant deployment

### Documentation
- [prompts.md](./prompts.md) - AI prompts and tools used
- [ai_logs/](./ai_logs/) - Detailed iteration history:
  - [01-project-setup.md](./ai_logs/01-project-setup.md)
  - [02-supabase-database.md](./ai_logs/02-supabase-database.md)
  - [03-web3-blockchain.md](./ai_logs/03-web3-blockchain.md)
  - [04-gamification-quests.md](./ai_logs/04-gamification-quests.md)
  - [05-ai-trip-planning.md](./ai_logs/05-ai-trip-planning.md)

### Development Stats
- **Development Time:** 3 weeks
- **Traditional Estimate:** 3-4 months
- **AI-Generated Code:** ~70%
- **Lines of Code:** ~15,000

---

## 📊 Current Status

| Feature | Status |
|---------|--------|
| Core App | ✅ Complete |
| Smart Contracts | ✅ Deployed (Testnet) |
| AI Trip Planning | ✅ Working |
| GPS Verification | ✅ Working |
| Photo Verification | ✅ Working |
| Token Claiming | ✅ Working |
| NFT Minting | ✅ Working |
| Documentation | ✅ Complete |

---

## 📄 License

MIT License - see LICENSE file for details.

---

<div align="center">

**Built with ❤️ and Vibe Coding 🤖**

*Submitted to Seedify Vibe Coins Hackathon - December 2025*

</div>
