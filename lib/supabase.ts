import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.warn('⚠️ VITE_SUPABASE_URL nie jest ustawiony w .env');
  console.warn('Aplikacja może nie działać poprawnie bez Supabase.');
}

if (!supabaseAnonKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY nie jest ustawiony w .env');
  console.warn('Aplikacja może nie działać poprawnie bez Supabase.');
}

// Create Supabase client with validation
let supabaseClient;
try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '') {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.error('❌ Supabase nie jest skonfigurowany!');
    console.error('Dodaj do .env:');
    console.error('  VITE_SUPABASE_URL=https://twoj-projekt.supabase.co');
    console.error('  VITE_SUPABASE_ANON_KEY=twoj-anon-key');
    // Create a dummy client to prevent crashes
    supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
} catch (error) {
  console.error('Błąd inicjalizacji Supabase:', error);
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export const supabase = supabaseClient;

export interface User {
  id: string;
  wallet_address?: string | null;
  email?: string | null;
  auth_user_id?: string | null;
  username?: string;
  total_xp: number;
  level: number;
  passport_tier: string;
  quests_completed: number;
  total_tokens_earned: number;
  registration_ip?: string | null;
  registration_at?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  login_count?: number;
  user_agent?: string | null;
  last_user_agent?: string | null;
  countries_visited?: string[] | null;
  cities_visited?: string[] | null;
  total_distance_traveled?: number | null;
  last_active_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty: number;
  reward_tokens: number;
  reward_xp: number;
  quest_type: 'standard' | 'sponsored' | 'hidden_gem';
  sponsor_name?: string;
  creator_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  proof_image_url?: string;
  verification_result?: any;
  completed_at?: string;
  tokens_claimed: boolean;
  claimed_at?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  season: string;
  rank: number;
  total_xp: number;
  quests_completed: number;
  tokens_earned: number;
  updated_at: string;
  users?: User;
}
