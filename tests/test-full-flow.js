/**
 * End-to-end integration test
 * Tests complete flow: create user → complete quest → claim tokens → mint passport → mint achievement
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3002';
const NFT_CONTRACT = process.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS;
const TPX_CONTRACT = process.env.VITE_TPX_CONTRACT_ADDRESS;
const RPC_URL = process.env.ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

// Test wallet address
const TEST_WALLET = process.env.TEST_WALLET_ADDRESS || '0x232F5aDb8921692526AeEce0C7e80139F6Fde073';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL)
});

const NFT_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  }
];

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  }
];

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  transactions: []
};

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: name, error: error.message || error });
      console.log(`   Error: ${error.message || error}`);
    }
  }
}

function logTransaction(type, txHash, details = {}) {
  testResults.transactions.push({ type, txHash, details, timestamp: new Date().toISOString() });
  console.log(`   📝 ${type}: ${txHash}`);
  console.log(`      Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
}

async function getTokenBalance(address) {
  try {
    const balance = await publicClient.readContract({
      address: TPX_CONTRACT,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address]
    });
    return parseFloat(formatUnits(balance, 18));
  } catch (error) {
    return null;
  }
}

async function getNFTBalance(address) {
  try {
    const balance = await publicClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'balanceOf',
      args: [address]
    });
    return Number(balance);
  } catch (error) {
    return null;
  }
}

async function checkTransactionOnBlockchain(txHash) {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    return receipt && receipt.status === 'success';
  } catch (error) {
    return false;
  }
}

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (responseText.includes('<!DOCTYPE')) {
        return { ok: false, error: `Server returned HTML instead of JSON. Endpoint may not exist: ${endpoint}` };
      }
      return { ok: false, error: `Invalid JSON response: ${responseText.substring(0, 200)}` };
    }
    
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function runFullFlowTest() {
  console.log('🧪 Starting End-to-End Integration Test\n');
  console.log('Configuration:');
  console.log(`  API URL: ${API_BASE_URL}`);
  console.log(`  NFT Contract: ${NFT_CONTRACT}`);
  console.log(`  TPX Contract: ${TPX_CONTRACT}`);
  console.log(`  RPC URL: ${RPC_URL}`);
  console.log(`  Test Wallet: ${TEST_WALLET}\n`);

  if (!NFT_CONTRACT || !TPX_CONTRACT) {
    console.error('❌ Contract addresses not set in environment variables');
    process.exit(1);
  }

  // Step 1: Create user
  console.log('Step 1: Creating test user...');
  const userResult = await apiCall('/api/users/get-or-create', 'POST', { walletAddress: TEST_WALLET });
  logTest('User created', userResult.ok && userResult.data?.user?.id, !userResult.ok ? new Error(userResult.data?.error || 'Failed to create user') : null);
  
  if (!userResult.ok || !userResult.data?.user?.id) {
    console.error('❌ Cannot continue without user. Exiting...');
    printSummary();
    process.exit(1);
  }

  const userId = userResult.data.user.id;
  console.log(`   User ID: ${userId}`);

  // Step 2: Check initial balances
  console.log('\nStep 2: Checking initial balances...');
  const initialTPXBalance = await getTokenBalance(TEST_WALLET);
  const initialNFTBalance = await getNFTBalance(TEST_WALLET);
  console.log(`   Initial TPX Balance: ${initialTPXBalance !== null ? initialTPXBalance.toFixed(4) : 'N/A'} TPX`);
  console.log(`   Initial NFT Balance: ${initialNFTBalance !== null ? initialNFTBalance : 'N/A'}`);

  // Step 3: Get or create a quest
  console.log('\nStep 3: Finding quests...');
  const questsResult = await apiCall('/api/quests');
  const quests = questsResult.data?.quests || questsResult.data || [];
  console.log(`   Found ${quests.length} quest(s)`);
  
  let testQuest = null;
  if (quests.length > 0) {
    testQuest = quests[0];
    console.log(`   Using quest: ${testQuest.title} (ID: ${testQuest.id})`);
  } else {
    console.log('   ⚠️  No quests available. Skipping quest-related tests.');
  }

  // Step 4: Complete quest (if available)
  let questCompleted = false;
  if (testQuest) {
    console.log('\nStep 4: Completing quest...');
    const completeResult = await apiCall('/api/quests/complete', 'POST', {
      userId,
      questId: testQuest.id,
      verificationResult: {
        verified: true,
        confidence: 0.95,
        reasoning: 'E2E test verification'
      }
    });
    
    questCompleted = completeResult.ok;
    logTest('Quest completed', questCompleted, !questCompleted ? new Error(completeResult.data?.error || 'Failed to complete quest') : null);
    
    if (questCompleted) {
      console.log(`   XP Earned: ${completeResult.data?.xp || 'N/A'}`);
      console.log(`   Tokens Earned: ${completeResult.data?.tokens || 'N/A'} TPX`);
    }
  }

  // Step 5: Claim rewards
  console.log('\nStep 5: Claiming rewards...');
  const claimResult = await apiCall('/api/web3/claim-rewards', 'POST', {
    userId,
    walletAddress: TEST_WALLET
  });
  
  let tokensClaimed = false;
  if (claimResult.ok && claimResult.data?.txHash) {
    tokensClaimed = true;
    logTransaction('Token Claim', claimResult.data.txHash, {
      amount: claimResult.data.amount
    });
    logTest('Tokens claimed successfully', true);
  } else {
    logTest('Tokens claimed', false, new Error(claimResult.data?.error || 'No pending claims'));
    console.log('   Note: This is expected if user has no pending claims');
  }

  // Wait for transaction confirmation
  if (tokensClaimed) {
    console.log('\n⏳ Waiting for token transfer confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const txConfirmed = await checkTransactionOnBlockchain(claimResult.data.txHash);
    logTest('Token transfer confirmed on blockchain', txConfirmed);
    
    const afterClaimBalance = await getTokenBalance(TEST_WALLET);
    if (afterClaimBalance !== null && initialTPXBalance !== null) {
      const increase = afterClaimBalance - initialTPXBalance;
      console.log(`   Balance after claim: ${afterClaimBalance.toFixed(4)} TPX (increase: ${increase.toFixed(4)} TPX)`);
    }
  }

  // Step 6: Mint NFT Passport
  console.log('\nStep 6: Minting NFT Passport...');
  const mintPassportResult = await apiCall('/api/web3/mint-passport', 'POST', {
    userId,
    walletAddress: TEST_WALLET,
    tier: 'bronze'
  });
  
  let passportMinted = false;
  if (mintPassportResult.ok && mintPassportResult.data?.txHash) {
    passportMinted = true;
    logTransaction('NFT Passport Mint', mintPassportResult.data.txHash, {
      tokenId: mintPassportResult.data.tokenId
    });
    logTest('NFT Passport minted successfully', true);
  } else {
    const error = mintPassportResult.data?.error || 'Unknown error';
    if (error.includes('already has')) {
      console.log('   ⚠️  User already has NFT Passport (this is OK for testing)');
      logTest('NFT Passport check', true);
    } else {
      logTest('NFT Passport minted', false, new Error(error));
    }
  }

  // Wait for transaction confirmation
  if (passportMinted) {
    console.log('\n⏳ Waiting for passport mint confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const txConfirmed = await checkTransactionOnBlockchain(mintPassportResult.data.txHash);
    logTest('Passport mint confirmed on blockchain', txConfirmed);
    
    const afterPassportBalance = await getNFTBalance(TEST_WALLET);
    console.log(`   NFT Balance after passport: ${afterPassportBalance !== null ? afterPassportBalance : 'N/A'}`);
  }

  // Step 7: Mint Achievement NFT (if quest was completed and has NFT reward)
  let achievementMinted = false;
  if (testQuest && testQuest.nft_reward && questCompleted) {
    console.log('\nStep 7: Minting Achievement NFT...');
    const mintAchievementResult = await apiCall('/api/web3/mint-achievement', 'POST', {
      userId,
      questId: testQuest.id,
      walletAddress: TEST_WALLET
    });
    
    if (mintAchievementResult.ok && mintAchievementResult.data?.txHash) {
      achievementMinted = true;
      logTransaction('Achievement NFT Mint', mintAchievementResult.data.txHash, {
        tokenId: mintAchievementResult.data.tokenId
      });
      logTest('Achievement NFT minted successfully', true);
    } else {
      const error = mintAchievementResult.data?.error || 'Unknown error';
      if (error.includes('already minted')) {
        console.log('   ⚠️  Achievement NFT already minted (this is OK for testing)');
        logTest('Achievement NFT check', true);
      } else {
        logTest('Achievement NFT minted', false, new Error(error));
      }
    }

    // Wait for transaction confirmation
    if (achievementMinted) {
      console.log('\n⏳ Waiting for achievement mint confirmation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const txConfirmed = await checkTransactionOnBlockchain(mintAchievementResult.data.txHash);
      logTest('Achievement mint confirmed on blockchain', txConfirmed);
    }
  } else {
    console.log('\nStep 7: Skipping Achievement NFT (quest not completed or no NFT reward)');
  }

  // Step 8: Final balance check
  console.log('\nStep 8: Final balance verification...');
  const finalTPXBalance = await getTokenBalance(TEST_WALLET);
  const finalNFTBalance = await getNFTBalance(TEST_WALLET);
  
  console.log(`   Final TPX Balance: ${finalTPXBalance !== null ? finalTPXBalance.toFixed(4) : 'N/A'} TPX`);
  console.log(`   Final NFT Balance: ${finalNFTBalance !== null ? finalNFTBalance : 'N/A'}`);
  
  if (initialTPXBalance !== null && finalTPXBalance !== null && tokensClaimed) {
    const tpxIncrease = finalTPXBalance - initialTPXBalance;
    logTest('TPX balance increased', tpxIncrease > 0, tpxIncrease <= 0 ? new Error('TPX balance did not increase') : null);
  }
  
  if (initialNFTBalance !== null && finalNFTBalance !== null) {
    const nftIncrease = finalNFTBalance - initialNFTBalance;
    const expectedIncrease = (passportMinted ? 1 : 0) + (achievementMinted ? 1 : 0);
    logTest(
      `NFT balance increased by ${expectedIncrease}`,
      nftIncrease === expectedIncrease,
      nftIncrease !== expectedIncrease ? new Error(`Expected ${expectedIncrease}, got ${nftIncrease}`) : null
    );
  }

  // Step 9: Verify all transactions on blockchain
  console.log('\nStep 9: Verifying all transactions on blockchain...');
  for (const tx of testResults.transactions) {
    const confirmed = await checkTransactionOnBlockchain(tx.txHash);
    logTest(`${tx.type} transaction confirmed`, confirmed, !confirmed ? new Error('Transaction not found or failed') : null);
  }

  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 End-to-End Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.transactions.length > 0) {
    console.log('\n📝 Transactions:');
    testResults.transactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. ${tx.type}`);
      console.log(`     Hash: ${tx.txHash}`);
      console.log(`     Etherscan: https://sepolia.etherscan.io/tx/${tx.txHash}`);
      if (tx.details.tokenId) {
        console.log(`     Token ID: ${tx.details.tokenId}`);
      }
      if (tx.details.amount) {
        console.log(`     Amount: ${tx.details.amount} TPX`);
      }
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.test}: ${err.error}`);
    });
  }
  
  console.log('='.repeat(60));
}

// Run tests
runFullFlowTest().catch(error => {
  console.error('❌ Fatal error:', error);
  printSummary();
  process.exit(1);
});

