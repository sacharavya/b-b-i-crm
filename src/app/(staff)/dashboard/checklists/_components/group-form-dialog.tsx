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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  createChecklistGroup,
  updateChecklistGroup,
} from "../actions";

type Mode =
  | { kind: "create" }
  | {
      kind: "edit";
      group: {
        code: string;
        name: string;
        description: string | null;
        displayOrder: number;
      };
    };

export function GroupFormDialog({
  open,
  onOpenChange,
  mode,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSuccess?: () => void;
}) {
  const isEdit = mode.kind === "edit";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset / preload whenever the dialog is reopened or the mode changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode.kind === "edit") {
      setCode(mode.group.code);
      setName(mode.group.name);
      setDescription(mode.group.description ?? "");
      setDisplayOrder(String(mode.group.displayOrder));
    } else {
      setCode("");
      setName("");
      setDescription("");
      setDisplayOrder("");
    }
  }, [open, mode]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const trimmedDescription =
        description.trim() === "" ? null : description.trim();
      const orderValue =
        displayOrder.trim() === "" ? undefined : Number(displayOrder);

      if (mode.kind === "edit") {
        const result = await updateChecklistGroup({
          groupCode: mode.group.code,
          name: name.trim(),
          description: trimmedDescription,
          displayOrder: orderValue,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createChecklistGroup({
          code: code.trim(),
          name: name.trim(),
          description: trimmedDescription,
          displayOrder: orderValue,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
      }

      onSuccess?.();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit group" : "New checklist group"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "The code is immutable — changing it would break templates that reference this group."
              : "Groups define which sections appear in checklists. The code is permanent once saved."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-code">Code</FieldLabel>
              <Input
                id="group-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEdit || pending}
                placeholder="e.g. legal_supporting"
                required={!isEdit}
                autoFocus={!isEdit}
              />
              <FieldDescription>
                Lowercase letters, numbers, and underscores only.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                placeholder="e.g. Legal supporting"
                required
                autoFocus={isEdit}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="group-description">
                Description (optional)
              </FieldLabel>
              <textarea
                id="group-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={pending}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="group-order">
                Display order (optional)
              </FieldLabel>
              <Input
                id="group-order"
                type="number"
                min={0}
                step={10}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                disabled={pending}
                placeholder="Leave blank to append"
              />
              <FieldDescription>
                Smaller numbers sort first. Leave blank to add to the end.
              </FieldDescription>
            </Field>

            {error && (
              <FieldError errors={[{ message: error }]} />
            )}
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
