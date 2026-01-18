# ERP Integration Database Schema Proposal

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Purpose:** Proposed database tables for storing ERP invoice data  
**Design Principles:** Preserve ERP field names, maintain contract compatibility, minimal ecommerce-specific additions

---

## DESIGN PRINCIPLES

1. **Preserve ERP Field Names** - All field names from JSON payload preserved exactly
2. **Mirror ERP Data** - Store ERP data as-is, with minimal transformation
3. **Add Minimal Ecommerce Fields** - Only add fields required for ecommerce operations (marked separately)
4. **Maintain Compatibility** - Schema supports future ERP payload changes
5. **Audit Trail** - Store raw payload for troubleshooting and reconciliation

---

## TABLE OVERVIEW

### Core Tables (ERP Data)

1. **`erp_invoices`** - Invoice-level data from ERP
2. **`erp_invoice_details`** - Line items from invoice `details` array
3. **`erp_invoice_custom_fields`** - Custom fields from `customFields` array (normalized for querying)

### Supporting Tables (Ecommerce Operations)

4. **`erp_integration_log`** - Audit log for invoice processing
5. **`erp_products_cache`** - Cached product master data from ERP (optional, for SKU lookup)

---

## TABLE 1: `erp_invoices`

**Purpose:** Stores invoice-level data received from ERP system. This table mirrors the top-level invoice object from the JSON payload.

**Business Meaning:** Represents a sales invoice/order issued by the ERP system to a retailer. Each row is one invoice from ERP.

---

### Columns

| Column Name | Type | Nullable | Description | Source |
|------------|------|----------|-------------|--------|
| **`id`** | `UUID` | NO | **ECOM:** Primary key, internal ecommerce database ID (auto-generated) | Ecommerce |
| **`erp_invoice_number`** | `TEXT` | NO | **ERP:** Unique invoice number from ERP (e.g., "S56723"). This is the business key for deduplication. Format appears alphanumeric. | JSON: `erp_invoice_number` |
| **`retailer_br_id`** | `BIGINT` | NO | **ERP:** Retailer's internal BR ID in ERP system (e.g., 15750504). This identifies which retailer the invoice is for. | JSON: `retailer_br_id` |
| **`retailer_external_id`** | `TEXT` | YES | **ERP:** External identifier for retailer. Currently always empty string `""` in all samples. May be used for specific retailer types or future use. | JSON: `retailer_external_id` |
| **`invoice_date`** | `DATE` | NO | **ERP:** Date when invoice was created in ERP system. Format is `YYYY-MM-DD` (ISO 8601 date, not datetime). | JSON: `invoice_date` |
| **`status`** | `INTEGER` | NO | **ERP:** Invoice status code from ERP. Observed value is always `1` in samples. Other status codes unknown. Likely represents invoice state (active, pending, cancelled). | JSON: `status` |
| **`remarks`** | `TEXT` | YES | **ERP:** Free-text remarks or notes attached to invoice. Currently always empty string `""` in all samples. Field exists for future use. | JSON: `remarks` |
| **`custom_fields`** | `JSONB` | NO | **ERP:** Array of custom metadata fields. Always contains exactly 3 items. First item typically has `id: "1128"` with name value. Stored as JSONB for flexibility and querying. | JSON: `customFields` |
| **`erp_payload`** | `JSONB` | NO | **ECOM:** Complete raw JSON payload received from ERP. Stored for audit trail, troubleshooting, and reconciliation. Preserves exact payload structure. | Ecommerce (full request body) |
| **`total`** | `NUMERIC(12,4)` | YES | **ECOM:** Calculated total from line items. For convenience and fast queries. Formula: `SUM((quantity * price_per_item) - discount_value)`. Can be recalculated from `erp_invoice_details`. | Ecommerce (calculated) |
| **`created_at`** | `TIMESTAMPTZ` | NO | **ECOM:** Timestamp when invoice record was created in ecommerce database. | Ecommerce |
| **`updated_at`** | `TIMESTAMPTZ` | NO | **ECOM:** Timestamp when invoice record was last updated. | Ecommerce |
| **`received_at`** | `TIMESTAMPTZ` | NO | **ECOM:** Timestamp when invoice was received from ERP API. Different from `invoice_date` (which is invoice creation date in ERP). | Ecommerce |
| **`processing_status`** | `TEXT` | NO | **ECOM:** Ecommerce processing state. Values: `pending`, `processed`, `failed`, `duplicate`. Tracks invoice processing workflow. | Ecommerce |

