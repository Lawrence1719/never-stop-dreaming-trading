# ERP JSON Payload - Conceptual Model Analysis

**Analysis Date:** 2025-01-27  
**Purpose:** Understand the ERP invoice/order payload structure before implementation  
**Contract Status:** READ-ONLY - Must preserve exact structure

---

## Document Overview

This document analyzes the JSON payload structure received from the Legacy ERP system. The payload represents **invoice/order data** that flows from the ERP (source of truth) to this ecommerce system.

**Payload Format:** Array of Invoice objects  
**Response Format:** HTTP response with success/error structure

---

## ENTITIES IDENTIFIED

### 1. **Invoice** (Root Entity)

**Business Meaning:** Represents a sales invoice/order issued by the ERP system to a retailer. This is the primary transaction record that mirrors invoices from the Windows ERP, Android apps, and BeatRoute ecosystem.

**Structure:**
```json
{
  "retailer_br_id": number,
  "retailer_external_id": string,
  "erp_invoice_number": string,
  "invoice_date": string (YYYY-MM-DD),
  "status": number,
  "remarks": string,
  "customFields": array<CustomField>,
  "details": array<InvoiceDetail>
}
```

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `retailer_br_id` | `number` | **YES** | Retailer's internal BR ID in ERP (e.g., 15750504). This appears to be the primary retailer identifier. |
| `retailer_external_id` | `string` | **PARTIAL** | External identifier for retailer. **OBSERVED:** Always empty string `""` in all samples. May be reserved for future use or specific retailer types. |
| `erp_invoice_number` | `string` | **YES** | Unique invoice number from ERP (e.g., "S56723"). This is the **primary key for deduplication**. Format appears to be alphanumeric. |
| `invoice_date` | `string` | **YES** | Invoice date in ISO format: `YYYY-MM-DD` (e.g., "2025-10-14"). **NOTE:** Date format is consistently this format. |
| `status` | `number` | **YES** | Invoice status code. **OBSERVED:** Always `1` in all samples. Status meaning unclear without ERP documentation. Likely represents active/pending state. |
| `remarks` | `string` | **PARTIAL** | Free-text remarks/notes. **OBSERVED:** Always empty string `""` in all samples. Optional but always present. |
| `customFields` | `array<CustomField>` | **YES** | Array of custom metadata fields. Always present, typically contains 3 items with first populated. |
| `details` | `array<InvoiceDetail>` | **YES** | Line items/products in the invoice. Must have at least 1 item. |

**Key Observations:**
- Payload is always an **array** (even single invoice: `[{...}]`)
- `retailer_br_id` is numeric and likely represents internal ERP retailer master data
- `erp_invoice_number` is the unique business identifier (not database ID)
- `invoice_date` uses `YYYY-MM-DD` format (not ISO datetime)

---

### 2. **InvoiceDetail** (Child Entity)

**Business Meaning:** Represents a single line item in an invoice - a product/SKU ordered by quantity with pricing and discount information.

**Relationship to Invoice:** **N:1** (Many InvoiceDetails belong to One Invoice)

