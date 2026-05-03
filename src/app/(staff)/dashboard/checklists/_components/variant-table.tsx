import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/index";

export type VariantStatusKind =
  | "active"
  | "scheduled_deactivation"
  | "deactivated"
  | "no_active_checklist";

export type VariantRow = {
  id: string;
  name: string;
  statusKind: VariantStatusKind;
  statusDate: string | null; // formatted, e.g. "Dec 1, 2026"
  activeVersion: string | null; // e.g. "v3" or null
  futureVersionLabel: string | null; // e.g. "v4 starts Dec 1"
  inFlightCases: number;
  lastEdited: string; // already formatted via formatDistanceToNow
};

const STATUS_PILL: Record<VariantStatusKind, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  scheduled_deactivation: {
    label: "Scheduled deactivation",
    className: "bg-amber-100 text-amber-800",
  },
  deactivated: { label: "Deactivated", className: "bg-stone-100 text-stone-700" },
  no_active_checklist: {
    label: "No active checklist",
    className: "bg-red-100 text-red-800",
  },
};

export function VariantTable({
  variants,
  emptyAddHref,
}: {
  variants: VariantRow[];
  emptyAddHref: string;
}) {
  if (variants.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-stone-500">
        No checklists yet for this category.{" "}
        <Link
          href={emptyAddHref}
          className="font-medium text-[var(--navy)] hover:underline"
        >
          + Add checklist
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-stone-100 bg-stone-50/30 hover:bg-stone-50/30">
          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            Name
          </TableHead>
          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            Status
          </TableHead>
          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            Active version
          </TableHead>
          <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            In-flight
          </TableHead>
          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            Last edited
          </TableHead>
          <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variants.map((v) => {
          const pill = STATUS_PILL[v.statusKind];
          return (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.name}</TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    pill.className,
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  )}
                >
                  {pill.label}
                </Badge>
                {v.statusDate && (
                  <div className="mt-0.5 text-[11px] text-stone-500">
                    {v.statusKind === "scheduled_deactivation"
                      ? `on ${v.statusDate}`
                      : v.statusDate}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-stone-700">
                {v.activeVersion ?? "—"}
                {v.futureVersionLabel && (
                  <div className="text-[11px] text-stone-500">
                    {v.futureVersionLabel}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-stone-700">
                {v.inFlightCases}
              </TableCell>
              <TableCell className="text-xs text-stone-500">
                {v.lastEdited}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/dashboard/checklists/${v.id}`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Edit
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
