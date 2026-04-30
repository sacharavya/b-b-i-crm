---
name: db-schema-reviewer
description: >
  Reviews database schemas, migration files, and ORM model definitions for
  missing indexes, unsafe migrations, naming inconsistencies, nullable traps,
  N+1 risks, and structural problems. Use when user says "review this
  migration", "check my schema", "is this migration safe", "review these
  models", "database design review", "will this migration lock the table",
  or shares SQL migration files, Prisma schemas, TypeORM entities, or
  Sequelize models.
  Does NOT trigger for query optimisation — use perf-profiler for that.
  Does NOT trigger for general SQL help or ORM usage questions.
license: MIT
metadata:
  author: sagun karanjit
  version: 1.0.0
  category: database
---

# DB schema reviewer

## Purpose
Catch schema and migration problems before they reach production — where
they are expensive, risky, or impossible to reverse. Focus on correctness,
safety, and long-term maintainability of the data model.

---

## Step 1 — Identify the context

Before reviewing, determine:

1. **Format** — raw SQL, Prisma schema, TypeORM, Sequelize, Drizzle, or
   other ORM
2. **Operation type** — new table, add column, modify column, add index,
   data migration, or destructive change
3. **Scale signal** — any hint of table size matters for lock risk
   (migrations safe on 1k rows can lock for minutes on 10M rows)
4. **Database engine** — Postgres, MySQL, SQLite (lock behaviour and
   feature support differ significantly)

If a migration is provided without the current schema, ask:
> "Can you share the current schema or model definition for the affected
> table? Reviewing a migration in isolation misses context."

---

## Step 2 — Review across six dimensions

---

### Dimension 1 — Migration safety

The highest-risk dimension. A bad migration can lock a production table
and cause an outage.

**Lock risk — operations that acquire table-level locks:**

In Postgres:
- `ADD COLUMN` with a non-null default (pre-Postgres 11) — rewrites table
- `ADD COLUMN NOT NULL` without a default — blocks all writes
- `ALTER COLUMN TYPE` — full table rewrite
- `ADD CONSTRAINT` — scans entire table
- `DROP COLUMN` — acquires AccessExclusiveLock

In MySQL:
- Most schema changes require a full table copy unless using `ALGORITHM=INPLACE`
- Always check `ALGORITHM` and `LOCK` clauses

**Safe patterns for zero-downtime migrations:**

Adding a non-nullable column with a default:
```sql
-- Dangerous on large tables (pre-Postgres 11)
ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false;

-- Safe: add nullable first, backfill, then add constraint
ALTER TABLE users ADD COLUMN verified BOOLEAN;
UPDATE users SET verified = false WHERE verified IS NULL;
ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
ALTER TABLE users ALTER COLUMN verified SET DEFAULT false;
```

Renaming a column (never do this in one migration):
```sql
-- Dangerous: breaks running code immediately
ALTER TABLE users RENAME COLUMN username TO handle;

-- Safe zero-downtime sequence (3 separate deployments):
-- 1. Add new column, write to both
-- 2. Migrate reads to new column
-- 3. Drop old column
```

**Irreversibility check:**
Every destructive migration must have a corresponding down migration:
- `DROP TABLE` / `DROP COLUMN` → down migration restores the structure
- Data migrations that modify values → down migration reverses them or
  note explicitly: "This migration is intentionally irreversible — data
  cannot be recovered without a backup"

---

### Dimension 2 — Index coverage

**Missing indexes — check for:**
- Foreign key columns without an index (especially on the "many" side
  of a one-to-many relationship)
- Columns used in WHERE clauses in common queries
- Columns used in JOIN conditions
- Columns used in ORDER BY on large tables
- Compound index column order (most selective column first)

```sql
-- Missing: orders.user_id is a FK but has no index
-- Every query for a user's orders does a full table scan
ALTER TABLE orders ADD INDEX idx_orders_user_id (user_id);
```

**Over-indexing — flag when:**
- Every column has an index (write performance penalty, storage cost)
- Duplicate indexes (same columns in same order)
- Indexes on very low-cardinality columns (boolean, status with 2–3 values)
  unless used with other columns in a compound index

**Unique constraints:**
- Email, username, slug, and other uniqueness requirements should be
  enforced at the database level, not only in application code
- Missing unique constraint = race condition vulnerability

---

### Dimension 3 — Nullable and default traps

**Nullable columns without a sensible default:**
- A new nullable column on an existing table means existing rows have
  NULL for that column
- If application code doesn't handle NULL, this creates runtime errors
- Fix: add a default value or handle NULL explicitly in the application

**NOT NULL without a default on an existing table:**
```sql
-- Fails if any existing rows exist
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL;

-- Safe: provide a default that applies to existing rows
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'viewer';
```

**Boolean nullable columns:**
- A `BOOLEAN` column that can be `NULL` creates three-state logic
  (true / false / unknown) which is almost never intentional
- Fix: `NOT NULL` with a `DEFAULT false` unless NULL has explicit meaning

**Timestamp columns:**
- `created_at` and `updated_at` should always be `NOT NULL` with
  database-level defaults, not application-level
- `deleted_at` for soft deletes should be nullable by design — document it

