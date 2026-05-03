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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createCategory } from "@/app/(staff)/dashboard/checklists/actions";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
}

export type CategoryFormProps = {
  /** Receives the new code/name once the row is committed. */
  onCreated: (category: { code: string; name: string }) => void;
  onCancel: () => void;
  pending: boolean;
  setPending: (pending: boolean) => void;
};

export function CategoryFormBody({
  onCreated,
  onCancel,
  pending,
  setPending,
}: CategoryFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Auto-slug code from name unless touched.
  useEffect(() => {
    if (!codeManuallyEdited) setCode(slugify(name));
  }, [name, codeManuallyEdited]);

  function submit() {
    setError(null);
    setPending(true);
    startTransition(async () => {
      const result = await createCategory({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
      });
      setPending(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onCreated(result.category);
    });
  }

  const valid =
    name.trim().length > 0 &&
    /^[a-z0-9_]+$/.test(code) &&
    code.length <= 50 &&
    description.trim().length <= 500;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="cat-name">Name</FieldLabel>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Work Permit"
          maxLength={100}
          required
          disabled={pending}
          autoFocus
        />
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="cat-code">Code</FieldLabel>
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="text-xs text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            {showCode ? "Hide code" : "Show code"}
          </button>
        </div>
        {showCode ? (
          <Input
            id="cat-code"
            value={code}
            onChange={(e) => {
              setCodeManuallyEdited(true);
              setCode(e.target.value);
            }}
            placeholder="work_permit"
            maxLength={50}
            disabled={pending}
            className="font-mono"
          />
        ) : (
          <p className="font-mono text-xs text-stone-500">
            {code || "(auto-generated from name)"}
          </p>
        )}
        <FieldDescription>
          Lowercase letters, numbers, and underscores only.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="cat-description">
          Description (optional)
        </FieldLabel>
        <textarea
          id="cat-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          disabled={pending}
          className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending || !valid}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Create category"
          )}
        </Button>
      </div>
    </FieldGroup>
  );
}

export function NewCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (category: { code: string; name: string }) => void;
}) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Categories are top-level groups for checklists. Edit or delete
            them from the landing page.
          </DialogDescription>
        </DialogHeader>

        <CategoryFormBody
          pending={pending}
          setPending={setPending}
          onCreated={(category) => {
            onCreated?.(category);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />

        {/* Footer is inside CategoryFormBody to avoid a stale DialogFooter */}
        <DialogFooter className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
