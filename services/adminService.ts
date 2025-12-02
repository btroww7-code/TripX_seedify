import { supabase } from '../lib/supabase';

const ADMIN_WALLET_ADDRESS = '0x6819143a95aeed963348b5f1e9c9405999bd1588';

/**
 * Get admin wallet address constant
 */
function getAdminWalletAddress(): string {
  return ADMIN_WALLET_ADDRESS;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalQuests: number;
  completedQuests: number;
  totalTrips: number;
  totalTPXTransfers: number;
  totalTPXMinted: number; // Keep for backward compatibility
  totalNFTPassports: number;
  totalTransactions: number;
  recentActivity: any[];
  recentTransactions?: any[];
  recentQuestCompletions?: any[];
  recentTrips?: any[];
  systemHealth?: {
    database: string;
    api: string;
    blockchain: string;
  };
}

export interface AdminUser {
  id: string;
  wallet_address: string | null;
  email: string | null;
  username: string | null;
  total_xp: number;
  level: number;
  passport_tier: string;
  quests_completed: number;
  total_tokens_earned: number;
  created_at: string;
  last_active_at: string | null;
  countries_visited: string[];
  cities_visited: string[];
  is_banned?: boolean;
  osint?: {
    country?: string | null;
    city?: string | null;
    ip_address?: string | null;
    device_type?: string | null;
    os?: string | null;
    browser?: string | null;
    os_info?: any;
    browser_info?: any;
  } | null;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  action_type: string;
  action_details: any;
  ip_address: string | null;
  user_agent: string | null;
  fingerprint_hash: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  os_info: any;
  browser_info: any;
  action_timestamp: string;
  timestamp?: string;
  username: string | null;
  wallet_address: string | null;
}

/**
 * Get admin statistics - using Supabase directly
 */
