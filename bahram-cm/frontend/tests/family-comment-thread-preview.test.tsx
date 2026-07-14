import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CommentThreadPreview } from "@/components/family/CommentThreadPreview";
import type { FamilyComment } from "@/lib/family/types";

function makeComment(id: number, name: string): FamilyComment {
  return {
    id,
    body: `نظر ${id}`,
    status: "approved",
    created_at: new Date().toISOString(),
    user: { name, avatar: null },
    is_pending_mine: false,
  };
}

describe("CommentThreadPreview", () => {
  it("opens the sheet from the summary row without showing inline comment bodies", () => {
    const onOpen = vi.fn();
    render(
      <CommentThreadPreview
        count={3}
        preview={[makeComment(1, "سارا"), makeComment(2, "امیر"), makeComment(3, "علی")]}
        onOpen={onOpen}
      />,
    );

    expect(screen.queryByText("نظر 1")).not.toBeInTheDocument();
    expect(screen.getByText("۳ نظر")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows the empty-state prompt when there are no comments", () => {
    render(<CommentThreadPreview count={0} preview={[]} onOpen={vi.fn()} />);

    expect(screen.getByText("اولین نظر را بنویس")).toBeInTheDocument();
  });
});
