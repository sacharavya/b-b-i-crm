import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { phaseIndex, PHASE_LABELS, type CaseStatus } from "@/lib/utils/phase";

export function PhasePipeline({
  status,
  children,
}: {
  status: CaseStatus;
  children?: ReactNode;
}) {
  const current = phaseIndex(status);

  if (current === -1) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
        <Badge className="bg-gray-200 text-gray-700 rounded-full px-3 py-1 font-medium">
          Closed
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
        Phase
      </div>
      <div className="flex items-center gap-2">
        <ol className="flex flex-1 items-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const isCurrent = n === current;
            const isComplete = n < current;
            const isFuture = n > current;

            return (
              <li
                key={n}
                className={[
                  "flex flex-1 flex-col items-center justify-center rounded-lg px-2 py-3 text-xs font-medium",
                  isCurrent && "bg-[var(--navy)] text-white",
                  isComplete && "bg-stone-100 text-stone-600",
                  isFuture &&
                    "border border-dashed border-stone-300 text-stone-400",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="flex items-center gap-1">
                  <span className="text-[11px] opacity-80">{n}</span>
                  {isComplete && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="mt-0.5 text-[11px]">{PHASE_LABELS[n]}</span>
              </li>
            );
          })}
        </ol>

        {children}
      </div>
    </div>
  );
}