---

### Dimension 4 — Naming conventions

Inconsistent naming accumulates into unmaintainable schemas.
Check for violations of whatever conventions are already established:

**Common conventions to enforce consistently:**
- Table names: plural snake_case (`users`, `order_items`) or singular —
  pick one and flag violations
- Column names: snake_case throughout
- Foreign keys: `{referenced_table_singular}_id` (e.g. `user_id`,
  `order_id`)
- Primary keys: `id` or `{table_singular}_id` — flag if mixed
- Boolean columns: `is_`, `has_`, `can_` prefix (e.g. `is_active`,
  `has_verified_email`)
- Timestamp columns: `_at` suffix (`created_at`, `updated_at`,
  `deleted_at`)
- Junction/pivot tables: `{table_a}_{table_b}` alphabetically

---

### Dimension 5 — Structural and relational integrity

**Missing foreign key constraints:**
- Columns that are logically foreign keys but have no `REFERENCES`
  constraint allow orphaned records
- Fix: add the constraint, with a decision on `ON DELETE` behaviour:
  - `CASCADE` — delete child when parent is deleted (use carefully)
  - `RESTRICT` — prevent parent deletion if children exist
  - `SET NULL` — null the FK when parent is deleted

**Missing cascade decisions:**
- Every FK without an explicit `ON DELETE` clause defaults to `RESTRICT`
  in Postgres — confirm this is intentional

**Enum vs. string for constrained values:**
- Status columns with a small fixed set of values benefit from database
  enums or a check constraint
- But: adding values to a Postgres enum requires a migration — if the
  set will grow, a reference table or check constraint is more flexible

**Shared package type alignment:**
- In a monorepo, check that column types in the schema match the
  TypeScript types in the shared package
- Especially: `Date` vs `string` for timestamps, `number` vs `string`
  for IDs

---

### Dimension 6 — ORM-specific risks

**Prisma:**
- `@updatedAt` only updates via Prisma — raw SQL updates won't trigger it
- Relations without explicit `@relation` names can cause issues with
  multiple relations between the same models
- `Json` fields bypass type safety entirely — flag for review

**TypeORM:**
- `synchronize: true` in production is dangerous — it auto-migrates and
  can drop columns
- `eager: true` on relations causes automatic joins — can trigger N+1
  at the ORM level

**Sequelize:**
- `underscored: true` vs. explicit `field` mapping inconsistencies
- `timestamps: false` removes `createdAt`/`updatedAt` — flag if unexpected

---

## Step 3 — Format output

```
## Schema review — [migration filename or model name]

### Summary
[2–3 sentences: overall assessment, most critical issue, whether this
migration is safe to run on a production table of significant size.]

---

### Findings

#### 🔴 Critical — do not run this migration as-is
- **[Dimension]** — [Issue].
  Risk: [Concrete impact — data loss, table lock, outage]
  Fix: [Specific corrected SQL or model change]

#### 🟡 Major — should fix before deploying
- **[Dimension]** — [Issue and fix]

#### 🔵 Minor — worth addressing, not urgent
- **[Dimension]** — [Issue and fix]

---

### Safe to run?
[ ] Yes — no lock risk, reversible, conventions followed
[ ] Yes with caveats — [specific conditions]
[ ] No — [reason]

---

### Suggested migration order
[If multiple changes: recommend the safe sequence to apply them]
```

---

## Examples

### Example 1 — New migration file
**User:** shares a migration adding columns to an existing table

**Actions:**
1. Check each column: nullable, default, type, lock risk
2. Check for missing indexes on any new FK columns
3. Verify down migration exists
4. Flag any zero-downtime concerns

### Example 2 — Full schema review
**User:** shares a Prisma schema or full SQL schema

**Actions:**
1. Check naming conventions throughout
2. Identify all FKs without indexes
3. Check all nullable columns for intentionality
4. Flag missing unique constraints on identity columns
5. Check ORM-specific risks

### Example 3 — "Will this migration lock the table?"
**User:** shares a specific ALTER TABLE statement

**Actions:**
1. Identify the lock type acquired (Postgres lock levels)
2. Estimate risk based on operation type
3. Provide the zero-downtime alternative if lock risk is high

### Example 4 — Data migration
**User:** shares a migration that updates existing row values

**Actions:**
1. Check: is this wrapped in a transaction?
2. Check: is the WHERE clause selective enough to avoid full table scan?
3. Check: does the down migration restore the original values, or is
   this intentionally irreversible?
4. For large tables: recommend batching the update to avoid long-running
   transactions

---

## Troubleshooting

**Migration looks fine but production behaved differently:**
Schema migrations interact with the running application version. Ask:
"Was the application deployed before or after the migration ran?" Column
renames and type changes are especially sensitive to deployment order.

**User is using a managed migration tool (Flyway, Liquibase, Alembic):**
The review principles are the same. Note any tool-specific syntax
requirements (e.g. Alembic's `op.batch_alter_table` for SQLite).

**Schema is very large:**
Prioritise: FK indexes first (highest query impact), then NOT NULL
traps, then naming conventions. Ask the user which tables are
highest-traffic to focus the review.