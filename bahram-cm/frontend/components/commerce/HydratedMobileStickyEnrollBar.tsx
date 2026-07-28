'use client';

import { MobileStickyEnrollBar } from '@/components/commerce/MobileStickyEnrollBar';
import {
  useProductPurchaseState,
  type ProductPurchaseState,
} from '@/components/commerce/ProductPurchaseProvider';
import { formatFa } from '@/lib/persian';

type Props = {
  fallback: ProductPurchaseState;
  productSlug: string;
  title: string;
  location: string;
  panelHref: string;
  ownedLabel: string;
};

export function HydratedMobileStickyEnrollBar({
  fallback,
  productSlug,
  title,
  location,
  panelHref,
  ownedLabel,
}: Props) {
  const purchase = useProductPurchaseState(fallback);
  const priceLabel = `${formatFa(purchase.finalPrice)} تومان`;

  return (
    <MobileStickyEnrollBar
      priceLabel={priceLabel}
      alreadyPurchased={purchase.alreadyPurchased}
      productSlug={productSlug}
      title={title}
      location={location}
      panelHref={panelHref}
      ownedLabel={ownedLabel}
    />
  );
}
