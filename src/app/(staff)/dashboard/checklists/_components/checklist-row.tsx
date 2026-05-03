"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  ChecklistPreview,
  type ChecklistPreviewGroup,
} from "@/components/checklists/checklist-preview";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/index";

import type { VariantStatusKind } from "./variant-table";

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

export type ChecklistRowData = {
  id: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  subCategory: string | null;
  statusKind: VariantStatusKind;
  statusDate: string | null;
  activeVersion: string | null;
  futureVersionLabel: string | null;
  inFlightCases: number;
  lastEdited: string;
  previewGroups: ChecklistPreviewGroup[];
};

export function ChecklistRow({ data }: { data: ChecklistRowData }) {
  const [open, setOpen] = useState(false);
  const pill = STATUS_PILL[data.statusKind];

  return (
    <Card>
      <CardContent className="space-y-0 p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <span aria-hidden className="text-stone-400">
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-stone-900">
              {data.name}
            </div>
            <div className="text-xs text-stone-500">
              {data.categoryName}
              {data.subCategory && (
                <>
                  <span className="mx-1.5 text-stone-300">·</span>
                  {data.subCategory}
                </>
              )}
            </div>
          </div>

          <div className="hidden flex-col items-end gap-0 sm:flex">
            <Badge
              className={cn(
                pill.className,
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              )}
            >
              {pill.label}
            </Badge>
            {data.statusDate && (
              <span className="text-[11px] text-stone-500">
                {data.statusKind === "scheduled_deactivation"
                  ? `on ${data.statusDate}`
                  : data.statusDate}
              </span>
            )}
          </div>

          <div className="hidden w-20 flex-col items-end text-xs text-stone-600 md:flex">
            <span className="font-medium tabular-nums">
              {data.activeVersion ?? "—"}
            </span>
            {data.futureVersionLabel && (
              <span className="text-[11px] text-stone-500">
                {data.futureVersionLabel}
              </span>
            )}
          </div>

          <div className="hidden w-16 text-right text-xs text-stone-600 md:block">
            <span className="font-medium tabular-nums">
              {data.inFlightCases}
            </span>
            <div className="text-[11px] text-stone-500">in-flight</div>
          </div>

          <div className="hidden w-28 text-right text-xs text-stone-500 lg:block">
            {data.lastEdited}
          </div>

          <Link
            href={`/dashboard/checklists/${data.id}`}
            onClick={(e) => e.stopPropagation()}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Edit
          </Link>
        </button>

        {open && (
          <div className="space-y-3 border-t border-stone-100 bg-stone-50/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <Chip>Category: {data.categoryName}</Chip>
              <Chip>
                Sub category: {data.subCategory ? data.subCategory : "—"}
              </Chip>
            </div>

            {data.previewGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 bg-white px-4 py-6 text-center">
                <p className="text-sm text-stone-500">
                  This checklist has no items yet.
                </p>
                <Link
                  href={`/dashboard/checklists/${data.id}`}
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-2`}
                >
                  Open the editor →
                </Link>
              </div>
            ) : (
              <ChecklistPreview groups={data.previewGroups} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-600">
      {children}
    </span>
  );
}
