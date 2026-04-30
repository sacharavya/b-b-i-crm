"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assigneeColor } from "@/lib/utils/assignee-color";
import { cn } from "@/lib/utils/index";

export type TaskRow = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "blocked" | "done" | "cancelled";
  priority: string | null;
  dueAt: string | null;
  caseId: string | null;
  caseNumber: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
};

const statusPill: Record<TaskRow["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "bg-stone-100 text-stone-700" },
  in_progress: { label: "In progress", className: "bg-blue-100 text-blue-800" },
  blocked: { label: "Blocked", className: "bg-amber-100 text-amber-800" },
  done: { label: "Done", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-stone-100 text-stone-500" },
};

function dueLabel(iso: string | null): {
  label: string;
  tone: "overdue" | "today" | "soon" | "later" | "none";
} {
  if (!iso) return { label: "—", tone: "none" };
  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.floor(
    (due.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (dayDiff < 0) return { label: `Overdue · ${Math.abs(dayDiff)}d`, tone: "overdue" };
  if (dayDiff === 0) return { label: "Today", tone: "today" };
  if (dayDiff === 1) return { label: "Tomorrow", tone: "soon" };
  if (dayDiff <= 7) return { label: `In ${dayDiff}d`, tone: "soon" };
  return {
    label: due.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    tone: "later",
  };
}

export function TasksTable({ rows }: { rows: TaskRow[] }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-stone-100 bg-stone-50/30 hover:bg-stone-50/30">
            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              Task
            </TableHead>
            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              Case
            </TableHead>
            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              Assigned
            </TableHead>
            <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              Status
            </TableHead>
            <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              Due
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-stone-500">
                No tasks.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((t) => {
              const pill = statusPill[t.status];
              const due = dueLabel(t.dueAt);
              const colour = assigneeColor(t.assigneeId);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {(t.priority === "high" || t.priority === "urgent") && (
                        <span
                          aria-label="High priority"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        />
                      )}
                      <span className="truncate">{t.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-stone-500">
                    {t.caseId && t.caseNumber ? (
                      <Link
                        href={`/dashboard/cases/${t.caseId}`}
                        className="hover:text-[var(--navy)] hover:underline"
                      >
                        {t.caseNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {t.assigneeName ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${colour.bg} ${colour.fg} ${colour.ring}`}
                      >
                        {t.assigneeName}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${pill.className} rounded-full px-3 py-1 font-medium`}
                    >
                      {pill.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span
                      className={cn(
                        "tabular-nums",
                        due.tone === "overdue" && "font-semibold text-red-600",
                        due.tone === "today" && "font-semibold text-amber-700",
                        due.tone === "soon" && "text-amber-700",
                        due.tone === "later" && "text-stone-700",
                        due.tone === "none" && "text-stone-400",
                      )}
                    >
                      {due.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="border-t border-stone-100 bg-stone-50/30 px-4 py-2.5 text-xs text-stone-500">
        {rows.length} task{rows.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
