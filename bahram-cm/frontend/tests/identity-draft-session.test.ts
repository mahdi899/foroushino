import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearIdentityDraftSession,
  readIdentityDraftSession,
  writeIdentityDraftSession,
} from '@/lib/student/identityDraftSession';

const STORAGE_KEY = 'panel-identity-draft-v1';

describe('identityDraftSession', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('writes and reads draft fields', () => {
    writeIdentityDraftSession({
      draft: {
        first_name: 'احسان',
        last_name: 'رستمی',
        national_code: '1234567890',
        date_of_birth: '1374-01-01',
        gender: 'male',
        city: 'تهران',
      },
      step: 1,
      submissionId: 42,
    });

    const session = readIdentityDraftSession();
    expect(session?.draft.first_name).toBe('احسان');
    expect(session?.step).toBe(1);
    expect(session?.submissionId).toBe(42);
  });

  it('clears stored session', () => {
    writeIdentityDraftSession({
      draft: {
        first_name: '',
        last_name: '',
        national_code: '',
        date_of_birth: '',
        gender: '',
        city: '',
      },
    });
    clearIdentityDraftSession();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores expired sessions', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft: {
          first_name: 'قدیمی',
          last_name: '',
          national_code: '',
          date_of_birth: '',
          gender: '',
          city: '',
        },
        updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      }),
    );

    expect(readIdentityDraftSession()).toBeNull();
  });
});
