import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommentsSheet } from "@/components/family/CommentsSheet";
import { FamilyApiError } from "@/lib/family/errors";
import type { FamilyComment } from "@/lib/family/types";

const { useFamilyComments } = vi.hoisted(() => ({ useFamilyComments: vi.fn() }));

vi.mock("@/lib/family/hooks/useFamilyComments", () => ({
  useFamilyComments: (...args: unknown[]) => useFamilyComments(...args),
}));

vi.mock("@/hooks/useIsMobileMotion", () => ({
  useIsMobileMotion: () => true,
}));

function mockHook(overrides: Partial<ReturnType<typeof defaultHookState>> = {}) {
  useFamilyComments.mockReturnValue({ ...defaultHookState(), ...overrides });
}

function defaultHookState() {
  return {
    comments: [] as FamilyComment[],
    isLoading: false,
    submitting: false,
    submit: vi.fn(),
  };
}

describe("CommentsSheet", () => {
  beforeEach(() => {
    useFamilyComments.mockReset();
  });

  it("shows a loading state", () => {
    mockHook({ isLoading: true });
    render(<CommentsSheet postId={1} onClose={vi.fn()} />);

    expect(screen.getByText("در حال بارگذاری…")).toBeInTheDocument();
  });

  it("shows an empty state when there are no comments", () => {
    mockHook();
    render(<CommentsSheet postId={1} onClose={vi.fn()} />);

    expect(screen.getByText(/هنوز نظری ثبت نشده/)).toBeInTheDocument();
  });

  it("renders existing comments, flagging the user's own pending ones", () => {
    mockHook({
      comments: [
        { id: 1, body: "سلام بهرام", user: { name: "علی" }, is_pending_mine: true } as FamilyComment,
        { id: 2, body: "عالی بود", user: { name: "سارا" }, is_pending_mine: false } as FamilyComment,
      ],
    });
    render(<CommentsSheet postId={1} onClose={vi.fn()} />);

    expect(screen.getByText("سلام بهرام")).toBeInTheDocument();
    expect(screen.getByText("در انتظار بررسی")).toBeInTheDocument();
    expect(screen.getByText("عالی بود")).toBeInTheDocument();
  });

  it("submits a trimmed comment and clears the textarea", async () => {
    const submit = vi.fn().mockResolvedValue({});
    mockHook({ submit });
    render(<CommentsSheet postId={5} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText("نظرت رو بنویس…");
    fireEvent.change(textarea, { target: { value: "  یک نظر خوب  " } });
    fireEvent.click(screen.getByRole("button", { name: "ارسال" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith("یک نظر خوب"));
    await waitFor(() => expect(textarea).toHaveValue(""));
    expect(await screen.findByText(/نظر شما ثبت شد\./)).toBeInTheDocument();
  });

  it("shows the API error message when submission fails", async () => {
    const submit = vi.fn().mockRejectedValue(new FamilyApiError("نظر شما رد شد.", 422));
    mockHook({ submit });
    render(<CommentsSheet postId={5} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("نظرت رو بنویس…"), { target: { value: "نظر بد" } });
    fireEvent.click(screen.getByRole("button", { name: "ارسال" }));

    expect(await screen.findByText("نظر شما رد شد.")).toBeInTheDocument();
  });

  it("calls onClose when the back button is pressed", () => {
    mockHook();
    const onClose = vi.fn();
    render(<CommentsSheet postId={1} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("بازگشت"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
