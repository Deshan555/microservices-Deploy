# Multi-tenancy architecture

Leaves uses a control-plane database plus one isolated database per tenant.
This design protects legacy and new modules without relying on every SQL query
author remembering to add a tenant filter.

## Isolation boundary

- `DB_NAME` is the control database and the original/default tenant database.
- `tenants` maps a stable workspace slug to a database name.
- `tenant_memberships` is the cross-tenant user directory.
- Each tenant database contains the complete operational schema: factories,
  growers, fields, collections, fleet, inventory, assets, and tenant-local
  authentication tokens.
- Tenant database identifiers are loaded only from the control registry and
  are validated before a pool is created. Request input never selects a
  database directly.

## Request lifecycle

1. Login resolves the submitted workspace slug in the control database.
2. Credentials are checked inside that tenant database.
3. The signed access and refresh tokens receive `tenantId`, `tenantSlug`, and
   `principalType` claims.
4. Authentication reloads the active tenant from the control registry on every
   request. Suspended tenants are rejected immediately.
5. `AsyncLocalStorage` binds the request to its tenant pool. Existing model
   calls to `query()` and `withTransaction()` automatically use that pool.
6. A tenant switch is allowed only when `tenant_memberships` contains an active
   membership and the account still exists in the target database.

All business routes are protected by tenant authentication. Only login,
refresh, the demo echo, and public weather lookup execute without a tenant
context.

## Initial migration

Back up the database, then run:

```bash
npm run migrate:tenants
```

The migration registers the current `DB_NAME` database as the
`teacooperative` workspace, backfills employee/customer memberships, and
expands JWT token columns for tenant-aware tokens. It also creates the
`ROLE.SUPER_ADMIN` role; assign that role only to a trusted platform operator.
Existing users must sign in again after deployment.

Set `DEFAULT_TENANT_SLUG=teacooperative` on the backend. Login clients submit
only the account type, email, and password; the tenant slug is resolved
server-side from the account membership, with the configured default used for
legacy accounts that have not yet been backfilled. The tenant slug is not
exposed on the login form.

Create or promote the first trusted platform operator with:

```bash
npm run bootstrap:super-admin
```

The command is idempotent and does not rotate an existing account password
unless `--reset-password` is supplied.

## Onboarding another tenant

1. Create a new MySQL database with a safe identifier such as
   `leaves_kandy_coop`.
2. Apply the complete base schema and all current module migrations to it.
3. Seed roles and create the tenant's first `ROLE.ADMIN` employee.
4. Sign in as a `ROLE.SUPER_ADMIN`, open `/tenants`, and register the database,
   slug, branding, timezone, and currency.
5. Add the administrator to `tenant_memberships`, or sign in once after the
   membership has been inserted by the provisioning process.
6. Validate tenant isolation before activation by creating distinct test
   records in both workspaces.

Application database credentials need access only to the control database and
registered tenant databases. Production provisioning should use a separate
credential with `CREATE DATABASE`/DDL privileges.

## Background jobs

HTTP requests receive tenant context automatically. Workers and scheduled jobs
must enumerate active tenants from the control plane and wrap each job in
`withTenantContext(tenant, work)`. A background process must never run business
queries without an explicit tenant context.

## Platform administration

Only `ROLE.SUPER_ADMIN` can access:

- `GET /tenants`
- `POST /tenants`
- `PUT /tenants/:id`

Tenant administrators remain scoped to their own database and cannot enumerate
or modify other tenant registrations.
