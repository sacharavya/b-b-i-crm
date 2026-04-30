import { z } from "zod";

export const PAYMENT_METHODS = [
  "e_transfer",
  "stripe",
  "bank_transfer",
  "cash",
  "cheque",
  "wire",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  e_transfer: "e-Transfer",
  stripe: "Stripe",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  wire: "Wire",
  other: "Other",
};

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .max(max, `${label} cannot exceed ${max} characters`)
      .optional(),
  );

export const paymentSchema = z.object({
  amountCad: z.coerce
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than 0")
    .max(100_000, "Amount cannot exceed $100,000"),
  method: z.enum(PAYMENT_METHODS, { message: "Pick a payment method" }),
  reference: optionalText(100, "Reference"),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  notes: optionalText(500, "Notes"),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
