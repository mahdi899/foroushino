import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { FamilyStoryHint } from "@/components/family/FamilyStoryHint";
import { inflatedMemberCount } from "@/lib/family/inflatedMemberCount";
import { formatFa } from "@/lib/persian";

describe("FamilyStoryHint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T16:30:00")); // hour 16 → ones digit 6
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never displays the raw backend count (only inflated formula)", async () => {
    render(
      <FamilyStoryHint memberCount={10} hasUnseen={false} onOpenStories={() => {}} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.queryByText(/^۱۰ عضو$/)).not.toBeInTheDocument();
    const hour = new Date().getHours();
    const display = formatFa(inflatedMemberCount(10, hour));
    expect(screen.getByText(new RegExp(`${display} عضو`))).toBeInTheDocument();
  });

  it("shows inflated member count after hour sync (base×10 + hour%10)", async () => {
    render(
      <FamilyStoryHint memberCount={6} hasUnseen={false} onOpenStories={() => {}} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    const hour = new Date().getHours();
    const display = formatFa(inflatedMemberCount(6, hour));
    expect(screen.getByText(new RegExp(`${display} عضو`))).toBeInTheDocument();
  });
});