**Structure:**
```json
{
  "sku_external_id": string,
  "quantity": string,
  "sku_uom": string,
  "price_per_item": number,
  "discount_value": number
}
```

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sku_external_id` | `string` | **YES** | Product SKU identifier in ERP. Format appears to be numeric string (e.g., "000005015151498522"). **Length varies:** 15-18 characters observed. **CRITICAL:** This is the product identifier - must be preserved exactly. |
| `quantity` | `string` | **YES** | Quantity ordered. **IMPORTANT:** Type is `string` not `number` (e.g., "12", "6", "9"). Always numeric characters but as string. **RISK:** Requires parsing to numeric for calculations. |
| `sku_uom` | `string` | **YES** | Unit of Measure (UOM). **Observed values:** "PC" (Piece), "PCK" (Pack), "TIN", "SET", "BDL" (Bundle). UOM is critical for inventory management. |
| `price_per_item` | `number` | **YES** | Unit price per item. Decimal precision: typically 4 decimal places (e.g., 23.7946, 168.4821). **ERP controls pricing** - this is authoritative. |
| `discount_value` | `number` | **YES** | Discount amount applied to this line item. **OBSERVED:** Always `0.0000` in all samples. Decimal precision: 4 places. May be non-zero in actual discounts. |

**Key Observations:**
- `quantity` is string type - must convert for math operations
- `sku_external_id` format is consistent but numeric strings (leading zeros matter)
- `price_per_item` has 4 decimal precision (likely currency in PHP/currency format)
- `discount_value` field exists but always 0.0000 in samples (structure supports discounts)

---

### 3. **CustomField** (Child Entity)

**Business Meaning:** Extensible metadata fields attached to invoices. Used for storing additional business context (e.g., salesperson name, route identifier).

**Relationship to Invoice:** **N:1** (Many CustomFields belong to One Invoice)

**Structure:**
```json
{
  "id": string,
  "value": string
}
```

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | **YES** | Custom field identifier. **OBSERVED:** First item always has `"1128"`, others are empty `""`. Field ID `"1128"` appears to have business meaning (possibly salesperson or route). |
| `value` | `string` | **YES** | Custom field value. **OBSERVED:** First item contains names like "ALJON YU", "BK-GLENDA SARMIENTO", "MARK EVANN DOMINGO". Others are empty `""`. |

**Pattern Observed:**
```json
[
  {"id": "1128", "value": "ALJON YU"},
  {"id": "", "value": ""},
  {"id": "", "value": ""}
]
```

**Key Observations:**
- Array always has **3 items** (consistent structure)
- First item typically populated with `id: "1128"` and a name value
- Remaining 2 items are placeholders (empty strings)
- `"1128"` likely represents a specific custom field type in ERP (e.g., salesperson/route)

---

## API RESPONSE STRUCTURE

The ERP system returns a response after processing:

**Response Format:**
```json
{
  "success": boolean,
  "data": array<InvoiceResponse>,
  "status": number (HTTP status code)
}
```

### 4. **InvoiceResponse** (Response Entity)

**Business Meaning:** Confirmation/result of invoice processing, containing the created record's identifiers.

**Structure:**
```json
{
  "success": boolean,
  "br_id": number,
  "external_id": string,
  "message": string
}
```

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `success` | `boolean` | Processing success flag |
| `br_id` | `number` | Internal database ID assigned by ecommerce system (e.g., 84418668). **Different from `retailer_br_id`.** |
| `external_id` | `string` | Echo of `erp_invoice_number` from request |
| `message` | `string` | Response message (e.g., "Success") |

**Key Observations:**
- `br_id` is the **ecommerce system's internal ID** (not ERP's retailer_br_id)
- `external_id` maps back to `erp_invoice_number` for correlation

---

## ENTITY RELATIONSHIPS

```
Invoice (1) ──< (N) InvoiceDetail
  │
  └──< (N) CustomField

