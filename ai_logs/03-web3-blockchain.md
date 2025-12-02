# ⛓️ Iteration 03: Web3 & Blockchain Integration

## Date: November 2025 (Week 2)

## Objective
Develop and deploy smart contracts for TPX token and NFT Passport, integrate Web3 functionality into React app.

---

## AI Tools Used
- **Visual Studio Code** - Primary IDE with Solidity extension
- **Cursor AI** - Solidity code generation, debugging
- **GitHub Copilot** - wagmi/viem integration, TypeScript
- **Kiro (AWS)** - Smart contract architecture review
- **Bolt.new** - Frontend deployment with Web3
- **Claude (Anthropic)** - Smart contract security review

---

## Prompts & Results

### Prompt 1: TPX Token Contract

```
Write a Solidity ERC-20 token contract for Base Sepolia:
- Name: "TripX Token", Symbol: "TPX"
- Max supply: 1 billion tokens
- Mint function (owner only) for quest rewards
- Burn function for users
- Use OpenZeppelin 5.x contracts
- Include events for tracking
```

**AI Output:** Complete TPXToken.sol contract.

### Prompt 2: NFT Passport Contract

```
Write a Solidity ERC-721 NFT contract for travel passports:
- Name: "TripX NFT Passport", Symbol: "TRIPX"
- Soulbound (non-transferable) - block transfers between addresses
- Tiers: bronze, silver, gold, platinum
- One passport per user (check balanceOf before mint)
- updateMetadata function for tier upgrades
- Store user mapping and tier mapping
- Use OpenZeppelin 5.x (ERC721URIStorage)
```

**AI Output:** Complete NFTPassport.sol with soulbound logic.

### Prompt 3: Hardhat Configuration

```
Set up Hardhat for Base Sepolia deployment:
- Network configuration with RPC URL
- Deploy scripts for both contracts
- Verification setup for BaseScan
- Environment variables handling
```

**AI Output:** hardhat.config.js and deploy scripts.

### Prompt 4: React Web3 Integration

```
Integrate Web3 into React using wagmi v2 + viem + RainbowKit:
- WagmiProvider configuration for Base Sepolia
- RainbowKit wallet connection UI
- useAccount, useBalance hooks
- Contract read/write functions
- Transaction status monitoring
- Error handling with toast notifications
```

**AI Output:** Complete Web3 setup and service layer.

---

## Smart Contracts

### TPXToken.sol (AI-generated)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TPXToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor() ERC20("TripX Token", "TPX") Ownable(msg.sender) {
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}
```

### NFTPassport.sol - Soulbound Logic (AI-generated)

```solidity
// Override _update to make passport non-transferable
function _update(
    address to,
    uint256 tokenId,
    address auth
) internal virtual override returns (address) {
    address from = _ownerOf(tokenId);
    
    // Allow minting and burning, block transfers
    if (from != address(0) && to != address(0)) {
        revert("Passport is soulbound and cannot be transferred");
    }
    
    return super._update(to, tokenId, auth);
}
```

---

## Deployed Contracts (Base Sepolia)

| Contract | Address | BaseScan |
|----------|---------|----------|
| TPXToken | `0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd` | [View](https://sepolia.basescan.org/address/0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd) |
| NFTPassport | `0xFc22556bb4ae5740610bE43457d46AdA5200b994` | [View](https://sepolia.basescan.org/address/0xFc22556bb4ae5740610bE43457d46AdA5200b994) |

---

## Web3 Service Layer (AI-generated)

```typescript
// services/blockchainService.ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export async function getTPXBalance(address: string): Promise<bigint> {
  return publicClient.readContract({
    address: TPX_TOKEN_ADDRESS,
    abi: TPX_ABI,
    functionName: 'balanceOf',
    args: [address]
  });
}

export async function hasNFTPassport(address: string): Promise<boolean> {
  const balance = await publicClient.readContract({
    address: NFT_PASSPORT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: [address]
  });
  return balance > 0n;
}

export async function mintPassport(
  userAddress: string,
  metadataURI: string,
  tier: string
): Promise<string> {
  // Backend API call (admin wallet signs)
  const response = await fetch('/api/web3/mint-passport', {
    method: 'POST',
    body: JSON.stringify({ userAddress, metadataURI, tier })
  });
  return response.json();
}
```

---

## wagmi Configuration (AI-generated)

```typescript
// lib/wagmi.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'TripX',
  projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [baseSepolia],
  ssr: false,
});
```

---

## Transaction Monitoring (AI-generated)

```typescript
// services/etherscanMonitor.ts
export async function monitorTPXTransaction(
  walletAddress: string,
  onSuccess: (tx: TransactionResult) => void,
  onProgress: (attempts: number) => void,
  maxAttempts = 30,
  startBlock?: number
): Promise<{ found: boolean; transaction?: TransactionResult }> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const result = await checkTPXTransaction(walletAddress, startBlock);
    
    if (result.found) {
      onSuccess(result);
      return { found: true, transaction: result };
    }
    
    attempts++;
    onProgress(attempts);
    await new Promise(r => setTimeout(r, 2000)); // 2s interval
  }
  
  return { found: false };
}
```

---

## Challenges & Solutions

### Challenge 1: Soulbound NFT in OZ 5.x
- **Issue:** OpenZeppelin 5.x removed _beforeTokenTransfer
- **AI Solution:** Override _update() instead for transfer blocking

### Challenge 2: Gas Estimation Failures
- **Issue:** Frontend couldn't estimate gas for transactions
- **AI Solution:** Move signing to backend with admin wallet

### Challenge 3: Transaction Confirmation UX
- **Issue:** Users didn't know if transaction succeeded
- **AI Solution:** Created Etherscan monitoring service with toasts

---

## Security Considerations (AI-reviewed)

1. ✅ **Admin-only minting** - Prevents unauthorized token creation
2. ✅ **Soulbound NFT** - Cannot be traded/transferred
3. ✅ **Max supply cap** - Prevents inflation
4. ✅ **Backend signing** - Private key not exposed to frontend
5. ✅ **Rate limiting** - Prevents abuse of claim endpoints

---

## Metrics

| Metric | Value |
|--------|-------|
| Time Spent | 12 hours |
| Traditional Estimate | 1 week |
| Contracts Deployed | 2 |
| Service Functions | 15+ |
| Lines of Solidity | ~200 |
| Lines of TypeScript | ~500 |
| AI Assistance | 80% |

---

## Next Iteration
→ [04-gamification-quests.md](./04-gamification-quests.md) - Quest system and GPS verification