export async function getAdminStats(walletAddress?: string): Promise<{ stats: AdminStats }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    console.log('[AdminService] getAdminStats - Using Supabase directly');

    // Get all stats in parallel
    const [
      usersResult,
      activeUsersResult,
      questsResult,
      completedQuestsResult,
      tripsResult,
      transactionsResult,
      nftPassportsResult,
      recentTransactionsResult,
      recentQuestCompletionsResult,
      recentTripsResult
    ] = await Promise.all([
      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      // Active users (last 7 days)
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // Total quests
      supabase.from('quests').select('id', { count: 'exact', head: true }),
      // Completed quests
      supabase
        .from('user_quests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      // Total trips
      supabase.from('trips').select('id', { count: 'exact', head: true }),
      // Total transactions
      supabase.from('token_transactions').select('id', { count: 'exact', head: true }),
      // NFT Passports
      supabase.from('nft_passports').select('id', { count: 'exact', head: true }),
      // Recent transactions
      supabase
        .from('token_transactions')
        .select(`
          *,
          users:user_id (
            id,
            username,
            wallet_address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10),
      // Recent quest completions
      supabase
        .from('user_quests')
        .select(`
          *,
          users:user_id (
            id,
            username,
            wallet_address
          ),
          quests:quest_id (
            id,
            title
          )
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10),
      // Recent trips
      supabase
        .from('trips')
        .select(`
          *,
          users:user_id (
            id,
            username,
            wallet_address
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Calculate total TPX transfers (all transaction types)
    const { data: allTransactions } = await supabase
      .from('token_transactions')
      .select('amount, transaction_type')
      .eq('status', 'confirmed');

    const totalTPXTransfers = allTransactions?.reduce((sum, tx) => {
      return sum + (parseFloat(tx.amount?.toString() || '0') || 0);
    }, 0) || 0;

    // Also calculate minted separately for backward compatibility
    const totalTPXMinted = allTransactions
      ?.filter(tx => tx.transaction_type === 'mint' || tx.transaction_type === 'reward')
      .reduce((sum, tx) => {
        return sum + (parseFloat(tx.amount?.toString() || '0') || 0);
      }, 0) || 0;

    const stats: AdminStats = {
      totalUsers: usersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      totalQuests: questsResult.count || 0,
      completedQuests: completedQuestsResult.count || 0,
      totalTrips: tripsResult.count || 0,
      totalTPXTransfers,
      totalTPXMinted, // Keep for backward compatibility
      totalNFTPassports: nftPassportsResult.count || 0,
      totalTransactions: transactionsResult.count || 0,
      recentActivity: [],
      recentTransactions: recentTransactionsResult.data || [],
      recentQuestCompletions: recentQuestCompletionsResult.data || [],
      recentTrips: recentTripsResult.data || [],
      systemHealth: {
        database: 'healthy',
        api: 'healthy',
        blockchain: 'healthy'
      }
    };

    return { stats };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
}

/**
 * Get all users with filtering - using Supabase directly
 */
export async function getAllUsers(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}, walletAddress?: string): Promise<{ users: AdminUser[]; total: number }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 20;
    const offset = params?.offset || 0;
    const sortBy = params?.sortBy || 'created_at';
    const sortOrder = params?.sortOrder || 'desc';

    console.log('[AdminService] getAllUsers - Using Supabase directly', { params });

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (params?.search) {
      const search = params.search.toLowerCase();
      query = query.or(`wallet_address.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminService] getAllUsers - Error:', error);
      throw new Error(error.message || 'Failed to fetch users');
    }

    // Get most recent session for each user (for OSINT data in table)
    const userIds = (data || []).map((u: any) => u.id);
    const { data: recentSessions } = await supabase
      .from('user_sessions')
      .select('user_id, country, city, ip_address, device_type, os, browser, os_info, browser_info, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    // Group sessions by user_id (get most recent for each)
    const sessionsByUser: { [key: string]: any } = {};
    recentSessions?.forEach((session: any) => {
      if (!sessionsByUser[session.user_id] || 
          new Date(session.created_at) > new Date(sessionsByUser[session.user_id].created_at)) {
        sessionsByUser[session.user_id] = session;
      }
    });

    // Map to AdminUser format with OSINT data
    const users: AdminUser[] = (data || []).map((user: any) => {
      const recentSession = sessionsByUser[user.id];
      return {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        username: user.username,
        total_xp: user.total_xp || 0,
        level: user.level || 1,
        passport_tier: user.passport_tier || 'bronze',
        quests_completed: user.quests_completed || 0,
        total_tokens_earned: parseFloat(user.total_tokens_earned?.toString() || '0') || 0,
        created_at: user.created_at,
        last_active_at: user.last_active_at,
        countries_visited: user.countries_visited || [],
        cities_visited: user.cities_visited || [],
        is_banned: user.is_banned || false,
        // OSINT data from most recent session
        osint: recentSession ? {
          country: recentSession.country,
          city: recentSession.city,
          ip_address: recentSession.ip_address,
          device_type: recentSession.device_type,
          os: recentSession.os || recentSession.os_info?.name,
          browser: recentSession.browser || recentSession.browser_info?.name,
          os_info: recentSession.os_info,
          browser_info: recentSession.browser_info
        } : null
      };
    });

    return {
      users,
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Get user details - using Supabase directly
 */
export async function getUserDetails(userId: string, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    console.log('[AdminService] getUserDetails - Using Supabase directly', { userId });

    // Get user with related data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(userError.message || 'Failed to fetch user');
    }

    // Get related data in parallel - including OSINT data
    const [questsResult, tripsResult, transactionsResult, achievementsResult, sessionsResult, activityResult] = await Promise.all([
      supabase
        .from('user_quests')
        .select(`
          *,
          quests:quest_id (
            id,
            title,
            description
          )
        `)
        .eq('user_id', userId),
      supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('user_achievements')
        .select(`
          *,
          achievements:achievement_id (
            id,
            title,
            description
          )
        `)
        .eq('user_id', userId),
      supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('user_activity_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100)
    ]);

    // Aggregate OSINT data from sessions and activity
    const sessions = sessionsResult.data || [];
    const activities = activityResult.data || [];
    
    // Get unique countries, cities, IPs, fingerprints
    const uniqueCountries = [...new Set(sessions.map((s: any) => s.country).filter(Boolean))];
    const uniqueCities = [...new Set(sessions.map((s: any) => s.city).filter(Boolean))];
    const uniqueIPs = [...new Set(sessions.map((s: any) => s.ip_address).filter(Boolean))];
    const uniqueFingerprints = [...new Set(sessions.map((s: any) => s.fingerprint_hash || s.fingerprint).filter(Boolean))];
    const uniqueDevices = [...new Set(sessions.map((s: any) => s.device_type).filter(Boolean))];
    const uniqueOS = [...new Set(sessions.map((s: any) => s.os).filter(Boolean))];
    const uniqueBrowsers = [...new Set(sessions.map((s: any) => s.browser).filter(Boolean))];
    
    // Get most recent session for current location
    const mostRecentSession = sessions[0] || null;
    
    // Calculate statistics
    const osintStats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s: any) => s.is_active).length,
      uniqueCountries: uniqueCountries.length,
      uniqueCities: uniqueCities.length,
      uniqueIPs: uniqueIPs.length,
      uniqueFingerprints: uniqueFingerprints.length,
      uniqueDevices: uniqueDevices.length,
      uniqueOS: uniqueOS.length,
      uniqueBrowsers: uniqueBrowsers.length,
      totalActivityEvents: activities.length,
      firstSeen: sessions.length > 0 ? sessions[sessions.length - 1]?.created_at : null,
      lastSeen: mostRecentSession?.last_activity_at || mostRecentSession?.created_at || null
    };

    return {
      user,
      quests: questsResult.data || [],
      trips: tripsResult.data || [],
      transactions: transactionsResult.data || [],
      achievements: achievementsResult.data || [],
      sessions,
      activities,
      osint: {
        stats: osintStats,
        mostRecentSession,
        uniqueCountries,
        uniqueCities,
        uniqueIPs,
        uniqueFingerprints,
        uniqueDevices,
        uniqueOS,
        uniqueBrowsers,
        allSessions: sessions,
        allActivities: activities
      }
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
}

/**
 * Get activity log - using Supabase directly
 * Fetches from user_activity_events (where data is actually stored)
 */
export async function getActivityLog(params?: {
  userId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}, walletAddress?: string): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 100;
    const offset = params?.offset || 0;

    console.log('[AdminService] getActivityLog - Using Supabase directly', { params });

    // Query user_activity_events (where data is actually stored)
    let query = supabase
      .from('user_activity_events')
      .select(`
        *,
        users:user_id (
          username,
          wallet_address
        )
      `, { count: 'exact' });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params?.actionType) {
      query = query.eq('event_type', params.actionType);
    }
    if (params?.startDate) {
      query = query.gte('timestamp', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('timestamp', params.endDate);
    }

    query = query.order('timestamp', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const result = await query;
    
    if (result.error) {
      console.error('[AdminService] getActivityLog - Error:', result.error);
      // Try admin_activity_log as fallback
      console.log('[AdminService] Trying admin_activity_log as fallback...');
      let fallbackQuery = supabase
        .from('admin_activity_log')
        .select(`
          *,
          users:user_id (
            username,
            wallet_address
          )
        `, { count: 'exact' });

      if (params?.userId) {
        fallbackQuery = fallbackQuery.eq('user_id', params.userId);
      }
      if (params?.actionType) {
        fallbackQuery = fallbackQuery.eq('action_type', params.actionType);
      }
      if (params?.startDate) {
        fallbackQuery = fallbackQuery.gte('timestamp', params.startDate);
      }
      if (params?.endDate) {
        fallbackQuery = fallbackQuery.lte('timestamp', params.endDate);
      }

      fallbackQuery = fallbackQuery.order('timestamp', { ascending: false });
      fallbackQuery = fallbackQuery.range(offset, offset + limit - 1);

      const fallbackResult = await fallbackQuery;
      
      if (fallbackResult.error) {
        throw new Error(fallbackResult.error.message || 'Failed to fetch activity log');
      }

      const logs: ActivityLogEntry[] = (fallbackResult.data || []).map((log: any) => ({
        id: log.id,
        user_id: log.user_id,
        action_type: log.action_type,
        action_details: log.action_details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        fingerprint_hash: log.fingerprint_hash,
        country: log.country,
        city: log.city,
        device_type: log.device_type,
        os_info: log.os_info,
        browser_info: log.browser_info,
        action_timestamp: log.timestamp || log.action_timestamp,
        timestamp: log.timestamp || log.action_timestamp,
        username: log.users?.username || null,
        wallet_address: log.users?.wallet_address || null
      }));

      return {
        logs,
        total: fallbackResult.count || 0
      };
    }

    // Map user_activity_events to ActivityLogEntry format
    const logs: ActivityLogEntry[] = (result.data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      action_type: log.event_type || log.action_type, // user_activity_events uses event_type
      action_details: log.event_data || log.action_details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      fingerprint_hash: log.fingerprint_hash,
      country: log.country,
      city: log.city,
      device_type: log.device_type,
      os_info: log.os_info,
      browser_info: log.browser_info,
      action_timestamp: log.timestamp || log.action_timestamp,
      timestamp: log.timestamp || log.action_timestamp,
      username: log.users?.username || null,
      wallet_address: log.users?.wallet_address || null
    }));

    // Get total count
    let countQuery = supabase
      .from('user_activity_events')
      .select('id', { count: 'exact', head: true });

    if (params?.userId) {
      countQuery = countQuery.eq('user_id', params.userId);
    }
    if (params?.actionType) {
      countQuery = countQuery.eq('event_type', params.actionType);
    }
    if (params?.startDate) {
      countQuery = countQuery.gte('timestamp', params.startDate);
    }
    if (params?.endDate) {
      countQuery = countQuery.lte('timestamp', params.endDate);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.warn('[AdminService] Count query error, using data length:', countError);
    }

    console.log('[AdminService] getActivityLog - Found logs:', logs.length, 'Total:', count || logs.length);

    return {
      logs,
      total: count || logs.length || 0
    };
  } catch (error) {
    console.error('Error fetching activity log:', error);
    throw error;
  }
}

