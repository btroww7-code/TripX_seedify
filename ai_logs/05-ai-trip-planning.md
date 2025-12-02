# 🤖 Iteration 05: AI Trip Planning

## Date: November 2025 (Week 3)

## Objective
Implement AI-powered trip planning using Google Gemini to generate personalized itineraries with automatic quest creation.

---

## AI Tools Used
- **Visual Studio Code** - Primary IDE
- **Cursor AI** - Service implementation, Gemini integration
- **GitHub Copilot** - UI components, TypeScript
- **Kiro (AWS)** - AI integration architecture
- **Bolt.new** - Frontend deployment and testing
- **Claude (Anthropic)** - Prompt engineering for Gemini

---

## Prompts & Results

### Prompt 1: Trip Generation Service

```
Create an AI trip planning service using Google Gemini:
- Accept: destination, duration (days), budget level, interests
- Generate day-by-day itinerary with:
  - Morning, afternoon, evening activities
  - Specific POI names with coordinates
  - Time estimates for each activity
  - Local tips and recommendations
- Return structured JSON for easy parsing
- Handle errors with graceful fallbacks
```

**AI Output:** Complete AI trip service with Gemini integration.

### Prompt 2: Automatic Quest Generation

```
After generating a trip, automatically create quests:
- One quest per major POI in the itinerary
- Set difficulty based on activity type
- Calculate appropriate XP/token rewards
- Use POI coordinates for GPS verification
- Mark as trip-related for grouping
```

**AI Output:** Quest generation from trip POIs.

### Prompt 3: Trip Planning UI

```
Build the Create Trip page with:
- Destination search with autocomplete
- Duration selector (1-14 days)
- Budget toggle (Budget/Moderate/Luxury)
- Interest checkboxes (Culture, Food, Adventure, Nature, etc.)
- Loading state with progress animation
- Generated itinerary display with day tabs
- Save trip button
```

**AI Output:** Complete CreateTrip page component.

---

## Gemini Trip Generation (AI-generated)

```typescript
// services/aiTripService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_KEY);

export interface TripPreferences {
  destination: string;
  duration: number;
  budget: 'budget' | 'moderate' | 'luxury';
  interests: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
}

export interface GeneratedTrip {
  destination: string;
  duration: number;
  days: TripDay[];
  tips: string[];
  estimatedCost: string;
}

export interface TripDay {
  day: number;
  date?: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  name: string;
  description: string;
  duration: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  category: string;
  tips?: string;
}

export async function generateTrip(
  preferences: TripPreferences
): Promise<GeneratedTrip> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `
    You are an expert travel planner. Create a detailed ${preferences.duration}-day 
    itinerary for ${preferences.destination}.
    
    Budget Level: ${preferences.budget}
    Interests: ${preferences.interests.join(', ')}
    ${preferences.dietaryRestrictions?.length ? `Dietary: ${preferences.dietaryRestrictions.join(', ')}` : ''}
    ${preferences.accessibilityNeeds?.length ? `Accessibility: ${preferences.accessibilityNeeds.join(', ')}` : ''}
    
    For each day, provide 3-5 activities with:
    - Specific time (e.g., "09:00")
    - Name of place/activity
    - Brief description
    - Duration estimate
    - Exact location with latitude/longitude
    - Category (food, culture, adventure, nature, shopping)
    - Local tips
    
    Also include:
    - General tips for the destination
    - Estimated daily cost range
    
    Respond with valid JSON matching this structure:
    {
      "destination": "string",
      "duration": number,
      "days": [
        {
          "day": number,
          "activities": [
            {
              "time": "HH:MM",
              "name": "string",
              "description": "string",
              "duration": "string",
              "location": { "name": "string", "lat": number, "lng": number },
              "category": "string",
              "tips": "string"
            }
          ]
        }
      ],
      "tips": ["string"],
      "estimatedCost": "string"
    }
  `;
  
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse trip response');
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

---

## Quest Generation from Trip (AI-generated)

```typescript
// services/questGeneratorService.ts
export async function generateQuestsFromTrip(
  trip: GeneratedTrip,
  userId: string,
  tripId: string
): Promise<Quest[]> {
  const quests: Quest[] = [];
  
  for (const day of trip.days) {
    for (const activity of day.activities) {
      // Determine difficulty based on category
      const difficulty = getDifficultyForCategory(activity.category);
      
      // Calculate rewards based on difficulty
      const xpReward = difficulty * 100;
      const tokenReward = difficulty * 50;
      
      const quest: Quest = {
        id: crypto.randomUUID(),
        title: `Visit ${activity.name}`,
        description: activity.description,
        latitude: activity.location.lat,
        longitude: activity.location.lng,
        difficulty,
        xp_reward: xpReward,
        token_reward: tokenReward,
        category: activity.category,
        radius_meters: 100,
        is_active: true,
        is_sponsored: false,
        trip_id: tripId,
        day_number: day.day
      };
      
      quests.push(quest);
    }
  }
  
  // Bulk insert quests
  const { error } = await supabase
    .from('quests')
    .insert(quests);
    
  if (error) throw error;
  
  return quests;
}

