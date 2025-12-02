# 🔑 API Setup Guide

Detailed instructions for setting up all required API keys and services.

---

## 📋 Overview

TripX requires 4 API services:

| Service | Purpose | Cost | Setup Time |
|---------|---------|------|------------|
| **Supabase** | Database & Auth | Free tier: 500MB DB, 50K auth users | 5 min |
| **Google Maps** | Transit routing & places | Free tier: $200/month credit | 10 min |
| **Google Gemini** | AI trip planning | Free tier: 60 requests/min | 3 min |
| **Mapbox** | Map visualization | Free tier: 50K loads/month | 3 min |

**Total:** ~20 minutes, $0 cost for development

---

## 1️⃣ Supabase Setup

### What is Supabase?
- PostgreSQL database hosting
- Built-in authentication
- Real-time subscriptions
- Storage for files
- Edge functions

### Step-by-Step Setup

**1. Create Account**
- Go to https://supabase.com
- Sign up with GitHub, Google, or email
- Verify your email

**2. Create Project**
- Click "New Project"
- Organization: Create new or select existing
- Project name: `tripx` (or your choice)
- Database Password: Generate strong password
- Region: Select closest to your users
  - `US East` for North America
  - `EU Central` for Europe
  - `Southeast Asia` for Asia
- Pricing: Select Free tier
- Click "Create new project"
- Wait 2-3 minutes for provisioning

**3. Get API Credentials**
- Go to **Settings** (gear icon)
- Click **API** in sidebar
- Copy these values:
  ```
  Project URL: https://xxxxxxxxxxxxx.supabase.co
  anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

**4. Configure Database**
- Database will be auto-configured on first run
- Or manually run migrations:
  - Go to **SQL Editor**
  - Click **New Query**
  - Paste content from `supabase/migrations/20251122120151_complete_tripx_database.sql`
  - Click **Run**
  - Repeat for `supabase/migrations/20251122_enhance_quest_system.sql`

**5. Verify Setup**
- Go to **Table Editor**
- You should see tables: users, quests, trips, etc.
- Go to **Authentication** → Should see empty users list
- Go to **Storage** → Should see buckets

### Free Tier Limits
- ✅ 500MB database storage
- ✅ 50,000 monthly active users
- ✅ 2GB bandwidth
- ✅ 1GB file storage
- ✅ 500K Edge Function invocations

### Add to .env
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here
```

---

## 2️⃣ Google Maps Setup

### What is Google Maps Platform?
- Directions API (route planning)
- Places API (location search)
- Geocoding (address lookup)
- Distance Matrix (travel times)
- Maps JavaScript API (visual display)

### Step-by-Step Setup

**1. Create Google Cloud Account**
- Go to https://console.cloud.google.com
- Sign in with Google account
- Accept terms of service
- Set up billing (required but free tier available)
  - Add credit card (won't be charged unless you exceed free tier)
  - You get $200/month free credit

**2. Create Project**
- Click project dropdown at top
- Click "New Project"
- Project name: `TripX`
- Click "Create"
- Wait for project creation

**3. Enable Required APIs**
- Go to **APIs & Services** → **Library**
- Search and enable each of these:

  **a) Maps JavaScript API**
  - Search "Maps JavaScript API"
  - Click on it
  - Click "Enable"
  - Wait for activation

  **b) Directions API**
  - Search "Directions API"
  - Click "Enable"

  **c) Places API (New)**
  - Search "Places API"
  - Enable the "NEW" version (not legacy)

  **d) Geocoding API**
  - Search "Geocoding API"
  - Click "Enable"

  **e) Distance Matrix API**
  - Search "Distance Matrix API"
  - Click "Enable"

**4. Create API Key**
- Go to **APIs & Services** → **Credentials**
- Click **Create Credentials** → **API Key**
- API key created: `AIzaSy...`
- Click "Restrict Key" (recommended)

**5. Restrict API Key (Optional but Recommended)**
- Application restrictions:
  - Select "HTTP referrers"
  - Add your domains:
    ```
    localhost:5173
    localhost:4173
    your-domain.com
    *.your-domain.com
    ```
