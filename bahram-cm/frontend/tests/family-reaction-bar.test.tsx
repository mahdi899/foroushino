import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ReactionBar } from "@/components/family/ReactionBar";
import type { FamilyPostStats } from "@/lib/family/types";

const { setReaction, removeReaction } = vi.hoisted(() => ({
  setReaction: vi.fn(),
  removeReaction: vi.fn(),
}));

vi.mock("@/lib/family/api", () => ({
  setReaction: (...args: unknown[]) => setReaction(...args),
  removeReaction: (...args: unknown[]) => removeReaction(...args),
}));

vi.mock("@/components/family/FamilyReactionLottie", () => ({
  FamilyReactionLottie: () => <span data-testid="reaction-icon" />,
}));

vi.mock("@/components/family/ReactionFlyBurst", () => ({
  ReactionFlyBurst: ({ onComplete }: { onComplete: () => void }) => {
    onComplete();
    return null;
  },
}));

vi.mock("@/components/family/FamilyBodyPortal", () => ({
  FamilyBodyPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseStats: FamilyPostStats = {
  fire: 2,
  heart: 0,
  target: 1,
  clap: 0,
  comments: 3,
  action_responses: 0,
};

describe("ReactionBar", () => {
  beforeEach(() => {
    setReaction.mockReset();
    removeReaction.mockReset();
  });

  it("renders reaction counts without a comments button", () => {
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} />);

    expect(screen.getByLabelText("آتشین")).toHaveTextContent("2");
    expect(screen.queryByText(/نظرات/)).not.toBeInTheDocument();
  });

  it("optimistically activates a reaction and calls setReaction", async () => {
    setReaction.mockResolvedValueOnce({ data: {} });
    render(<ReactionBar postId={42} stats={baseStats} userReaction={null} />);

    fireEvent.click(screen.getByLabelText("افزودن واکنش"));
    fireEvent.click(within(screen.getByRole("menu")).getByLabelText("قلب"));

    expect(screen.getByLabelText("قلب")).toHaveTextContent("1");
    await waitFor(() => expect(setReaction).toHaveBeenCalledWith(42, "heart"));
  });

  it("toggling an already-active reaction calls removeReaction", async () => {
    removeReaction.mockResolvedValueOnce({ data: { removed: true } });
    render(<ReactionBar postId={7} stats={baseStats} userReaction="fire" />);

    fireEvent.click(screen.getByLabelText("آتشین"));

    expect(screen.getByLabelText("آتشین")).toHaveTextContent("1");
    await waitFor(() => expect(removeReaction).toHaveBeenCalledWith(7));
  });

  it("reverts the optimistic update when the request fails", async () => {
    setReaction.mockRejectedValueOnce(new Error("network"));
    render(<ReactionBar postId={9} stats={baseStats} userReaction={null} />);

    fireEvent.click(screen.getByLabelText("هدف"));
    expect(screen.getByLabelText("هدف")).toHaveTextContent("2");

    await waitFor(() => expect(screen.getByLabelText("هدف")).toHaveTextContent("1"));
  });

  it("only renders reactions with counts plus the add button", () => {
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("shows nudge reactions when reactionNudge is true", () => {
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} reactionNudge />);

    expect(screen.getByLabelText("قلب", { selector: ".family-reaction-nudge-btn" })).toBeInTheDocument();
    expect(screen.getByLabelText("آتشین", { selector: ".family-reaction-nudge-btn" })).toBeInTheDocument();
    expect(screen.getByLabelText("تشویق", { selector: ".family-reaction-nudge-btn" })).toBeInTheDocument();
    expect(document.querySelector(".family-reaction-bar--nudge")).toBeInTheDocument();
  });

  it("hides nudge after picking a teaser reaction", async () => {
    setReaction.mockResolvedValueOnce({ data: {} });
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} reactionNudge />);

    fireEvent.click(screen.getByLabelText("قلب", { selector: ".family-reaction-nudge-btn" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("قلب", { selector: ".family-reaction-nudge-btn" })).not.toBeInTheDocument();
    });
    expect(setReaction).toHaveBeenCalledWith(1, "heart");
  });

  it("replaces a nudge reaction when picking a different emoji from the picker", async () => {
    setReaction.mockResolvedValue({ data: {} });
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} reactionNudge />);

    fireEvent.click(screen.getByLabelText("قلب", { selector: ".family-reaction-nudge-btn" }));
    await waitFor(() => expect(setReaction).toHaveBeenCalledWith(1, "heart"));

    fireEvent.click(screen.getByLabelText("افزودن واکنش"));
    fireEvent.click(within(screen.getByRole("menu")).getByLabelText("آتشین"));

    await waitFor(() => expect(setReaction).toHaveBeenCalledWith(1, "fire"));
    expect(screen.getByLabelText("آتشین")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("آتشین")).toHaveTextContent("3");
    expect(screen.queryByLabelText("قلب")).not.toBeInTheDocument();
    expect(setReaction).toHaveBeenCalledTimes(2);
    expect(removeReaction).not.toHaveBeenCalled();
  });
});
