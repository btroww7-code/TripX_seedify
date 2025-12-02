import { supabase } from '../lib/supabase';

/**
 * Photo verification result interface
 */
export interface PhotoVerificationResult {
  verified: boolean;
  confidence: number;
  analysis: string;
  matchedFeatures: string[];
  suggestedCorrections?: string[];
}

export async function verifyQuestPhoto(
  photoUrl: string,
  questData: {
    title: string;
    description: string;
    location: string;
    place_name?: string;
    category?: string;
  }
): Promise<PhotoVerificationResult> {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

    const response = await fetch(`${API_BASE_URL}/api/photo-verification/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photoUrl,
        questDescription: questData.description || questData.title,
        verificationCriteria: `Location: ${questData.location}. ${
          questData.place_name ? `Place: ${questData.place_name}. ` : ''
        }${questData.category ? `Category: ${questData.category}. ` : ''}`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'AI verification failed');
    }

    const aiResult = data.data || {};
    const verification: PhotoVerificationResult = {
      verified: Boolean(aiResult.verified),
      confidence: aiResult.confidence ?? 0,
      analysis: aiResult.reason || aiResult.analysis || 'Photo verified',
      matchedFeatures: aiResult.detected_elements || [],
      suggestedCorrections: aiResult.suggested_corrections,
    };

    if (!verification.verified && !verification.suggestedCorrections) {
      verification.suggestedCorrections = ['AI verification rejected the photo. Please retake with clearer view.'];
    }

    return verification;
  } catch (error: any) {
    console.error('Photo verification error:', error);
    throw new Error(`Photo verification failed: ${error.message}`);
  }
}

/**
 * Convert blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Verify photo dimensions and file size
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Photo size exceeds 10MB. Please compress or resize the image.',
    };
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  return { valid: true };
}

/**
 * Delete photo from storage
 */
export async function deleteQuestPhoto(photoUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = photoUrl.split('/quest-photos/');
  if (urlParts.length < 2) {
    throw new Error('Invalid photo URL');
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage.from('quest-photos').remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete photo: ${error.message}`);
  }
}

/**
 * Get user's uploaded photos for a quest
 */
export async function getUserQuestPhotos(userId: string, questId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('quest-photos')
    .list(`${userId}/${questId}`);

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  const publicUrls = data.map((file) => {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from('quest-photos')
      .getPublicUrl(`${userId}/${questId}/${file.name}`);
    return publicUrl;
  });

  return publicUrls;
}

/**
 * Batch verify multiple photos
 */
export async function batchVerifyPhotos(
  photos: Array<{ url: string; questData: any }>
): Promise<PhotoVerificationResult[]> {
  const results = await Promise.all(
    photos.map((photo) => verifyQuestPhoto(photo.url, photo.questData))
  );

  return results;
}

/**
 * Calculate overall verification score from GPS and Photo
 */
export function calculateOverallVerificationScore(
  gpsVerification: { verified: boolean; accuracy: number; distance: number },
  photoVerification: PhotoVerificationResult
): { verified: boolean; overallScore: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // GPS score (max 50 points)
  if (gpsVerification.verified) {
    score += 50;
    reasons.push('GPS location verified');
  } else {
    reasons.push(`GPS verification failed (distance: ${Math.round(gpsVerification.distance)}m)`);
  }

  // Accuracy bonus (max 10 points)
  if (gpsVerification.accuracy <= 10) {
    score += 10;
  } else if (gpsVerification.accuracy <= 30) {
    score += 5;
  }

  // Photo score (max 40 points)
  if (photoVerification.verified) {
    score += (photoVerification.confidence / 100) * 40;
    reasons.push(`Photo verified (${Math.round(photoVerification.confidence)}% confidence)`);
  } else {
    reasons.push(`Photo verification failed`);
  }

  const verified = score >= 70; // Need at least 70% overall score
  const reason = reasons.join(', ');

  return {
    verified,
    overallScore: Math.round(score),
    reason,
  };
}