- API restrictions:
  - Select "Restrict key"
  - Choose these APIs:
    - Maps JavaScript API
    - Directions API
    - Places API
    - Geocoding API
    - Distance Matrix API
- Click "Save"

**6. Verify Setup**
- Go to **APIs & Services** → **Dashboard**
- Check all 5 APIs show as "Enabled"
- Check API key is listed in Credentials

### Free Tier Limits
- $200 credit per month
- Maps JavaScript: 28,000 loads/month free
- Directions: 40,000 requests/month free
- Places: 200,000 requests/month free
- Usually enough for 10,000+ users

### Monitoring Usage
- Go to **APIs & Services** → **Dashboard**
- View requests per API
- Set up billing alerts:
  - **Billing** → **Budgets & alerts**
  - Create alert at $50, $100, $150

### Add to .env
```env
VITE_GOOGLE_MAPS_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 3️⃣ Google Gemini AI Setup

### What is Gemini?
- Google's latest AI model
- Used for trip planning
- Natural language understanding
- Context-aware responses

### Step-by-Step Setup

**1. Go to Google AI Studio**
- Visit https://makersuite.google.com/app/apikey
- Sign in with Google account

**2. Create API Key**
- Click "Create API Key"
- Select Google Cloud project (from Maps setup)
  - Or create new one
- API key generated: `AIzaSy...`
- Copy the key immediately

**3. Test API Key**
- Click "Test" button
- Try a prompt: "Plan a 2-day trip to Paris"
- Should get AI response

**4. Configure Quotas (Optional)**
- Go to Google Cloud Console
- **APIs & Services** → **Generative Language API**
- Click "Quotas"
- Default: 60 requests per minute (free)

### Free Tier Limits
- ✅ 60 requests per minute
- ✅ 1,500 requests per day
- ✅ Unlimited for first 180 days
- ✅ After 180 days: pay-as-you-go

### Usage Tips
- Cache common requests
- Implement rate limiting
- Add error handling
- Use streaming for long responses

### Add to .env
```env
VITE_GOOGLE_AI_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 4️⃣ Mapbox Setup

### What is Mapbox?
- Interactive map visualization
- Custom map styles
- Geolocation services
- Route display
- Dark mode optimized

### Step-by-Step Setup

**1. Create Account**
- Go to https://account.mapbox.com/
- Click "Sign up"
- Sign up with email or GitHub

**2. Get Access Token**
- After signup, you'll see "Access tokens" page
- Default public token is already created
- Copy the token: `pk.eyJ1...`

**3. Create New Token (Optional)**
- Click "Create a token"
- Name: `TripX Production`
- Scopes (select these):
  - ✅ Styles: Read
  - ✅ Fonts: Read
  - ✅ Datasets: Read
  - ✅ Vision: Read
- URL restrictions (optional):
  - Add your domains
- Click "Create token"

**4. Choose Map Style**
- Go to https://www.mapbox.com/maps
- Browse styles:
  - **Dark v11** (recommended for TripX)
  - Light v11
  - Streets v12
  - Satellite Streets v12
- Style URL format: `mapbox://styles/mapbox/dark-v11`

**5. Verify Setup**
- Go to https://docs.mapbox.com/help/getting-started/
- Click "Test your token"
- Paste your token
- Should see a map

### Free Tier Limits
- ✅ 50,000 map loads/month
- ✅ 100,000 geocoding requests
- ✅ 4 tokens
- ✅ Unlimited styles

### Usage Tracking
- Go to **Statistics**
- View map loads per day
- Set up email alerts for usage

### Add to .env
```env
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0.XXXXX
```

---

## ✅ Verification Checklist

After setting up all APIs, verify:

### Supabase
- [ ] Project created and active
- [ ] API credentials copied
- [ ] Database tables visible in Table Editor
- [ ] Can create test user in Authentication

