const STORAGE_KEY = 'panel-identity-draft-v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type IdentityDraftSessionFields = {
  first_name: string;
  last_name: string;
  national_code: string;
  date_of_birth: string;
  gender: string;
  city: string;
};

export type IdentityDraftSession = {
  draft: IdentityDraftSessionFields;
  step?: number;
  submissionId?: number | null;
  updatedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSession(raw: string): IdentityDraftSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.draft)) return null;

    const draft = parsed.draft;
    const session: IdentityDraftSession = {
      draft: {
        first_name: typeof draft.first_name === 'string' ? draft.first_name : '',
        last_name: typeof draft.last_name === 'string' ? draft.last_name : '',
        national_code: typeof draft.national_code === 'string' ? draft.national_code : '',
        date_of_birth: typeof draft.date_of_birth === 'string' ? draft.date_of_birth : '',
        gender: typeof draft.gender === 'string' ? draft.gender : '',
        city: typeof draft.city === 'string' ? draft.city : '',
      },
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };

    if (typeof parsed.step === 'number') session.step = parsed.step;
    if (typeof parsed.submissionId === 'number') session.submissionId = parsed.submissionId;

    if (Date.now() - session.updatedAt > MAX_AGE_MS) return null;
    return session;
  } catch {
    return null;
  }
}

export function readIdentityDraftSession(): IdentityDraftSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSession(raw);
  } catch {
    return null;
  }
}

export function writeIdentityDraftSession(patch: {
  draft: IdentityDraftSessionFields;
  step?: number;
  submissionId?: number | null;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readIdentityDraftSession();
    const next: IdentityDraftSession = {
      draft: patch.draft,
      step: patch.step ?? current?.step,
      submissionId: patch.submissionId ?? current?.submissionId ?? null,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function clearIdentityDraftSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
