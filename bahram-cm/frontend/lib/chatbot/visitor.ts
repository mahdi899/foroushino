const VISITOR_NAME_PREFIX = 'bahram_chatbot_visitor_name:';
const VISITOR_NAME_GLOBAL_KEY = 'bahram_chatbot_visitor_name_global';
const VISITOR_INTRO_SEEN_KEY = 'bahram_chatbot_visitor_intro_seen';
const OPERATOR_PROFILE_PREFIX = 'bahram_chatbot_operator_profile:';

export interface SavedVisitorName {
  firstName: string;
  lastName: string;
}

function nameKey(sessionId: string): string {
  return `${VISITOR_NAME_PREFIX}${sessionId}`;
}

function operatorKey(sessionId: string): string {
  return `${OPERATOR_PROFILE_PREFIX}${sessionId}`;
}

export function sanitizeVisitorNameInput(raw: string): string {
  return raw.replace(/[^\p{L}\s\u200c]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function parseSavedVisitorName(raw: string | null): SavedVisitorName {
  if (!raw) return { firstName: '', lastName: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<SavedVisitorName>;
    return {
      firstName: sanitizeVisitorNameInput(parsed.firstName ?? ''),
      lastName: sanitizeVisitorNameInput(parsed.lastName ?? ''),
    };
  } catch {
    return { firstName: '', lastName: '' };
  }
}

export function loadGlobalVisitorName(): SavedVisitorName {
  if (typeof window === 'undefined') return { firstName: '', lastName: '' };
  try {
    return parseSavedVisitorName(localStorage.getItem(VISITOR_NAME_GLOBAL_KEY));
  } catch {
    return { firstName: '', lastName: '' };
  }
}

export function loadSavedVisitorName(sessionId: string): SavedVisitorName {
  if (typeof window === 'undefined') return { firstName: '', lastName: '' };
  try {
    return parseSavedVisitorName(localStorage.getItem(nameKey(sessionId)));
  } catch {
    return { firstName: '', lastName: '' };
  }
}

export function hasVisitorIntroBeenShown(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(VISITOR_INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markVisitorIntroShown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VISITOR_INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function markVisitorNameSaved(sessionId: string, firstName: string, lastName: string): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    firstName: sanitizeVisitorNameInput(firstName),
    lastName: sanitizeVisitorNameInput(lastName),
  });
  try {
    localStorage.setItem(nameKey(sessionId), payload);
    localStorage.setItem(VISITOR_NAME_GLOBAL_KEY, payload);
  } catch {
    /* ignore */
  }
}

export function loadSavedOperatorProfile(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(operatorKey(sessionId))?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function markSavedOperatorProfile(sessionId: string, profileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(operatorKey(sessionId), profileId);
  } catch {
    /* ignore */
  }
}

export function visitorDisplayName(firstName: string, lastName: string): string | null {
  const parts = [firstName.trim(), lastName.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}
