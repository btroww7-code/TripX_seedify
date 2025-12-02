/**
 * NFT Metadata Service
 * Generates metadata for quest achievement NFTs
 */

export interface QuestNFTMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface QuestData {
  id: string;
  title: string;
  description: string;
  location: string;
  difficulty: number;
  reward_xp: number;
  reward_tokens: number;
  nft_reward?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface UserQuestData {
  completed_at?: string;
  verification_result?: any;
}

/**
 * Generate NFT metadata for a completed quest
 */
export function generateQuestNFTMetadata(
  quest: QuestData,
  userQuest: UserQuestData
): QuestNFTMetadata {
  const completionDate = userQuest.completed_at
    ? new Date(userQuest.completed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const difficultyLabels = ['Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme'];
  const difficultyLabel = difficultyLabels[Math.min(quest.difficulty - 1, 4)] || 'Unknown';

  const metadata: QuestNFTMetadata = {
    name: `Quest Achievement: ${quest.title}`,
    description: `${quest.description}\n\nCompleted on ${completionDate} at ${quest.location}.`,
    attributes: [
      {
        trait_type: 'Quest Title',
        value: quest.title,
      },
      {
        trait_type: 'Location',
        value: quest.location,
      },
      {
        trait_type: 'Difficulty',
        value: difficultyLabel,
      },
      {
        trait_type: 'Difficulty Level',
        value: quest.difficulty,
      },
      {
        trait_type: 'XP Reward',
        value: quest.reward_xp,
      },
      {
        trait_type: 'TPX Reward',
        value: quest.reward_tokens,
      },
      {
        trait_type: 'Completion Date',
        value: completionDate,
      },
    ],
  };

  // Add coordinates if available
  if (quest.latitude && quest.longitude) {
    metadata.attributes.push(
      {
        trait_type: 'Latitude',
        value: quest.latitude,
      },
      {
        trait_type: 'Longitude',
        value: quest.longitude,
      }
    );
  }

  return metadata;
}

/**
 * Convert metadata to JSON string
 */
export function metadataToJSON(metadata: QuestNFTMetadata): string {
  return JSON.stringify(metadata, null, 2);
}

/**
 * Generate data URI for metadata
 */
export function metadataToDataURI(metadata: QuestNFTMetadata): string {
  const json = metadataToJSON(metadata);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${base64}`;
}

/**
 * Generate IPFS-style metadata URI (for future use)
 */
export function metadataToIPFSUri(metadata: QuestNFTMetadata, cid: string): string {
  return `ipfs://${cid}`;
}

