import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Quest, QuestType } from "@/lib/quest-rules";

export type QuestFormValues = {
  name: string; type: QuestType; description: string; location: string;
  objectives: { id?: number; text: string }[];
};

export function NewQuestDialog({
  onSubmit, quest, trigger,
}: {
  onSubmit: (q: QuestFormValues) => Promise<void>;
  quest?: Quest;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<QuestType>("main");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [objectives, setObjectives] = useState<{ id?: number; text: string }[]>([{ text: "" }]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(quest?.name ?? ""); setType(quest?.type ?? "main");
    setDescription(quest?.description ?? ""); setLocation(quest?.location ?? "");
    setObjectives(quest && quest.objectives.length ? quest.objectives.map((o) => ({ id: o.id, text: o.text })) : [{ text: "" }]);
  };
  const handleOpen = (v: boolean) => { if (v) reset(); setOpen(v); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        name, type, description, location,
        objectives: objectives.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text),
      });
      reset();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? <button className="font-display flex w-full items-center justify-center gap-2 border border-gold-dim py-2 text-sm text-gold transition hover:bg-accent hover:glow-gold">
          <Plus className="h-4 w-4" /> New Quest
        </button>}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-gold-dim bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gold">{quest ? "Amend the Quest" : "Inscribe a New Quest"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["main", "side"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`font-display border py-2 text-xs uppercase transition ${
                  type === t ? "border-gold bg-accent text-gold" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "main" ? "Main Quest" : "Side Quest"}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="font-display text-xs text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bloody Baron" required autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="font-display text-xs text-muted-foreground">Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Velen" />
          </div>
          <div className="space-y-1">
            <Label className="font-display text-xs text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-xs text-muted-foreground">Objectives (optional)</Label>
            <div
              role="region"
              aria-label="Quest objective inputs"
              tabIndex={0}
              className="max-h-48 space-y-2 overflow-y-auto overscroll-contain py-1 pr-2 [scrollbar-gutter:stable]"
            >
            {objectives.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={o.text}
                  onChange={(e) => setObjectives(objectives.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  placeholder={`Objective ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label="Remove objective"
                  onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}
                  className="px-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            </div>
            <button
              type="button"
              onClick={() => setObjectives([...objectives, { text: "" }])}
              className="text-sm text-gold-dim hover:text-gold"
            >
              + Add objective
            </button>
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="font-display w-full bg-primary py-2.5 text-sm text-primary-foreground transition hover:glow-gold disabled:opacity-50"
          >
            {busy ? "Inscribing..." : quest ? "Save Changes" : "Accept Quest"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
