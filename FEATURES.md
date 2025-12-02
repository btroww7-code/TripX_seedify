# 🎯 TripX Features Documentation

Complete guide to all TripX features and capabilities.

---

## 🗺️ Transit Planner

**Real-time multi-modal route planning with interactive maps.**

### Features
- ✅ Multi-modal routing (bus, train, metro, tram, walking)
- ✅ Real-time transit data via Google Directions API
- ✅ Multiple route alternatives
- ✅ Detailed step-by-step instructions
- ✅ Transfer information
- ✅ Duration and distance calculations
- ✅ Departure/arrival times
- ✅ Direct ticket purchase links
- ✅ Route saving for logged-in users
- ✅ Interactive Mapbox visualization
- ✅ Dark mode optimized

### How to Use
1. Go to **Transit** page
2. Enter origin and destination
3. (Optional) Set departure time
4. Click **Find Connections**
5. View multiple route options
6. Click **View Map** to see route visualization
7. Click **Buy Ticket** to purchase
8. Click **Save** to bookmark route (requires login)

### Supported Operators
- **Poland:** PKP Intercity, ZTM Warszawa, Metro, Koleje Mazowieckie
- **Europe:** Most major transit operators via Google Directions API
- **Global:** Public transit data available worldwide

---

## 🎮 Quest System

**GPS-verified location challenges with rewards.**

### Features
- ✅ GPS-based verification (100m radius)
- ✅ Photo upload and AI verification
- ✅ Multiple quest categories
- ✅ Difficulty scaling (1-5)
- ✅ XP and token rewards
- ✅ Quest progress tracking
- ✅ Interactive map visualization
- ✅ Sponsored quests
- ✅ Real-time distance tracking
- ✅ Anti-spoofing measures

### Quest Categories
1. **Travel** - Visit landmarks and explore cities
2. **Food & Drink** - Try local cuisine
3. **Culture** - Experience art and history
4. **Adventure** - Outdoor activities
5. **Photography** - Capture moments
6. **Social** - Meet locals
7. **Shopping** - Discover markets
8. **Wellness** - Yoga and relaxation

### How to Complete a Quest
1. Go to **Quests** page
2. Browse available quests or use map
3. Click on a quest to see details
4. Click **Start Quest**
5. Navigate to quest location (GPS tracking active)
6. Take a photo when within 100m
7. Upload photo for AI verification
8. Receive XP and tokens upon completion

### Quest Difficulty
- **Level 1 (Easy):** 50 TPX, 100 XP
- **Level 2 (Medium):** 100 TPX, 200 XP
- **Level 3 (Hard):** 150 TPX, 300 XP
- **Level 4 (Very Hard):** 200 TPX, 400 XP
- **Level 5 (Expert):** 300 TPX, 500 XP

### GPS Verification
- **Radius:** 100 meters default
- **Accuracy:** <50m required
- **Auto-complete:** 30 seconds in range
- **Anti-spoofing:** Speed check, mock location detection
- **Real-time tracking:** Live distance updates

---

## 🤖 AI Trip Planning

**Gemini-powered intelligent itinerary generation.**

### Features
- ✅ Natural language input
- ✅ Multi-day itinerary generation
- ✅ POI recommendations
- ✅ Time optimization
- ✅ Budget considerations
- ✅ Local insights
- ✅ Transit integration
- ✅ Weather considerations
- ✅ Dietary preferences
- ✅ Accessibility options

### How to Use
1. Go to **Create Trip** page
2. Enter destination
3. Specify dates and preferences:
   - Duration (1-14 days)
   - Budget level (Budget/Moderate/Luxury)
   - Interests (Culture/Food/Adventure/etc.)
   - Dietary restrictions
   - Accessibility needs
4. Click **Generate Itinerary**
5. Review AI-generated plan
6. Edit or customize as needed
7. Save trip to your profile
8. Export to calendar or PDF

### AI Capabilities
- Understands context and preferences
- Suggests optimal routes and timing
- Includes local tips and warnings
- Adapts to budget constraints
- Considers seasonal factors
- Recommends hidden gems
- Provides backup options

---

## 🏆 Gamification System

**XP, levels, achievements, and rewards.**

### Leveling System
- **Start:** Level 1, 0 XP
- **Level up:** Exponential XP curve
- **Max level:** 100
- **Formula:** `level = floor(sqrt(totalXP / 100))`

### XP Sources
- Complete quests: 100-500 XP
- Create trips: 50 XP
- Save routes: 10 XP
- Daily login: 5 XP
- Share content: 20 XP
- Invite friends: 100 XP

### Achievements
1. **First Steps** - Complete first quest
2. **Explorer** - Visit 10 locations
3. **Globetrotter** - Visit 5 cities
4. **Transit Master** - Use 50 routes
5. **Quest Hunter** - Complete 25 quests
6. **Social Butterfly** - Share 10 experiences
7. **Early Bird** - Login 7 days in a row
8. **Night Owl** - Complete quest after 10pm
9. **Speed Demon** - Complete 5 quests in one day
10. **Perfectionist** - Get 100% accuracy on 10 quests

### Leaderboard
- **Global:** Top players worldwide
- **Regional:** Top in your area
- **Friends:** Compete with connections
- **Seasonal:** Monthly/yearly resets
- **Categories:** XP, Quests, Distance, Tokens