---

### Constraints

- **Primary Key:** `id` (UUID)
- **Unique Constraint:** `erp_invoice_number` (prevent duplicate processing)
- **Check Constraint:** `processing_status IN ('pending', 'processed', 'failed', 'duplicate')`
- **Indexes:**
  - `erp_invoice_number` (unique index for fast duplicate check)
  - `retailer_br_id` (for filtering by retailer)
  - `invoice_date` (for date-range queries)
  - `status` (for filtering by ERP status)
  - `processing_status` (for workflow queries)
  - `created_at` (for chronological queries)

---

### Field Stability Analysis

| Field | Stability | Notes |
|-------|-----------|-------|
| `erp_invoice_number` | ✅ **STABLE** | Immutable business key. Format unlikely to change. |
| `retailer_br_id` | ✅ **STABLE** | Stable numeric ID from ERP master data. |
| `retailer_external_id` | ⚠️ **MAY CHANGE** | Currently always empty. May be populated in future. |
| `invoice_date` | ✅ **STABLE** | Date format consistent. Value changes per invoice. |
| `status` | ⚠️ **UNKNOWN** | Only value `1` observed. Other codes may exist. |
| `remarks` | ⚠️ **MAY CHANGE** | Currently always empty. May be populated in future. |
| `custom_fields` | ⚠️ **MAY EXPAND** | Currently 3 items. Structure may expand (more items). |

---

## TABLE 2: `erp_invoice_details`

**Purpose:** Stores line items from invoice `details` array. Each row represents one product/SKU ordered in the invoice.

**Business Meaning:** Represents a single line item in an invoice - a product ordered with quantity, pricing, and discount information.

**Relationship:** Many details belong to one invoice (N:1 relationship with `erp_invoices`)

---

### Columns

| Column Name | Type | Nullable | Description | Source |
|------------|------|----------|-------------|--------|
| **`id`** | `UUID` | NO | **ECOM:** Primary key, internal ecommerce database ID (auto-generated) | Ecommerce |
| **`erp_invoice_id`** | `UUID` | NO | **ECOM:** Foreign key to `erp_invoices.id`. Links line item to its invoice. | Ecommerce |
| **`sku_external_id`** | `TEXT` | NO | **ERP:** Product SKU identifier from ERP. Format is numeric string (e.g., "000005015151498522"). Length varies 15-18 characters. **CRITICAL:** Leading zeros must be preserved (store as TEXT, not NUMBER). | JSON: `details[].sku_external_id` |
| **`quantity`** | `INTEGER` | NO | **ERP:** Quantity ordered. ERP sends as string (e.g., "12") but stored as integer for calculations. Must parse from string during insert. | JSON: `details[].quantity` (parsed) |
| **`sku_uom`** | `TEXT` | NO | **ERP:** Unit of Measure (UOM). Observed values: "PC" (Piece), "PCK" (Pack), "TIN", "SET", "BDL" (Bundle), "BAG". Used for inventory management and unit conversions. | JSON: `details[].sku_uom` |
| **`price_per_item`** | `NUMERIC(12,4)` | NO | **ERP:** Unit price per item from ERP. Decimal precision: 4 places (e.g., 23.7946, 168.4821). **ERP controls pricing** - this is authoritative. | JSON: `details[].price_per_item` |
| **`discount_value`** | `NUMERIC(12,4)` | NO | **ERP:** Discount amount applied to this line item. Decimal precision: 4 places. Currently always `0.0000` in samples. May be non-zero for actual discounts. | JSON: `details[].discount_value` |
| **`line_total`** | `NUMERIC(12,4)` | YES | **ECOM:** Calculated line total for convenience. Formula: `(quantity * price_per_item) - discount_value`. Can be recalculated from other fields. | Ecommerce (calculated) |
| **`line_number`** | `INTEGER` | YES | **ECOM:** Sequence number of line item within invoice (1-based). Preserves order from `details` array. | Ecommerce (from array index) |
| **`created_at`** | `TIMESTAMPTZ` | NO | **ECOM:** Timestamp when line item record was created. | Ecommerce |

