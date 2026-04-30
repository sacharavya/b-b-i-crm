"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { assigneeColor } from "@/lib/utils/assignee-color";
import { cn } from "@/lib/utils/index";

import { updateAssignment } from "../actions";

export type StaffOption = {
  id: string;
  first_name: string;
  last_name: string;
};

export function AssignmentCard({
  caseId,
  assignedId,
  options,
  canEdit,
}: {
  caseId: string;
  assignedId: string;
  options: StaffOption[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState(assignedId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(next: string) {
    if (next === selected) return;
    const previous = selected;
    setError(null);
    setSelected(next);

    startTransition(async () => {
      const result = await updateAssignment({ caseId, rcicId: next });
      if ("error" in result) {
        setError(result.error);
        setSelected(previous);
      }
    });
  }

  const current = options.find((s) => s.id === selected);
  const label = current ? formatName(current) : "Unassigned";
  const colour = assigneeColor(current?.id ?? null);

  if (!canEdit) {
    return <Chip colour={colour}>{label}</Chip>;
  }

  return (
    <div className="space-y-2">
      <div className="relative inline-flex">
        <Chip colour={colour} className="pr-7">
          {label}
        </Chip>
        <ChevronDown
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
            colour.fg,
          )}
        />
        <select
          value={selected}
          onChange={(e) => commit(e.target.value)}
          disabled={pending}
          aria-label="Change assignment"
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {options.length === 0 ? (
            <option value={selected}>{label}</option>
          ) : (
            options.map((s) => (
              <option key={s.id} value={s.id}>
                {formatName(s)}
              </option>
            ))
          )}
        </select>
      </div>

      {pending && (
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Chip({
  className,
  colour,
  children,
}: {
  className?: string;
  colour: { bg: string; fg: string; ring: string };
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1",
        colour.bg,
        colour.fg,
        colour.ring,
        className,
      )}
    >
      {children}
    </span>
  );
}

function formatName(s: StaffOption): string {
  return `${s.first_name} ${s.last_name}`.trim();
}