/**
 * Get all sessions - using Supabase directly
 */
export async function getAllSessions(params?: {
  userId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}, walletAddress?: string): Promise<{ sessions: any[]; total: number }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    console.log('[AdminService] getAllSessions - Using Supabase directly', { params });

    let query = supabase
      .from('user_sessions')
      .select(`
        *,
        users:user_id (
          id,
          username,
          wallet_address,
          email
        )
      `, { count: 'exact' });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params?.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminService] getAllSessions - Error:', error);
      throw new Error(error.message || 'Failed to fetch sessions');
    }

    console.log('[AdminService] getAllSessions - Found sessions:', data?.length || 0, 'Total:', count || 0);

    return {
      sessions: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

/**
 * Get all quests - using Supabase directly
 */
export async function getAllQuests(params?: {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}, walletAddress?: string): Promise<{ quests: any[]; total: number; stats: any }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    console.log('[AdminService] getAllQuests - Using Supabase directly', { params });

    let query = supabase
      .from('quests')
      .select('*', { count: 'exact' });

    if (params?.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminService] getAllQuests - Error:', error);
      throw new Error(error.message || 'Failed to fetch quests');
    }

    // Get quest stats
    const [totalQuestsResult, activeQuestsResult, completedQuestsResult] = await Promise.all([
      supabase.from('quests').select('id', { count: 'exact', head: true }),
      supabase.from('quests').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('user_quests').select('id', { count: 'exact', head: true }).eq('status', 'completed')
    ]);

    const stats = {
      total: totalQuestsResult.count || 0,
      active: activeQuestsResult.count || 0,
      completed: completedQuestsResult.count || 0
    };

    return {
      quests: data || [],
      total: count || 0,
      stats
    };
  } catch (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }
}