---

### Constraints

- **Primary Key:** `id` (UUID)
- **Foreign Key:** `erp_invoice_id` REFERENCES `erp_invoices(id)` ON DELETE CASCADE
- **Indexes:**
  - `erp_invoice_id` (for joining with invoices)
  - `sku_external_id` (for product/SKU queries)
  - `(erp_invoice_id, line_number)` (for ordering line items)

---

### Field Stability Analysis

| Field | Stability | Notes |
|-------|-----------|-------|
| `sku_external_id` | ✅ **STABLE** | Format consistent (numeric string). Leading zeros significant. |
| `quantity` | ✅ **STABLE** | Always positive integer. Type conversion from string stable. |
| `sku_uom` | ⚠️ **MAY CHANGE** | New UOM values may be introduced (beyond known 6 types). |
| `price_per_item` | ✅ **STABLE** | Format stable (4 decimal precision). Value changes per invoice. |
| `discount_value` | ⚠️ **UNKNOWN** | Currently always 0.0000. Discount calculation logic unknown. |

---

## TABLE 3: `erp_invoice_custom_fields` (Optional Normalization)

**Purpose:** Normalized table for custom fields. Alternative to storing `custom_fields` as JSONB in `erp_invoices`.

**Rationale:** 
- Allows querying by custom field ID or value
- Easier to filter invoices by salesperson (if field ID "1128" = salesperson)
- Optional - can use JSONB in `erp_invoices` instead

**Recommendation:** Use JSONB in `erp_invoices` unless you need frequent queries by custom field values.

---

### Columns (If Normalized)

| Column Name | Type | Nullable | Description | Source |
|------------|------|----------|-------------|--------|
| **`id`** | `UUID` | NO | **ECOM:** Primary key | Ecommerce |
| **`erp_invoice_id`** | `UUID` | NO | **ECOM:** Foreign key to `erp_invoices.id` | Ecommerce |
| **`field_id`** | `TEXT` | NO | **ERP:** Custom field identifier. Currently "1128" in first item, empty `""` in others. | JSON: `customFields[].id` |
| **`field_value`** | `TEXT` | NO | **ERP:** Custom field value. Currently name (e.g., "ALJON YU") in first item, empty `""` in others. | JSON: `customFields[].value` |
| **`field_order`** | `INTEGER` | NO | **ECOM:** Sequence number (0, 1, 2) to preserve order from array. | Ecommerce (array index) |

---

### Alternative: Store as JSONB

**Recommended Approach:** Store `custom_fields` as JSONB in `erp_invoices` table.

**Benefits:**
- Simpler schema (one less table)
- Preserves exact structure from ERP
- Can query JSONB in PostgreSQL: `WHERE custom_fields @> '[{"id": "1128"}]'`
- Matches ERP payload structure

**Structure:**
```jsonb
[
  {"id": "1128", "value": "ALJON YU"},
  {"id": "", "value": ""},
  {"id": "", "value": ""}
]
```

---

## TABLE 4: `erp_integration_log`

**Purpose:** Audit log for invoice processing. Tracks all API requests, processing attempts, successes, and failures.

**Business Meaning:** Provides visibility into integration health, error tracking, and debugging capabilities.

---

### Columns

| Column Name | Type | Nullable | Description | Source |
|------------|------|----------|-------------|--------|
| **`id`** | `UUID` | NO | **ECOM:** Primary key | Ecommerce |
| **`erp_invoice_number`** | `TEXT` | YES | **ECOM:** Invoice number from request (for correlation) | Ecommerce |
| **`event_type`** | `TEXT` | NO | **ECOM:** Event type. Values: `invoice_received`, `invoice_processed`, `invoice_duplicate`, `invoice_failed`, `validation_error` | Ecommerce |
| **`processing_status`** | `TEXT` | NO | **ECOM:** Processing result. Values: `success`, `failed`, `duplicate`, `validation_error` | Ecommerce |
| **`request_payload`** | `JSONB` | YES | **ECOM:** Complete request payload (for failed requests, truncated for successful) | Ecommerce |
| **`error_message`** | `TEXT` | YES | **ECOM:** Error message if processing failed | Ecommerce |
| **`error_details`** | `JSONB` | YES | **ECOM:** Detailed error information (stack traces, validation errors) | Ecommerce |
| **`erp_invoice_id`** | `UUID` | YES | **ECOM:** Foreign key to `erp_invoices.id` (if invoice was created) | Ecommerce |
| **`processing_time_ms`** | `INTEGER` | YES | **ECOM:** Time taken to process invoice (milliseconds) | Ecommerce |
| **`created_at`** | `TIMESTAMPTZ` | NO | **ECOM:** Timestamp when log entry was created | Ecommerce |

