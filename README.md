# Thaproban backend

Express and MySQL API for the Leaves tea-factory platform. The API is mounted
at `/thaprobane/core/v01`.

## Dynamic inventory

The inventory module provides:

- configurable product types and schema-driven SKUs;
- effective-dated cost, sale, and transfer prices;
- batch genealogy, expiry, lifecycle transitions, and inspection gates;
- immutable receipt, issue, transfer, adjustment, production, return, and
  scrap movements;
- on-hand, reserved, and available stock by SKU, batch, and location;
- versioned QA checklists with automatic pass/fail scoring;
- reservations and an append-only audit log;
- transactional posting with concurrency locks and negative-stock prevention.

Before using `/inventory`, back up the database and run:

```bash
mysql -h <host> -u <user> -p <database> \
  < migrations/20260730_dynamic_inventory.sql
```

The migration creates only new `inventory_*` tables and a stock ledger view.
It does not modify legacy fertilizer quantity data. See
[`docs/inventory-architecture.md`](docs/inventory-architecture.md) for the
domain rules, dynamic schema formats, workflow examples, and endpoint list.

## Asset management

The asset module adds an unlimited equipment/component hierarchy, category and
subcategory JSON field schemas, locations, assignments, lifecycle events,
meter readings, preventive maintenance, work orders, inspection templates,
depreciation, documents, and audit records.

```bash
mysql -h <host> -u <user> -p <database> \
  < migrations/20260730_asset_management.sql
```

When the backend `.env` contains the database connection values, the safer
option is:

```bash
npm run migrate:assets
```

This executes the complete migration from the first statement and stops at the
first SQL error. In database IDEs such as DataGrip, run the complete file rather
than only the statement under the cursor. An
`asset_subcategories doesn't exist` error at the seed or `assets` statement
means the earlier table-creation statements were not run successfully.

See
[`docs/asset-management-architecture.md`](docs/asset-management-architecture.md)
for hierarchy rules, dynamic schema behavior, and the complete API surface.

## Development

```bash
npm install
cp .env.example .env
npm test
npm run dev
```

Database credentials are read from `DB_HOST`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, and `DB_PORT`. Keep `.env` out of source control and enable
`DB_SSL=true` when the database provider supplies a trusted TLS certificate.

## Multi-tenancy

Leaves uses an isolated database per tenant with a central tenant registry and
signed tenant-aware sessions. Before starting the tenant-aware backend, run:

```bash
npm run migrate:tenants
```

See
[`docs/multi-tenancy-architecture.md`](docs/multi-tenancy-architecture.md)
for isolation guarantees, login/switch behavior, provisioning, and background
job rules.

Create or promote the initial platform administrator with:

```bash
npm run bootstrap:super-admin
```

The command defaults to `superadmin@leaves.local`, prints a generated temporary
password only when it creates the account, and safely preserves an existing
password on later runs. Set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`,
`SUPER_ADMIN_MOBILE`, or `SUPER_ADMIN_PASSWORD` to override the defaults. Use
`npm run bootstrap:super-admin -- --reset-password` only when an intentional
password rotation is required.
