import React, { useState, useEffect } from 'react';
import { Database, Coins, Shield } from 'lucide-react';
import { getBlockchainStats } from '../../../services/adminBlockchainService';

export const AdminBlockchain: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('[AdminBlockchain] Loading blockchain stats...');
      const data = await getBlockchainStats();
      console.log('[AdminBlockchain] Stats loaded:', data);
      setStats(data);
    } catch (error: any) {
      console.error('Error loading blockchain stats:', error);
      alert(`Failed to load blockchain stats: ${error.message || 'Unknown error'}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Blockchain Statistics</h2>
        <p className="text-gray-400">TPX Token and NFT Passport statistics</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TPX Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <Coins className="w-8 h-8 text-cyan-400" />
              <h3 className="text-xl font-bold">TPX Token</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Total Supply</p>
                <p className="text-2xl font-bold">{stats.tpx.totalSupply} TPX</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Decimals</p>
                <p className="text-lg">{stats.tpx.decimals}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Contract Address</p>
                <p className="text-xs font-mono text-cyan-400 break-all">{stats.tpx.contractAddress}</p>
              </div>
            </div>
          </div>

          {/* NFT Passport Stats */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
              <h3 className="text-xl font-bold">NFT Passports</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Total Mints</p>
                <p className="text-2xl font-bold">{stats.nftPassport.totalSupply}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Tier Distribution</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-gray-900/50 p-2 rounded">
                    <p className="text-xs text-gray-400">Bronze</p>
                    <p className="font-bold">{stats.nftPassport.tierDistribution.bronze}</p>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <p className="text-xs text-gray-400">Silver</p>
                    <p className="font-bold">{stats.nftPassport.tierDistribution.silver}</p>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <p className="text-xs text-gray-400">Gold</p>
                    <p className="font-bold">{stats.nftPassport.tierDistribution.gold}</p>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <p className="text-xs text-gray-400">Platinum</p>
                    <p className="font-bold">{stats.nftPassport.tierDistribution.platinum}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Contract Address</p>
                <p className="text-xs font-mono text-purple-400 break-all">{stats.nftPassport.contractAddress}</p>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-8 h-8 text-green-400" />
              <h3 className="text-xl font-bold">Network Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Network</p>
                <p className="font-bold">{stats.network.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Chain ID</p>
                <p className="font-bold">{stats.network.chainId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">RPC URL</p>
                <p className="text-xs font-mono text-green-400 break-all">{stats.network.rpcUrl}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

