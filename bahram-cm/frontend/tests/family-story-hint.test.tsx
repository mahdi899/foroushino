import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilyStoryHint } from "@/components/family/FamilyStoryHint";
import { getDisplayedFamilyCount } from "@/lib/family/displayedFamilyCount";
import { formatFa } from "@/lib/persian";

describe("FamilyStoryHint", () => {
  it("never displays the raw backend count (only displayed formula)", () => {
    render(
      <FamilyStoryHint memberCount={10} hasUnseen={false} onOpenStories={() => {}} />,
    );

    expect(screen.queryByText(/^۱۰ عضو$/)).not.toBeInTheDocument();
    const display = formatFa(getDisplayedFamilyCount(10));
    expect(screen.getByText(new RegExp(`${display} عضو`))).toBeInTheDocument();
  });

  it("shows displayed member count from the shared helper", () => {
    render(
      <FamilyStoryHint memberCount={6} hasUnseen={false} onOpenStories={() => {}} />,
    );

    const display = formatFa(getDisplayedFamilyCount(6));
    expect(screen.getByText(new RegExp(`${display} عضو`))).toBeInTheDocument();
  });
});
