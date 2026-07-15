import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActionCard } from "@/components/family/ActionCard";
import type { FamilyAction } from "@/lib/family/types";

const { respondToAction } = vi.hoisted(() => ({ respondToAction: vi.fn() }));

vi.mock("@/lib/family/api", () => ({
  respondToAction: (...args: unknown[]) => respondToAction(...args),
}));

function makeAction(overrides: Partial<FamilyAction> = {}): FamilyAction {
  return {
    id: 1,
    type: "commitment",
    prompt: "امروز ۱۰ دقیقه تمرین می‌کنی؟",
    config: null,
    options: [],
    ...overrides,
  };
}

describe("ActionCard", () => {
  beforeEach(() => {
    respondToAction.mockReset();
  });

  it("submits a commitment action and shows the confirmation state", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    render(<ActionCard action={makeAction()} />);

    fireEvent.click(screen.getByRole("button", { name: /متعهد می‌شوم/ }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(1, { committed: true }));
    expect(await screen.findByText(/ثبت شد/)).toBeInTheDocument();
  });

  it("submits a confirmation action's negative answer", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    render(<ActionCard action={makeAction({ id: 2, type: "confirmation" })} />);

    fireEvent.click(screen.getByRole("button", { name: "هنوز نه" }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(2, { confirmed: false }));
  });

  it("requires a value before enabling the number submit button", () => {
    render(<ActionCard action={makeAction({ id: 3, type: "number" })} />);

    const submitButton = screen.getByRole("button", { name: "ثبت" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("عدد را وارد کن"), { target: { value: "12" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("submits a single-choice selection", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    const action = makeAction({
      id: 4,
      type: "single_choice",
      options: [
        { id: 1, label: "بله", value: "yes", position: 0 },
        { id: 2, label: "خیر", value: "no", position: 1 },
      ],
    });
    render(<ActionCard action={action} />);

    fireEvent.click(screen.getByText("بله"));
    fireEvent.click(screen.getByRole("button", { name: "ثبت پاسخ" }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(4, { option: "yes" }));
  });

  it("accumulates multiple selections for multi-choice", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    const action = makeAction({
      id: 5,
      type: "multi_choice",
      options: [
        { id: 1, label: "صبح", value: "morning", position: 0 },
        { id: 2, label: "شب", value: "night", position: 1 },
      ],
    });
    render(<ActionCard action={action} />);

    fireEvent.click(screen.getByText("صبح"));
    fireEvent.click(screen.getByText("شب"));
    fireEvent.click(screen.getByRole("button", { name: "ثبت پاسخ" }));

    await waitFor(() =>
      expect(respondToAction).toHaveBeenCalledWith(5, { options: ["morning", "night"] }),
    );
  });

  it("submits a scale rating", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    render(<ActionCard action={makeAction({ id: 6, type: "scale" })} />);

    fireEvent.click(screen.getByText("7"));
    fireEvent.click(screen.getByRole("button", { name: "ثبت" }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(6, { score: 7 }));
  });

  it("ignores repeated submissions while pending", async () => {
    let resolveResponse: (() => void) | undefined;
    respondToAction.mockImplementationOnce(
      () =>
        new Promise<{ data: unknown }>((resolve) => {
          resolveResponse = () => resolve({ data: {} });
        }),
    );
    render(<ActionCard action={makeAction({ id: 7 })} />);

    const button = screen.getByRole("button", { name: /متعهد می‌شوم/ });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(respondToAction).toHaveBeenCalledTimes(1);
    resolveResponse?.();
    await waitFor(() => expect(screen.getByText(/ثبت شد/)).toBeInTheDocument());
  });
});
