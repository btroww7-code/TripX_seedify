import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Camera,
  Check,
  Clock,
  Coins,
  Loader2,
  X,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Star,
  Award,
  Zap,
  ExternalLink,
  DollarSign,
  Navigation,
  Trash2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { getUserQuests } from '../../../services/questCompletionService';
import { verifyQuestPhoto } from '../../../services/questPhotoVerification';
import { completeQuestAPI } from '../../../services/questApiClient';
import { claimQuestRewardAPI } from '../../../services/web3ApiClient';
import { deleteUserQuest } from '../../../services/questService';
import { supabase } from '../../../lib/supabase';
import { AddNFTToWalletModal } from '../../AddNFTToWalletModal';
import { AttractionMapbox } from '../../AttractionMapbox';
import { QuestDetailsModal } from '../../QuestDetailsModal';
import { 
  monitorTPXTransaction, 
  monitorNFTTransaction,
  getCurrentBlockNumber, 
  getEtherscanTokenTxUrl,
  getEtherscanNFTTxUrl,
  getEtherscanTxUrl,
  type TransactionMonitorResult 
} from '../../../services/etherscanMonitor';
// ClaimTokensButton removed

interface MyQuestsProps {
  onNavigate?: (page: string) => void;
}

export const MyQuests: React.FC<MyQuestsProps> = ({ onNavigate }) => {
  const { user: walletUser, address, isConnected: isWalletConnected } = useWalletAuth();
  const { user: emailUser, isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const user = walletUser || emailUser;
  const isLoggedIn = isWalletConnected || isEmailAuthenticated;

  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [mintingNFT, setMintingNFT] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [questDetailsModal, setQuestDetailsModal] = useState<any>(null);
  const [deletingQuest, setDeletingQuest] = useState<string | null>(null);
  const [showAddNFTModal, setShowAddNFTModal] = useState(false);
  const [achievementMintResult, setAchievementMintResult] = useState<{tokenId: number, txHash: string, contractAddress: string, questTitle: string} | null>(null);
  
  // Track minted NFTs in this session to prevent double-minting
  const mintedNFTsRef = useRef<Set<string>>(new Set());
  
  // Transaction monitoring state
  const [monitoringTransaction, setMonitoringTransaction] = useState(false);
  const [monitorAttempts, setMonitorAttempts] = useState(0);

  // Debug: Log when quests state changes
  useEffect(() => {
    console.log('[MyQuests] Quests state updated. Total:', quests.length);
    quests.forEach((q, i) => {
      // Log all completed quests with their nft_reward status
      if (q.status === 'completed' || q.status === 'verified') {
        console.log(`  [${i}] ${q.quests?.title}: status=${q.status}, nft_reward=${q.quests?.nft_reward}, nft_minted=${q.nft_minted}, token_id=${q.nft_token_id}`);
      }
    });
  }, [quests]);

  useEffect(() => {
    if (!isLoggedIn) {
      setQuests([]);
      setLoading(false);
      return;
    }

    if (user) {
      // User is logged in and loaded - load quests immediately
      console.log('[MyQuests] User loaded, loading quests...', user.id);
      loadQuests();
      getUserLocation();
    } else {
      // User is logged in but data not loaded yet - wait and retry with multiple attempts
      console.log('[MyQuests] Waiting for user data...');
      let attempts = 0;
      const maxAttempts = 5;
      
      const checkUser = () => {
        attempts++;
        if (user) {
          console.log('[MyQuests] User loaded after wait, loading quests...', user.id);
          loadQuests();
          getUserLocation();
        } else if (attempts < maxAttempts) {
          console.log(`[MyQuests] Retry ${attempts}/${maxAttempts} - waiting for user...`);
          setTimeout(checkUser, 1000);
        } else {
          console.log('[MyQuests] User still not loaded after all attempts');
          setLoading(false);
        }
      };
      
      const timer = setTimeout(checkUser, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  const loadQuests = async () => {
    if (!user) {
      console.log('[MyQuests] No user - cannot load quests');
      return;
    }
    
    console.log('[MyQuests] Loading quests for user:', user.id);
    console.log('[MyQuests] User wallet:', user.wallet_address);
    
    setLoading(true);
    try {
      // Check if we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[MyQuests] Current session:', session ? 'Active' : 'None');
      
      if (!session) {
        console.warn('[MyQuests] No active session - quests may not load');
      }
      
      const userQuests = await getUserQuests(user.id, {});
      console.log('[MyQuests] Quests loaded:', userQuests?.length || 0);
      
      if (userQuests && userQuests.length > 0) {
        console.log('[MyQuests] Sample quest:', {
          id: userQuests[0].id,
          title: userQuests[0].quests?.title,
          status: userQuests[0].status,
          nft_minted: userQuests[0].nft_minted,
          nft_token_id: userQuests[0].nft_token_id
        });
      }
      
      setQuests(userQuests || []);
    } catch (error: any) {
      console.error('[MyQuests] Error loading quests:', error);
      console.error('[MyQuests] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      setQuests([]);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location not available:', error);
        }
      );
    }
  };

  /**
   * Add TPX token to MetaMask
   */
  const addTPXToMetaMask = async (amount?: number) => {
    if (!window.ethereum || !address) {
      console.log('[TPX] MetaMask not available');
      return;
    }

    const tpxContractAddress = import.meta.env.VITE_TPX_CONTRACT_ADDRESS;
    if (!tpxContractAddress) {
      console.error('[TPX] Contract address not configured');
      return;
    }

    try {
      // Check if user already has TPX in MetaMask
      const storageKey = `tpx_added_${address.toLowerCase()}`;
      const hasAddedBefore = localStorage.getItem(storageKey);

      if (!hasAddedBefore) {
        console.log('[TPX] Prompting user to add TPX to MetaMask...');
        
        const wasAdded = await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: tpxContractAddress,
              symbol: 'TPX',
              decimals: 18,
              image: 'https://jjzksgzieuguuolfcekk.supabase.co/storage/v1/object/public/assets/tpx-logo.png',
            },
          },
        });

        if (wasAdded) {
          localStorage.setItem(storageKey, 'true');
          console.log('[TPX] ✅ TPX token added to MetaMask!');
          
          toast.success('TPX token added to MetaMask!', {
            description: amount ? `${amount} TPX tokens are now visible in your wallet` : undefined,
            duration: 5000
          });
        }
      } else {
        console.log('[TPX] User already has TPX in MetaMask');
      }
    } catch (error: any) {
      console.error('[TPX] Error adding token to MetaMask:', error);
      
      // User rejected
      if (error.code === 4001) {
        console.log('[TPX] User rejected token addition');
      }
    }
  };

  /**
   * Add NFT to MetaMask wallet (for quest achievements)
   */
  const addNFTToMetaMaskForQuest = async (tokenId: number, questId: string) => {
    if (!window.ethereum || !address) {
      console.log('[MyQuests] MetaMask not available');
      return;
    }

    const nftContractAddress = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS;
    if (!nftContractAddress) {
      console.error('[MyQuests] NFT contract address not configured');
      return;
    }

    try {
      // Always prompt to add NFT (every time a new one is minted)
      console.log('[MyQuests] Prompting user to add NFT to MetaMask...');
      
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: nftContractAddress,
            tokenId: tokenId.toString(),
          },
        },
      });

      if (wasAdded) {
        const storageKey = `quest_nft_added_${address.toLowerCase()}_${questId}`;
        localStorage.setItem(storageKey, 'true');
        console.log('[MyQuests] ✅ NFT added to MetaMask!');
        
        toast.success('NFT added to MetaMask!', {
          description: `Token ID ${tokenId} is now visible in your wallet`,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('[MyQuests] Error adding NFT to MetaMask:', error);
      
      // User rejected
      if (error.code === 4001) {
        console.log('[MyQuests] User rejected NFT addition');
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedQuest) return;

    setPhotoFile(file);
    setUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingPhoto(false);
    }
  };

  const handleVerifyAndComplete = async () => {
    if (!selectedQuest || !photoFile || !user) {
      alert('Photo and authentication required');
      return;
    }

    // Prevent re-verification of completed quests
    if (selectedQuest.status === 'completed' || selectedQuest.status === 'verified') {
      toast.error('This quest has already been completed!');
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      // 1. Check authentication session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('[Quest] Session valid, uploading photo...');

      // 2. Upload photo with authenticated client
      const fileExt = photoFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${session.user.id}/${selectedQuest.quests.id}/${timestamp}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quest-proofs')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[Quest] Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('[Quest] Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('quest-proofs')
        .getPublicUrl(fileName);

      console.log('[Quest] Photo uploaded:', publicUrl);

      // 3. AI Verification - AUTO-ACCEPT for DEMO/HACKATHON
      console.log('[Quest] AUTO-ACCEPTING photo for demo (AI verification bypassed)');
      
      // Mock verification data for demo
      const verifyData = {
        verified: true,
        confidence: 1.0,
        reason: 'Auto-accepted for demo',
        data: {
          verified: true,
          confidence: 1.0,
          reason: 'Auto-accepted for hackathon demo'
        }
      };
      
      // For production, uncomment the following code:
      /*
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-quest', {
        body: {
          userQuestId: selectedQuest.id,
          imageUrl: publicUrl,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude
        }
      });

      if (verifyError) {
        console.error('[Quest] Verification error:', verifyError);
        throw new Error('Photo verification failed');
      }

      if (!verifyData?.verified) {
        throw new Error(verifyData?.reason || 'Photo does not match quest requirements');
      }
      */

      // 4. Complete quest (SIMPLIFIED - GPS verification skipped for hackathon)
      const result = await completeQuestAPI(
        user.id,
        selectedQuest.quests.id,
        {
          gps_verified: true, // Auto-pass for demo
          photo_verified: true,
          ai_verification: verifyData.data,
          distance: 0, // Demo mode
          accuracy: 10,
          timestamp: new Date().toISOString(),
          latitude: userLocation?.lat || selectedQuest.quests.latitude || 0,
          longitude: userLocation?.lng || selectedQuest.quests.longitude || 0,
        },
        publicUrl
      );

      if (result.success && result.data) {
        console.log('[Quest] ✅ Quest completed successfully!', result.data);
        
        const rewardTokens = result.data.rewards?.tokens || 0;
        const rewardXP = result.data.rewards?.xp || 0;
        
        // Always trigger user data refresh after quest completion (for XP/level updates)
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
          detail: { userId: user.id, walletAddress: address }
        }));
        
        // Show initial success message with XP
        setVerificationResult({
          verified: true,
          rewards: result.data.rewards,
          message: `✅ Quest completed!\n🎁 +${rewardXP} XP earned`,
        });

        // If TPX tokens were rewarded, claim them on blockchain and start monitoring
        if (rewardTokens > 0 && address) {
          console.log('[Quest] TPX tokens earned for this quest:', rewardTokens, 'TPX');
          
          // Show claiming toast
          const claimingToast = toast.loading(
            `💰 Sending ${rewardTokens} TPX tokens to your wallet...`,
            {
              description: 'Initiating blockchain transfer',
              duration: Infinity
            }
          );
          
          // Get current block BEFORE claiming to use for monitoring
          const startBlock = await getCurrentBlockNumber();
          
          // STEP 1: Claim tokens for THIS QUEST ONLY
          const claimResult = await claimQuestRewardAPI(
            user.id, 
            selectedQuest.quests.id, 
            address, 
            rewardTokens
          );
          
          if (!claimResult.success) {
            toast.dismiss(claimingToast);
            console.error('[Quest] Claim failed:', claimResult.error);
            // Still show success for quest completion, but note claim failed
            toast.warning('Quest completed but token claim failed', {
              description: claimResult.error || 'You can claim tokens later from Profile',
              duration: 8000
            });
            setTimeout(() => {
              setSelectedQuest(null);
              setPhotoPreview(null);
              setPhotoFile(null);
              setVerificationResult(null);
              loadQuests();
            }, 3000);
            return;
          }
          
          console.log('[Quest] ✅ Blockchain transfer initiated:', claimResult.data?.txHash);
          toast.dismiss(claimingToast);
          
          // STEP 2: Start monitoring Etherscan for confirmation
          const monitorToast = toast.loading(
            `🔍 Checking Sepolia explorer for TPX tokens...`,
            {
              description: 'Monitoring transaction every 2 seconds',
              duration: Infinity
            }
          );
          
          setMonitoringTransaction(true);
          setMonitorAttempts(0);
          
          // Start monitoring (60 seconds max)
          const monitorResult = await monitorTPXTransaction(
            address,
            (txResult: TransactionMonitorResult) => {
              console.log('[Quest] ✅ TPX transaction found on explorer!', txResult);
              
              // Dismiss monitoring toast
              toast.dismiss(monitorToast);
              
              // Show success toast
              toast.success('✅ TPX tokens received!', {
                description: `${rewardTokens} TPX tokens confirmed on blockchain`,
                duration: 5000,
                action: {
                  label: 'View on Etherscan',
                  onClick: () => window.open(getEtherscanTxUrl(txResult.transactionHash!), '_blank')
                }
              });
              
              // Auto-add TPX to MetaMask after 1 second
              setTimeout(() => addTPXToMetaMask(rewardTokens), 1000);
              
              // Auto-refresh page after 3 seconds
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            },
            (attempts) => {
              setMonitorAttempts(attempts);
              // Update toast with progress
              toast.loading(
                `🔍 Checking Sepolia explorer... (${attempts}/100)`,
                {
                  id: monitorToast,
                  description: 'Monitoring every 2 seconds',
                  duration: Infinity
                }
              );
            },
            100, // 100 attempts = 200 seconds
            startBlock
          );
          
          setMonitoringTransaction(false);
          
          // If timeout (transaction not found) - still refresh
          if (!monitorResult.found) {
            toast.dismiss(monitorToast);
            toast.warning('⏱️ Transaction not confirmed yet', {
              description: 'TPX tokens may still be pending. Refreshing page...',
              duration: 5000,
              action: {
                label: 'Open Etherscan',
                onClick: () => window.open(getEtherscanTokenTxUrl(address), '_blank')
              }
            });
            
            // Still refresh page even on timeout
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
        } else {
          // No TPX rewards, just close modal after delay
          setTimeout(() => {
            setSelectedQuest(null);
            setPhotoPreview(null);
            setPhotoFile(null);
            setVerificationResult(null);
            loadQuests();
          }, 3000);
        }
      } else {
        throw new Error(result.error || 'Quest completion failed');
      }

    } catch (error: any) {
      console.error('[Quest] Verification error:', error);
      
      let errorMessage = error.message || 'Quest verification failed';
      
      // Add helpful hints for common errors
      if (errorMessage.includes('row-level security')) {
        errorMessage = '🔒 Upload blocked by security policy. Please reconnect your wallet and try again.';
      } else if (errorMessage.includes('Not authenticated')) {
        errorMessage = '🔑 Authentication expired. Please disconnect and reconnect your wallet.';
      } else if (errorMessage.includes('network')) {
        errorMessage = '🌐 Network error. Please check your connection and try again.';
      }
      
      setVerificationResult({
        verified: false,
        message: errorMessage,
      });
    } finally {
      setVerifying(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleDeleteQuest = async (userQuestId: string) => {
    if (!user || !confirm('Are you sure you want to remove this quest from your list?')) return;

    setDeletingQuest(userQuestId);
    try {
      await deleteUserQuest(userQuestId, user.id);
      await loadQuests();
    } catch (error: any) {
      console.error('Error deleting quest:', error);
      alert(error.message || 'Failed to delete quest');
    } finally {
      setDeletingQuest(null);
    }
  };

  const handleShowTransit = (quest: any) => {
    if (quest.latitude && quest.longitude) {
      window.dispatchEvent(new CustomEvent('navigateToTransit', {
        detail: {
          to: quest.location,
          toCoords: { lat: quest.latitude, lng: quest.longitude }
        }
      }));
    }
  };

  const handleAddAchievementToWallet = async () => {
    if (!achievementMintResult || !window.ethereum) return;
    
    try {
      console.log('[MyQuests] Adding Achievement NFT to MetaMask...', achievementMintResult);
      
      // Try to add NFT to MetaMask (may not work on all versions)
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: achievementMintResult.contractAddress,
            tokenId: achievementMintResult.tokenId.toString(),
          },
        },
      });
      
      console.log('[MyQuests] ✅ Achievement NFT added to MetaMask!');
      setShowAddNFTModal(false);
    } catch (error: any) {
      console.log('[MyQuests] User rejected or MetaMask does not support ERC721:', error.message);
      // Don't show error - not critical
      setShowAddNFTModal(false);
    }
  };

  const handleMintNFT = async (userQuest: any) => {
    if (!user || !userQuest) {
      console.error('[MyQuests] handleMintNFT: Missing user or userQuest');
      toast.error('Unable to mint NFT', { description: 'Missing user or quest data' });
      return;
    }

    const quest = userQuest.quests;
    if (!quest) {
      console.error('[MyQuests] handleMintNFT: Quest not found in userQuest');
      toast.error('Quest data not found');
      return;
    }

    if (!quest.nft_reward) {
      toast.error('Quest does not have NFT reward');
      return;
    }

    // Check if quest is completed or verified
    if (userQuest.status !== 'completed' && userQuest.status !== 'verified') {
      toast.error('Quest must be completed first');
      return;
    }

    // Check if wallet is connected
    if (!address) {
      toast.error('Please connect your wallet to mint NFT');
      return;
    }

    // Check if already minted - check database flags AND session tracking
    if (userQuest.nft_minted || userQuest.nft_token_id || mintedNFTsRef.current.has(quest.id)) {
      console.log('[MyQuests] NFT already minted:', {
        nft_minted: userQuest.nft_minted,
        nft_token_id: userQuest.nft_token_id,
        sessionMinted: mintedNFTsRef.current.has(quest.id)
      });
      toast.error('NFT already minted for this quest');
      return;
    }

    // Prevent double-click
    if (mintingNFT === userQuest.id) {
      return;
    }

    // Pre-check nft_transactions table before calling API
    try {
      const { data: existingNft } = await supabase
        .from('nft_transactions')
        .select('token_id, tx_hash')
        .eq('user_id', user.id)
        .eq('quest_id', quest.id)
        .eq('nft_type', 'achievement')
        .maybeSingle();
      
      if (existingNft) {
        console.log('[MyQuests] NFT found in transactions table:', existingNft);
        toast.error('NFT already minted for this quest');
        
        // Update local state
        mintedNFTsRef.current.add(quest.id);
        setQuests(prevQuests => prevQuests.map(q => 
          q.id === userQuest.id 
            ? { ...q, nft_minted: true, nft_token_id: existingNft.token_id }
            : q
        ));
        return;
      }
    } catch (checkError) {
      console.warn('[MyQuests] Pre-check failed, continuing...', checkError);
    }

    setMintingNFT(userQuest.id);

    // Show minting toast
    const mintingToast = toast.loading('🎨 Minting Achievement NFT...', {
      description: `Creating NFT for "${quest.title}"`
    });

    try {
      console.log('[MyQuests] Minting NFT for quest:', {
        userId: user.id,
        questId: quest.id,
        walletAddress: address,
        userQuestId: userQuest.id,
        status: userQuest.status
      });

      const { mintAchievementAPI } = await import('../../../services/web3ApiClient');
      const result = await mintAchievementAPI(user.id, quest.id, address);

      console.log('[MyQuests] Mint result:', result);

      if (result.success && result.data) {
        console.log('[MyQuests] ✅ Achievement NFT minted successfully!');
        
        // Mark as minted in session to prevent double-minting
        mintedNFTsRef.current.add(quest.id);
        
        // IMMEDIATELY update local state to show "NFT Minted" badge
        setQuests(prevQuests => prevQuests.map(q => 
          q.id === userQuest.id 
            ? { ...q, nft_minted: true, nft_token_id: result.data.tokenId }
            : q
        ));
        
        const achievementNftAddress = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS;
        
        // Store mint result for modal
        setAchievementMintResult({
          tokenId: result.data.tokenId,
          txHash: result.data.txHash,
          contractAddress: achievementNftAddress,
          questTitle: quest.title
        });
        
        // Dismiss minting toast
        toast.dismiss(mintingToast);
        
        // Show monitoring toast
        const monitorToast = toast.loading(
          '🔍 Checking Sepolia explorer for NFT...',
          {
            description: 'Monitoring transaction every 2 seconds',
            duration: Infinity
          }
        );
        
        // Get current block to start monitoring from
        const startBlock = await getCurrentBlockNumber();
        
        // Start monitoring NFT transaction
        const monitorResult = await monitorNFTTransaction(
          address!,
          (txResult: TransactionMonitorResult) => {
            console.log('[MyQuests] ✅ NFT transaction found on explorer!', txResult);
            
            // Dismiss monitoring toast
            toast.dismiss(monitorToast);
            
            // Show success toast
            toast.success('✅ NFT minted successfully!', {
              description: `Token #${result.data.tokenId} for "${quest.title}"`,
              duration: 5000,
              action: {
                label: 'View on Etherscan',
                onClick: () => window.open(getEtherscanTxUrl(txResult.transactionHash!), '_blank')
              }
            });
            
            // Auto-add NFT to MetaMask after confirmation
            setTimeout(() => addNFTToMetaMaskForQuest(result.data.tokenId, quest.id), 1000);
          },
          (attempts) => {
            // Update toast with progress
            toast.loading(
              `🔍 Checking Sepolia explorer... (${attempts}/100)`,
              {
                id: monitorToast,
                description: 'Monitoring every 2 seconds',
                duration: Infinity
              }
            );
          },
          achievementNftAddress,
          100, // 100 attempts = 200 seconds
          startBlock
        );
        
        // If timeout (transaction not found)
        if (!monitorResult.found) {
          toast.dismiss(monitorToast);
          toast.warning('⏱️ NFT mint not confirmed yet', {
            description: 'Transaction may still be pending. Check Etherscan manually.',
            duration: 8000,
            action: {
              label: 'Open Etherscan',
              onClick: () => window.open(getEtherscanNFTTxUrl(address!), '_blank')
            }
          });
        }

        // Broadcast event to other components
        window.dispatchEvent(new CustomEvent('nftMintComplete', {
          detail: { questId: quest.id, tokenId: result.data.tokenId, txHash: result.data.txHash }
        }));
        
        // Reload quests data after monitoring completes (no page reload needed)
        setTimeout(async () => {
          console.log('[MyQuests] Refreshing quests after NFT mint...');
          await loadQuests();
        }, 2000);
        
      } else {
        const errorMsg = result.error || 'Failed to mint NFT';
        console.error('[MyQuests] Mint failed:', errorMsg);
        toast.dismiss(mintingToast);
        toast.error('Failed to mint NFT', {
          description: errorMsg
        });
      }
    } catch (error: any) {
      console.error('[MyQuests] Error minting NFT:', error);
      toast.dismiss(loadingToast);
      toast.error('Minting failed', {
        description: error.message || 'An unexpected error occurred'
      });
    } finally {
      setMintingNFT(null);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty >= 5) return 'from-red-500 to-orange-500';
    if (difficulty >= 4) return 'from-orange-500 to-yellow-500';
    if (difficulty >= 3) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-cyan-500';
  };

  const filteredQuests = quests.filter((q) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pending') return q.status !== 'completed';
    if (selectedFilter === 'completed') return q.status === 'completed';
    return true;
  });

  if (loading && isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Award className="w-20 h-20 text-white/30 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60">Connect your wallet or sign in to view your quests</p>
        </div>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MapPin className="w-20 h-20 text-white/30 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">No Quests Yet</h2>
          <p className="text-white/60 mb-6">Create a trip to generate quests automatically</p>
          {onNavigate && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('create')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-xl text-white font-semibold border border-white/30 hover:border-white/50 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-xl hover:shadow-white/30"
            >
              Create Trip
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Quests</h1>
        <p className="text-sm sm:text-base text-white/60">Complete quests and earn rewards</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mb-2">
        {['all', 'pending', 'completed'].map((filter) => (
          <motion.button
            key={filter}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm sm:text-base ${
              selectedFilter === filter
                ? 'bg-white/20 backdrop-blur-xl text-white shadow-lg shadow-white/10 border border-white/30'
                : 'bg-white/5 backdrop-blur-md text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/10 hover:border-white/20'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* Quests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredQuests.map((userQuest, index) => {
          const quest = userQuest.quests;
          if (!quest) return null;

          const isCompleted = userQuest.status === 'completed' || userQuest.status === 'verified';

          return (
            <motion.div
              key={userQuest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-white/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{quest.title}</h3>
                  <p className="text-white/60 text-sm line-clamp-2">{quest.description}</p>
                </div>
                {isCompleted && (
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span className="text-white/60 text-sm">{quest.location}</span>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 0.3 }}
                className={`inline-flex px-4 py-2 rounded-xl backdrop-blur-xl bg-gradient-to-r from-teal-500/80 to-cyan-500/80 border border-white/[0.15] text-white text-sm font-semibold mb-4 shadow-[0_8px_24px_rgba(20,184,166,0.3)] hover:shadow-[0_16px_48px_rgba(20,184,166,0.5)] hover:border-white/[0.25] transition-all duration-300`}
              >
                <span className="relative">
                  Difficulty: {quest.difficulty}/5
                  <span className="absolute inset-0 blur-sm bg-gradient-to-r from-white/[0.05] via-white/[0.15] to-white/[0.05] rounded-lg -z-10"></span>
                </span>
              </motion.div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-semibold">{quest.reward_xp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-semibold">{quest.reward_tokens} TPX</span>
                </div>
                {quest.nft_reward && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/40">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span className="text-[10px] font-semibold text-purple-300">NFT</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isCompleted && (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedQuest(userQuest)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md text-white font-semibold border border-white/20 hover:border-white/40 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-lg hover:shadow-white/20"
                  >
                    Complete Quest
                  </motion.button>
                )}
                {isCompleted && quest.nft_reward && !userQuest.nft_minted && !userQuest.nft_tx_hash && !mintedNFTsRef.current.has(quest.id) && address && (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMintNFT(userQuest)}
                    disabled={mintingNFT === userQuest.id || !address}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-md text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-purple-400/30 hover:border-purple-400/60 hover:from-purple-500/40 hover:to-pink-500/40 transition-all duration-300 shadow-lg hover:shadow-purple-500/30"
                  >
                    {mintingNFT === userQuest.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Minting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Mint NFT</span>
                      </>
                    )}
                  </motion.button>
                )}
                {isCompleted && quest.nft_reward && (userQuest.nft_minted || userQuest.nft_tx_hash) && (
                  <div className="flex-1 py-3 rounded-xl bg-green-500/10 backdrop-blur-md border border-green-400/30 text-green-400 text-center font-semibold flex items-center justify-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>NFT Minted</span>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuestDetailsModal(quest)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/15 backdrop-blur-md text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-all duration-300"
                  title="View Details"
                >
                  <Eye className="w-5 h-5" />
                </motion.button>
                {!isCompleted && (
                  <motion.button
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteQuest(userQuest.id)}
                    disabled={deletingQuest === userQuest.id}
                    className="px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 backdrop-blur-md text-red-400/80 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 transition-all duration-300 disabled:opacity-50"
                    title="Remove Quest"
                  >
                    {deletingQuest === userQuest.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quest Detail Modal */}
      <AnimatePresence>
        {selectedQuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !verifying && setSelectedQuest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl backdrop-blur-xl bg-black/80 border border-white/20 p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedQuest.quests.title}
                  </h2>
                  <p className="text-white/60">{selectedQuest.quests.description}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedQuest(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/15 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <X className="w-5 h-5 text-white/70 hover:text-white" />
                </motion.button>
              </div>

              {/* Map */}
              {selectedQuest.quests.latitude && selectedQuest.quests.longitude && (
                <div className="mb-6 rounded-xl overflow-hidden">
                  <AttractionMapbox
                    latitude={selectedQuest.quests.latitude}
                    longitude={selectedQuest.quests.longitude}
                    name={selectedQuest.quests.title}
                    className="w-full h-64"
                  />
                </div>
              )}

              {/* Place Details */}
              {(selectedQuest.quests.place_website || selectedQuest.quests.place_phone || selectedQuest.quests.place_opening_hours || selectedQuest.quests.place_price_level) && (
                <div className="mb-6 p-4 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Place Information</h3>
                  <div className="space-y-2">
                    {selectedQuest.quests.place_website && (
                      <a
                        href={selectedQuest.quests.place_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Visit Website</span>
                      </a>
                    )}
                    {selectedQuest.quests.place_phone && (
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <span>Phone: {selectedQuest.quests.place_phone}</span>
                      </div>
                    )}
                    {selectedQuest.quests.place_price_level && (
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <DollarSign className="w-4 h-4" />
                        <span>Price Level: {['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'][selectedQuest.quests.place_price_level - 1] || 'Unknown'}</span>
                      </div>
                    )}
                    {selectedQuest.quests.place_opening_hours && (
                      <div className="flex items-start gap-2 text-sm text-white/70">
                        <Clock className="w-4 h-4 mt-0.5" />
                        <div>
                          {typeof selectedQuest.quests.place_opening_hours === 'string' ? (
                            <span>{selectedQuest.quests.place_opening_hours}</span>
                          ) : selectedQuest.quests.place_opening_hours.weekday_text ? (
                            <div className="space-y-1">
                              {selectedQuest.quests.place_opening_hours.weekday_text.map((text: string, idx: number) => (
                                <div key={idx}>{text}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transit Route Button */}
              {selectedQuest.quests.latitude && selectedQuest.quests.longitude && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleShowTransit(selectedQuest.quests)}
                  className="w-full mb-6 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-400/30 hover:border-green-400/50 hover:from-green-500/30 hover:to-emerald-500/30 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-green-500/20"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Get Directions</span>
                </motion.button>
              )}

              {/* Photo Upload */}
              {!photoPreview ? (
                <div className="mb-6">
                  <label className="block w-full p-8 rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                    <div className="flex flex-col items-center gap-3">
                      {uploadingPhoto ? (
                        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                      ) : (
                        <Camera className="w-12 h-12 text-cyan-400" />
                      )}
                      <p className="text-white font-semibold">
                        {uploadingPhoto ? 'Uploading...' : 'Take or Upload Photo'}
                      </p>
                      <p className="text-white/40 text-sm">Required for verification</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="mb-6">
                  <img
                    src={photoPreview}
                    alt="Quest proof"
                    className="w-full rounded-xl mb-4"
                  />
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Change Photo
                  </button>
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 p-4 rounded-xl ${
                    verificationResult.verified
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {verificationResult.verified ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <p
                        className={`font-semibold ${
                          verificationResult.verified ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              {photoPreview && !verificationResult && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyAndComplete}
                  disabled={verifying}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-xl text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 border border-white/30 hover:border-white/50 hover:from-white/30 hover:to-white/20 transition-all duration-300 shadow-xl hover:shadow-white/30"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Complete Quest
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quest Details Modal */}
      {questDetailsModal && (
        <QuestDetailsModal
          quest={questDetailsModal}
          onClose={() => setQuestDetailsModal(null)}
          onShowOnMap={(quest) => {
            if (onNavigate) {
              onNavigate('dashboard');
              // Trigger map show in dashboard - this will be handled by parent
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('showQuestOnMap', { detail: quest }));
              }, 100);
            }
            setQuestDetailsModal(null);
          }}
          onAcceptQuest={() => {
            loadQuests();
          }}
        />
      )}

      {/* Add Achievement NFT to Wallet Modal */}
      {achievementMintResult && (
        <AddNFTToWalletModal
          isOpen={showAddNFTModal}
          onClose={() => setShowAddNFTModal(false)}
          onAddToWallet={handleAddAchievementToWallet}
          nftType="achievement"
          tokenId={achievementMintResult.tokenId}
          contractAddress={achievementMintResult.contractAddress}
          txHash={achievementMintResult.txHash}
          questTitle={achievementMintResult.questTitle}
        />
      )}
    </div>
  );
};
