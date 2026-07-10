import { LinkButton } from "@/components/ui/Button";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import type { ComponentPropsWithoutRef } from "react";

type AddToCartProps = Omit<ComponentPropsWithoutRef<typeof AddToCartButton>, "productSlug">;

type ProductPurchaseCtaProps = AddToCartProps & {
  productSlug: string;
  alreadyPurchased?: boolean;
  location?: string;
  ownedLabel?: string;
  panelHref?: string;
};

export function ProductPurchaseCta({
  productSlug,
  alreadyPurchased = false,
  location,
  ownedLabel = "مشاهده در پنل",
  panelHref = "/panel",
  ...buttonProps
}: ProductPurchaseCtaProps) {
  if (alreadyPurchased) {
    return (
      <LinkButton href={panelHref} variant="primary" size={buttonProps.size ?? "lg"} withArrow>
        {ownedLabel}
      </LinkButton>
    );
  }

  return <AddToCartButton productSlug={productSlug} location={location} {...buttonProps} />;
}
