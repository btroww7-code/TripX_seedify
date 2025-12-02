import { supabase } from '../lib/supabase';

export interface SponsoredQuest {
  id: string;
  quest_id: string;
  sponsor_wallet: string;
  sponsor_email?: string;
  sponsor_company?: string;
  total_budget: number;
  budget_spent: number;
  reward_per_completion: number;
  max_completions: number;
  current_completions: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  payment_status: string;
  payment_tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSponsoredQuestParams {
  questId: string;
  sponsorWallet: string;
  sponsorEmail?: string;
  sponsorCompany?: string;
  totalBudget: number;
  rewardPerCompletion: number;
  maxCompletions: number;
  startDate: Date;
  endDate: Date;
  paymentTxHash?: string;
}

export async function createSponsoredQuest(
  params: CreateSponsoredQuestParams
): Promise<SponsoredQuest> {
  if (params.totalBudget < params.rewardPerCompletion * params.maxCompletions) {
    throw new Error('Total budget must cover all completions');
  }

  if (params.endDate <= params.startDate) {
    throw new Error('End date must be after start date');
  }

  const { data, error } = await supabase
    .from('sponsored_quests')
    .insert({
      quest_id: params.questId,
      sponsor_wallet: params.sponsorWallet,
      sponsor_email: params.sponsorEmail,
      sponsor_company: params.sponsorCompany,
      total_budget: params.totalBudget,
      reward_per_completion: params.rewardPerCompletion,
      max_completions: params.maxCompletions,
      start_date: params.startDate.toISOString(),
      end_date: params.endDate.toISOString(),
      payment_status: params.paymentTxHash ? 'confirmed' : 'pending',
      payment_tx_hash: params.paymentTxHash,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create sponsored quest: ${error.message}`);
  }

  await supabase
    .from('quests')
    .update({
      quest_type: 'sponsored',
      reward_tokens: params.rewardPerCompletion,
    })
    .eq('id', params.questId);

  return data;
}

export async function getSponsoredQuests(
  includeInactive: boolean = false
): Promise<SponsoredQuest[]> {
  let query = supabase
    .from('sponsored_quests')
    .select(`
      *,
      quests (
        title,
        description,
        location,
        difficulty
      )
    `)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sponsored quests:', error);
    return [];
  }

  return data || [];
}

export async function getSponsoredQuestById(id: string): Promise<SponsoredQuest | null> {
  const { data, error } = await supabase
    .from('sponsored_quests')
    .select(`
      *,
      quests (
        title,
        description,
        location,
        latitude,
        longitude,
        difficulty,
        image_url
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching sponsored quest:', error);
    return null;
  }

  return data;
}

export async function getSponsoredQuestByQuestId(questId: string): Promise<SponsoredQuest | null> {
  const { data, error } = await supabase
    .from('sponsored_quests')
    .select('*')
    .eq('quest_id', questId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching sponsored quest:', error);
    return null;
  }

  return data;
}

export async function incrementSponsoredQuestCompletion(
  questId: string
): Promise<void> {
  const sponsoredQuest = await getSponsoredQuestByQuestId(questId);

  if (!sponsoredQuest) {
    return;
  }

  if (sponsoredQuest.current_completions >= sponsoredQuest.max_completions) {
    await supabase
      .from('sponsored_quests')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sponsoredQuest.id);

    throw new Error('Sponsored quest has reached maximum completions');
  }

  const newCompletions = sponsoredQuest.current_completions + 1;
  const newBudgetSpent = sponsoredQuest.budget_spent + sponsoredQuest.reward_per_completion;

  const updates: any = {
    current_completions: newCompletions,
    budget_spent: newBudgetSpent,
    updated_at: new Date().toISOString(),
  };

  if (newCompletions >= sponsoredQuest.max_completions) {
    updates.is_active = false;
  }

  const { error } = await supabase
    .from('sponsored_quests')
    .update(updates)
    .eq('id', sponsoredQuest.id);

  if (error) {
    throw new Error(`Failed to update sponsored quest: ${error.message}`);
  }
}

export async function updateSponsoredQuestPayment(
  id: string,
  txHash: string
): Promise<void> {
  const { error } = await supabase
    .from('sponsored_quests')
    .update({
      payment_status: 'confirmed',
      payment_tx_hash: txHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
}

export async function deactivateSponsoredQuest(id: string, sponsorWallet: string): Promise<void> {
  const { data: quest } = await supabase
    .from('sponsored_quests')
    .select('sponsor_wallet')
    .eq('id', id)
    .maybeSingle();

  if (!quest || quest.sponsor_wallet !== sponsorWallet) {
    throw new Error('You do not have permission to deactivate this quest');
  }

  const { error } = await supabase
    .from('sponsored_quests')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to deactivate sponsored quest: ${error.message}`);
  }
}

export async function getSponsorStats(sponsorWallet: string): Promise<{
  totalSponsored: number;
  activeQuests: number;
  totalBudgetSpent: number;
  totalCompletions: number;
}> {
  const { data, error } = await supabase
    .from('sponsored_quests')
    .select('*')
    .eq('sponsor_wallet', sponsorWallet);

  if (error) {
    console.error('Error fetching sponsor stats:', error);
    return {
      totalSponsored: 0,
      activeQuests: 0,
      totalBudgetSpent: 0,
      totalCompletions: 0,
    };
  }

  const stats = data.reduce(
    (acc, quest) => ({
      totalSponsored: acc.totalSponsored + 1,
      activeQuests: acc.activeQuests + (quest.is_active ? 1 : 0),
      totalBudgetSpent: acc.totalBudgetSpent + parseFloat(quest.budget_spent?.toString() || '0'),
      totalCompletions: acc.totalCompletions + quest.current_completions,
    }),
    {
      totalSponsored: 0,
      activeQuests: 0,
      totalBudgetSpent: 0,
      totalCompletions: 0,
    }
  );

  return stats;
}

export function calculateSponsoredQuestBudget(
  rewardPerCompletion: number,
  expectedCompletions: number,
  platformFeePercent: number = 5
): {
  rewardBudget: number;
  platformFee: number;
  totalBudget: number;
} {
  const rewardBudget = rewardPerCompletion * expectedCompletions;
  const platformFee = (rewardBudget * platformFeePercent) / 100;
  const totalBudget = rewardBudget + platformFee;

  return {
    rewardBudget: Math.round(rewardBudget * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    totalBudget: Math.round(totalBudget * 100) / 100,
  };
}
