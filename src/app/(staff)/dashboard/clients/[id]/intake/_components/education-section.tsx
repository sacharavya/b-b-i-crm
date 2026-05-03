"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

import {
  addEducation,
  removeEducation,
  updateClientCore,
  updateEducation,
} from "../actions";
import { NumberField, SelectField, TextField } from "./fields";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type EducationRow =
  Database["crm"]["Tables"]["client_education_history"]["Row"];
type CountryOption = { code: string; name: string };

export function EducationSection({
  client,
  education,
  countries,
  canEdit,
}: {
  client: ClientRow;
  education: EducationRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  const saveYears =
    (key: "years_elementary" | "years_secondary" | "years_post_secondary" | "years_trade_other") =>
    async (v: number | null) =>
      updateClientCore({
        clientId: client.id,
        patch: { [key]: v } as never,
      });

  function add() {
    startTransition(async () => {
      await addEducation({
        clientId: client.id,
        institution: "New institution",
      });
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-700">
          Years of study
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            label="Elementary"
            initial={client.years_elementary}
            save={saveYears("years_elementary")}
            disabled={!canEdit}
          />
          <NumberField
            label="Secondary"
            initial={client.years_secondary}
            save={saveYears("years_secondary")}
            disabled={!canEdit}
          />
          <NumberField
            label="Post-secondary"
            initial={client.years_post_secondary}
            save={saveYears("years_post_secondary")}
            disabled={!canEdit}
          />
          <NumberField
            label="Trade / Other"
            initial={client.years_trade_other}
            save={saveYears("years_trade_other")}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-700">
          Institutions
        </h3>
        {education.length === 0 ? (
          <p className="text-sm text-stone-500">No institutions added.</p>
        ) : (
          <div className="space-y-3">
            {education.map((row) => (
              <EducationRowEditor
                key={row.id}
                row={row}
                countries={countryOptions}
                canEdit={canEdit}
                clientId={client.id}
              />
            ))}
          </div>
        )}
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={add}
            disabled={pending}
            className="mt-3"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add institution
          </Button>
        )}
      </div>
    </div>
  );
}

function EducationRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: EducationRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function save<K extends keyof EducationRow>(key: K) {
    return async (value: EducationRow[K] | null) =>
      updateEducation({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
  }

  function doDelete() {
    startTransition(async () => {
      await removeEducation(clientId, row.id);
    });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Date from"
          type="date"
          initial={row.date_from}
          save={save("date_from")}
          disabled={!canEdit}
        />
        <TextField
          label="Date to"
          type="date"
          initial={row.date_to}
          save={save("date_to")}
          disabled={!canEdit}
        />
        <TextField
          label="Institution"
          initial={row.institution}
          save={(v) => save("institution")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="Field of study"
          initial={row.field_of_study}
          save={save("field_of_study")}
          disabled={!canEdit}
        />
        <TextField
          label="City"
          initial={row.city}
          save={save("city")}
          disabled={!canEdit}
        />
        <TextField
          label="Province / State"
          initial={row.province_state}
          save={save("province_state")}
          disabled={!canEdit}
        />
        <SelectField
          label="Country"
          initial={row.country_code}
          options={countries}
          save={save("country_code")}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          {confirm ? (
            <span className="inline-flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={doDelete}
                disabled={pending}
              >
                Confirm delete
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirm(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirm(true)}
              className="text-destructive hover:bg-red-50 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
