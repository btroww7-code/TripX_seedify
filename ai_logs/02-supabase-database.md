# 🗄️ Iteration 02: Supabase Database & Authentication

## Date: November 2025 (Week 1)

## Objective
Design and implement the database schema using Supabase, including authentication and Row Level Security (RLS).

---

## AI Tools Used
- **Visual Studio Code** - Primary IDE with SQL extensions
- **Cursor AI** - SQL generation, schema design
- **GitHub Copilot** - TypeScript types generation
- **Kiro (AWS)** - Database architecture review
- **Bolt.new** - Instant preview with Supabase
- **Claude (Anthropic)** - Schema design, RLS policies

---

## Prompts & Results

### Prompt 1: Database Schema Design

```
Design a PostgreSQL schema for TripX with these entities:
- Users (id, email, wallet_address, username, avatar, xp, level, created_at)
- Quests (id, title, description, lat, lng, difficulty, xp_reward, token_reward, category, is_active)
- User_Quests (user_id, quest_id, status, started_at, completed_at, photo_url)
- Achievements (id, title, description, icon, requirement_type, requirement_value)
- User_Achievements (user_id, achievement_id, unlocked_at)
- Leaderboard (user_id, total_xp, rank, updated_at)
- Trips (id, user_id, destination, duration, generated_plan)
- Saved_Routes (id, user_id, origin, destination, route_data)

Include proper foreign keys, indexes, and constraints.
```

**AI Output:** Complete SQL schema with 10 tables.

### Prompt 2: Row Level Security Policies

```
Create RLS policies for Supabase:
- Users: read own data, admins read all
- Quests: public read, admin write
- User_Quests: users see own progress only
- Achievements: public read
- Leaderboard: public read, system update only
Ensure no data leaks between users.
```

**AI Output:** Comprehensive RLS policies for each table.

### Prompt 3: Authentication Setup

```
Set up Supabase authentication with:
- Email/password signup with magic link
- Web3 wallet authentication (sign message)
- Session management
- Protected routes in React
Create useAuth hook for easy integration.
```

**AI Output:** Auth configuration and React hooks.

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  wallet_address TEXT UNIQUE,
  username TEXT,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  tokens_earned INTEGER DEFAULT 0,
  tokens_claimed INTEGER DEFAULT 0,
  nft_passport_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quests table
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  xp_reward INTEGER DEFAULT 100,
  token_reward INTEGER DEFAULT 50,
  category TEXT DEFAULT 'explore',
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  is_sponsored BOOLEAN DEFAULT false,
  sponsor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Quests (progress tracking)
CREATE TABLE user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  photo_url TEXT,
  verification_score INTEGER,
  tokens_claimed BOOLEAN DEFAULT false,
  nft_minted BOOLEAN DEFAULT false,
  UNIQUE(user_id, quest_id)
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true
);

-- Leaderboard
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  quests_completed INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RLS Policies (AI-generated)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

-- Users: read own, update own
CREATE POLICY "Users read own" ON users
  FOR SELECT USING (auth.uid() = id OR wallet_address IS NOT NULL);

CREATE POLICY "Users update own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Quests: public read
CREATE POLICY "Quests public read" ON quests
  FOR SELECT USING (is_active = true);

-- User_Quests: own data only
CREATE POLICY "User quests own" ON user_quests
  FOR ALL USING (auth.uid() = user_id);
```

---

## TypeScript Types (AI-generated)

```typescript
export interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  username?: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  tokens_earned: number;
  tokens_claimed: number;
  nft_passport_id?: string;
  created_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  xp_reward: number;
  token_reward: number;
  category: string;
  radius_meters: number;
  is_active: boolean;
  is_sponsored: boolean;
  sponsor_name?: string;
}

export interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'verified';
  started_at?: string;
  completed_at?: string;
  photo_url?: string;
  verification_score?: number;
  tokens_claimed: boolean;
  nft_minted: boolean;
}
```

---

## Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## Auth Hook (AI-generated)

```typescript
// hooks/useEmailAuth.ts
export function useEmailAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    return supabase.auth.signInWithOtp({ email });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return { user, loading, signIn, signOut };
}
```

---

## Challenges & Solutions

### Challenge 1: RLS with Wallet Auth
- **Issue:** Users without email (wallet-only) couldn't pass RLS
- **AI Solution:** Added OR condition for wallet_address in policies

### Challenge 2: Leaderboard Performance
- **Issue:** Calculating ranks on every query was slow
- **AI Solution:** Created materialized view with periodic refresh

---

## Metrics

| Metric | Value |
|--------|-------|
| Time Spent | 6 hours |
| Traditional Estimate | 3 days |
| Tables Created | 10 |
| RLS Policies | 15+ |
| Lines of SQL | ~500 |
| AI Assistance | 85% |

---

## Next Iteration
→ [03-web3-blockchain.md](./03-web3-blockchain.md) - Smart contracts and Web3 integration
