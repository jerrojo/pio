import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email?: string;
  faceId_enrolled: boolean;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  target_language: string;
  native_language: string;
  progress: any;
  created_at: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function updateUserProgress(
  userId: string,
  progress: {
    totalInteractions: number;
    clarityScore: number;
    weakPhonemes: string[];
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating progress:', error);
  }
}

export async function saveTermsAcceptance(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error saving terms acceptance:', error);
  }
}


