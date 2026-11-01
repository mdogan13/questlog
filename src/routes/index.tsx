import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, MapPin, Swords, Scroll, Check, Trash2, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NewQuestDialog } from "@/components/quests/NewQuestDialog";
import { createQuest, deleteQuest, listQuests, setQuestDone, toggleObjective, updateQuest } from "@/lib/quests.functions";
import type { Quest } from "@/lib/quest-rules";

const questsQuery = queryOptions({ queryKey: ["quests"], queryFn: () => listQuests() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quest Log — Gamified Todos" },
      { name: "description", content: "Turn your todos into main and side quests in a fantasy RPG quest journal." },
      { property: "og:title", content: "Quest Log — Gamified Todos" },
      { property: "og:description", content: "Turn your todos into main and side quests in a fantasy RPG quest journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(questsQuery),
  component: QuestLog,
});

function QuestLog() {
  const qc = useQueryClient();
  const { data: quests } = useSuspenseQuery(questsQuery);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["quests"] });

  const main = quests.filter((q) => !q.done && q.type === "main");
  const side = quests.filter((q) => !q.done && q.type === "side");
  const done = quests.filter((q) => q.done);
  const selected = quests.find((q) => q.id === selectedId) ?? main[0] ?? side[0] ?? done[0] ?? null;

  const toggle = useMutation({
    mutationFn: (v: { objectiveId: number; done: boolean }) => toggleObjective({ data: v }),
    onSuccess: refresh,
  });
  const finish = useMutation({
    mutationFn: (v: { questId: number; done: boolean }) => setQuestDone({ data: v }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (questId: number) => deleteQuest({ data: { questId } }),
    onSuccess: () => { setSelectedId(null); refresh(); },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-center gap-6 px-6 pt-6 pb-3">
        <span className="divider-gold w-32" />
        <h1 className="font-display text-2xl text-gold">Quests</h1>
        <span className="divider-gold w-32" />
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 px-6 pb-6 lg:grid-cols-[320px_1fr_1fr]">
        {/* Left: quest list */}
        <aside className="flex flex-col gap-3 border-r-0 lg:border-r lg:pr-6">
          <NewQuestDialog
            onSubmit={async (q) => {
              const { id } = await createQuest({ data: { ...q, objectives: q.objectives.map((o) => o.text) } });
              await refresh();
              setSelectedId(id);
            }}
          />
          <QuestGroup title="Main Quests" quests={main} selected={selected} onSelect={setSelectedId} />
          <QuestGroup title="Secondary Quests" quests={side} selected={selected} onSelect={setSelectedId} />
          <QuestGroup title="Completed Quests" quests={done} selected={selected} onSelect={setSelectedId} defaultOpen={false} />
        </aside>

        {!selected ? (
          <div className="col-span-2 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Scroll className="mb-4 h-12 w-12 text-gold-dim" />
            <p className="font-display text-lg">Your journal is empty</p>
            <p className="mt-1 italic">Every legend begins with a single quest.</p>
          </div>
        ) : (
          <>
            {/* Middle: name + objectives */}
            <section className="animate-in fade-in">
              <p className="font-display text-xs uppercase text-gold-dim">
                {selected.type === "main" ? "Main Quest" : "Secondary Quest"}
                {selected.done && " · Completed"}
              </p>
              <h2 className={`font-display mt-1 text-3xl ${selected.done ? "text-muted-foreground" : "text-gold"}`}>
                {selected.name}
              </h2>
              <div className="divider-gold my-4" />
              {selected.objectives.length === 0 ? (
                <p className="italic text-muted-foreground">No objectives. Mark the quest complete when it's done.</p>
              ) : (
                <ul className="space-y-3">
                  {selected.objectives.map((o) => (
                    <li key={o.id}>
                      <button
                        onClick={() => toggle.mutate({ objectiveId: o.id, done: !o.done })}
                        className="group flex w-full items-start gap-3 text-left"
                      >
                        <span
                          className={`mt-1 flex h-4 w-4 shrink-0 rotate-45 items-center justify-center border transition ${
                            o.done ? "border-gold bg-gold" : "border-gold-dim group-hover:border-gold"
                          }`}
                        >
                          {o.done && <Check className="h-3 w-3 -rotate-45 text-primary-foreground" />}
                        </span>
                        <span className={`text-lg ${o.done ? "text-muted-foreground line-through" : "text-parchment"}`}>
                          {o.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Right: details */}
            <section className="animate-in fade-in border-border lg:border-l lg:pl-6">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {selected.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gold-dim" /> {selected.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Swords className="h-4 w-4 text-gold-dim" />
                  {selected.objectives.filter((o) => o.done).length}/{selected.objectives.length} objectives
                </span>
              </div>
              <div className="divider-gold my-4" />
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-parchment">
                {selected.description || <span className="italic text-muted-foreground">No tale has been written of this quest.</span>}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => finish.mutate({ questId: selected.id, done: !selected.done })}
                  className="font-display border border-gold px-4 py-2 text-sm text-gold transition hover:bg-accent hover:glow-gold"
                >
                  {selected.done ? "Reopen Quest" : "Complete Quest"}
                </button>
                <NewQuestDialog
                  key={selected.id}
                  quest={selected}
                  onSubmit={async (q) => {
                    await updateQuest({ data: { ...q, id: selected.id } });
                    await refresh();
                  }}
                  trigger={
                    <button className="font-display flex items-center gap-2 border border-gold-dim px-4 py-2 text-sm text-gold transition hover:bg-accent hover:glow-gold">
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  }
                />
                <button
                  onClick={() => confirm(`Abandon "${selected.name}"?`) && remove.mutate(selected.id)}
                  className="font-display flex items-center gap-2 border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Abandon
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function QuestGroup({
  title, quests, selected, onSelect, defaultOpen = true,
}: {
  title: string; quests: Quest[]; selected: Quest | null; onSelect: (id: number) => void; defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group font-display flex w-full items-center justify-between py-2 text-sm text-gold-dim hover:text-gold">
        <span>{title} <span className="text-muted-foreground">({quests.length})</span></span>
        <ChevronDown className="h-4 w-4 transition group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <div className="divider-gold" />
      <CollapsibleContent>
        <ul className="py-1">
          {quests.length === 0 && <li className="px-3 py-2 text-sm italic text-muted-foreground">None</li>}
          {quests.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => onSelect(q.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-base transition hover:bg-accent/50 ${
                  selected?.id === q.id ? "row-active text-gold" : q.done ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rotate-45 ${q.done ? "bg-muted-foreground" : "bg-gold"}`} />
                <span className="truncate">{q.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
