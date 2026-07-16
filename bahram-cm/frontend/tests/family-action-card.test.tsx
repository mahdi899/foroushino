import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActionCard } from "@/components/family/ActionCard";
import { FamilyActionCelebrateProvider } from "@/lib/family/FamilyActionCelebrateContext";
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

function renderActionCard(ui: ReactElement) {
  return render(<FamilyActionCelebrateProvider>{ui}</FamilyActionCelebrateProvider>);
}

describe("ActionCard", () => {
  beforeEach(() => {
    respondToAction.mockReset();
  });

  it("submits a commitment action and shows the confirmation state", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    renderActionCard(<ActionCard action={makeAction()} />);

    fireEvent.click(screen.getByRole("button", { name: /متعهد می‌شوم/ }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(1, { committed: true }));
    expect(await screen.findByText(/پاسخ شما ثبت شد/)).toBeInTheDocument();
  });

  it("restores submitted state from feed when already responded", () => {
    renderActionCard(<ActionCard action={makeAction({ responded: true, results: null })} />);

    expect(screen.getByText(/پاسخ شما ثبت شد/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /متعهد می‌شوم/ })).not.toBeInTheDocument();
  });

  it("clears done state when feed responded flag becomes false for a new viewer", () => {
    const { rerender } = renderActionCard(
      <ActionCard action={makeAction({ responded: true, results: null })} />,
    );
    expect(screen.getByText(/پاسخ شما ثبت شد/)).toBeInTheDocument();

    rerender(
      <FamilyActionCelebrateProvider>
        <ActionCard action={makeAction({ responded: false, results: null })} />
      </FamilyActionCelebrateProvider>,
    );

    expect(screen.queryByText(/پاسخ شما ثبت شد/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /متعهد می‌شوم/ })).toBeInTheDocument();
  });

  it("submits a confirmation action's negative answer", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    renderActionCard(<ActionCard action={makeAction({ id: 2, type: "confirmation" })} />);

    fireEvent.click(screen.getByRole("button", { name: "هنوز نه" }));

    await waitFor(() => expect(respondToAction).toHaveBeenCalledWith(2, { confirmed: false }));
  });

  it("requires a value before enabling the number submit button", () => {
    renderActionCard(<ActionCard action={makeAction({ id: 3, type: "number" })} />);

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
    renderActionCard(<ActionCard action={action} />);

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
    renderActionCard(<ActionCard action={action} />);

    fireEvent.click(screen.getByText("صبح"));
    fireEvent.click(screen.getByText("شب"));
    fireEvent.click(screen.getByRole("button", { name: "ثبت پاسخ" }));

    await waitFor(() =>
      expect(respondToAction).toHaveBeenCalledWith(5, { options: ["morning", "night"] }),
    );
  });

  it("submits a scale rating", async () => {
    respondToAction.mockResolvedValueOnce({ data: {} });
    renderActionCard(<ActionCard action={makeAction({ id: 6, type: "scale" })} />);

    fireEvent.click(screen.getByText("7"));
    fireEvent.click(screen.getByRole("button", { name: /ثبت/ }));

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
    renderActionCard(<ActionCard action={makeAction({ id: 7 })} />);

    const button = screen.getByRole("button", { name: /متعهد می‌شوم/ });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(respondToAction).toHaveBeenCalledTimes(1);
    resolveResponse?.();
    await waitFor(() => expect(screen.getByText(/پاسخ شما ثبت شد/)).toBeInTheDocument());
  });

  it("shows staff poll participation counts", () => {
    renderActionCard(
      <ActionCard
        action={makeAction({
          type: "single_choice",
          options: [{ id: 1, label: "بله", value: "yes", position: 0 }],
          results: {
            total: 12,
            options: [{ value: "yes", label: "بله", count: 12, percent: 100 }],
          },
        })}
        memberCount={30}
        isStaff
      />,
    );

    expect(screen.getByText('۱۲ از ۳۰ نفر پاسخ دادند')).toBeInTheDocument();
  });

  it("shows member poll participation percent", () => {
    renderActionCard(
      <ActionCard
        action={makeAction({
          type: "confirmation",
          results: {
            total: 78,
            options: [
              { value: "yes", label: "بله", count: 78, percent: 100 },
            ],
          },
        })}
        memberCount={100}
        isStaff={false}
      />,
    );

    expect(screen.getByText('۷۸٪ شرکت کردند')).toBeInTheDocument();
  });
});