/**
 * Get all trips - using Supabase directly
 */
export async function getAllTrips(params?: {
  userId?: string;
  limit?: number;
  offset?: number;
}, walletAddress?: string): Promise<{ trips: any[]; total: number }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    console.log('[AdminService] getAllTrips - Using Supabase directly', { params });

    let query = supabase
      .from('trips')
      .select(`
        *,
        users:user_id (
          id,
          username,
          wallet_address
        )
      `, { count: 'exact' });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminService] getAllTrips - Error:', error);
      throw new Error(error.message || 'Failed to fetch trips');
    }

    return {
      trips: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
}

/**
 * Get all transactions - using Supabase directly
 */
export async function getAllTransactions(params?: {
  userId?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, walletAddress?: string): Promise<{ transactions: any[]; total: number }> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    console.log('[AdminService] getAllTransactions - Using Supabase directly', { params });

    let query = supabase
      .from('token_transactions')
      .select(`
        *,
        users:user_id (
          id,
          username,
          wallet_address
        )
      `, { count: 'exact' });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params?.type) {
      query = query.eq('transaction_type', params.type);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[AdminService] getAllTransactions - Error:', error);
      throw new Error(error.message || 'Failed to fetch transactions');
    }

    return {
      transactions: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Ban user - using Supabase directly
 */
export async function banUser(userId: string, reason?: string, walletAddress?: string): Promise<void> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { error } = await supabase
      .from('users')
      .update({ is_banned: true })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to ban user');
    }
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
}

