'use client';

import { MobileStickyEnrollBar } from '@/components/commerce/MobileStickyEnrollBar';
import {
  useProductPurchaseState,
  type ProductPurchaseState,
} from '@/components/commerce/ProductPurchaseProvider';
import { formatSeminarDiscountCopy } from '@/lib/commerce/seminarDiscountCopy';
import { formatFa } from '@/lib/persian';

type Props = {
  fallback: ProductPurchaseState;
  productSlug: string;
  title?: string | null;
  location: string;
  panelHref: string;
  ownedLabel: string;
};

export function HydratedMobileStickyEnrollBar({
  fallback,
  productSlug,
  title = null,
  location,
  panelHref,
  ownedLabel,
}: Props) {
  const purchase = useProductPurchaseState(fallback);
  const priceLabel = `${formatFa(purchase.finalPrice)} تومان`;
  const priceHint = purchase.seminarOff
    ? formatSeminarDiscountCopy(purchase.seminarTitle).stickyHint
    : null;

  return (
    <MobileStickyEnrollBar
      priceLabel={priceLabel}
      priceHint={priceHint}
      alreadyPurchased={purchase.alreadyPurchased}
      productSlug={productSlug}
      title={title}
      location={location}
      panelHref={panelHref}
      ownedLabel={ownedLabel}
    />
  );
}
