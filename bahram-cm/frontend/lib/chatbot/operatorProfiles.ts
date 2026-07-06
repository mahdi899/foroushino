'use server';

import 'server-only';

import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import type { ChatbotOperatorProfile } from './types';

const CHATBOT_GROUP = 'chatbot';
const OPERATOR_PROFILES_KEY = 'operator_profiles';

function sanitizeProfile(raw: Partial<ChatbotOperatorProfile>): ChatbotOperatorProfile | null {
  const id = raw.id?.trim();
  const name = raw.name?.trim().slice(0, 80);
  const avatar_url = raw.avatar_url?.trim().slice(0, 500) ?? '';
  if (!id || !name) return null;
  if (avatar_url && !avatar_url.startsWith('/') && !avatar_url.startsWith('http')) return null;

  return { id, name, avatar_url };
}

export async function getChatbotOperatorProfiles(): Promise<ChatbotOperatorProfile[]> {
  const raw = await getSettingBlob<{ profiles?: Partial<ChatbotOperatorProfile>[] }>(
    CHATBOT_GROUP,
    OPERATOR_PROFILES_KEY,
  );
  if (!raw?.profiles?.length) return [];

  return raw.profiles
    .map((p) => sanitizeProfile(p))
    .filter((p): p is ChatbotOperatorProfile => p !== null);
}

export async function saveChatbotOperatorProfiles(
  profiles: ChatbotOperatorProfile[],
): Promise<{ ok: boolean; error?: string }> {
  const cleaned = profiles
    .map((p) => sanitizeProfile(p))
    .filter((p): p is ChatbotOperatorProfile => p !== null);

  return saveSettingBlob(CHATBOT_GROUP, OPERATOR_PROFILES_KEY, { profiles: cleaned });
}
