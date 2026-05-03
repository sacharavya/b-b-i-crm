"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";

import { createVariant } from "../actions";

export type CategoryOption = { code: string; name: string };
export type CopySource = {
  id: string;
  name: string;
  categoryCode: string;
  activeVersion: number;
  isDeactivated: boolean;
};

type Step = 1 | 2 | 3 | 4;

const stepTitles: Record<Step, string> = {
  1: "Checklist basics",
  2: "Starting point",
  3: "Effective date",
  4: "Confirm",
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

export function NewVariantWizard({
  categories,
  copySources,
  defaultCategoryCode,
}: {
  categories: CategoryOption[];
  copySources: CopySource[];
  defaultCategoryCode: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [categoryCode, setCategoryCode] = useState(defaultCategoryCode);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");

  // Step 2
  const [startKind, setStartKind] = useState<"blank" | "copy" | "">("");
  const [sourceVariantId, setSourceVariantId] = useState("");

  // Step 3
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());

  // Submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Auto-slug code from name unless the user has touched it.
  useEffect(() => {
    if (!codeManuallyEdited) {
      setCode(slugify(name));
    }
  }, [name, codeManuallyEdited]);

  const sourcesByCategory = useMemo(() => {
    const m = new Map<string, CopySource[]>();
    for (const s of copySources) {
      const arr = m.get(s.categoryCode) ?? [];
      arr.push(s);
      m.set(s.categoryCode, arr);
    }
    return m;
  }, [copySources]);

  const selectedCategory = categories.find((c) => c.code === categoryCode);
  const selectedSource = copySources.find((s) => s.id === sourceVariantId);

  function step1Valid() {
    return (
      categoryCode !== "" &&
      name.trim().length > 0 &&
      /^[a-z0-9_]+$/.test(code) &&
      code.length <= 50 &&
      description.trim().length <= 500 &&
      (duration.trim() === "" ||
        (Number.isInteger(Number(duration)) &&
          Number(duration) >= 1 &&
          Number(duration) <= 1000))
    );
  }
  function step2Valid() {
    if (startKind === "blank") return true;
    if (startKind === "copy") return sourceVariantId !== "";
    return false;
  }
  function step3Valid() {
    return effectiveFrom >= todayIso();
  }

  function submit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createVariant({
        categoryCode,
        name,
        code,
        description: description.trim() === "" ? null : description.trim(),
        typicalDurationDays: duration.trim() === "" ? null : Number(duration),
        starting:
          startKind === "copy"
            ? { kind: "copy", sourceVariantId }
            : { kind: "blank" },
        effectiveFrom,
      });
      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }
      router.push(`/dashboard/checklists/${result.variantId}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stepTitles[step]}</CardTitle>
        <CardDescription>Step {step} of 4</CardDescription>
        <ProgressBar step={step} />
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <Step1
            categories={categories}
            categoryCode={categoryCode}
            onCategoryChange={setCategoryCode}
            name={name}
            onNameChange={setName}
            code={code}
            onCodeChange={(v) => {
              setCode(v);
              setCodeManuallyEdited(true);
            }}
            description={description}
            onDescriptionChange={setDescription}
            duration={duration}
            onDurationChange={setDuration}
            valid={step1Valid()}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            startKind={startKind}
            onStartKindChange={setStartKind}
            sourcesByCategory={sourcesByCategory}
            categories={categories}
            sourceVariantId={sourceVariantId}
            onSourceVariantIdChange={setSourceVariantId}
            valid={step2Valid()}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            effectiveFrom={effectiveFrom}
            onEffectiveFromChange={setEffectiveFrom}
            valid={step3Valid()}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4
            categoryName={selectedCategory?.name ?? ""}
            name={name}
            code={code}
            description={description}
            duration={duration}
            startKind={startKind}
            sourceLabel={
              selectedSource
                ? `${selectedSource.name} (v${selectedSource.activeVersion})`
                : ""
            }
            effectiveFrom={effectiveFrom}
            error={submitError}
            pending={pending}
            onBack={() => setStep(3)}
            onSubmit={submit}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1 flex-1 rounded-full ${
            n <= step ? "bg-[var(--navy)]" : "bg-stone-200"
          }`}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Step 1: Variant basics ───────────────────── */

function Step1({
  categories,
  categoryCode,
  onCategoryChange,
  name,
  onNameChange,
  code,
  onCodeChange,
  description,
  onDescriptionChange,
  duration,
  onDurationChange,
  valid,
  onNext,
}: {
  categories: CategoryOption[];
  categoryCode: string;
  onCategoryChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  code: string;
  onCodeChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  duration: string;
  onDurationChange: (v: string) => void;
  valid: boolean;
  onNext: () => void;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="vw-category">Category</FieldLabel>
        <select
          id="vw-category"
          value={categoryCode}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="" disabled>
            Pick a category…
          </option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor="vw-name">Name</FieldLabel>
        <Input
          id="vw-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="PR via Express Entry CEC"
          maxLength={200}
          required
        />
        <FieldDescription>
          The full name of this variant. Shown in the new-case wizard.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="vw-code">Code</FieldLabel>
        <Input
          id="vw-code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="pr_express_cec"
          maxLength={50}
          required
        />
        <FieldDescription>
          Unique identifier. Auto-generated from the name; edit if you prefer.
          Lowercase letters, numbers, underscores only.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="vw-description">Description</FieldLabel>
        <textarea
          id="vw-description"
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
        <FieldDescription>
          What this variant is for. Optional.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="vw-duration">Typical duration (days)</FieldLabel>
        <Input
          id="vw-duration"
          type="number"
          min={1}
          max={1000}
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
        />
        <FieldDescription>
          Approximate IRCC processing time. Optional.
        </FieldDescription>
      </Field>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!valid}>
          Continue
        </Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────── Step 2: Starting point ───────────────────── */

function Step2({
  startKind,
  onStartKindChange,
  sourcesByCategory,
  categories,
  sourceVariantId,
  onSourceVariantIdChange,
  valid,
  onBack,
  onNext,
}: {
  startKind: "blank" | "copy" | "";
  onStartKindChange: (v: "blank" | "copy") => void;
  sourcesByCategory: Map<string, CopySource[]>;
  categories: CategoryOption[];
  sourceVariantId: string;
  onSourceVariantIdChange: (v: string) => void;
  valid: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const hasSources = sourcesByCategory.size > 0;

  return (
    <FieldGroup>
      <button
        type="button"
        onClick={() => onStartKindChange("blank")}
        className={cn(
          "rounded-lg border px-4 py-3 text-left transition-colors",
          startKind === "blank"
            ? "border-[var(--navy)] bg-blue-50"
            : "border-stone-200 bg-white hover:bg-stone-50",
        )}
      >
        <div className="font-medium">Start from a blank checklist</div>
        <div className="text-xs text-stone-500">
          Build the checklist from scratch. Best when IRCC requirements are
          unique.
        </div>
      </button>

      <button
        type="button"
        onClick={() => onStartKindChange("copy")}
        disabled={!hasSources}
        className={cn(
          "rounded-lg border px-4 py-3 text-left transition-colors",
          startKind === "copy"
            ? "border-[var(--navy)] bg-blue-50"
            : "border-stone-200 bg-white hover:bg-stone-50",
          !hasSources && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="font-medium">Copy from existing checklist</div>
        <div className="text-xs text-stone-500">
          Snapshot another checklist&apos;s items and edit from there.
          {!hasSources && " (No checklists available to copy from.)"}
        </div>
      </button>

      {startKind === "copy" && (
        <Field>
          <FieldLabel htmlFor="vw-source">Source checklist</FieldLabel>
          <select
            id="vw-source"
            value={sourceVariantId}
            onChange={(e) => onSourceVariantIdChange(e.target.value)}
            className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          >
            <option value="" disabled>
              Pick a variant…
            </option>
            {categories.map((c) => {
              const sources = sourcesByCategory.get(c.code);
              if (!sources || sources.length === 0) return null;
              return (
                <optgroup key={c.code} label={c.name}>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (v{s.activeVersion}
                      {s.isDeactivated ? " · deactivated" : ""})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!valid}>
          Continue
        </Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────── Step 3: Effective date ───────────────────── */

function Step3({
  effectiveFrom,
  onEffectiveFromChange,
  valid,
  onBack,
  onNext,
}: {
  effectiveFrom: string;
  onEffectiveFromChange: (v: string) => void;
  valid: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const today = todayIso();
  const isFuture = effectiveFrom > today;

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="vw-effective">Effective from</FieldLabel>
        <Input
          id="vw-effective"
          type="date"
          min={today}
          value={effectiveFrom}
          onChange={(e) => onEffectiveFromChange(e.target.value)}
        />
        {!valid ? (
          <FieldError errors={[{ message: "Cannot be in the past" }]} />
        ) : (
          <FieldDescription>
            {isFuture
              ? "Checklist becomes available in the new-case wizard on this date."
              : "Checklist becomes available immediately."}
          </FieldDescription>
        )}
      </Field>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!valid}>
          Continue
        </Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────── Step 4: Confirm ───────────────────── */

function Step4({
  categoryName,
  name,
  code,
  description,
  duration,
  startKind,
  sourceLabel,
  effectiveFrom,
  error,
  pending,
  onBack,
  onSubmit,
}: {
  categoryName: string;
  name: string;
  code: string;
  description: string;
  duration: string;
  startKind: "blank" | "copy" | "";
  sourceLabel: string;
  effectiveFrom: string;
  error: string | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-stone-200 rounded-lg border border-stone-200">
        <SummaryRow label="Category" value={categoryName} />
        <SummaryRow label="Name" value={name} />
        <SummaryRow label="Code" value={code} mono />
        <SummaryRow
          label="Description"
          value={description.trim() === "" ? "—" : description}
        />
        <SummaryRow
          label="Typical duration"
          value={duration.trim() === "" ? "—" : `${duration} days`}
        />
        <SummaryRow
          label="Starting point"
          value={startKind === "copy" ? `Copy from ${sourceLabel}` : "Blank"}
        />
        <SummaryRow label="Effective from" value={effectiveFrom} />
      </dl>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Create checklist"
          )}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className={cn("font-medium text-stone-900", mono && "font-mono")}>
        {value}
      </dd>
    </div>
  );
}