/**
 * Unban user - using Supabase directly
 */
export async function unbanUser(userId: string, walletAddress?: string): Promise<void> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { error } = await supabase
      .from('users')
      .update({ is_banned: false })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to unban user');
    }
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
}

/**
 * Update user - using Supabase directly
 */
export async function updateUser(userId: string, data: Partial<AdminUser>, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update user');
    }

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user - using Supabase directly
 */
export async function deleteUser(userId: string, walletAddress?: string): Promise<void> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Add/Remove tokens for user - using Supabase directly
 */
export async function addTokens(userId: string, amount: number, operation: 'add' | 'subtract' = 'add', reason?: string, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    // Get current user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('total_tokens_earned')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch user');
    }

    const currentAmount = parseFloat(user.total_tokens_earned?.toString() || '0') || 0;
    const newAmount = operation === 'add' 
      ? currentAmount + amount 
      : Math.max(0, currentAmount - amount);

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ total_tokens_earned: newAmount })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update tokens');
    }

    // Log transaction
    await supabase.from('token_transactions').insert({
      user_id: userId,
      transaction_type: operation === 'add' ? 'admin_adjustment' : 'admin_deduction',
      amount: amount,
      status: 'confirmed',
      metadata: {
        reason: reason || 'Admin adjustment',
        admin_wallet: adminAddress
      }
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating tokens:', error);
    throw error;
  }
}

/**
 * Add/Remove XP for user - using Supabase directly
 */
export async function addXP(userId: string, amount: number, operation: 'add' | 'subtract' = 'add', reason?: string, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    // Get current user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('total_xp, level')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch user');
    }

    const currentXP = user.total_xp || 0;
    const newXP = operation === 'add' 
      ? currentXP + amount 
      : Math.max(0, currentXP - amount);
    
    // Calculate new level (simple formula: level = floor(sqrt(xp) / 10) + 1)
    const newLevel = Math.floor(Math.sqrt(newXP) / 10) + 1;

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        total_xp: newXP,
        level: newLevel
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update XP');
    }

    return updatedUser;
  } catch (error) {
    console.error('Error updating XP:', error);
    throw error;
  }
}

/**
 * Create new quest - using Supabase directly
 */
export async function createQuest(questData: {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty?: number;
  reward_tokens?: number;
  reward_xp?: number;
  quest_type?: string;
  category?: string;
  sponsor_name?: string;
  is_active?: boolean;
  is_permanent?: boolean;
}, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { data: quest, error } = await supabase
      .from('quests')
      .insert(questData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create quest');
    }

    return quest;
  } catch (error) {
    console.error('Error creating quest:', error);
    throw error;
  }
}

/**
 * Update quest - using Supabase directly
 */
