'use client';

import { useEffect, useState } from 'react';
import { isPhoneClient } from '@/lib/device/mobileClient';

export function useIsPhoneClient(): boolean | null {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);

  useEffect(() => {
    setIsPhone(isPhoneClient());
  }, []);

  return isPhone;
}
