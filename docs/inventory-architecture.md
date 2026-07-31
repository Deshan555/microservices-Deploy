# Dynamic inventory architecture

The inventory module extends the tea-factory platform with a transactional,
auditable stock ledger. It is intentionally separate from the legacy
`FertilizerInfo.FertilizerQuantity` column so fertilizer records can be migrated
without making that mutable value the source of truth.

## Core concepts

| Concept | Purpose |
| --- | --- |
| Product type | Defines reusable dynamic SKU fields and a batch workflow |
| SKU | A unique stock-keeping unit with a base unit of measure |
| Location | Warehouse, zone, bin, production, quarantine, or dispatch node |
| Batch | Traceable lot with dates, attributes, genealogy, and lifecycle status |
| Movement | Immutable posted stock-in, stock-out, transfer, production, or adjustment document |
| Price | Versioned cost, sale, or transfer price with an effective period |
| Inspection template | Versioned dynamic checklist for receipt, batch, process, or dispatch QA |
| Inspection | Checklist response snapshot evaluated as passed or failed |
| Reservation | Quantity allocated to an order or process without changing on-hand stock |

## Inventory invariants

1. `sku_code` is globally unique.
2. Dynamic attributes must satisfy the selected product type's `field_schema`.
3. Posted movement quantities are positive; direction comes from source and
   destination locations.
4. Outbound movements cannot make stock negative. SKU rows are locked while a
   movement is posted so concurrent requests serialize safely.
5. Posted movements are never edited. Corrections use a compensating movement;
   an administrative void only removes the original document from the ledger
   view and remains auditable.
6. Batch transitions must exist in the product type's workflow. A transition
   marked `requiresPassedInspection` requires a passed inspection for that
   batch.
7. Prices and inspection templates are versioned instead of overwritten.

Source and destination requirements are validated transactionally for each
movement type by the inventory service. This is enforced in application code
because some supported MySQL versions do not allow the foreign-key location
columns to also participate in a check constraint.

## Dynamic schema format

Product-type `field_schema` is an array:

```json
[
  {
    "key": "tea_grade",
    "label": "Tea grade",
    "type": "select",
    "required": true,
    "options": ["BOP", "BOPF", "DUST"]
  },
  {
    "key": "pack_size_kg",
    "label": "Pack size (kg)",
    "type": "number",
    "required": false,
    "min": 0
  }
]
```

Supported field types are `text`, `textarea`, `number`, `boolean`, `date`, and
`select`.

## Batch workflow format

```json
[
  { "from": "PLANNED", "to": "RECEIVED" },
  { "from": "RECEIVED", "to": "QUARANTINED" },
  {
    "from": "QUARANTINED",
    "to": "APPROVED",
    "requiresPassedInspection": true
  }
]
```

## Checklist format

Checklist items use the same basic field types and can add a `passRule`:

```json
[
  {
    "key": "moisture_pct",
    "label": "Measured moisture %",
    "type": "number",
    "required": true,
    "passRule": { "operator": "between", "min": 65, "max": 82 }
  }
]
```

Rule operators: `equals`, `notEquals`, `greaterThan`, `lessThan`, `between`,
and `in`.

## API surface

All routes are under `/thaprobane/core/v01/inventory`.

| Method and path | Purpose |
| --- | --- |
| `GET /dashboard` | KPI summary, low-stock count, expiring batches, recent movements |
| `GET/POST /product-types` | List or define dynamic product types |
| `PUT /product-types/:id` | Update product type metadata, schema, or workflow |
| `GET/POST /locations` | List or create storage/production locations |
| `PUT /locations/:id` | Update a location |
| `GET/POST /skus` | Search or create SKUs |
| `GET/PUT /skus/:id` | SKU detail or update |
| `GET/POST /skus/:id/prices` | Price history or new effective price |
| `GET /stock` | On-hand, reserved, and available quantity by SKU/batch/location |
| `GET/POST /batches` | Search or create batches |
| `GET /batches/:id` | Batch detail, stock, inspections, and transitions |
| `POST /batches/:id/transitions` | Apply a validated batch transition |
| `GET/POST /movements` | Search or post stock documents |
| `GET /movements/:id` | Movement header and lines |
| `POST /movements/:id/void` | Administratively void a posted movement |
| `GET/POST /inspection-templates` | List or version checklist templates |
| `PUT /inspection-templates/:id` | Update template metadata/active state |
| `GET/POST /inspections` | Search or complete checklist inspections |
| `GET/POST /reservations` | Search or allocate available stock |
| `PUT /reservations/:id/status` | Release, fulfil, or cancel a reservation |

## Deployment

1. Back up the database.
2. Run `migrations/20260730_dynamic_inventory.sql`.
3. Restart the Express service.
4. Set the frontend `VITE_API_BASE_URL` or use the Vite `/api` proxy.

The migration only creates new `inventory_*` objects and seed configuration; it
does not modify legacy fertilizer records.
