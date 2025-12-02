# 🧪 TripX Tests

This folder contains the essential tests for verifying TripX MVP functionality.

## Test Files

| File | Purpose | Run Time |
|------|---------|----------|
| `test-system.js` | Full system health check | ~30s |
| `test-mint-passport.js` | NFT Passport minting flow | ~60s |
| `test-full-flow.js` | End-to-end user journey | ~90s |

## Prerequisites

1. **Environment Variables**: Ensure `.env` is configured with:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

2. **Backend Running** (for web3 tests):
   ```bash
   cd server && npm run dev
   ```

3. **Node.js**: Version 18+ required

## Running Tests

### Quick System Check
```bash
node tests/test-system.js
```

This verifies:
- ✅ Environment variables configured
- ✅ Supabase connection working
- ✅ Database tables exist
- ✅ RPC functions available
- ✅ Contract addresses valid

### NFT Passport Test
```bash
node tests/test-mint-passport.js
```

This tests:
- ✅ User creation
- ✅ NFT Passport minting via API
- ✅ Blockchain transaction confirmation
- ✅ balanceOf verification
- ✅ Duplicate mint prevention

### Full Flow Test
```bash
node tests/test-full-flow.js
```

This tests the complete user journey:
- ✅ User registration
- ✅ Quest discovery
- ✅ Quest completion
- ✅ Photo verification
- ✅ Token claiming
- ✅ NFT minting

## Test Results

Each test outputs:
- ✅ Passed tests (green checkmarks)
- ❌ Failed tests (red X marks)
- 📊 Summary with success rate
- 📝 Transaction hashes with Etherscan links

### Expected Output

```
🧪 TripX System - Automated Test Suite
============================================================

✅ Environment: VITE_SUPABASE_URL configured
✅ Environment: VITE_SUPABASE_ANON_KEY configured
✅ Database: Connected successfully
✅ Tables: users, quests, user_quests exist
✅ Contracts: TPX Token address valid
✅ Contracts: NFT Passport address valid

============================================================
📊 Test Summary
============================================================
Total Tests: 10
✅ Passed: 10
❌ Failed: 0

📈 Success Rate: 100.0%

🎉 All tests passed! System is ready.
```

## Troubleshooting

### Rate Limiting
If you see rate limit errors, wait 60 seconds between test runs.

### Database Connection
Verify your Supabase project is active and credentials are correct.

### Blockchain Tests
Ensure the backend server is running on `http://localhost:3002`.

## Notes

- Tests are AI-generated as part of Vibe Coding process
- Run tests after any significant code changes
- Tests use Sepolia testnet (no real funds)
