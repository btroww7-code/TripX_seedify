# 🎮 Iteration 04: Gamification & Quest System

## Date: November 2025 (Week 2)

## Objective
Build the complete quest system with GPS verification, photo verification using AI, progress tracking, and reward distribution.

---

## AI Tools Used
- **Visual Studio Code** - Primary IDE with debugging
- **Cursor AI** - Service implementation, GPS logic
- **GitHub Copilot** - React components, hooks
- **Kiro (AWS)** - Anti-spoofing architecture review
- **Bolt.new** - Rapid UI prototyping
- **Claude (Anthropic)** - Quest logic architecture, anti-spoofing strategies

---

## Prompts & Results

### Prompt 1: GPS Verification System

```
Create a GPS verification system for quests:
- Geofencing with configurable radius (default 100m)
- Real-time distance tracking with updates
- Anti-spoofing measures:
  - Check for mock location APIs
  - Speed validation (can't teleport)
  - Accuracy threshold (<50m)
- Auto-complete when user enters radius
- Graceful fallback if GPS unavailable
```

**AI Output:** Complete GPS verification service.

### Prompt 2: Photo Verification with AI

```
Implement photo verification using Google Gemini Vision:
- Accept photo upload after GPS verification
- Send to Gemini with quest context
- Analyze if photo matches quest location/requirements
- Return confidence score (0-100)
- Threshold: 30% for acceptance (generous for UX)
- Handle errors gracefully
```

**AI Output:** Photo verification service with Gemini integration.

### Prompt 3: Quest Progress Tracking

```
Build quest progress tracking:
- States: not_started → in_progress → completed → verified
- Track started_at, completed_at timestamps
- Store photo_url and verification_score
- Update user XP and tokens on completion
- Prevent duplicate completions
- Handle edge cases (app crash, timeout)
```

**AI Output:** Quest service with full state management.

### Prompt 4: Gamification UI Components

```
Create React components for gamification:
- QuestCard with difficulty indicator, rewards, distance
- QuestMap with Mapbox, quest markers by category
- QuestDetailsModal with start/complete actions
- ProgressBar for XP to next level
- AchievementBadge with unlock animation
- LeaderboardEntry with rank and avatar
Use Framer Motion for animations.
```

**AI Output:** Complete UI component library.

---

## GPS Verification Service (AI-generated)

```typescript
// services/gpsService.ts
export interface GPSVerificationResult {
  isWithinRadius: boolean;
  distance: number;
  accuracy: number;
  isMockLocation: boolean;
  speed: number;
}

export async function verifyGPSLocation(
  questLat: number,
  questLng: number,
  radiusMeters: number = 100
): Promise<GPSVerificationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          latitude, longitude,
          questLat, questLng
        );
        
        // Check for mock location (Android)
        const isMockLocation = checkMockLocation(position);
        
        resolve({
          isWithinRadius: distance <= radiusMeters,
          distance,
          accuracy,
          isMockLocation,
          speed: speed || 0
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
```

---

## Photo Verification with Gemini (AI-generated)

