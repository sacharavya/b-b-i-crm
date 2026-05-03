"use client";

import type { Database } from "@/lib/supabase/types";

import { updateClientCore } from "../actions";
import { SelectField, TextField } from "./fields";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type CountryOption = { code: string; name: string };

const MARITAL_OPTIONS = [
  { value: "single" as const, label: "Single" },
  { value: "married" as const, label: "Married" },
  { value: "common_law" as const, label: "Common-law" },
  { value: "divorced" as const, label: "Divorced" },
  { value: "widowed" as const, label: "Widowed" },
  { value: "separated" as const, label: "Separated" },
  { value: "annulled" as const, label: "Annulled" },
];

const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
  { value: "other" as const, label: "Other" },
  { value: "prefer_not_to_say" as const, label: "Prefer not to say" },
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: "email" as const, label: "Email" },
  { value: "phone" as const, label: "Phone" },
  { value: "whatsapp" as const, label: "WhatsApp" },
];

export function PersonalSection({
  client,
  countries,
  canEdit,
}: {
  client: ClientRow;
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  const save = (key: string) => async (value: unknown) => {
    return updateClientCore({
      clientId: client.id,
      patch: { [key]: value } as never,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TextField
        label="Legal name (full)"
        initial={client.legal_name_full}
        save={async (v) => save("legal_name_full")(v ?? "")}
        disabled={!canEdit}
      />
      <TextField
        label="Preferred name"
        initial={client.preferred_name}
        save={save("preferred_name")}
        disabled={!canEdit}
      />
      <TextField
        label="Given names"
        initial={client.given_names}
        save={save("given_names")}
        disabled={!canEdit}
      />
      <TextField
        label="Family name"
        initial={client.family_name}
        save={save("family_name")}
        disabled={!canEdit}
      />
      <TextField
        label="Date of birth"
        type="date"
        initial={client.date_of_birth}
        save={save("date_of_birth")}
        disabled={!canEdit}
      />
      <SelectField
        label="Gender"
        initial={client.gender}
        options={GENDER_OPTIONS}
        save={save("gender")}
        disabled={!canEdit}
      />
      <SelectField
        label="Marital status"
        initial={client.marital_status}
        options={MARITAL_OPTIONS}
        save={save("marital_status")}
        disabled={!canEdit}
      />
      <SelectField
        label="Country of birth"
        initial={client.country_of_birth}
        options={countryOptions}
        save={save("country_of_birth")}
        disabled={!canEdit}
      />
      <SelectField
        label="Country of citizenship"
        initial={client.country_of_citizenship}
        options={countryOptions}
        save={save("country_of_citizenship")}
        disabled={!canEdit}
      />
      <SelectField
        label="Country of residence"
        initial={client.country_of_residence}
        options={countryOptions}
        save={save("country_of_residence")}
        disabled={!canEdit}
      />
      <TextField
        label="Preferred language"
        initial={client.preferred_language}
        save={save("preferred_language")}
        disabled={!canEdit}
      />
      <SelectField
        label="Preferred contact"
        initial={
          (client.preferred_contact as "email" | "phone" | "whatsapp" | null) ??
          null
        }
        options={PREFERRED_CONTACT_OPTIONS}
        save={save("preferred_contact")}
        disabled={!canEdit}
      />
      <TextField
        label="Email"
        type="email"
        initial={client.email}
        save={save("email")}
        disabled={!canEdit}
      />
      <TextField
        label="Phone"
        type="tel"
        initial={client.phone_primary}
        save={save("phone_primary")}
        disabled={!canEdit}
      />
      <TextField
        label="WhatsApp"
        type="tel"
        initial={client.phone_whatsapp}
        save={save("phone_whatsapp")}
        disabled={!canEdit}
      />
      <TextField
        label="Address line 1"
        initial={client.address_line1}
        save={save("address_line1")}
        disabled={!canEdit}
      />
      <TextField
        label="Address line 2"
        initial={client.address_line2}
        save={save("address_line2")}
        disabled={!canEdit}
      />
      <TextField
        label="City"
        initial={client.city}
        save={save("city")}
        disabled={!canEdit}
      />
      <TextField
        label="Province / State"
        initial={client.province_state}
        save={save("province_state")}
        disabled={!canEdit}
      />
      <TextField
        label="Postal code"
        initial={client.postal_code}
        save={save("postal_code")}
        disabled={!canEdit}
      />
      <SelectField
        label="Country"
        initial={client.country_code}
        options={countryOptions}
        save={save("country_code")}
        disabled={!canEdit}
      />
    </div>
  );
}
