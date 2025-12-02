import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Search, Filter, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllTransactions } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminTransactions: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    userId: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadTransactions();
  }, [adminUser, page, filters]);

  const loadTransactions = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminTransactions] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminTransactions] Loading transactions with wallet:', adminUser.wallet_address);
      const response = await getAllTransactions({
        userId: filters.userId || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        limit,
        offset: (page - 1) * limit,
      }, adminUser.wallet_address);
      
      console.log('[AdminTransactions] Response:', response);
      
      if (response && response.transactions) {
        // Filter by search if provided
        let filtered = response.transactions;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter((tx: any) => 
            tx.tx_hash?.toLowerCase().includes(searchLower) ||
            tx.from_address?.toLowerCase().includes(searchLower) ||
            tx.to_address?.toLowerCase().includes(searchLower) ||
            tx.users?.wallet_address?.toLowerCase().includes(searchLower)
          );
        }
        setTransactions(filtered);
        setTotal(response.total || 0);
      } else {
        console.warn('[AdminTransactions] Unexpected response format:', response);
        setTransactions([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      alert(`Failed to load transactions: ${error.message || 'Unknown error'}`);
      setTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const getExplorerLink = (txHash: string) => {
    // Check if it's Sepolia or Base Sepolia
    const isSepolia = true; // Default to Sepolia
    if (isSepolia) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return `https://basescan.org/tx/${txHash}`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Type', 'From Address', 'To Address', 'Amount', 'Status', 'TX Hash', 'Block', 'Gas Used', 'IP Address'];
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleString(),
      tx.users?.username || tx.users?.wallet_address?.substring(0, 10) || 'Unknown',
      tx.transaction_type,
      tx.from_address || 'N/A',
      tx.to_address || 'N/A',
      tx.amount || 0,
      tx.status,
      tx.tx_hash || 'N/A',
      tx.block_number || 'N/A',
      tx.gas_used || 'N/A',
      tx.ip_address || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Transactions</h2>
          <p className="text-gray-400">All blockchain transactions with full details</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by TX hash, address..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Types</option>
            <option value="claim">Claim</option>
            <option value="burn">Burn</option>
            <option value="reward">Reward</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="text"
            placeholder="User ID"
            value={filters.userId}
            onChange={(e) => {
              setFilters({ ...filters, userId: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden p-4">
            <ScrollableTable minWidth="1200px">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">From Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">To Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">TX Hash</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Block</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Gas</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">IP Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-gray-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{tx.users?.username || tx.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {tx.users?.wallet_address?.substring(0, 10) || 'N/A'}...
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {tx.from_address ? (
                            <p className="font-mono text-xs text-gray-300">
                              {tx.from_address.substring(0, 10)}...{tx.from_address.substring(tx.from_address.length - 8)}
                            </p>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {tx.to_address ? (
                            <p className="font-mono text-xs text-gray-300">
                              {tx.to_address.substring(0, 10)}...{tx.to_address.substring(tx.to_address.length - 8)}
                            </p>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium">{tx.amount || 0} TPX</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {tx.tx_hash ? (
                            <a
                              href={getExplorerLink(tx.tx_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs"
                            >
                              <span>{tx.tx_hash.substring(0, 10)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {tx.block_number ? tx.block_number.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {tx.gas_used ? `${tx.gas_used.toLocaleString()} (${tx.gas_price ? (tx.gas_used * tx.gas_price / 1e18).toFixed(6) : 'N/A'} ETH)` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                          {tx.ip_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedTransaction(tx)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} transactions
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{selectedTransaction.tx_hash || 'N/A'}</p>
                      {selectedTransaction.tx_hash && (
                        <a
                          href={getExplorerLink(selectedTransaction.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedTransaction.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      selectedTransaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">From Address</p>
                    <p className="font-mono text-sm">{selectedTransaction.from_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">To Address</p>
                    <p className="font-mono text-sm">{selectedTransaction.to_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Amount</p>
                    <p className="font-medium">{selectedTransaction.amount || 0} TPX</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Type</p>
                    <p>{selectedTransaction.transaction_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Block Number</p>
                    <p>{selectedTransaction.block_number ? selectedTransaction.block_number.toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Gas Used</p>
                    <p>{selectedTransaction.gas_used ? selectedTransaction.gas_used.toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Gas Price</p>
                    <p>{selectedTransaction.gas_price ? `${(selectedTransaction.gas_price / 1e9).toFixed(2)} Gwei` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">IP Address</p>
                    <p className="font-mono text-sm">{selectedTransaction.ip_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User</p>
                    <p>{selectedTransaction.users?.username || selectedTransaction.users?.wallet_address || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Created At</p>
                    <p>{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                  </div>
                  {selectedTransaction.blockchain_confirmed_at && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Confirmed At</p>
                      <p>{new Date(selectedTransaction.blockchain_confirmed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Metadata</p>
                    <pre className="text-xs bg-gray-900/50 p-3 rounded overflow-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