---

### Indexes

- `erp_invoice_number` (for correlating logs with invoices)
- `event_type` (for filtering by event type)
- `processing_status` (for error monitoring)
- `created_at` (for chronological queries)

---

## SCHEMA VISUALIZATION

```
erp_invoices (1)
    │
    ├─→ (1:N) erp_invoice_details
    │       │
    │       └─→ sku_external_id → erp_products_cache (optional)
    │
    ├─→ (1:1) erp_payload (stored as JSONB column)
    │
    └─→ (1:N) erp_integration_log
```

**Note:** `custom_fields` stored as JSONB in `erp_invoices` table (not normalized).

---

## FIELD NAME PRESERVATION

**All ERP Field Names Preserved Exactly:**

| ERP JSON Field | Database Column | Preserved |
|----------------|----------------|-----------|
| `retailer_br_id` | `retailer_br_id` | ✅ Yes |
| `retailer_external_id` | `retailer_external_id` | ✅ Yes |
| `erp_invoice_number` | `erp_invoice_number` | ✅ Yes |
| `invoice_date` | `invoice_date` | ✅ Yes |
| `status` | `status` | ✅ Yes |
| `remarks` | `remarks` | ✅ Yes |
| `customFields` | `custom_fields` | ✅ Yes (camelCase → snake_case for SQL convention) |
| `details[].sku_external_id` | `sku_external_id` | ✅ Yes |
| `details[].quantity` | `quantity` | ✅ Yes |
| `details[].sku_uom` | `sku_uom` | ✅ Yes |
| `details[].price_per_item` | `price_per_item` | ✅ Yes |
| `details[].discount_value` | `discount_value` | ✅ Yes |

**Ecommerce-Only Fields (Marked):**

| Field | Purpose | Type |
|-------|---------|------|
| `id` | Primary key (UUID) | Ecommerce |
| `created_at`, `updated_at` | Audit timestamps | Ecommerce |
| `received_at` | Track when invoice received | Ecommerce |
| `processing_status` | Workflow state | Ecommerce |
| `total`, `line_total` | Calculated convenience fields | Ecommerce |
| `line_number` | Preserve array order | Ecommerce |
| `erp_payload` | Raw payload for audit | Ecommerce |

---

## DATA TYPE MAPPINGS

| ERP Type | JSON Type | Database Type | Notes |
|----------|-----------|---------------|-------|
| `retailer_br_id` | `number` | `BIGINT` | Numeric ID, may be large |
| `retailer_external_id` | `string` | `TEXT` | Empty in samples, nullable |
| `erp_invoice_number` | `string` | `TEXT` | Alphanumeric, unique |
| `invoice_date` | `string` (YYYY-MM-DD) | `DATE` | Convert from string to DATE |
| `status` | `number` | `INTEGER` | Status code (1 observed) |
| `remarks` | `string` | `TEXT` | Empty in samples, nullable |
| `customFields` | `array` | `JSONB` | Array of {id, value} objects |
| `sku_external_id` | `string` | `TEXT` | **CRITICAL:** Preserve as TEXT (leading zeros) |
| `quantity` | `string` | `INTEGER` | Parse from string ("12" → 12) |
| `sku_uom` | `string` | `TEXT` | UOM code (PC, PCK, TIN, etc.) |
| `price_per_item` | `number` | `NUMERIC(12,4)` | 4 decimal precision |
| `discount_value` | `number` | `NUMERIC(12,4)` | 4 decimal precision |

---

## CONSTRAINTS & VALIDATIONS

