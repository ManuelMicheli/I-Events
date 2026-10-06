import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serviceCatalogSql } from "../src/catalog-sql";

const target = fileURLToPath(new URL("../../../supabase/seed/01_service_categories.sql", import.meta.url));
writeFileSync(target, serviceCatalogSql());
console.log(`wrote ${target}`);