---

## 💰 Token Economy

**TPX token rewards and NFT passports.**

### TPX Token
- **Symbol:** TPX
- **Network:** Base Sepolia (testnet)
- **Type:** ERC-20
- **Uses:**
  - Quest rewards
  - Sponsored quest participation
  - NFT passport upgrades
  - Premium features
  - Marketplace purchases

### Earning TPX
- Complete quests: 50-300 TPX
- Daily challenges: 25 TPX
- Achievements: 100-500 TPX
- Referrals: 200 TPX per friend
- Sponsored quests: Variable rewards

### NFT Passport
- **Type:** ERC-721 (unique NFT)
- **Tiers:** Gray → Bronze → Silver → Gold → Platinum
- **Upgrades:** Earn through quests and XP
- **Benefits:**
  - Exclusive quests
  - Higher rewards
  - Special badges
  - Early access to features
  - Collectible value

### Claiming Rewards
1. Complete quest/achievement
2. Go to **Profile** page
3. Click **Claim Rewards**
4. Connect Web3 wallet
5. Approve transaction
6. Tokens sent to your wallet

---

## 📍 Location Services

**GPS tracking, geofencing, and real-time updates.**

### Features
- ✅ High-accuracy GPS
- ✅ Real-time position tracking
- ✅ Geofencing (quest verification)
- ✅ Distance calculations
- ✅ Anti-spoofing measures
- ✅ Battery optimization
- ✅ Offline support

### Privacy
- Location used only when quest active
- No background tracking
- Data encrypted in transit
- No location history storage
- Full control in settings

---

## 🔐 Authentication

**Secure login with multiple options.**

### Login Methods
1. **Email Magic Link**
   - Enter email
   - Receive link
   - Click to login
   - No password needed

2. **Web3 Wallet**
   - Connect MetaMask/WalletConnect
   - Sign message
   - Instant login
   - Blockchain verified

### Security Features
- Email verification
- Rate limiting
- Session management
- Auto-logout after 30 days
- Secure token storage
- No password storage

---

## 📊 User Dashboard

**Personal stats and activity tracking.**

### Stats Displayed
- Total XP and level
- Quests completed
- Cities visited
- Tokens earned
- Current streak
- Total distance traveled
- Active achievements
- Leaderboard position

### Activity Feed
- Recent quests
- Trip history
- Achievement unlocks
- Friend activity
- Upcoming challenges

---

## 🗺️ Interactive Maps

**Mapbox-powered visualizations.**

### Features
- Dark mode optimized
- Real-time updates
- Custom markers
- Route polylines
- User location tracking
- Zoom/pan controls
- Fullscreen mode
- Touch gestures
- Offline caching

### Map Types
1. **Transit Map** - Route visualization with transfers
2. **Quest Map** - All available quests with difficulty colors
3. **Trip Map** - Full itinerary with waypoints
4. **Heatmap** - Activity density visualization

---

## 🔔 Notifications

**Real-time updates and alerts.**

### Notification Types
- Quest nearby (proximity alerts)
- Quest completed
- Level up
- Achievement unlocked
- Friend activity
- Sponsored quest available
- System announcements

### Settings
- Enable/disable per category
- Sound preferences
- Vibration options
- Quiet hours
- Location-based triggers

---

## 🌐 Multi-language Support

**Interface available in multiple languages.**

### Supported Languages
- English (default)
- Polish (Polski)
- German (Deutsch)
- French (Français)
- Spanish (Español)
- Italian (Italiano)

### Auto-detection
- Browser language detected
- Can be changed in settings
- Saves preference

---

## 📱 Progressive Web App

**Install as native app on any device.**

### Features
- Add to home screen
- Offline functionality
- Push notifications
- Native app feel
- Fast loading
- Background sync

### Installation
1. Visit TripX in browser
2. Click "Install" prompt or
3. Menu → Add to Home Screen
4. Open as app from home screen

---

## 🎨 Customization

**Personalize your experience.**

### Settings
- Dark/light theme (dark default)
- Map style
- Distance units (km/mi)
- Currency
- Notification preferences
- Privacy settings
- Language

### Profile
- Avatar upload
- Username
- Bio
- Interests
- Privacy level
- Social links

---

## 🔌 Integrations

**Connected services and APIs.**

### Current Integrations
- Google Maps (routing)
- Gemini AI (trip planning)
- Mapbox (visualization)
- Supabase (database)
- Base Sepolia (blockchain)
- Web3Auth (wallet)

### Coming Soon
- Uber/Lyft integration
- Hotel booking
- Flight search
- Restaurant reservations
- Event tickets
- Travel insurance

---

## 📈 Analytics

**Track your travel journey.**

### Metrics
- Distance traveled
- Cities visited
- Quests completed
- Time on transit
- Carbon footprint saved
- Money saved vs car
- Social impact

### Visualizations
- Activity heatmap
- Progress charts
- Comparison graphs
- Achievement timeline
- Route history

---

## 🆘 Support

**Help and resources.**

### Documentation
- Setup guide
- API reference
- Troubleshooting
- FAQs
- Video tutorials

### Community
- Discord server
- Twitter updates
- Blog posts
- User forums
- Feature requests

---

**Last Updated:** November 22, 2025