### `erp_invoices` Constraints

- **Unique:** `erp_invoice_number` (prevents duplicate processing)
- **Check:** `processing_status IN ('pending', 'processed', 'failed', 'duplicate')`
- **Not Null:** All ERP-required fields (except nullable ones like `retailer_external_id`, `remarks`)

### `erp_invoice_details` Constraints

- **Foreign Key:** `erp_invoice_id` → `erp_invoices(id)` CASCADE DELETE
- **Check:** `quantity > 0` (positive quantity required)
- **Check:** `price_per_item >= 0` (non-negative price)
- **Check:** `discount_value >= 0` (non-negative discount)

---

## INDEXES FOR PERFORMANCE

### `erp_invoices` Indexes

1. **Unique Index:** `erp_invoice_number` (fast duplicate check)
2. **B-Tree Index:** `retailer_br_id` (filter by retailer)
3. **B-Tree Index:** `invoice_date` (date range queries)
4. **B-Tree Index:** `status` (filter by ERP status)
5. **B-Tree Index:** `processing_status` (workflow queries)
6. **B-Tree Index:** `created_at` (chronological queries)
7. **Composite Index:** `(retailer_br_id, invoice_date)` (common query pattern)

### `erp_invoice_details` Indexes

1. **B-Tree Index:** `erp_invoice_id` (join with invoices)
2. **B-Tree Index:** `sku_external_id` (product/SKU queries)
3. **Composite Index:** `(erp_invoice_id, line_number)` (ordered line items)

---

## STORAGE ESTIMATES

**Assumptions:**
- 1,000 invoices/day
- Average 5 line items per invoice
- 30-day retention (minimum)

**Monthly Growth:**
- Invoices: ~30,000 rows
- Details: ~150,000 rows
- Logs: ~30,000 rows (at minimum)

**Storage Per Row (Estimated):**
- `erp_invoices`: ~2KB (including JSONB payload)
- `erp_invoice_details`: ~200 bytes
- `erp_integration_log`: ~1KB

**Total Monthly Growth:**
- ~60MB (invoices) + ~30MB (details) + ~30MB (logs) = **~120MB/month**

---

## MIGRATION STRATEGY

### Phase 1: Create Core Tables

1. Create `erp_invoices` table
2. Create `erp_invoice_details` table
3. Create `erp_integration_log` table
4. Add indexes

### Phase 2: Data Migration (If Existing Orders)

1. Map existing `orders` table data to `erp_invoices` (if applicable)
2. Backfill `erp_invoice_details` from existing `order_items` or `items` JSONB

### Phase 3: Update Application

1. Update API endpoint to write to new tables
2. Keep existing `orders` table for ecommerce orders (separate from ERP invoices)

---

## COMPATIBILITY NOTES

### ERP Contract Compatibility

✅ **All Required Fields Stored** - Every field from JSON payload has corresponding database column  
✅ **Field Names Preserved** - Exact ERP field names maintained (with SQL snake_case convention)  
✅ **Data Types Match** - Database types support ERP data types without loss  
✅ **Structure Preserved** - JSON arrays stored as JSONB, maintaining structure  

### Future ERP Changes

**Handled Gracefully:**
- Additional `customFields` items → JSONB allows flexible array length
- New `status` codes → INTEGER column supports any numeric value
- Non-empty `retailer_external_id` → TEXT column already supports it
- Non-empty `remarks` → TEXT column already supports it
- New fields in `details` → Can add columns or store in JSONB extension

**Monitoring Needed:**
- Log unknown fields for review
- Alert if payload structure changes significantly
- Regular reconciliation with ERP data

---

## RECOMMENDATIONS

1. **Use JSONB for `custom_fields`** - Simpler than normalization, supports querying
2. **Store raw `erp_payload`** - Essential for troubleshooting and reconciliation
3. **Add calculated fields (`total`, `line_total`)** - Convenience for queries, but recalculate from source if needed
4. **Index `erp_invoice_number`** - Most critical for duplicate prevention
5. **Separate ERP invoices from ecommerce orders** - Keep `orders` table for direct ecommerce sales, `erp_invoices` for ERP integration

---

**END OF SCHEMA PROPOSAL**

