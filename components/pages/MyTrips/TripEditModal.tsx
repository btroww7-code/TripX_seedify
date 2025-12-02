import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { updateTrip } from '../../../services/tripService';

interface TripEditModalProps {
  trip: any;
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

export const TripEditModal: React.FC<TripEditModalProps> = ({ trip, userId, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination: trip.destination || '',
    duration_days: trip.duration_days || 3,
    budget: trip.budget || 'medium',
    interests: trip.interests || [],
    notes: trip.notes || '',
  });

  const interestOptions = ['food', 'culture', 'nature', 'nightlife', 'adventure', 'shopping'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateTrip(trip.id, userId, formData);
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating trip:', error);
      alert(error.message || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl p-6"
        style={{
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Trip</h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-xl backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Destination
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.duration_days}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
              className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Budget
            </label>
            <select
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="low">Low Budget</option>
              <option value="medium">Medium Budget</option>
              <option value="high">High Budget</option>
            </select>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Interests
            </label>
            <div className="grid grid-cols-3 gap-2">
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.interests.includes(interest)
                      ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-300'
                      : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
                  } border backdrop-blur-xl`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              placeholder="Add any notes about your trip..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl font-medium backdrop-blur-xl bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
