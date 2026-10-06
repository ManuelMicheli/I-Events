import { SERVICE_CATALOG } from "./services";

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

/** SQL that upserts SERVICE_CATALOG into public.service_categories (supabase/seed/01_service_categories.sql). */
export function serviceCatalogSql(): string {
  const rows = SERVICE_CATALOG.map(
    (c, i) =>
      `  (${lit(c.key)}, ${lit(JSON.stringify(c.name))}::jsonb, ${lit(c.icon)}, ${lit(JSON.stringify(c.questions))}::jsonb, ${i})`,
  );
  return [
    "-- Generated from packages/core/src/services.ts by `pnpm --filter @i-events/core catalog:sql`. Do not edit.",
    "insert into public.service_categories (key, name, icon, questions, sort) values",
    rows.join(",\n"),
    "on conflict (key) do update set name = excluded.name, icon = excluded.icon, questions = excluded.questions, sort = excluded.sort, active = true;",
    "",
  ].join("\n");
}
