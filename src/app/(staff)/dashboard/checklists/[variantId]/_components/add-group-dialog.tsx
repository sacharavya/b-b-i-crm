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
import { cn } from "@/lib/utils/index";

import { createChecklistGroup } from "../../actions";

export type GroupOption = {
  code: string;
  name: string;
  isActive: boolean;
};

type Tab = "pick" | "create";

export function AddGroupDialog({
  open,
  onOpenChange,
  options,
  excludeCodes,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  options: GroupOption[];
  excludeCodes: ReadonlySet<string>;
  onPick: (groupCode: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("pick");
  const [picked, setPicked] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTab("pick");
    setPicked("");
    setCode("");
    setName("");
    setError(null);
  }, [open]);

  const available = options.filter(
    (g) => g.isActive && !excludeCodes.has(g.code),
  );

  function submitPick() {
    if (!picked) return;
    onPick(picked);
    onOpenChange(false);
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createChecklistGroup({
        code: code.trim(),
        name: name.trim(),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onPick(code.trim());
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add group to checklist</DialogTitle>
          <DialogDescription>
            Pick an existing group or define a new one. New groups become
            available everywhere checklists are edited.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-stone-200">
          <TabButton active={tab === "pick"} onClick={() => setTab("pick")}>
            Pick existing
          </TabButton>
          <TabButton active={tab === "create"} onClick={() => setTab("create")}>
            Create new
          </TabButton>
        </div>

        {tab === "pick" ? (
          <div className="space-y-3">
            {available.length === 0 ? (
              <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                Every active group is already in this checklist. Create a new
                one or remove an existing group first.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {available.map((g) => (
                  <li key={g.code}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50">
                      <input
                        type="radio"
                        name="group-pick"
                        value={g.code}
                        checked={picked === g.code}
                        onChange={() => setPicked(g.code)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{g.name}</div>
                        <div className="font-mono text-xs text-stone-500">
                          {g.code}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-stone-600">
                Code
              </span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={pending}
                placeholder="e.g. supporting_docs"
                className="mt-1"
              />
              <span className="mt-1 block text-xs text-stone-500">
                Lowercase letters, numbers, and underscores only.
              </span>
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-stone-600">
                Name
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                placeholder="e.g. Supporting documents"
                className="mt-1"
              />
            </label>
          </div>
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          {tab === "pick" ? (
            <Button onClick={submitPick} disabled={!picked}>
              Add group
            </Button>
          ) : (
            <Button
              onClick={submitCreate}
              disabled={pending || !code.trim() || !name.trim()}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create + add"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-[var(--navy)] font-medium text-[var(--navy)]"
          : "border-transparent text-stone-500 hover:text-stone-800",
      )}
    >
      {children}
    </button>
  );
}