### Google Maps
- [ ] 5 APIs enabled (Maps, Directions, Places, Geocoding, Distance Matrix)
- [ ] API key created
- [ ] (Optional) Key restrictions applied
- [ ] Billing account set up

### Google Gemini
- [ ] API key created
- [ ] Test prompt works
- [ ] Quotas visible in console

### Mapbox
- [ ] Account created
- [ ] Access token copied
- [ ] Token tested successfully

### Environment File
- [ ] `.env` file created
- [ ] All 4 keys added
- [ ] No example placeholders remaining
- [ ] File not committed to git (in `.gitignore`)

---

## 🧪 Test All APIs

Create a test script to verify all APIs work:

```javascript
// test-apis.js
import { supabase } from './lib/supabase';

async function testAPIs() {
  console.log('Testing APIs...\n');

  // Test Supabase
  const { data, error } = await supabase.from('quests').select('count');
  console.log('✅ Supabase:', error ? '❌ Error' : '✅ Connected');

  // Test Google Maps (make a simple request)
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  console.log('✅ Google Maps Key:', mapsKey ? '✅ Set' : '❌ Missing');

  // Test Gemini
  const geminiKey = import.meta.env.VITE_GOOGLE_AI_KEY;
  console.log('✅ Gemini Key:', geminiKey ? '✅ Set' : '❌ Missing');

  // Test Mapbox
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  console.log('✅ Mapbox Token:', mapboxToken ? '✅ Set' : '❌ Missing');
}

testAPIs();
```

Run with: `node test-apis.js`

---

## 💰 Cost Estimates

### Development (Testing)
- **Monthly cost:** $0
- All services have free tiers
- Typical usage well below limits

### Production (1000 active users)
- Supabase: $0 (under 500MB)
- Google Maps: ~$20-50
- Gemini AI: $0-10
- Mapbox: $0 (under 50K loads)
- **Total:** ~$30-60/month

### Production (10,000 active users)
- Supabase: $25 (Pro tier)
- Google Maps: ~$200-400
- Gemini AI: ~$50-100
- Mapbox: $0-50
- **Total:** ~$275-575/month

---

## 🔒 Security Best Practices

### API Key Security
- ✅ Never commit `.env` to git
- ✅ Use environment variables only
- ✅ Restrict keys to specific domains
- ✅ Rotate keys every 90 days
- ✅ Use different keys for dev/prod
- ✅ Monitor usage for anomalies
- ✅ Set up billing alerts
- ✅ Use key restrictions

### Supabase Security
- Enable RLS on all tables
- Use Row Level Security policies
- Enable email verification
- Configure CORS properly
- Use secure connection strings
- Rotate service role keys

### Best Practices
- Use HTTPS only
- Implement rate limiting
- Add CAPTCHA for sensitive actions
- Log API usage
- Monitor for abuse
- Have incident response plan

---

## 🆘 Troubleshooting

### "API key is invalid"
- Check key is copied correctly (no spaces)
- Verify API is enabled in console
- Check billing account is active
- Try generating new key

### "API quota exceeded"
- Check usage in dashboard
- Upgrade to paid tier if needed
- Implement caching
- Optimize API calls

### "CORS error"
- Add domain to API restrictions
- Check Supabase CORS settings
- Verify URL in .env is correct

### "Unauthorized"
- Check anon key (not service role key)
- Verify RLS policies
- Check authentication state

---

## 📚 Additional Resources

### Supabase
- Docs: https://supabase.com/docs
- Examples: https://github.com/supabase/supabase/tree/master/examples
- Discord: https://discord.supabase.com

### Google Maps
- Docs: https://developers.google.com/maps/documentation
- API Explorer: https://developers.google.com/apis-explorer
- Support: https://developers.google.com/maps/support

### Gemini AI
- Docs: https://ai.google.dev/docs
- Examples: https://ai.google.dev/examples
- API Reference: https://ai.google.dev/api

### Mapbox
- Docs: https://docs.mapbox.com
- Examples: https://docs.mapbox.com/mapbox-gl-js/examples
- Support: https://support.mapbox.com

---

**Last Updated:** November 22, 2025
