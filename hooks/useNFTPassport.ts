import { useEffect, useState } from 'react';
import { useWalletAuth } from './useWalletAuth';
import { mintNFTPassport, getNFTPassportTokenId, updateNFTPassportMetadata } from '../services/web3Service';
import { supabase } from '../lib/supabase';

export function useNFTPassport() {
  const { user, address, isConnected } = useWalletAuth();
  const [nftTokenId, setNftTokenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    if (user && address && isConnected) {
      checkAndMintPassport();
    }
  }, [user, address, isConnected]);

  const checkAndMintPassport = async () => {
    if (!user || !address) return;

    setLoading(true);

    try {
      // Check if user already has NFT Passport in database
      const { data: userData } = await supabase
        .from('users')
        .select('nft_passport_token_id, passport_tier')
        .eq('id', user.id)
        .single();

      if (userData?.nft_passport_token_id) {
        setNftTokenId(userData.nft_passport_token_id);
        setLoading(false);
        return;
      }

      // Check blockchain for existing NFT
      const tokenId = await getNFTPassportTokenId(address);

      if (tokenId) {
        // Update database with existing NFT
        await supabase
          .from('users')
          .update({ nft_passport_token_id: tokenId })
          .eq('id', user.id);

        setNftTokenId(tokenId);
        setLoading(false);
        return;
      }

      // No NFT found - mint new one
      await mintPassport();
    } catch (error) {
      console.error('Error checking NFT Passport:', error);
      setLoading(false);
    }
  };

  const mintPassport = async () => {
    if (!user || !address || minting) return;

    setMinting(true);

    try {
      // Get user stats for metadata
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const tier = userData?.passport_tier || 'bronze';
      const metadataURI = generateMetadataURI(userData, tier);

      // Mint NFT on blockchain
      const result = await mintNFTPassport(address, metadataURI, tier);

      if (result.success && result.tokenId) {
        // Update database
        await supabase
          .from('users')
          .update({
            nft_passport_token_id: result.tokenId,
            passport_tier: tier
          })
          .eq('id', user.id);

        setNftTokenId(result.tokenId);

        console.log('✅ NFT Passport minted!', result);
      }
    } catch (error) {
      console.error('Error minting NFT Passport:', error);
    } finally {
      setMinting(false);
      setLoading(false);
    }
  };

  const updatePassportTier = async (newTier: string) => {
    if (!nftTokenId || !user || !address) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const metadataURI = generateMetadataURI(userData, newTier);

      const result = await updateNFTPassportMetadata(nftTokenId, metadataURI, newTier);

      if (result.success) {
        await supabase
          .from('users')
          .update({ passport_tier: newTier })
          .eq('id', user.id);

        console.log('✅ NFT Passport tier updated!', result);
      }
    } catch (error) {
      console.error('Error updating passport tier:', error);
    }
  };

  const generateMetadataURI = (userData: any, tier: string): string => {
    const metadata = {
      name: `TripX Passport - ${tier.toUpperCase()}`,
      description: `Travel NFT Passport for ${userData?.wallet_address || 'traveler'}`,
      image: `https://tripx.app/nft-passport/${tier}.png`,
      attributes: [
        { trait_type: 'Tier', value: tier },
        { trait_type: 'Level', value: userData?.level || 1 },
        { trait_type: 'XP', value: userData?.total_xp || 0 },
        { trait_type: 'Quests Completed', value: userData?.quests_completed || 0 },
        { trait_type: 'Tokens Earned', value: userData?.total_tokens_earned || 0 },
      ],
    };

    // In production, upload to IPFS and return IPFS URI
    // For now, return base64 encoded JSON
    return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
  };

  return {
    nftTokenId,
    loading,
    minting,
    updatePassportTier,
    mintPassport,
  };
}
