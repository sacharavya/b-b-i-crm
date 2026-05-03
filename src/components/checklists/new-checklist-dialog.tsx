"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

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
import { cn } from "@/lib/utils/index";

import { createChecklist } from "@/app/(staff)/dashboard/checklists/actions";

import { CategoryFormBody } from "./new-category-dialog";

export type NewChecklistCategory = { code: string; name: string };
export type NewChecklistCopySource = {
  id: string;
  name: string;
  categoryCode: string;
  categoryName: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewChecklistDialog({
  open,
  onOpenChange,
  categories,
  copySources,
  subCategoriesByCategory,
  defaultCategoryCode = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: NewChecklistCategory[];
  copySources: NewChecklistCopySource[];
  /** Distinct sub_category values seen in each category, for autocomplete. */
  subCategoriesByCategory: Record<string, string[]>;
  /** Pre-select a category (used by the in-card "+ Add checklist" links). */
  defaultCategoryCode?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [categoryCode, setCategoryCode] = useState(defaultCategoryCode);
  // When categories[] is empty, default to the inline-create view.
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryCreatePending, setCategoryCreatePending] = useState(false);
  const [subCategory, setSubCategory] = useState("");
  const [showSubCat, setShowSubCat] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [startKind, setStartKind] = useState<"blank" | "copy">("blank");
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [extraCategories, setExtraCategories] = useState<NewChecklistCategory[]>([]);

  // Reset everything whenever the dialog reopens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setCode("");
    setShowCode(false);
    setCodeManuallyEdited(false);
    setCategoryCode(defaultCategoryCode);
    setCreatingCategory(categories.length === 0 && extraCategories.length === 0);
    setCategoryCreatePending(false);
    setSubCategory("");
    setShowSubCat(false);
    setEffectiveFrom(todayIso());
    setStartKind("blank");
    setSourceId("");
    setError(null);
  }, [open, defaultCategoryCode, categories.length, extraCategories.length]);

  useEffect(() => {
    if (!codeManuallyEdited) setCode(slugify(name));
  }, [name, codeManuallyEdited]);

  const allCategories = useMemo(
    () => [...categories, ...extraCategories],
    [categories, extraCategories],
  );

  const subCatSuggestions = useMemo(() => {
    if (!categoryCode) return [];
    return subCategoriesByCategory[categoryCode] ?? [];
  }, [categoryCode, subCategoriesByCategory]);

  const subCatMatches = useMemo(() => {
    const q = subCategory.trim().toLowerCase();
    if (!q) return [];
    return subCatSuggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5);
  }, [subCategory, subCatSuggestions]);

  const valid =
    name.trim().length > 0 &&
    /^[a-z0-9_]+$/.test(code) &&
    code.length <= 50 &&
    categoryCode !== "" &&
    !creatingCategory &&
    effectiveFrom >= todayIso() &&
    (startKind === "blank" || (startKind === "copy" && sourceId !== ""));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createChecklist({
        name: name.trim(),
        code: code.trim(),
        categoryCode,
        subCategory: subCategory.trim() === "" ? null : subCategory.trim(),
        effectiveFrom,
        starting:
          startKind === "copy"
            ? { kind: "copy", sourceVariantId: sourceId }
            : { kind: "blank" },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.push(`/dashboard/checklists/${result.checklistId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : onOpenChange(o))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New checklist</DialogTitle>
          <DialogDescription>
            Adds a checklist with its initial v1 contents. You can edit the
            items right after.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="nc-name">Name</FieldLabel>
            <Input
              id="nc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SOWP"
              maxLength={200}
              required
              disabled={pending || creatingCategory}
            />
            <FieldDescription>
              What is this checklist called?
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="nc-category">Category</FieldLabel>

            {creatingCategory ? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
                <p className="mb-2 text-xs text-stone-500">
                  {allCategories.length === 0
                    ? "No categories yet. Create your first."
                    : "Adding a new category."}
                </p>
                <CategoryFormBody
                  pending={categoryCreatePending}
                  setPending={setCategoryCreatePending}
                  onCreated={(c) => {
                    setExtraCategories((prev) =>
                      prev.some((p) => p.code === c.code) ? prev : [...prev, c],
                    );
                    setCategoryCode(c.code);
                    setCreatingCategory(false);
                  }}
                  onCancel={() => {
                    if (allCategories.length === 0) {
                      // Nothing to fall back to — close the whole dialog.
                      onOpenChange(false);
                    } else {
                      setCreatingCategory(false);
                    }
                  }}
                />
              </div>
            ) : (
              <select
                id="nc-category"
                value={categoryCode}
                onChange={(e) => {
                  if (e.target.value === "__create__") {
                    setCreatingCategory(true);
                    return;
                  }
                  setCategoryCode(e.target.value);
                }}
                disabled={pending}
                className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
              >
                <option value="" disabled>
                  Pick a category…
                </option>
                {allCategories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
                <option value="__create__">+ Create new category</option>
              </select>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="nc-subcat">
              Sub category (optional)
            </FieldLabel>
            <div className="relative">
              <Input
                id="nc-subcat"
                value={subCategory}
                onChange={(e) => {
                  setSubCategory(e.target.value);
                  setShowSubCat(true);
                }}
                onFocus={() => setShowSubCat(true)}
                onBlur={() => setTimeout(() => setShowSubCat(false), 150)}
                placeholder={
                  categoryCode
                    ? "e.g. Spousal Work Permit"
                    : "Pick a category first"
                }
                maxLength={200}
                disabled={pending || creatingCategory || !categoryCode}
                autoComplete="off"
              />
              {showSubCat && subCatMatches.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 text-sm shadow-lg">
                  {subCatMatches.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSubCategory(s);
                          setShowSubCat(false);
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-left hover:bg-stone-100"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <FieldDescription>
              Optional sub-grouping within this category.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="nc-effective">Effective from</FieldLabel>
            <Input
              id="nc-effective"
              type="date"
              min={todayIso()}
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              disabled={pending || creatingCategory}
            />
            <FieldDescription>
              {effectiveFrom > todayIso()
                ? "Checklist activates automatically on this date."
                : "Checklist becomes available immediately."}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Start from</FieldLabel>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStartKind("blank")}
                disabled={pending || creatingCategory}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  startKind === "blank"
                    ? "border-[var(--navy)] bg-blue-50"
                    : "border-stone-200 bg-white hover:bg-stone-50",
                )}
              >
                <div className="font-medium">Blank checklist</div>
                <div className="text-xs text-stone-500">
                  Build the items from scratch.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStartKind("copy")}
                disabled={pending || creatingCategory || copySources.length === 0}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  startKind === "copy"
                    ? "border-[var(--navy)] bg-blue-50"
                    : "border-stone-200 bg-white hover:bg-stone-50",
                  copySources.length === 0 && "cursor-not-allowed opacity-60",
                )}
              >
                <div className="font-medium">Copy from existing checklist</div>
                <div className="text-xs text-stone-500">
                  {copySources.length === 0
                    ? "No checklists available to copy from."
                    : "Snapshot another checklist's items and edit from there."}
                </div>
              </button>

              {startKind === "copy" && copySources.length > 0 && (
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  disabled={pending || creatingCategory}
                  className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30 disabled:opacity-60"
                >
                  <option value="" disabled>
                    Pick a checklist…
                  </option>
                  {copySources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.categoryName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="nc-code">Code</FieldLabel>
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
                id="nc-code"
                value={code}
                onChange={(e) => {
                  setCodeManuallyEdited(true);
                  setCode(e.target.value);
                }}
                placeholder="sowp"
                maxLength={50}
                disabled={pending || creatingCategory}
                className="font-mono"
              />
            ) : (
              <p className="font-mono text-xs text-stone-500">
                {code || "(auto-generated from name)"}
              </p>
            )}
            <FieldDescription>
              Unique identifier. Lowercase letters, numbers, underscores only.
            </FieldDescription>
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending || categoryCreatePending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || categoryCreatePending || !valid}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create checklist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
