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

import {
  cancelScheduledDeactivation,
  deactivateNow,
  reactivateVariant,
  scheduleDeactivation,
} from "../actions";

export type LifecycleDialogKind =
  | { kind: "schedule" }
  | { kind: "cancel-schedule" }
  | { kind: "deactivate-now" }
  | { kind: "reactivate" }
  | null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function LifecycleDialogs({
  variantId,
  open,
  onOpenChange,
}: {
  variantId: string;
  open: LifecycleDialogKind;
  onOpenChange: (next: LifecycleDialogKind) => void;
}) {
  const [date, setDate] = useState(tomorrowIso());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setReason("");
    setDate(tomorrowIso());
  }, [open]);

  function close() {
    if (pending) return;
    onOpenChange(null);
  }

  function submit() {
    if (!open) return;
    setError(null);

    startTransition(async () => {
      let result: { ok: true } | { error: string };
      switch (open.kind) {
        case "schedule":
          if (date <= todayIso()) {
            setError("Date must be in the future");
            return;
          }
          if (!reason.trim()) {
            setError("Reason is required");
            return;
          }
          result = await scheduleDeactivation(variantId, date, reason.trim());
          break;
        case "cancel-schedule":
          result = await cancelScheduledDeactivation(variantId);
          break;
        case "deactivate-now":
          if (!reason.trim()) {
            setError("Reason is required");
            return;
          }
          result = await deactivateNow(variantId, reason.trim());
          break;
        case "reactivate":
          result = await reactivateVariant(variantId);
          break;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(null);
    });
  }

  if (!open) {
    return null;
  }

  const cfg = configFor(open.kind);

  return (
    <Dialog open onOpenChange={(o) => (!o ? close() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription>{cfg.description}</DialogDescription>
        </DialogHeader>

        {open.kind === "schedule" && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-stone-600">
                Deactivation date
              </span>
              <Input
                type="date"
                min={tomorrowIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
                className="mt-1"
              />
            </label>
            <ReasonField value={reason} onChange={setReason} disabled={pending} />
          </div>
        )}

        {open.kind === "deactivate-now" && (
          <ReasonField value={reason} onChange={setReason} disabled={pending} />
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={cfg.destructive ? "destructive" : "default"}
            onClick={submit}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Working…
              </>
            ) : (
              cfg.confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReasonField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-stone-600">Reason</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Why is this checklist being deactivated?"
        className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
      />
    </label>
  );
}

function configFor(kind: NonNullable<LifecycleDialogKind>["kind"]) {
  switch (kind) {
    case "schedule":
      return {
        title: "Schedule deactivation",
        description:
          "The checklist stays available until this date, then disappears from the new-case wizard. In-flight cases continue running.",
        confirmLabel: "Schedule",
        destructive: false,
      };
    case "cancel-schedule":
      return {
        title: "Cancel scheduled deactivation?",
        description:
          "The checklist stays active indefinitely. The original deactivation reason is cleared.",
        confirmLabel: "Cancel schedule",
        destructive: false,
      };
    case "deactivate-now":
      return {
        title: "Deactivate checklist now?",
        description:
          "The checklist disappears from the new-case wizard immediately. In-flight cases continue running on their existing template version.",
        confirmLabel: "Deactivate",
        destructive: true,
      };
    case "reactivate":
      return {
        title: "Reactivate checklist?",
        description:
          "Clears any deactivation timestamps. The checklist becomes available in the new-case wizard again.",
        confirmLabel: "Reactivate",
        destructive: false,
      };
  }
}
