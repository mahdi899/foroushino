import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders counts and the comments button", () => {
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} onCommentClick={vi.fn()} />);

    expect(screen.getByLabelText("آتشین")).toHaveTextContent("2");
    expect(screen.getByText(/نظرات/)).toHaveTextContent("نظرات (3)");
  });

  it("optimistically activates a reaction and calls setReaction", async () => {
    setReaction.mockResolvedValueOnce({ data: {} });
    render(<ReactionBar postId={42} stats={baseStats} userReaction={null} onCommentClick={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("قلب"));

    expect(screen.getByLabelText("قلب")).toHaveTextContent("1");
    await waitFor(() => expect(setReaction).toHaveBeenCalledWith(42, "heart"));
  });

  it("toggling an already-active reaction calls removeReaction", async () => {
    removeReaction.mockResolvedValueOnce({ data: { removed: true } });
    render(<ReactionBar postId={7} stats={baseStats} userReaction="fire" onCommentClick={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("آتشین"));

    expect(screen.getByLabelText("آتشین")).toHaveTextContent("1");
    await waitFor(() => expect(removeReaction).toHaveBeenCalledWith(7));
  });

  it("reverts the optimistic update when the request fails", async () => {
    setReaction.mockRejectedValueOnce(new Error("network"));
    render(<ReactionBar postId={9} stats={baseStats} userReaction={null} onCommentClick={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("هدف"));
    expect(screen.getByLabelText("هدف")).toHaveTextContent("2");

    await waitFor(() => expect(screen.getByLabelText("هدف")).toHaveTextContent("1"));
  });

  it("invokes onCommentClick when the comments button is pressed", () => {
    const onCommentClick = vi.fn();
    render(<ReactionBar postId={1} stats={baseStats} userReaction={null} onCommentClick={onCommentClick} />);

    fireEvent.click(screen.getByText(/نظرات/));
    expect(onCommentClick).toHaveBeenCalledTimes(1);
  });
});
