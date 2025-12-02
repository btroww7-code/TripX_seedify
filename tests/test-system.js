#!/usr/bin/env node

/**
 * TripX System - Automated Test Suite
 * Tests the complete NFT & Token system end-to-end
 */

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3002';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'success' : 'error';
  log(`${icon} ${name}${details ? ': ' + details : ''}`, color);
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function testBackendHealth() {
  log('\n🧪 Test 1: Backend Health Check', 'info');
  try {
    const response = await httpGet(`${BACKEND_URL}/api/health`);
    
    if (response.data && response.data.status === 'ok') {
      logTest('Backend Health Check', true, `${response.data.service}`);
      return true;
    } else if (response.status === 404) {
      logTest('Backend Health Check', false, 'Backend not running - start with: cd server && npm start');
      return false;
    } else {
      logTest('Backend Health Check', false, 'Invalid response');
      return false;
    }
  } catch (error) {
    logTest('Backend Health Check', false, `Backend not running: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🧪 Test 2: Database Connection', 'info');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (!error) {
      logTest('Database Connection', true, 'Supabase connected');
      return true;
    } else {
      logTest('Database Connection', false, error.message);
      return false;
    }
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

async function testDatabaseTables() {
  log('\n🧪 Test 3: Required Database Tables', 'info');
  
  const requiredTables = [
    'users',
    'quests',
    'user_quests',
    'token_transactions',
    'nft_transactions',
    'nft_passports',
    'pending_claims',
    'user_profile_history'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        logTest(`Table: ${table}`, true);
      } else {
        logTest(`Table: ${table}`, false, error.message);
        allTablesExist = false;
      }
    } catch (error) {
      logTest(`Table: ${table}`, false, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testRPCFunctions() {
  log('\n🧪 Test 4: RPC Functions', 'info');
  
  const rpcFunctions = [
    'log_token_transaction',
    'log_nft_transaction',
    'update_user_xp',
    'add_pending_reward',
    'get_user_nft_passport'
  ];
  
  let allFunctionsExist = true;
  
  for (const func of rpcFunctions) {
    try {
      // Try to call function with dummy data to check if it exists
      // This will fail but if function doesn't exist, error message will be different
      const { error } = await supabase.rpc(func, {});
      
      // Function exists if we get parameter error or success
      if (!error || error.message.includes('parameter') || error.message.includes('argument')) {
        logTest(`RPC Function: ${func}`, true);
      } else if (error.message.includes('does not exist')) {
        logTest(`RPC Function: ${func}`, false, 'Function not found');
        allFunctionsExist = false;
      } else {
        logTest(`RPC Function: ${func}`, true, 'Exists (got expected error)');
      }
    } catch (error) {
      logTest(`RPC Function: ${func}`, false, error.message);
      allFunctionsExist = false;
    }
  }
  
  return allFunctionsExist;
}

async function testContractAddresses() {
  log('\n🧪 Test 5: Smart Contract Configuration', 'info');
  
  const tpxAddress = process.env.VITE_TPX_CONTRACT_ADDRESS;
  const nftAddress = process.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS;
  const adminAddress = process.env.VITE_ADMIN_WALLET_ADDRESS;
  
  logTest('TPX Contract Address', !!tpxAddress, tpxAddress || 'Not configured');
  logTest('NFT Contract Address', !!nftAddress, nftAddress || 'Not configured');
  logTest('Admin Wallet Address', !!adminAddress, adminAddress || 'Not configured');
  
  return !!(tpxAddress && nftAddress && adminAddress);
}

async function testAPIEndpoints() {
  log('\n🧪 Test 6: API Endpoints', 'info');
  
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/quests/health', method: 'GET' },
    { path: '/api/web3/balance/0x0000000000000000000000000000000000000000', method: 'GET' }
  ];
  
  let allEndpointsWork = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await httpGet(`${BACKEND_URL}${endpoint.path}`);
      
      if (response.status && response.status < 500) {
        logTest(`${endpoint.method} ${endpoint.path}`, true, `Status: ${response.status}`);
      } else if (!response.status) {
        logTest(`${endpoint.method} ${endpoint.path}`, false, 'Backend not running');
        allEndpointsWork = false;
      } else {
        logTest(`${endpoint.method} ${endpoint.path}`, false, `Status: ${response.status}`);
        allEndpointsWork = false;
      }
    } catch (error) {
      logTest(`${endpoint.method} ${endpoint.path}`, false, 'Backend not running');
      allEndpointsWork = false;
    }
  }
  
  return allEndpointsWork;
}

async function testEnvironmentVariables() {
  log('\n🧪 Test 7: Environment Variables', 'info');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'BASE_SEPOLIA_RPC_URL',
    'ADMIN_WALLET_PRIVATE_KEY',
    'VITE_TPX_CONTRACT_ADDRESS',
    'VITE_NFT_PASSPORT_CONTRACT_ADDRESS',
    'VITE_ADMIN_WALLET_ADDRESS'
  ];
  
  let allVarsSet = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      // Don't log sensitive values
      const isSensitive = varName.includes('KEY') || varName.includes('PRIVATE');
      logTest(`Env: ${varName}`, true, isSensitive ? '***' : value.substring(0, 20) + '...');
    } else {
      logTest(`Env: ${varName}`, false, 'Not set');
      allVarsSet = false;
    }
  }
  
  return allVarsSet;
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'info');
  log('📊 TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  
  log(`\nTotal Tests: ${testResults.passed + testResults.failed}`);
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`, successRate === '100.0' ? 'success' : 'warning');
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! System is ready.', 'success');
    log('\n✅ Next Steps:', 'info');
    log('  1. Deploy smart contracts: cd contracts && npm run deploy');
    log('  2. Run database migration in Supabase');
    log('  3. Start frontend: npm run dev');
    log('  4. Test in browser: http://localhost:5173');
  } else {
    log('\n⚠️  Some tests failed. Please fix the issues above.', 'warning');
    log('\n📚 Check the documentation:');
    log('  - QUICK_START_NFT.md');
    log('  - NFT_SYSTEM_DEPLOYMENT_GUIDE.md');
  }
}

async function runAllTests() {
  log('🚀 TripX System - Automated Test Suite', 'info');
  log('='.repeat(60) + '\n', 'info');
  
  await testEnvironmentVariables();
  await testBackendHealth();
  await testDatabaseConnection();
  await testDatabaseTables();
  await testRPCFunctions();
  await testContractAddresses();
  await testAPIEndpoints();
  
  await printSummary();
  
  // Exit with error code if tests failed
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
