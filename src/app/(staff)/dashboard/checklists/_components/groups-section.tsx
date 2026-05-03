"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/index";

import {
  deactivateChecklistGroup,
  deleteChecklistGroup,
  reactivateChecklistGroup,
} from "../actions";

import { ConfirmDialog } from "./confirm-dialog";
import { GroupFormDialog } from "./group-form-dialog";

export type GroupRow = {
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  inUseCount: number;
};

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; group: GroupRow }
  | {
      kind: "deactivate" | "reactivate" | "delete";
      group: GroupRow;
    };

export function GroupsSection({ groups }: { groups: GroupRow[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setError(null);
    setDialog({ kind: "create" });
  }

  function openEdit(group: GroupRow) {
    setError(null);
    setDialog({ kind: "edit", group });
  }

  function openConfirm(
    kind: "deactivate" | "reactivate" | "delete",
    group: GroupRow,
  ) {
    setError(null);
    setDialog({ kind, group });
  }

  function close() {
    setDialog({ kind: "closed" });
    setError(null);
  }

  function runConfirm() {
    if (dialog.kind !== "deactivate" && dialog.kind !== "reactivate" && dialog.kind !== "delete") {
      return;
    }
    const code = dialog.group.code;
    const op = dialog.kind;
    setError(null);

    startTransition(async () => {
      const result = await (op === "deactivate"
        ? deactivateChecklistGroup(code)
        : op === "reactivate"
          ? reactivateChecklistGroup(code)
          : deleteChecklistGroup(code));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-stone-700">
            Checklist groups
          </h2>
          <p className="text-xs text-stone-500">
            Groups define which sections appear in checklists. Edit once,
            used everywhere.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate}>
          + Add group
        </Button>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-stone-100 bg-stone-50/30 hover:bg-stone-50/30">
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Name
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Code
              </TableHead>
              <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                In use
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Status
              </TableHead>
              <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-stone-500"
                >
                  No groups defined. Click + Add group to create your first.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => (
                <TableRow
                  key={g.code}
                  className={cn(!g.isActive && "opacity-60")}
                >
                  <TableCell className="font-medium">
                    {g.name}
                    {g.description && (
                      <div className="text-xs font-normal text-stone-500">
                        {g.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-stone-600">
                    {g.code}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-stone-700">
                    {g.inUseCount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        g.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-stone-100 text-stone-700",
                      )}
                    >
                      {g.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(g)}
                      >
                        Edit
                      </Button>
                      {g.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConfirm("deactivate", g)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConfirm("reactivate", g)}
                        >
                          Reactivate
                        </Button>
                      )}
                      {g.inUseCount === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openConfirm("delete", g)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GroupFormDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onOpenChange={(o) => {
          if (!o) close();
        }}
        mode={
          dialog.kind === "edit"
            ? {
                kind: "edit",
                group: {
                  code: dialog.group.code,
                  name: dialog.group.name,
                  description: dialog.group.description,
                  displayOrder: dialog.group.displayOrder,
                },
              }
            : { kind: "create" }
        }
      />

      <ConfirmDialog
        open={
          dialog.kind === "deactivate" ||
          dialog.kind === "reactivate" ||
          dialog.kind === "delete"
        }
        onOpenChange={(o) => {
          if (!o) close();
        }}
        title={confirmTitle(dialog)}
        description={confirmDescription(dialog)}
        confirmLabel={confirmLabel(dialog)}
        variant={dialog.kind === "delete" ? "destructive" : "default"}
        pending={pending}
        error={error}
        onConfirm={runConfirm}
      />
    </section>
  );
}

function confirmTitle(d: DialogState): string {
  if (d.kind === "deactivate") return `Deactivate "${d.group.name}"?`;
  if (d.kind === "reactivate") return `Reactivate "${d.group.name}"?`;
  if (d.kind === "delete") return `Delete "${d.group.name}"?`;
  return "";
}

function confirmDescription(d: DialogState): string {
  if (d.kind === "deactivate") {
    return "Inactive groups stay in the database but are hidden from new template editors. Existing templates that reference this group continue to work.";
  }
  if (d.kind === "reactivate") {
    return "Reactivating makes this group available to template editors again.";
  }
  if (d.kind === "delete") {
    return "Permanently removes this group. The audit log keeps a record of the deletion.";
  }
  return "";
}

function confirmLabel(d: DialogState): string {
  if (d.kind === "deactivate") return "Deactivate";
  if (d.kind === "reactivate") return "Reactivate";
  if (d.kind === "delete") return "Delete";
  return "OK";
}