```typescript
// services/photoVerificationService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_KEY);

export async function verifyQuestPhoto(
  photoBase64: string,
  questTitle: string,
  questDescription: string,
  questLocation: string
): Promise<{ verified: boolean; confidence: number; reason: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    You are verifying a photo for a travel quest completion.
    
    Quest: ${questTitle}
    Description: ${questDescription}
    Expected Location: ${questLocation}
    
    Analyze this photo and determine:
    1. Does it appear to be taken at or near the described location?
    2. Is it a real photo (not stock image, screenshot, or AI-generated)?
    3. Does it show relevant content for this quest?
    
    Respond with JSON:
    {
      "verified": boolean,
      "confidence": number (0-100),
      "reason": "brief explanation"
    }
  `;
  
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: photoBase64
      }
    }
  ]);
  
  const response = JSON.parse(result.response.text());
  
  // Generous threshold for better UX
  return {
    verified: response.confidence >= 30,
    confidence: response.confidence,
    reason: response.reason
  };
}
```

---

## Quest Service (AI-generated)

```typescript
// services/questService.ts
export async function startQuest(
  userId: string,
  questId: string
): Promise<UserQuest> {
  // Check if already started
  const { data: existing } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .single();
    
  if (existing?.status === 'completed') {
    throw new Error('Quest already completed');
  }
  
  // Create or update user_quest
  const { data, error } = await supabase
    .from('user_quests')
    .upsert({
      user_id: userId,
      quest_id: questId,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function completeQuest(
  userId: string,
  questId: string,
  photoUrl: string,
  verificationScore: number
): Promise<{ success: boolean; xpEarned: number; tokensEarned: number }> {
  // Get quest details
  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single();
    
  if (!quest) throw new Error('Quest not found');
  
  // Update user_quest
  await supabase
    .from('user_quests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      photo_url: photoUrl,
      verification_score: verificationScore
    })
    .eq('user_id', userId)
    .eq('quest_id', questId);
    
  // Update user XP and tokens
  await supabase.rpc('add_xp_and_tokens', {
    p_user_id: userId,
    p_xp: quest.xp_reward,
    p_tokens: quest.token_reward
  });
  
  // Check achievements
  await supabase.rpc('check_achievements', { p_user_id: userId });
  
  return {
    success: true,
    xpEarned: quest.xp_reward,
    tokensEarned: quest.token_reward
  };
}
```

---

## Quest Card Component (AI-generated)

```tsx
// components/QuestCard.tsx
import { motion } from 'framer-motion';

export function QuestCard({ quest, distance, onStart }: QuestCardProps) {
  const difficultyColors = {
    1: 'bg-green-500',
    2: 'bg-blue-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500'
  };
  
  return (
    <motion.div
      className="glass p-4 rounded-xl"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-white">{quest.title}</h3>
        <span className={`px-2 py-1 rounded text-xs ${difficultyColors[quest.difficulty]}`}>
          Level {quest.difficulty}
        </span>
      </div>
      
      <p className="text-gray-400 text-sm mt-2">{quest.description}</p>
      
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm">{quest.xp_reward} XP</span>
        </div>
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-purple-400" />
          <span className="text-sm">{quest.token_reward} TPX</span>
        </div>
        {distance && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-sm">{formatDistance(distance)}</span>
          </div>
        )}
      </div>
      
      <motion.button
        className="w-full mt-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
      >
        Start Quest
      </motion.button>
    </motion.div>
  );
}
```

---

## Challenges & Solutions

### Challenge 1: GPS Accuracy on Mobile
- **Issue:** Indoor GPS accuracy was poor (>100m)
- **AI Solution:** Added accuracy threshold, show warning to user

### Challenge 2: Photo Verification False Positives
- **Issue:** Gemini sometimes rejected valid photos
- **AI Solution:** Lowered threshold to 30%, added manual override option

### Challenge 3: Quest State Synchronization
- **Issue:** State could get out of sync if app crashed
- **AI Solution:** Added recovery logic on app start, check pending quests

---

## Quest Flow Diagram

```
┌─────────────────┐
│   Browse Map    │
│   See Quests    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Start Quest    │
│  (GPS Tracking) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Navigate to     │
│ Location        │
│ (Real-time dist)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     NO      ┌─────────────────┐
│ Within 100m?    │────────────▶│ Keep Walking    │
└────────┬────────┘             └─────────────────┘
         │ YES
         ▼
┌─────────────────┐
│ Take Photo      │
│ Upload          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     FAIL    ┌─────────────────┐
│ AI Verification │────────────▶│ Retry Photo     │
└────────┬────────┘             └─────────────────┘
         │ PASS
         ▼
┌─────────────────┐
│ Quest Complete! │
│ +XP, +TPX       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Claim Tokens    │
│ (Blockchain TX) │
└─────────────────┘
```

---

## Metrics

| Metric | Value |
|--------|-------|
| Time Spent | 16 hours |
| Traditional Estimate | 2 weeks |
| Service Functions | 20+ |
| React Components | 15+ |
| Lines of Code | ~2000 |
| AI Assistance | 75% |

---

## Next Iteration
→ [05-ai-trip-planning.md](./05-ai-trip-planning.md) - AI-powered trip generation
