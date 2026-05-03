"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { createNewVersion } from "../actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewVersionDialog({
  variantId,
  open,
  onOpenChange,
  onCreated,
}: {
  variantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (templateId: string) => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [copy, setCopy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDate(todayIso());
    setNotes("");
    setCopy(true);
  }, [open]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createNewVersion({
        variantId,
        effectiveFrom: date,
        notes: notes.trim() === "" ? null : notes.trim(),
        copyFromCurrentActive: copy,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.templateId);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New version</DialogTitle>
          <DialogDescription>
            Versions are immutable once they have in-flight cases. New versions
            transition automatically when the effective date is reached.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-stone-600">
              Effective from
            </span>
            <Input
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={pending}
              className="mt-1"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-stone-600">
              Notes (optional)
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              placeholder="What's changing in this version?"
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={copy}
              onChange={(e) => setCopy(e.target.checked)}
              disabled={pending}
              className="mt-1"
            />
            <span>
              Start with current active version&apos;s checklist
              <span className="block text-xs text-stone-500">
                Snapshot the items now; edit them in the new version without
                affecting active cases.
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create version"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
