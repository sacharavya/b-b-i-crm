import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email("Enter a valid email").optional(),
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
);

const optionalCountryCode = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().length(2, "Use a 2-letter ISO country code").optional(),
);

export const newClientSchema = z.object({
  legal_name_full: z.string().trim().min(1, "Full legal name is required"),
  email: optionalEmail,
  phone_primary: optionalText,
  phone_whatsapp: optionalText,
  country_of_citizenship: optionalCountryCode,
  date_of_birth: optionalDate,
});

export type NewClientInput = z.infer<typeof newClientSchema>;

const feeFields = {
  service_type_id: z.string().uuid("Select a service"),
  quoted_fee_cad: z.coerce
    .number({ message: "Quoted fee must be a number" })
    .positive("Quoted fee must be greater than 0"),
  retainer_minimum_cad: z.coerce
    .number({ message: "Retainer minimum must be a number" })
    .min(0, "Retainer minimum cannot be negative")
    .optional(),
  retained_at: optionalDate,
};

export const newCaseSchema = z.discriminatedUnion("client_kind", [
  z.object({
    client_kind: z.literal("existing"),
    client_id: z.string().uuid("Pick a client"),
    ...feeFields,
  }),
  z.object({
    client_kind: z.literal("new"),
    new_client: newClientSchema,
    ...feeFields,
  }),
]);

export type NewCaseInput = z.infer<typeof newCaseSchema>;
