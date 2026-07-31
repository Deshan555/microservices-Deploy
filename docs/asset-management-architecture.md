# Asset management architecture

The asset module is a hierarchical, auditable registry for factory equipment,
facilities, vehicles, IT equipment, assemblies, components, and any future
asset class.

## Hierarchy

`assets.parent_asset_id` is an adjacency-list relationship with unlimited
depth. A factory line may contain a dryer, the dryer may contain a burner
assembly, and the assembly may contain motors and sensors. The API prevents an
asset from becoming its own ancestor and provides both flat filtered lists and
a nested tree.

Self-parenting and deeper cycles are rejected transactionally by the asset
service. This rule is enforced in application code because some supported
MySQL versions do not allow a self-referencing foreign-key column to also
participate in a check constraint.

Every asset has one category and may have one subcategory. If a subcategory is
selected, it must belong to the asset's category.

## Dynamic fields

Categories and subcategories both contain `field_schema` JSON. Their fields are
merged for the asset form; duplicate keys are rejected. Values are stored in
`assets.custom_fields` and validated by the backend.

Supported types are `text`, `textarea`, `number`, `boolean`, `date`, and
`select`, using the same schema contract as the inventory module:

```json
[
  {
    "key": "motor_power_kw",
    "label": "Motor power (kW)",
    "type": "number",
    "required": true,
    "min": 0
  }
]
```

## Operational records

- Locations are hierarchical and independent from asset parentage.
- Assignments preserve custodian history.
- Lifecycle events preserve status, condition, parent, and location changes.
- Meter readings support hours, cycles, distance, energy, or custom units.
- Calendar- or meter-based maintenance plans generate operational schedules.
- Work orders track labor, parts, downtime, cost, and resolution.
- Versioned inspection checklists calculate pass/fail results.
- Documents store metadata and storage keys without coupling to a file vendor.
- The audit log records before/after snapshots for administrative changes.

## API

All endpoints are under `/thaprobane/core/v01/assets`.

| Endpoint | Purpose |
| --- | --- |
| `GET /dashboard` | Asset, condition, maintenance, warranty, and value KPIs |
| `GET/POST /categories` | List and define category schemas |
| `PUT /categories/:id` | Update category metadata and schema |
| `GET/POST /subcategories` | List and define subcategory schemas |
| `PUT /subcategories/:id` | Update subcategory defaults and schema |
| `GET/POST /locations` | Hierarchical asset locations |
| `PUT /locations/:id` | Update an asset location |
| `GET/POST /registry` | Search or create assets |
| `GET /registry/tree` | Nested asset hierarchy |
| `GET/PUT /registry/:id` | Full asset detail or update |
| `POST /registry/:id/relocate` | Change parent, location, or custodian safely |
| `POST /registry/:id/lifecycle` | Status and condition transition |
| `GET/POST /registry/:id/meter-readings` | Meter history and new readings |
| `GET/POST /registry/:id/documents` | Document metadata and storage references |
| `GET/POST /maintenance-plans` | Preventive maintenance definitions |
| `GET/POST /work-orders` | Work-order search and creation |
| `PUT /work-orders/:id/status` | Controlled work-order progress |
| `GET/POST /inspection-templates` | List or version QA/safety checklists |
| `GET/POST /inspections` | Inspection history and completion |
| `GET /registry/:id/depreciation` | Current straight-line or declining value |

## Deployment

Back up the database and run
`migrations/20260730_asset_management.sql`. The migration only adds
`asset_*` tables and seed configuration.
