"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Can } from "@/components/auth/can";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  newClientSchema,
  type NewCaseInput,
  type NewClientInput,
} from "@/lib/validators/case";

import {
  createCase,
  searchClients,
  type ClientSearchResult,
} from "../actions";

export type CategoryOption = {
  code: string;
  name: string;
  description: string | null;
  variantCount: number;
};

export type VariantOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  typicalDurationDays: number | null;
  categoryCode: string;
};

type CountryOption = { code: string; name: string };

type ClientChoice =
  | { kind: "existing"; client: ClientSearchResult }
  | { kind: "new"; data: NewClientInput };

type Step = 1 | 2 | 3 | 4;

const stepTitles: Record<Step, string> = {
  1: "Client",
  2: "Service",
  3: "Fee",
  4: "Confirm",
};

const emptyClient: NewClientInput = {
  legal_name_full: "",
  email: undefined,
  phone_primary: undefined,
  phone_whatsapp: undefined,
  country_of_citizenship: undefined,
  date_of_birth: undefined,
};

export function NewCaseWizard({
  categories,
  variants,
  countries,
  canManageTemplates,
  preselectedClient,
}: {
  categories: CategoryOption[];
  variants: VariantOption[];
  countries: CountryOption[];
  canManageTemplates: boolean;
  preselectedClient?: ClientSearchResult | null;
}) {
  const [step, setStep] = useState<Step>(preselectedClient ? 2 : 1);
  const [client, setClient] = useState<ClientChoice | null>(
    preselectedClient ? { kind: "existing", client: preselectedClient } : null,
  );
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [serviceTypeId, setServiceTypeId] = useState<string>("");
  const [quotedFee, setQuotedFee] = useState("");
  const [retainerMin, setRetainerMin] = useState("");
  const [retainedAt, setRetainedAt] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = variants.find((s) => s.id === serviceTypeId);

  function handleSubmit() {
    if (!client) {
      setSubmitError("Pick a client.");
      setStep(1);
      return;
    }
    setSubmitError(null);

    const fee = Number(quotedFee);
    const min = retainerMin.trim() === "" ? undefined : Number(retainerMin);

    const retainedAtInput = retainedAt.trim() === "" ? undefined : retainedAt;

    const input: NewCaseInput =
      client.kind === "existing"
        ? {
            client_kind: "existing",
            client_id: client.client.id,
            service_type_id: serviceTypeId,
            quoted_fee_cad: fee,
            retainer_minimum_cad: min,
            retained_at: retainedAtInput,
          }
        : {
            client_kind: "new",
            new_client: client.data,
            service_type_id: serviceTypeId,
            quoted_fee_cad: fee,
            retainer_minimum_cad: min,
            retained_at: retainedAtInput,
          };

    startTransition(async () => {
      const result = await createCase(input);
      if (result?.error) {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open a new case</CardTitle>
        <CardDescription>
          Step {step} of 4 · {stepTitles[step]}
        </CardDescription>
        <ProgressBar step={step} />
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <ClientStep
            countries={countries}
            value={client}
            onChange={setClient}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ServiceStep
            categories={categories}
            variants={variants}
            categoryCode={categoryCode}
            variantId={serviceTypeId}
            onCategoryChange={(code) => {
              setCategoryCode(code);
              setServiceTypeId("");
            }}
            onVariantChange={setServiceTypeId}
            canManageTemplates={canManageTemplates}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <FeeStep
            quotedFee={quotedFee}
            retainerMin={retainerMin}
            retainedAt={retainedAt}
            onQuotedFeeChange={setQuotedFee}
            onRetainerMinChange={setRetainerMin}
            onRetainedAtChange={setRetainedAt}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <ConfirmStep
            client={client}
            service={selectedService}
            quotedFee={quotedFee}
            retainerMin={retainerMin}
            retainedAt={retainedAt}
            error={submitError}
            pending={pending}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
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

/* ───────────────────────── Step 1: Client ───────────────────────── */

function ClientStep({
  countries,
  value,
  onChange,
  onNext,
}: {
  countries: CountryOption[];
  value: ClientChoice | null;
  onChange: (v: ClientChoice) => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<"search" | "new">(
    value?.kind === "new" ? "new" : "search",
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border border-stone-200 p-1">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "search"
              ? "bg-[var(--navy)] text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Existing client
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "new"
              ? "bg-[var(--navy)] text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          New client
        </button>
      </div>

      {mode === "search" ? (
        <ExistingClientSearch
          selected={value?.kind === "existing" ? value.client : null}
          onSelect={(client) => onChange({ kind: "existing", client })}
          onContinue={onNext}
        />
      ) : (
        <NewClientForm
          countries={countries}
          initial={value?.kind === "new" ? value.data : emptyClient}
          onSubmit={(data) => {
            onChange({ kind: "new", data });
            onNext();
          }}
        />
      )}
    </div>
  );
}

function ExistingClientSearch({
  selected,
  onSelect,
  onContinue,
}: {
  selected: ClientSearchResult | null;
  onSelect: (c: ClientSearchResult) => void;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchClients(query));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="client-search">Search clients</FieldLabel>
        <Input
          id="client-search"
          type="search"
          placeholder="Name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FieldDescription>
          Matches by legal name or email. Type at least 2 characters.
        </FieldDescription>
      </Field>

      {query.trim().length >= 2 && (
        <div className="overflow-hidden rounded-lg border border-stone-200">
          {searching ? (
            <p className="px-4 py-3 text-sm text-stone-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-stone-500">No matches.</p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {results.map((c) => {
                const isSelected = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-stone-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <div>
                        <div className="font-medium">{c.legal_name_full}</div>
                        <div className="text-xs text-stone-500">
                          {c.client_number}
                          {c.email ? ` · ${c.email}` : ""}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-medium text-[var(--navy)]">
                          Selected
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onContinue} disabled={!selected}>
          Continue
        </Button>
      </div>
    </FieldGroup>
  );
}

function NewClientForm({
  countries,
  initial,
  onSubmit,
}: {
  countries: CountryOption[];
  initial: NewClientInput;
  onSubmit: (data: NewClientInput) => void;
}) {
  const [form, setForm] = useState<NewClientInput>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof NewClientInput>(
    key: K,
    v: NewClientInput[K] | string,
  ) {
    setForm((f) => ({ ...f, [key]: v as NewClientInput[K] }));
  }

  function handleContinue() {
    const parsed = newClientSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="legal_name_full">Full legal name</FieldLabel>
        <Input
          id="legal_name_full"
          value={form.legal_name_full ?? ""}
          onChange={(e) => update("legal_name_full", e.target.value)}
          aria-invalid={Boolean(errors.legal_name_full)}
        />
        {errors.legal_name_full && (
          <FieldError
            errors={errors.legal_name_full.map((m) => ({ message: m }))}
          />
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          value={form.email ?? ""}
          onChange={(e) => update("email", e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <FieldError errors={errors.email.map((m) => ({ message: m }))} />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="phone_primary">Phone</FieldLabel>
          <Input
            id="phone_primary"
            value={form.phone_primary ?? ""}
            onChange={(e) => update("phone_primary", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone_whatsapp">WhatsApp</FieldLabel>
          <Input
            id="phone_whatsapp"
            value={form.phone_whatsapp ?? ""}
            onChange={(e) => update("phone_whatsapp", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="country_of_citizenship">
            Country of citizenship
          </FieldLabel>
          <select
            id="country_of_citizenship"
            value={form.country_of_citizenship ?? ""}
            onChange={(e) => update("country_of_citizenship", e.target.value)}
            className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          >
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="date_of_birth">Date of birth</FieldLabel>
          <Input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth ?? ""}
            onChange={(e) => update("date_of_birth", e.target.value)}
            aria-invalid={Boolean(errors.date_of_birth)}
          />
          {errors.date_of_birth && (
            <FieldError
              errors={errors.date_of_birth.map((m) => ({ message: m }))}
            />
          )}
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────────── Step 2: Service ───────────────────────── */

function ServiceStep({
  categories,
  variants,
  categoryCode,
  variantId,
  onCategoryChange,
  onVariantChange,
  canManageTemplates,
  onBack,
  onNext,
}: {
  categories: CategoryOption[];
  variants: VariantOption[];
  categoryCode: string;
  variantId: string;
  onCategoryChange: (code: string) => void;
  onVariantChange: (id: string) => void;
  canManageTemplates: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  // Empty state: there are no usable variants at all in any category.
  if (categories.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-stone-700">
          No checklists have been created yet.
        </p>
        <p className="text-xs text-stone-500">
          {canManageTemplates
            ? "Variants drive what services you can open cases for."
            : "Ask a super user, admin, or RCIC to create one."}
        </p>
        <Can permission="manage_templates">
          <Link
            href="/dashboard/checklists"
            className={`${buttonVariants()} mt-2 gap-1.5`}
          >
            Create your first variant →
          </Link>
        </Can>
        <div className="flex justify-start pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Step 2a: pick a category.
  if (!categoryCode) {
    return (
      <FieldGroup>
        <p className="text-xs uppercase tracking-wider text-stone-500">
          Service category
        </p>
        <ul className="grid gap-2">
          {categories.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => onCategoryChange(c.code)}
                className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 text-left transition-colors hover:bg-stone-50"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.description && (
                    <div className="text-xs text-stone-500">{c.description}</div>
                  )}
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {c.variantCount} {c.variantCount === 1 ? "variant" : "variants"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </FieldGroup>
    );
  }

  // Step 2b: pick a variant within the chosen category.
  const category = categories.find((c) => c.code === categoryCode);
  const inCategory = variants.filter((v) => v.categoryCode === categoryCode);
  const selected = inCategory.find((v) => v.id === variantId);

  return (
    <FieldGroup>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-500">
            {category?.name ?? "Variants"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCategoryChange("")}
          className="text-xs text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          Change category
        </button>
      </div>

      <ul className="grid gap-2">
        {inCategory.map((v) => {
          const isActive = v.id === variantId;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onVariantChange(v.id)}
                className={`flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-[var(--navy)] bg-blue-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-stone-500">{v.code}</div>
                  {v.description && (
                    <div className="mt-1 text-xs text-stone-600">
                      {v.description}
                    </div>
                  )}
                </div>
                {v.typicalDurationDays !== null && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    ~{v.typicalDurationDays}d
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!selected}>
          Continue
        </Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────────── Step 3: Fee ───────────────────────── */

function FeeStep({
  quotedFee,
  retainerMin,
  retainedAt,
  onQuotedFeeChange,
  onRetainerMinChange,
  onRetainedAtChange,
  onBack,
  onNext,
}: {
  quotedFee: string;
  retainerMin: string;
  retainedAt: string;
  onQuotedFeeChange: (v: string) => void;
  onRetainerMinChange: (v: string) => void;
  onRetainedAtChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<{
    fee?: string;
    min?: string;
    retained?: string;
  }>({});
  const todayIso = new Date().toISOString().slice(0, 10);

  function handleNext() {
    const next: typeof errors = {};
    const fee = Number(quotedFee);
    if (!Number.isFinite(fee) || fee <= 0) {
      next.fee = "Quoted fee must be greater than 0.";
    }
    if (retainerMin.trim() !== "") {
      const min = Number(retainerMin);
      if (!Number.isFinite(min) || min < 0) {
        next.min = "Retainer minimum cannot be negative.";
      } else if (Number.isFinite(fee) && min > fee) {
        next.min = "Retainer minimum cannot exceed the quoted fee.";
      }
    }
    if (retainedAt.trim() !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(retainedAt)) {
        next.retained = "Use a valid date.";
      } else if (retainedAt > todayIso) {
        next.retained = "Retainer date cannot be in the future.";
      }
    }
    setErrors(next);
    if (!next.fee && !next.min && !next.retained) onNext();
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="quoted_fee_cad">Quoted fee (CAD)</FieldLabel>
        <Input
          id="quoted_fee_cad"
          type="number"
          step="0.01"
          min="0"
          value={quotedFee}
          onChange={(e) => onQuotedFeeChange(e.target.value)}
          aria-invalid={Boolean(errors.fee)}
        />
        {errors.fee ? (
          <FieldError errors={[{ message: errors.fee }]} />
        ) : (
          <FieldDescription>The total fee quoted to the client.</FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="retainer_minimum_cad">
          Retainer minimum (CAD, optional)
        </FieldLabel>
        <Input
          id="retainer_minimum_cad"
          type="number"
          step="0.01"
          min="0"
          value={retainerMin}
          onChange={(e) => onRetainerMinChange(e.target.value)}
          aria-invalid={Boolean(errors.min)}
        />
        {errors.min ? (
          <FieldError errors={[{ message: errors.min }]} />
        ) : (
          <FieldDescription>
            Amount required before the case can leave Phase 1. Leave blank to
            accept any non-zero payment.
          </FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="retained_at">Retainer date (optional)</FieldLabel>
        <Input
          id="retained_at"
          type="date"
          max={todayIso}
          value={retainedAt}
          onChange={(e) => onRetainedAtChange(e.target.value)}
          aria-invalid={Boolean(errors.retained)}
        />
        {errors.retained ? (
          <FieldError errors={[{ message: errors.retained }]} />
        ) : (
          <FieldDescription>
            When the retainer was actually signed. Leave blank for today. Backdate
            for cases being entered from older paperwork.
          </FieldDescription>
        )}
      </Field>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Continue</Button>
      </div>
    </FieldGroup>
  );
}

/* ───────────────────────── Step 4: Confirm ───────────────────────── */

function ConfirmStep({
  client,
  service,
  quotedFee,
  retainerMin,
  retainedAt,
  error,
  pending,
  onBack,
  onSubmit,
}: {
  client: ClientChoice | null;
  service: VariantOption | undefined;
  quotedFee: string;
  retainerMin: string;
  retainedAt: string;
  error: string | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const clientLabel =
    client?.kind === "existing"
      ? `${client.client.legal_name_full} (${client.client.client_number})`
      : client?.kind === "new"
        ? `${client.data.legal_name_full} (new client)`
        : "—";

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-stone-200 rounded-lg border border-stone-200">
        <Row label="Client" value={clientLabel} />
        <Row label="Service" value={service?.name ?? "—"} />
        <Row label="Quoted fee" value={`${formatCad(quotedFee)} CAD`} />
        <Row
          label="Retainer minimum"
          value={
            retainerMin.trim() === ""
              ? "Any non-zero payment"
              : `${formatCad(retainerMin)} CAD`
          }
        />
        <Row
          label="Retainer date"
          value={retainedAt.trim() === "" ? "Today" : retainedAt}
        />
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
          {pending ? "Creating case…" : "Open case"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function formatCad(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
