import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, X, Save } from 'lucide-react';
import { getAllQuests, createQuest, updateQuest, deleteQuest, toggleQuest } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminQuests: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    difficulty: '1',
    reward_tokens: '10',
    reward_xp: '100',
    quest_type: 'standard',
    category: '',
    sponsor_name: '',
    is_active: true,
    is_permanent: false,
    auto_add_to_dashboard: false,
  });

  useEffect(() => {
    loadQuests();
  }, [adminUser]);

  const loadQuests = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminQuests] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminQuests] Loading quests with wallet:', adminUser.wallet_address);
      const response = await getAllQuests({ limit: 100 }, adminUser.wallet_address);
      
      console.log('[AdminQuests] Response:', response);
      
      if (response && response.quests) {
        setQuests(response.quests);
      } else {
        console.warn('[AdminQuests] Unexpected response format:', response);
        setQuests([]);
      }
    } catch (error: any) {
      console.error('Error loading quests:', error);
      alert(`Failed to load quests: ${error.message || 'Unknown error'}`);
      setQuests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuest = async () => {
    if (!formData.title || !formData.description || !formData.location || !formData.latitude || !formData.longitude) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const questData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        difficulty: parseInt(formData.difficulty),
        reward_tokens: parseFloat(formData.reward_tokens),
        reward_xp: parseInt(formData.reward_xp),
        quest_type: formData.quest_type,
        category: formData.category || null,
        sponsor_name: formData.sponsor_name || null,
        is_active: formData.is_active,
        is_permanent: formData.is_permanent,
      };

      const response = await createQuest(questData, adminUser?.wallet_address);
      
      if (response && response.quest) {
        alert('Quest created successfully!');
        setShowCreateModal(false);
        resetForm();
        loadQuests();
      }
    } catch (error: any) {
      console.error('Error creating quest:', error);
      alert(`Failed to create quest: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateQuest = async () => {
    if (!editingQuest) return;

    try {
      const questData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        difficulty: parseInt(formData.difficulty),
        reward_tokens: parseFloat(formData.reward_tokens),
        reward_xp: parseInt(formData.reward_xp),
        quest_type: formData.quest_type,
        category: formData.category || null,
        sponsor_name: formData.sponsor_name || null,
        is_active: formData.is_active,
        is_permanent: formData.is_permanent,
      };

      const response = await updateQuest(editingQuest.id, questData, adminUser?.wallet_address);
      
      if (response && response.quest) {
        alert('Quest updated successfully!');
        setShowEditModal(false);
        setEditingQuest(null);
        resetForm();
        loadQuests();
      }
    } catch (error: any) {
      console.error('Error updating quest:', error);
      alert(`Failed to update quest: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    if (!confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteQuest(questId, adminUser?.wallet_address);
      alert('Quest deleted successfully!');
      loadQuests();
    } catch (error: any) {
      console.error('Error deleting quest:', error);
      alert(`Failed to delete quest: ${error.message || 'Unknown error'}`);
    }
  };

  const handleToggle = async (questId: string) => {
    try {
      await toggleQuest(questId, adminUser?.wallet_address || undefined);
      loadQuests();
    } catch (error) {
      console.error('Error toggling quest:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      latitude: '',
      longitude: '',
      difficulty: '1',
      reward_tokens: '10',
      reward_xp: '100',
      quest_type: 'standard',
      category: '',
      sponsor_name: '',
      is_active: true,
      is_permanent: false,
      auto_add_to_dashboard: false,
    });
  };

  const openEditModal = (quest: any) => {
    setEditingQuest(quest);
    setFormData({
      title: quest.title || '',
      description: quest.description || '',
      location: quest.location || '',
      latitude: quest.latitude?.toString() || '',
      longitude: quest.longitude?.toString() || '',
      difficulty: quest.difficulty?.toString() || '1',
      reward_tokens: quest.reward_tokens?.toString() || '10',
      reward_xp: quest.reward_xp?.toString() || '100',
      quest_type: quest.quest_type || 'standard',
      category: quest.category || '',
      sponsor_name: quest.sponsor_name || '',
      is_active: quest.is_active !== false,
      is_permanent: quest.is_permanent || false,
      auto_add_to_dashboard: false,
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Quests Management</h2>
          <p className="text-gray-400">Manage all platform quests</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Quest
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden p-4">
          <ScrollableTable minWidth="1000px">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Reward</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {quests.map((quest) => (
                  <tr key={quest.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <p className="font-medium">{quest.title}</p>
                      <p className="text-xs text-gray-400">{quest.description?.substring(0, 50)}...</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{quest.location}</td>
                    <td className="px-6 py-4">
                      <p>{quest.reward_tokens} TPX</p>
                      <p className="text-xs text-gray-400">{quest.reward_xp} XP</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                        {quest.quest_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(quest.id)}
                        className="flex items-center gap-2"
                      >
                        {quest.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-xs ${
                          quest.is_active ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {quest.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedQuest(quest)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(quest)}
                          className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                          title="Edit Quest"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuest(quest.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete Quest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}

      {/* Create Quest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Create New Quest</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reward Tokens</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.reward_tokens}
                      onChange={(e) => setFormData({ ...formData, reward_tokens: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reward XP</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reward_xp}
                      onChange={(e) => setFormData({ ...formData, reward_xp: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Quest Type</label>
                    <select
                      value={formData.quest_type}
                      onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="sponsored">Sponsored</option>
                      <option value="hidden_gem">Hidden Gem</option>
                      <option value="secret">Secret</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sponsor Name</label>
                    <input
                      type="text"
                      value={formData.sponsor_name}
                      onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_permanent}
                      onChange={(e) => setFormData({ ...formData, is_permanent: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">Permanent</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.auto_add_to_dashboard}
                      onChange={(e) => setFormData({ ...formData, auto_add_to_dashboard: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">Auto-add to Dashboard</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateQuest}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Create Quest
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Quest Modal */}
      {showEditModal && editingQuest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Edit Quest</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingQuest(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reward Tokens</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.reward_tokens}
                      onChange={(e) => setFormData({ ...formData, reward_tokens: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reward XP</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reward_xp}
                      onChange={(e) => setFormData({ ...formData, reward_xp: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Quest Type</label>
                    <select
                      value={formData.quest_type}
                      onChange={(e) => setFormData({ ...formData, quest_type: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="sponsored">Sponsored</option>
                      <option value="hidden_gem">Hidden Gem</option>
                      <option value="secret">Secret</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sponsor Name</label>
                    <input
                      type="text"
                      value={formData.sponsor_name}
                      onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_permanent}
                      onChange={(e) => setFormData({ ...formData, is_permanent: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300">Permanent</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingQuest(null);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateQuest}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Update Quest
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quest Details Modal */}
      {selectedQuest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Quest Details</h3>
                <button
                  onClick={() => setSelectedQuest(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Title</p>
                  <p className="font-medium text-lg">{selectedQuest.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Description</p>
                  <p>{selectedQuest.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Location</p>
                    <p>{selectedQuest.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Coordinates</p>
                    <p className="font-mono text-sm">{selectedQuest.latitude}, {selectedQuest.longitude}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Difficulty</p>
                    <p>{selectedQuest.difficulty}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Reward</p>
                    <p>{selectedQuest.reward_tokens} TPX + {selectedQuest.reward_xp} XP</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Type</p>
                    <p>{selectedQuest.quest_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Category</p>
                    <p>{selectedQuest.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedQuest.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedQuest.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Permanent</p>
                    <p>{selectedQuest.is_permanent ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {selectedQuest.sponsor_name && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Sponsor</p>
                    <p>{selectedQuest.sponsor_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created At</p>
                  <p>{new Date(selectedQuest.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