export async function updateQuest(questId: string, questData: Partial<{
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty: number;
  reward_tokens: number;
  reward_xp: number;
  quest_type: string;
  category: string;
  sponsor_name: string;
  is_active: boolean;
  is_permanent: boolean;
}>, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { data: quest, error } = await supabase
      .from('quests')
      .update(questData)
      .eq('id', questId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update quest');
    }

    return quest;
  } catch (error) {
    console.error('Error updating quest:', error);
    throw error;
  }
}

/**
 * Delete quest - using Supabase directly
 */
export async function deleteQuest(questId: string, walletAddress?: string): Promise<void> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId);

    if (error) {
      throw new Error(error.message || 'Failed to delete quest');
    }
  } catch (error) {
    console.error('Error deleting quest:', error);
    throw error;
  }
}

/**
 * Get analytics data - using Supabase directly with comprehensive data
 */
export async function getAnalytics(params?: {
  dateRange?: '7d' | '30d' | '90d' | '1y';
}, walletAddress?: string): Promise<any> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    const dateRange = params?.dateRange || '30d';
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get comprehensive analytics data
    const [
      usersResult,
      questsResult,
      transactionsResult,
      tripsResult,
      sessionsResult,
      activityResult,
      topCountriesResult,
      topCitiesResult,
      topQuestsResult,
      topUsersResult
    ] = await Promise.all([
      // Users by date
      supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),
      // Quest completions by date
      supabase
        .from('user_quests')
        .select('completed_at, quest_id')
        .gte('completed_at', startDate)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true }),
      // Transactions by date
      supabase
        .from('token_transactions')
        .select('amount, created_at, transaction_type')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),
      // Trips by date
      supabase
        .from('trips')
        .select('created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),
      // Active sessions
      supabase
        .from('user_sessions')
        .select('created_at, country, city')
        .gte('created_at', startDate)
        .eq('is_active', true),
      // Activity events
      supabase
        .from('user_activity_events')
        .select('timestamp, event_type')
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: true }),
      // Top countries from sessions
      supabase
        .from('user_sessions')
        .select('country')
        .gte('created_at', startDate)
        .not('country', 'is', null),
      // Top cities from sessions
      supabase
        .from('user_sessions')
        .select('city')
        .gte('created_at', startDate)
        .not('city', 'is', null),
      // Top quests by completions
      supabase
        .from('user_quests')
        .select('quest_id, quests:quest_id(title)')
        .gte('completed_at', startDate)
        .eq('status', 'completed'),
      // Top users by tokens
      supabase
        .from('users')
        .select('id, username, wallet_address, total_tokens_earned')
        .gte('created_at', startDate)
        .order('total_tokens_earned', { ascending: false })
        .limit(10)
    ]);

    // Process data for charts
    const processTimeSeries = (data: any[], dateField: string) => {
      const grouped: { [key: string]: number } = {};
      data?.forEach((item: any) => {
        if (item[dateField]) {
          const date = new Date(item[dateField]).toISOString().split('T')[0];
          grouped[date] = (grouped[date] || 0) + 1;
        }
      });
      return Object.entries(grouped)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const processTransactionVolume = (data: any[]) => {
      const grouped: { [key: string]: number } = {};
      data?.forEach((item: any) => {
        if (item.created_at) {
          const date = new Date(item.created_at).toISOString().split('T')[0];
          const amount = parseFloat(item.amount?.toString() || '0') || 0;
          grouped[date] = (grouped[date] || 0) + amount;
        }
      });
      return Object.entries(grouped)
        .map(([date, volume]) => ({ date, volume }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const processCountByField = (data: any[], field: string) => {
      const grouped: { [key: string]: number } = {};
      data?.forEach((item: any) => {
        const value = item[field];
        if (value) {
          grouped[value] = (grouped[value] || 0) + 1;
        }
      });
      return Object.entries(grouped)
        .map(([key, count]) => ({ [field === 'country' ? 'country' : field === 'city' ? 'city' : 'title']: key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    const processQuestCompletions = (data: any[]) => {
      const grouped: { [key: string]: number } = {};
      data?.forEach((item: any) => {
        const questTitle = item.quests?.title || 'Unknown';
        grouped[questTitle] = (grouped[questTitle] || 0) + 1;
      });
      return Object.entries(grouped)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    };

    const userGrowth = processTimeSeries(usersResult.data || [], 'created_at');
    const questTrends = processTimeSeries(questsResult.data || [], 'completed_at');
    const transactionVolume = processTransactionVolume(transactionsResult.data || []);
    const activeUsers = processTimeSeries(sessionsResult.data || [], 'created_at');
    const topCountries = processCountByField(topCountriesResult.data || [], 'country');
    const topCities = processCountByField(topCitiesResult.data || [], 'city');
    const topQuests = processQuestCompletions(topQuestsResult.data || []);
    
    const tokenDistribution = (topUsersResult.data || []).map((user: any) => ({
      user: user.username || user.wallet_address?.substring(0, 10) || 'Unknown',
      tokens: parseFloat(user.total_tokens_earned?.toString() || '0') || 0
    }));

    return {
      dateRange,
      userGrowth: userGrowth.map((item: any) => ({ users: item.count })),
      questTrends: questTrends.map((item: any) => ({ completions: item.count })),
      transactionVolume: transactionVolume.map((item: any) => ({ volume: item.volume })),
      activeUsers: activeUsers.map((item: any) => ({ active_users: item.count })),
      topCountries,
      topCities,
      topQuests,
      tokenDistribution,
      users: {
        total: usersResult.data?.length || 0,
        data: usersResult.data || []
      },
      quests: {
        total: questsResult.data?.length || 0,
        data: questsResult.data || []
      },
      transactions: {
        total: transactionsResult.data?.length || 0,
        totalAmount: transactionsResult.data?.reduce((sum, tx) => sum + (parseFloat(tx.amount?.toString() || '0') || 0), 0) || 0,
        data: transactionsResult.data || []
      },
      trips: {
        total: tripsResult.data?.length || 0,
        data: tripsResult.data || []
      }
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
}

/**
 * Toggle quest active status - using Supabase directly
 */
export async function toggleQuest(questId: string, walletAddress?: string): Promise<void> {
  try {
    const adminAddress = walletAddress || getAdminWalletAddress();
    if (!adminAddress) {
      throw new Error('Admin wallet address required');
    }

    // Get current status
    const { data: quest, error: fetchError } = await supabase
      .from('quests')
      .select('is_active')
      .eq('id', questId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to fetch quest');
    }

    // Toggle status
    const { error } = await supabase
      .from('quests')
      .update({ is_active: !quest.is_active })
      .eq('id', questId);

    if (error) {
      throw new Error(error.message || 'Failed to toggle quest');
    }
  } catch (error) {
    console.error('Error toggling quest:', error);
    throw error;
  }
}

/**
 * Get blockchain stats - using Supabase directly
 */
export async function getBlockchainStats(): Promise<any> {
  try {
    // Get NFT passport stats
    const [nftPassportsResult, nftTransactionsResult, tokenTransactionsResult] = await Promise.all([
      supabase.from('nft_passports').select('*', { count: 'exact', head: true }),
      supabase.from('nft_transactions').select('*', { count: 'exact', head: true }),
      supabase
        .from('token_transactions')
        .select('amount, transaction_type')
        .eq('status', 'confirmed')
    ]);

    const totalTPX = tokenTransactionsResult.data?.reduce((sum, tx) => {
      if (tx.transaction_type === 'mint' || tx.transaction_type === 'reward') {
        return sum + (parseFloat(tx.amount?.toString() || '0') || 0);
      }
      return sum;
    }, 0) || 0;

    return {
      nftPassports: {
        total: nftPassportsResult.count || 0
      },
      nftTransactions: {
        total: nftTransactionsResult.count || 0
      },
      tokenStats: {
        totalTPXMinted: totalTPX,
        totalTransactions: tokenTransactionsResult.data?.length || 0
      }
    };
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    throw error;
  }
}
