import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Quest } from "@/lib/quest-rules";
import { setQuestTracked } from "@/lib/quests.functions";
import { Route } from "@/routes/index";

let quests: Quest[];
vi.mock("@/lib/quests.functions", () => ({
  listQuests: vi.fn(async () => structuredClone(quests)),
  setQuestTracked: vi.fn(async ({ data }: { data: { questId: number; tracked: boolean } }) => {
    quests = quests.map((quest) =>
      quest.id === data.questId ? { ...quest, tracked: data.tracked } : quest,
    );
    return { tracked: data.tracked };
  }),
  createQuest: vi.fn(),
  deleteQuest: vi.fn(),
  setQuestDone: vi.fn(),
  toggleObjective: vi.fn(),
  updateQuest: vi.fn(),
}));

function quest(id: number, type: "main" | "side", tracked: boolean, done = false): Quest {
  return {
    id,
    name: `Quest ${id}`,
    type,
    tracked,
    done,
    description: "",
    location: "",
    objectives: [],
    createdAt: "2026-11-01",
  };
}

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  quests = [
    quest(1, "main", false),
    quest(2, "main", true),
    quest(3, "side", false),
    quest(4, "side", true),
    quest(5, "main", false, true),
    quest(6, "side", true, true),
  ];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["quests"], structuredClone(quests));
});
afterEach(() => {
  cleanup();
  client.clear();
});

function renderJournal() {
  const Journal = Route.options.component!;
  return render(
    <QueryClientProvider client={client}>
      <Journal />
    </QueryClientProvider>,
  );
}

describe("quest tracking controls", () => {
  it("pins tracked quests within every category and marks them with accessible text", () => {
    const { container } = renderJournal();
    fireEvent.click(screen.getByRole("button", { name: /Completed Quests/ }));
    const lists = container.querySelectorAll("aside ul");
    expect(
      [...lists].map((list) => [...list.querySelectorAll("li")].map((item) => item.textContent)),
    ).toEqual([
      ["Quest 2Tracked quest", "Quest 1"],
      ["Quest 4Tracked quest", "Quest 3"],
      ["Quest 5", "Quest 6"],
    ]);
    expect(screen.getAllByText("Tracked quest")).toHaveLength(2);
  });

  it("does not offer tracking controls for completed quests", () => {
    renderJournal();
    fireEvent.click(screen.getByRole("button", { name: /Completed Quests/ }));
    fireEvent.click(screen.getByRole("button", { name: "Quest 6" }));
    expect(screen.queryByRole("button", { name: /^(Track|Untrack) Quest$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen Quest" })).toBeInTheDocument();
  });

  it("toggles tracking beside Complete Quest and keeps the selected quest open after reordering", async () => {
    const { container } = renderJournal();
    fireEvent.click(screen.getByRole("button", { name: "Quest 1" }));
    const track = screen.getByRole("button", { name: "Track Quest" });
    expect(track.nextElementSibling).toHaveTextContent("Complete Quest");
    fireEvent.click(track);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Untrack Quest" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(setQuestTracked).toHaveBeenCalledWith({ data: { questId: 1, tracked: true } });
    expect(screen.getByRole("heading", { name: "Quest 1" })).toBeInTheDocument();
    expect(
      within(container.querySelector("aside ul") as HTMLElement).getAllByRole("button")[0],
    ).toHaveTextContent("Quest 1");
    fireEvent.click(screen.getByRole("button", { name: "Untrack Quest" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Track Quest" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    expect(screen.getByRole("heading", { name: "Quest 1" })).toBeInTheDocument();
    expect(
      within(container.querySelector("aside ul") as HTMLElement).getAllByRole("button")[0],
    ).toHaveTextContent("Quest 2");
  });
});
