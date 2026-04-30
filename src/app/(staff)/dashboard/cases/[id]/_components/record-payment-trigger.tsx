"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";

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
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/validators/payment";

import { recordPayment } from "../actions";

type FormState =
  | { status: "idle" }
  | {
      status: "error";
      error: string;
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success" };

const initialState: FormState = { status: "idle" };
const todayIso = () => new Date().toISOString().slice(0, 10);

type Props = {
  caseId: string;
  /** Pre-fill the amount field, e.g. with the gate shortfall. */
  defaultAmount?: number;
  /** Callback after the dialog closes from a successful submit. */
  onSuccess?: () => void;
  /** Trigger button label. Defaults to "+ Record payment". */
  children?: ReactNode;
  /** Trigger button variant. Defaults to outline. */
  triggerVariant?: "default" | "outline";
  /** Trigger button size. Defaults to sm. */
  triggerSize?: "default" | "sm";
  /** Extra classes on the trigger button. */
  triggerClassName?: string;
};

export function RecordPaymentTrigger({
  caseId,
  defaultAmount,
  onSuccess,
  children = "+ Record payment",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "w-full",
}: Props) {
  const [open, setOpen] = useState(false);

  // Amount is controlled (not defaultValue) so it stays stable across the
  // re-renders that base-ui's FieldControl monitors — without this, when the
  // page revalidates after a successful payment and defaultAmount changes,
  // base-ui logs "A component is changing the default value of an
  // uncontrolled FieldControl". Initial value is seeded from defaultAmount
  // and only re-seeded on remount (which happens via the form key when the
  // dialog re-opens).
  const [amount, setAmount] = useState(() =>
    defaultAmount !== undefined && defaultAmount > 0
      ? defaultAmount.toFixed(2)
      : "",
  );

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const result = await recordPayment(caseId, {
        amountCad: formData.get("amountCad"),
        method: formData.get("method"),
        reference: formData.get("reference"),
        receivedDate: formData.get("receivedDate"),
        notes: formData.get("notes"),
      });
      if ("error" in result) {
        return {
          status: "error",
          error: result.error,
          fieldErrors: result.fieldErrors,
        };
      }
      return { status: "success" };
    },
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const fieldErrors =
    state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError =
    state.status === "error" && !state.fieldErrors ? state.error : null;

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Log a payment received from the client. Once submitted this entry
              is part of the audit trail; refunds and corrections are not
              recorded here in v1.
            </DialogDescription>
          </DialogHeader>

          <form
            action={formAction}
            noValidate
            // Force a remount (and reset of uncontrolled inputs) every time the
            // dialog opens, so users don't see stale values from a prior session.
            key={open ? "open" : "closed"}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="amountCad">Amount (CAD)</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                    $
                  </span>
                  <Input
                    id="amountCad"
                    name="amountCad"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                    aria-invalid={Boolean(fieldErrors.amountCad)}
                    required
                  />
                </div>
                {fieldErrors.amountCad && (
                  <FieldError
                    errors={fieldErrors.amountCad.map((m) => ({ message: m }))}
                  />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="method">Method</FieldLabel>
                  <select
                    id="method"
                    name="method"
                    defaultValue=""
                    required
                    aria-invalid={Boolean(fieldErrors.method)}
                    className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                  >
                    <option value="" disabled>
                      Pick…
                    </option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.method && (
                    <FieldError
                      errors={fieldErrors.method.map((m) => ({ message: m }))}
                    />
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="receivedDate">Received date</FieldLabel>
                  <Input
                    id="receivedDate"
                    name="receivedDate"
                    type="date"
                    defaultValue={todayIso()}
                    required
                    aria-invalid={Boolean(fieldErrors.receivedDate)}
                  />
                  {fieldErrors.receivedDate && (
                    <FieldError
                      errors={fieldErrors.receivedDate.map((m) => ({
                        message: m,
                      }))}
                    />
                  )}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="reference">Reference</FieldLabel>
                <Input
                  id="reference"
                  name="reference"
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.reference)}
                />
                {fieldErrors.reference ? (
                  <FieldError
                    errors={fieldErrors.reference.map((m) => ({ message: m }))}
                  />
                ) : (
                  <FieldDescription>
                    Optional — e-Transfer ref, cheque #, last 4 digits, etc.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <textarea
                  id="notes"
                  name="notes"
                  maxLength={500}
                  rows={3}
                  aria-invalid={Boolean(fieldErrors.notes)}
                  className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                />
                {fieldErrors.notes && (
                  <FieldError
                    errors={fieldErrors.notes.map((m) => ({ message: m }))}
                  />
                )}
              </Field>

              {formError && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Recording…
                  </>
                ) : (
                  "Record payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
