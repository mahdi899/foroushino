'use client';

import { ProductPurchaseCta } from '@/components/commerce/ProductPurchaseCta';
import {
  useProductPurchaseState,
  type ProductPurchaseState,
} from '@/components/commerce/ProductPurchaseProvider';
import type { ComponentPropsWithoutRef } from 'react';

type Props = Omit<ComponentPropsWithoutRef<typeof ProductPurchaseCta>, 'alreadyPurchased'> & {
  fallback: ProductPurchaseState;
};

export function HydratedProductPurchaseCta({ fallback, ...rest }: Props) {
  const { alreadyPurchased } = useProductPurchaseState(fallback);
  return <ProductPurchaseCta {...rest} alreadyPurchased={alreadyPurchased} />;
}
