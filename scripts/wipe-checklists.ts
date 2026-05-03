/**
 * One-shot: wipe all checklist data on the linked Supabase project.
 * Order matters: template_documents → service_templates → service_types
 * (the cascade FK from template_documents → service_templates handles
 * the first edge automatically, but we delete all three explicitly so
 * the result is deterministic).
 *
 * Usage:
 *   npm run wipe:checklists
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // .neq with an impossible UUID is the supabase-js idiom for
  // "delete every row" (the client refuses unfiltered delete()).
  const sentinel = "00000000-0000-0000-0000-000000000000";

  for (const table of [
    "template_documents",
    "service_templates",
    "service_types",
  ] as const) {
    const { error, count } = await supabase
      .schema("ref")
      .from(table)
      .delete({ count: "exact" })
      .neq("id", sentinel);
    if (error) {
      console.error(`Delete ${table} failed:`, error.message);
      process.exit(1);
    }
    console.log(`ref.${table}: deleted ${count ?? "?"} rows`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