Invoice → InvoiceResponse (after processing)
```

**Cardinality:**
- **Invoice 1:N InvoiceDetail** - One invoice has many line items
- **Invoice 1:N CustomField** - One invoice has multiple custom fields (fixed at 3 items)
- **Invoice → InvoiceResponse** - One-to-one mapping after processing (request→response)

---

## OPTIONAL FIELDS & EDGE CASES

### Potentially Optional (Always Present but Empty):
1. **`retailer_external_id`** - Always `""` in samples. May be optional for some retailer types.
2. **`remarks`** - Always `""` in samples. Field exists for future use.
3. **`customFields[1]` and `customFields[2]`** - Always `{"id": "", "value": ""}`. Placeholders for extensibility.

### Unstable/Unclear Fields:
1. **`status`** - Only value `1` observed. Other status codes unknown without ERP docs.
   - **RISK:** Unknown behavior if status != 1
   - **RECOMMENDATION:** Document valid status codes with ERP team

2. **`quantity` as string** - Numeric content but string type.
   - **RISK:** Must parse before calculations
   - **RISK:** Could theoretically contain non-numeric if ERP sends invalid data

3. **`discount_value`** - Always `0.0000` in samples.
   - **RISK:** Discount logic not tested in samples
   - **QUESTION:** Is discount per-item or per-line-total?

4. **`sku_external_id` format** - Variable length (15-18 chars), numeric string.
   - **RISK:** Leading zeros significant (e.g., "000005015151498522" vs "5015151498522")
   - **CRITICAL:** Must preserve as string, not convert to number

5. **`sku_uom` values** - Limited set observed: "PC", "PCK", "TIN", "SET", "BDL".
   - **RISK:** Unknown UOM values possible
   - **RECOMMENDATION:** Validate against known UOM list or allow any string

---

## BUSINESS RULES (Inferred)

### Conservative Inferences:
1. **Deduplication:** `erp_invoice_number` must be unique per invoice. Duplicate invoice numbers indicate duplicate orders.
2. **Pricing Authority:** ERP controls all pricing via `price_per_item`. Ecommerce system should not recalculate or override.
3. **Quantity Handling:** `quantity` is string but represents numeric value. Conversion needed for calculations.
4. **Date Format:** All dates in `YYYY-MM-DD` format (ISO date, not datetime).
5. **Custom Fields:** Field ID `"1128"` appears to represent a specific business concept (likely salesperson/route based on name values).

### Questions Requiring Confirmation:
1. What do status codes mean? (Only `1` observed)
2. Can `retailer_external_id` ever be non-empty?
3. Can `remarks` contain actual text?
4. What happens if `discount_value` > 0? (Discount calculation method)
5. Are there other `customFields[].id` values besides `"1128"`?
6. What is the maximum `details` array length?
7. Can the same `sku_external_id` appear multiple times in one invoice's `details` array?

---

## RISKS & WARNINGS

### HIGH RISK:
1. **Data Type Mismatch:** `quantity` as string requires parsing for calculations. Risk of type confusion.
2. **SKU ID Leading Zeros:** Converting `sku_external_id` to number would lose leading zeros. Must remain string.
3. **Status Code Unknown:** Only `status: 1` observed. Unknown behavior for other statuses.

### MEDIUM RISK:
1. **Discount Logic:** No samples with `discount_value > 0`. Calculation method unclear.
2. **Empty Fields:** Many fields always empty. Unclear if they can ever be populated.
3. **Custom Field Semantics:** Only one custom field ID (`"1128"`) observed. Other IDs unknown.

### LOW RISK:
1. **Array Length:** `customFields` always exactly 3 items. `details` variable length (1+ items).
2. **Date Format:** Consistent `YYYY-MM-DD` format observed.

---

## DATA TYPE SUMMARY

| Field | ERP Type | Ecommerce Should Store As |
|-------|----------|---------------------------|
| `retailer_br_id` | `number` | `number` or `bigint` |
| `retailer_external_id` | `string` | `string` (nullable/empty) |
| `erp_invoice_number` | `string` | `string` (unique, indexed) |
| `invoice_date` | `string` | `date` or `string` (preserve format) |
| `status` | `number` | `number` or `enum` |
| `remarks` | `string` | `string` (nullable/empty) |
| `sku_external_id` | `string` | `string` (DO NOT convert to number) |
| `quantity` | `string` | Parse to `number` for storage/calculations |
| `sku_uom` | `string` | `string` |
| `price_per_item` | `number` | `decimal` (4+ precision) |
| `discount_value` | `number` | `decimal` (4+ precision) |

---

## INTEGRATION CONSIDERATIONS

### For Ecommerce System:
1. **Mirror, Don't Transform:** Store ERP data as received (with type conversions only where necessary).
2. **Deduplication:** Use `erp_invoice_number` as unique constraint to prevent double-processing.
3. **Preserve Pricing:** Never recalculate `price_per_item` - ERP is authoritative.
4. **Stock Sync Risk:** Invoice creation may need to trigger stock updates. Avoid double-counting if ERP also maintains stock.
5. **Custom Fields:** Store `customFields` array as-is (JSONB) for future extensibility.

### Questions for ERP Team:
1. What status codes exist and their meanings?
2. Can `retailer_external_id` be populated? When?
3. What does custom field ID `"1128"` represent?
4. How is `discount_value` calculated when > 0?
5. Are invoices ever updated/amended after initial creation?

---

## NEXT STEPS

1. ✅ **Analysis Complete** - Models identified and documented
2. ⏳ **Await Confirmation** - Review this analysis before implementation
3. ⏳ **Schema Design** - Design database schema to mirror these models
4. ⏳ **API Implementation** - Build endpoint to receive and process payloads
5. ⏳ **Validation Logic** - Implement validation preserving ERP structure

---

**END OF ANALYSIS**




