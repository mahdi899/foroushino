"use client";

import { ComponentProps } from "react";
import { LinkButton } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";

/**
 * Thin client wrapper around the shared LinkButton that fires a typed analytics
 * event on click. Keeps the original button styling/props intact so server
 * sections can adopt tracking without restyling.
 */
export function TrackedLinkButton<E extends AnalyticsEventName>({
  event,
  eventProps,
  onClick,
  ...rest
}: ComponentProps<typeof LinkButton> & {
  event: E;
  eventProps: AnalyticsEventMap[E];
}) {
  return (
    <LinkButton
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