function getDifficultyForCategory(category: string): number {
  const difficultyMap: Record<string, number> = {
    'food': 1,
    'shopping': 1,
    'culture': 2,
    'nature': 3,
    'adventure': 4,
    'extreme': 5
  };
  return difficultyMap[category] || 2;
}
```

---

## Create Trip Page (AI-generated)

```tsx
// components/pages/CreateTrip/CreateTrip.tsx
export function CreateTrip() {
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(3);
  const [budget, setBudget] = useState<'budget' | 'moderate' | 'luxury'>('moderate');
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<GeneratedTrip | null>(null);
  
  const interestOptions = [
    'Culture & History',
    'Food & Dining',
    'Adventure',
    'Nature',
    'Shopping',
    'Nightlife',
    'Art & Museums',
    'Photography'
  ];
  
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const generatedTrip = await generateTrip({
        destination,
        duration,
        budget,
        interests
      });
      setTrip(generatedTrip);
      
      // Auto-generate quests
      if (user) {
        await generateQuestsFromTrip(generatedTrip, user.id, tripId);
      }
    } catch (error) {
      toast.error('Failed to generate trip');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">
        ✈️ Plan Your Adventure
      </h1>
      
      {/* Destination Input */}
      <div className="glass p-6 rounded-xl mb-6">
        <label className="block text-gray-300 mb-2">Where to?</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Paris, France"
          className="w-full bg-white/5 rounded-lg px-4 py-3 text-white"
        />
      </div>
      
      {/* Duration Slider */}
      <div className="glass p-6 rounded-xl mb-6">
        <label className="block text-gray-300 mb-2">
          Duration: {duration} days
        </label>
        <input
          type="range"
          min={1}
          max={14}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Budget Toggle */}
      <div className="glass p-6 rounded-xl mb-6">
        <label className="block text-gray-300 mb-2">Budget</label>
        <div className="flex gap-2">
          {['budget', 'moderate', 'luxury'].map((level) => (
            <button
              key={level}
              onClick={() => setBudget(level as any)}
              className={`px-4 py-2 rounded-lg ${
                budget === level
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Interests */}
      <div className="glass p-6 rounded-xl mb-6">
        <label className="block text-gray-300 mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1 rounded-full text-sm ${
                interests.includes(interest)
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      
      {/* Generate Button */}
      <motion.button
        onClick={handleGenerate}
        disabled={!destination || loading}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader className="animate-spin" />
            Generating your trip...
          </span>
        ) : (
          '✨ Generate Itinerary'
        )}
      </motion.button>
      
      {/* Generated Trip Display */}
      {trip && <TripItinerary trip={trip} />}
    </div>
  );
}
```

---

## Challenges & Solutions

### Challenge 1: Gemini Response Parsing
- **Issue:** Gemini sometimes returned markdown-wrapped JSON
- **AI Solution:** Added regex extraction for JSON block

### Challenge 2: Invalid Coordinates
- **Issue:** Some AI-generated coordinates were incorrect
- **AI Solution:** Added Google Places API validation for POIs

### Challenge 3: Trip Save Performance
- **Issue:** Saving trip with many quests was slow
- **AI Solution:** Bulk insert with transaction

---

## Trip Flow Diagram

```
┌─────────────────┐
│ Enter Destination│
│ Set Preferences  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call Gemini API │
│ Generate Plan   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Response  │
│ Extract POIs    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Quests │
│ For Each POI    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display Itinerary│
│ Show on Map      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save Trip       │
│ Start Exploring!│
└─────────────────┘
```

---

## Sample Generated Trip (AI output)

```json
{
  "destination": "Warsaw, Poland",
  "duration": 2,
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00",
          "name": "Old Town Market Square",
          "description": "Explore the beautifully reconstructed historic center",
          "duration": "2 hours",
          "location": {
            "name": "Rynek Starego Miasta",
            "lat": 52.2496,
            "lng": 21.0122
          },
          "category": "culture",
          "tips": "Visit early morning to avoid crowds"
        },
        {
          "time": "12:00",
          "name": "Zapiecek",
          "description": "Try traditional Polish pierogi",
          "duration": "1.5 hours",
          "location": {
            "name": "Zapiecek Restaurant",
            "lat": 52.2489,
            "lng": 21.0118
          },
          "category": "food",
          "tips": "Order the mixed plate to try different flavors"
        }
      ]
    }
  ],
  "tips": [
    "Most attractions are within walking distance in the center",
    "Get a Warsaw Pass for unlimited public transport",
    "Many restaurants accept cards but carry some cash"
  ],
  "estimatedCost": "$50-80 per day"
}
```

---

## Metrics

| Metric | Value |
|--------|-------|
| Time Spent | 8 hours |
| Traditional Estimate | 1 week |
| Service Functions | 10+ |
| Gemini API Calls | ~3 per trip |
| Lines of Code | ~800 |
| AI Assistance | 85% |

---

## Final Summary

This completes the core AI-powered features of TripX. The application now has:

1. ✅ **Project Setup** - Modern React stack with TypeScript
2. ✅ **Database** - Supabase with RLS security
3. ✅ **Blockchain** - TPX token + NFT Passport on Base Sepolia
4. ✅ **Gamification** - Quests with GPS + Photo verification
5. ✅ **AI Trip Planning** - Gemini-powered itinerary generation

**Total Development Time:** ~3 weeks
**Traditional Estimate:** 3-4 months
**Time Saved:** ~80%

---

## See Also

- [prompts.md](../prompts.md) - AI prompts documentation
- [FEATURES.md](../FEATURES.md) - Complete feature list
- [README.md](../README.md) - Project overview
