"use client";

import { CART_COOKIE, CART_MAX_AGE_SECONDS } from "./constants";
import { CART_UPDATED_EVENT } from "./events";
import { parseCartSlugs, serializeCartSlugs } from "./parse";

function readCookieValue(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(slugs: string[]): void {
  document.cookie = `${CART_COOKIE}=${encodeURIComponent(serializeCartSlugs(slugs))};path=/;max-age=${CART_MAX_AGE_SECONDS};SameSite=Lax`;
}

export function getCartSlugs(): string[] {
  return parseCartSlugs(readCookieValue());
}

export function addToCart(slug: string): string[] {
  const next = [...new Set([...getCartSlugs(), slug])];
  writeCookie(next);
  dispatchCartUpdated();
  return next;
}

export function removeFromCart(slug: string): string[] {
  const next = getCartSlugs().filter((item) => item !== slug);
  writeCookie(next);
  dispatchCartUpdated();
  return next;
}

export function clearCart(): void {
  writeCookie([]);
  dispatchCartUpdated();
}

function dispatchCartUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
}
