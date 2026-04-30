"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_VALUES = ["open", "in_progress", "blocked", "done", "cancelled"];

export function TasksFilters({
  status,
  mine,
}: {
  status: string | null;
  mine: boolean;
}) {
  const router = useRouter();

  function buildHref(next: { status?: string | null; mine?: boolean }) {
    const params = new URLSearchParams();
    const nextStatus = next.status === undefined ? status : next.status;
    if (nextStatus) params.set("status", nextStatus);
    const nextMine = next.mine === undefined ? mine : next.mine;
    if (nextMine) params.set("mine", "1");
    const qs = params.toString();
    return qs ? `/dashboard/tasks?${qs}` : "/dashboard/tasks";
  }

  function pushStatus(value: string) {
    router.push(buildHref({ status: value === "" ? null : value }));
  }

  function pushMine() {
    router.push(buildHref({ mine: !mine }));
  }

  const hasFilters = status !== null || mine;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex items-center gap-2 text-xs">
        <span className="font-medium uppercase tracking-wider text-stone-500">
          Status
        </span>
        <select
          value={status ?? ""}
          onChange={(e) => pushStatus(e.target.value)}
          className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-sm text-stone-900 transition-colors focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">Active (open / in progress / blocked)</option>
          {STATUS_VALUES.map((v) => (
            <option key={v} value={v}>
              {STATUS_LABEL[v]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={pushMine}
        aria-pressed={mine}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          mine
            ? "bg-[var(--navy)] text-white"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
        }`}
      >
        Assigned to me
      </button>

      {hasFilters && (
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <X className="h-3 w-3" />
          Clear
        </Link>
      )}
    </div>
  );
}
