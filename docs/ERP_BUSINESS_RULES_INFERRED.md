# ERP JSON Payload - Implied Business Rules

**Analysis Date:** 2025-01-27  
**Source:** Data patterns observed in `docs/API_INTEGRATION.md`  
**Method:** Statistical inference from payload samples  
**Status:** **INFERRED ONLY** - Rules derived from data patterns, not ERP documentation

---

## IMPORTANT DISCLAIMER

These rules are **INFERRED** from observed data patterns. They are **NOT** official ERP specifications.

**Rules marked as INFERRED** are strongly suggested by the data but may not be authoritative.  
**Rules marked as OBSERVED** are confirmed patterns from all samples reviewed.

---

## 1. FIELD REQUIREMENTS

### Required Fields (Always Present)

| Field | Evidence | Confidence |
|-------|----------|------------|
| `retailer_br_id` | Present in 100% of samples | **HIGH** - OBSERVED |
| `erp_invoice_number` | Present in 100% of samples | **HIGH** - OBSERVED |
| `invoice_date` | Present in 100% of samples | **HIGH** - OBSERVED |
| `status` | Present in 100% of samples | **HIGH** - OBSERVED |
| `remarks` | Present in 100% of samples (but always `""`) | **HIGH** - OBSERVED |
| `retailer_external_id` | Present in 100% of samples (but always `""`) | **HIGH** - OBSERVED |
| `customFields` | Present in 100% of samples | **HIGH** - OBSERVED |
| `details` | Present in 100% of samples, never empty | **HIGH** - OBSERVED |
| `sku_external_id` | Present in 100% of detail items | **HIGH** - OBSERVED |
| `quantity` | Present in 100% of detail items | **HIGH** - OBSERVED |
| `sku_uom` | Present in 100% of detail items | **HIGH** - OBSERVED |
| `price_per_item` | Present in 100% of detail items | **HIGH** - OBSERVED |
| `discount_value` | Present in 100% of detail items | **HIGH** - OBSERVED |

### Potentially Optional Fields (Always Present but May Be Empty)

| Field | Evidence | Inference |
|-------|----------|-----------|
| `retailer_external_id` | Always empty string `""` in all samples | **INFERRED:** Field exists but may not be populated. Unknown if non-empty values are valid. |
| `remarks` | Always empty string `""` in all samples | **INFERRED:** Field exists for free-text notes but may be unused in current workflow. |
| `customFields[1].id` | Always empty string `""` | **OBSERVED:** Placeholder field, always empty. |
| `customFields[1].value` | Always empty string `""` | **OBSERVED:** Placeholder field, always empty. |
| `customFields[2].id` | Always empty string `""` | **OBSERVED:** Placeholder field, always empty. |
| `customFields[2].value` | Always empty string `""` | **OBSERVED:** Placeholder field, always empty. |

---

## 2. UNIQUENESS CONSTRAINTS

### Invoice-Level Uniqueness

| Field | Evidence | Inference |
|-------|----------|-----------|
| `erp_invoice_number` | All observed values are distinct (e.g., "S56723", "S56721", "S56722", "S56715") | **STRONGLY INFERRED:** `erp_invoice_number` must be unique per invoice. This is the **primary deduplication key**. |
| `retailer_br_id` | Multiple invoices can share the same retailer_br_id | **OBSERVED:** Not unique - same retailer can have multiple invoices. |

### Line Item-Level Uniqueness

| Field | Evidence | Inference |
|-------|----------|-----------|
| `sku_external_id` within `details` array | Same SKU can appear multiple times in one invoice (not observed in samples, but not prevented by structure) | **INFERRED:** No uniqueness constraint on `sku_external_id` within an invoice's `details` array. Same SKU can appear on multiple line items. |

**Example Pattern (Not Observed, But Structurally Possible):**
```json
"details": [
  {"sku_external_id": "000005011200208450", "quantity": "6", ...},
  {"sku_external_id": "000005011200208450", "quantity": "4", ...}
]
```

---

## 3. FORMAT CONSTRAINTS

### Date Formats

| Field | Format Observed | Evidence | Inference |
|-------|----------------|----------|-----------|
| `invoice_date` | `YYYY-MM-DD` (e.g., "2025-10-14") | 100% consistency across all samples | **STRONGLY INFERRED:** Must follow ISO 8601 date format (YYYY-MM-DD). Not datetime, date only. |

**Examples:**
- ✅ `"2025-10-14"` (valid)
- ❌ `"2025/10/14"` (not observed)
- ❌ `"2025-10-14T00:00:00"` (not observed)
- ❌ `"14-10-2025"` (not observed)

### Decimal Precision

| Field | Precision Observed | Evidence | Inference |
|-------|-------------------|----------|-----------|
| `price_per_item` | 4 decimal places | All samples show exactly 4 decimal places (e.g., `23.7946`, `168.4821`, `0.4821`) | **STRONGLY INFERRED:** Must support minimum 4 decimal places. Values may have trailing zeros (`0.0000`). |
| `discount_value` | 4 decimal places | All samples show exactly 4 decimal places (all `0.0000` in samples) | **STRONGLY INFERRED:** Must support minimum 4 decimal places. Format consistent with `price_per_item`. |

**Examples:**
- ✅ `23.7946` (4 decimals)
- ✅ `168.4821` (4 decimals)
- ✅ `0.0000` (4 decimals with trailing zeros)
- ❓ `23.79` (2 decimals - not observed)

### ID Format Constraints

| Field | Format Pattern | Evidence | Inference |
|-------|---------------|----------|-----------|
| `erp_invoice_number` | Alphanumeric string starting with "S" followed by digits | Pattern: "S" + 5 digits (e.g., "S56723", "S56721") | **INFERRED:** Format appears to be "S" prefix + numeric suffix. Minimum 6 characters observed. **Unknown if other formats valid.** |
| `sku_external_id` | Numeric string, 15-18 characters, leading zeros | Pattern: Always numeric characters, variable length (15-18 chars), preserves leading zeros | **STRONGLY INFERRED:** Must be numeric string (not number). Leading zeros are significant. Length 15-18 characters typical. |
| `retailer_br_id` | Positive integer, 7-8 digits | Pattern: All values are positive integers (e.g., 15750504, 16004069) | **INFERRED:** Must be positive integer. Range observed: 7-8 digits. **Unknown if negative or zero valid.** |

**SKU ID Examples:**
- ✅ `"000005015151498522"` (18 chars, leading zeros)
- ✅ `"000005011200208450"` (18 chars)
- ✅ `"000000501318020049"` (18 chars)
- ❌ `5015151498522` (missing leading zeros - would be invalid)

---

## 4. ARRAY RULES

### `details` Array

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Minimum length: 1** | All samples have at least 1 item | **OBSERVED:** Must contain at least 1 line item. |
| **Maximum length: Unknown** | Observed range: 1-23+ items per invoice | **INFERRED:** No maximum length confirmed. Observed maximum ~23 items, but no structural limit apparent. |
| **Cannot be empty** | No empty arrays observed | **STRONGLY INFERRED:** `details` array must have `length > 0`. |
| **Order matters** | Items processed sequentially | **UNKNOWN:** Whether order is significant or arbitrary. Structure suggests order may be preserved for display. |

**Observed Length Range:**
- Minimum: 1 item (single-line invoices observed)
- Maximum: 23+ items (invoice S56717 has 23 line items observed)
- Typical: 3-11 items

### `customFields` Array

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Fixed length: 3** | All samples have exactly 3 items | **STRONGLY OBSERVED:** Must always contain exactly 3 items. Never more, never less. |
| **First item populated** | `customFields[0].id` always `"1128"`, `customFields[0].value` contains name | **OBSERVED:** First item always has `id: "1128"` and non-empty `value` (name). |
| **Other items empty** | `customFields[1]` and `customFields[2]` always `{"id": "", "value": ""}` | **OBSERVED:** Last 2 items always empty placeholders. |

**Pattern:**
```json
"customFields": [
  {"id": "1128", "value": "ALJON YU"},  // Always populated
  {"id": "", "value": ""},               // Always empty
  {"id": "", "value": ""}                // Always empty
]
```

---

## 5. QUANTITY RULES

### `quantity` Field

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Type: string** | All values are string type, not number | **OBSERVED:** Must be string type (e.g., `"12"`, `"6"`), not number. |
| **Format: numeric string** | All values are numeric characters only | **STRONGLY INFERRED:** Must be numeric string (digits only, no decimals observed). |
| **Must be positive** | All observed values are positive integers (1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 24, 32) | **STRONGLY INFERRED:** Must be positive integer. No zero, negative, or decimal values observed. |
| **Range: 1 to ~32+** | Observed range: 1-32+ | **INFERRED:** Minimum value appears to be 1. Maximum unknown but observed up to 32. **Unknown if higher values valid.** |
| **No leading zeros** | All values are canonical (e.g., `"12"` not `"012"`) | **OBSERVED:** Values are canonical numeric strings (no leading zeros). |

**Observed Values:**
- Minimum: `"1"` (observed)
- Maximum: `"32"` (observed)
- Common values: `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"8"`, `"9"`, `"10"`, `"12"`, `"24"`, `"32"`

**Examples:**
- ✅ `"12"` (valid)
- ✅ `"1"` (valid)
- ✅ `"32"` (valid)
- ❓ `"0"` (not observed - unknown if valid)
- ❓ `"-5"` (not observed - likely invalid)
- ❓ `"12.5"` (not observed - likely invalid)

---

## 6. PRICING RULES

### `price_per_item` Field

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Type: number** | All values are number type | **OBSERVED:** Must be number type, not string. |
| **Precision: 4 decimals** | All values have exactly 4 decimal places | **STRONGLY INFERRED:** Must support minimum 4 decimal places. Values formatted to 4 decimals. |
| **Must be positive** | All observed values are positive | **STRONGLY INFERRED:** Must be positive number. No zero or negative values observed. **Unknown if zero valid.** |
| **Range: ~8.48 to ~421.77** | Observed range in samples | **INFERRED:** Typical range observed. **Unknown if wider range valid.** No structural maximum apparent. |

**Observed Price Range:**
- Minimum: `8.4821` (observed)
- Maximum: `421.7679` (observed)
- Typical: 23-185 PHP range

### `discount_value` Field

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Type: number** | All values are number type | **OBSERVED:** Must be number type, not string. |
| **Precision: 4 decimals** | All values show 4 decimal places (`0.0000`) | **STRONGLY INFERRED:** Must support minimum 4 decimal places, same as `price_per_item`. |
| **Current value: always 0.0000** | All samples show `0.0000` | **OBSERVED:** All samples have no discount. **Unknown if non-zero values valid or how they're calculated.** |
| **Range: 0.0000+** | No negative or > price values observed | **INFERRED:** Likely must be non-negative. **Unknown if can exceed line total.** |

**Critical Unknown:**
- If `discount_value > 0`, is it:
  - Per-unit discount? (deduct from `price_per_item`)
  - Per-line-total discount? (deduct from `quantity * price_per_item`)
  - Percentage? (unlikely, since it's absolute value)

---

## 7. UOM (UNIT OF MEASURE) RULES

### `sku_uom` Field

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Type: string** | All values are string type | **OBSERVED:** Must be string type. |
| **Known values: 6 types observed** | PC, PCK, TIN, SET, BDL, BAG | **INFERRED:** Valid UOM codes appear limited. **Unknown if other values valid.** |
| **Case-sensitive: UPPERCASE** | All values are uppercase (e.g., "PC", "PCK") | **STRONGLY INFERRED:** Must be uppercase. Lowercase values not observed. |
| **Length: 2-3 characters** | All observed values are 2-3 chars | **INFERRED:** Typical length 2-3 characters. **Unknown if longer values valid.** |
| **Required per line item** | Present in 100% of detail items | **OBSERVED:** Must be present for every line item. |

**Observed UOM Values:**
1. `"PC"` - Piece (most common)
2. `"PCK"` - Pack (very common)
3. `"TIN"` - Tin/Can
4. `"SET"` - Set
5. `"BDL"` - Bundle
6. `"BAG"` - Bag (observed once)

**Frequency (estimated):**
- `"PC"` - ~40% of items
- `"PCK"` - ~45% of items
- `"TIN"` - ~10% of items
- `"SET"`, `"BDL"`, `"BAG"` - <5% combined

**Examples:**
- ✅ `"PC"` (valid)
- ✅ `"PCK"` (valid)
- ❓ `"pc"` (lowercase - not observed, likely invalid)
- ❓ `"PIECE"` (full word - not observed, likely invalid)
- ❓ `"KG"` (not observed - unknown if valid)

---

## 8. STATUS RULES

### `status` Field

| Rule | Evidence | Inference |
|------|----------|-----------|
| **Type: number** | All values are number type | **OBSERVED:** Must be number type, not string. |
| **Observed value: 1** | 100% of samples show `status: 1` | **OBSERVED:** Only value `1` observed in all samples. |
| **Meaning: Unknown** | No documentation available | **UNKNOWN:** Meaning of status `1` is unclear. Could be: Active, Pending, Confirmed, New. |
| **Other statuses: Unknown** | No other values observed | **UNKNOWN:** Whether other status codes exist (0, 2, 3, etc.) and their meanings. |

**Inference:**
- Status `1` likely represents: **Active**, **Pending**, **Confirmed**, or **New** invoice state.
- Other statuses (if they exist) might represent: **Cancelled** (0 or -1), **Completed** (2), **Voided** (3), etc.

**Recommendation:** Confirm with ERP team what status codes exist and their meanings.

---

## 9. CALCULATION RULES (INFERRED)

### Line Item Total Calculation

**INFERRED Rule:**
```
line_total = (quantity * price_per_item) - discount_value
```

**Evidence:**
- `quantity` is per-unit count
- `price_per_item` is unit price
- `discount_value` is absolute discount amount (not percentage)

**Example:**
```json
{
  "quantity": "12",
  "price_per_item": 23.7946,
  "discount_value": 0.0000
}
```
Line total = `(12 * 23.7946) - 0.0000` = `285.5352`

### Invoice Total Calculation

**INFERRED Rule:**
```
invoice_total = SUM(all line_item_totals)
```

**Evidence:**
- Invoice structure has `details` array with multiple line items
- No invoice-level discount field observed
- Each line item has its own `discount_value`

**Note:** Total is not explicitly provided in payload. Must be calculated from line items.

---

## 10. DATA INTEGRITY RULES (INFERRED)

### Invoice Number Uniqueness

**STRONGLY INFERRED:**
- `erp_invoice_number` must be unique across all invoices
- Duplicate invoice numbers indicate duplicate processing

**Evidence:**
- All observed invoice numbers are distinct
- Response structure includes `external_id` (echo of `erp_invoice_number`) for correlation

### Retailer Reference

**INFERRED:**
- `retailer_br_id` must reference a valid retailer in ERP master data
- No validation rules observed (no error samples available)

### SKU Reference

**INFERRED:**
- `sku_external_id` must reference a valid SKU in ERP product master
- Format preserves leading zeros (critical for matching)

---

## 11. SUMMARY OF INFERRED RULES

### Strongly Inferred (High Confidence)

1. ✅ `erp_invoice_number` must be unique (deduplication key)
2. ✅ `invoice_date` must be `YYYY-MM-DD` format
3. ✅ `quantity` must be positive numeric string (integer)
4. ✅ `price_per_item` and `discount_value` must have 4 decimal precision
5. ✅ `sku_external_id` must be numeric string (preserve leading zeros)
6. ✅ `customFields` must have exactly 3 items
7. ✅ `details` must have at least 1 item (non-empty array)
8. ✅ `sku_uom` must be uppercase string (2-3 chars, known values: PC, PCK, TIN, SET, BDL, BAG)

### Moderately Inferred (Medium Confidence)

1. ⚠️ `quantity` minimum is 1, maximum unknown
2. ⚠️ `price_per_item` must be positive (zero not observed)
3. ⚠️ `discount_value` must be non-negative (can be > 0, calculation method unknown)
4. ⚠️ Line item total = `(quantity * price_per_item) - discount_value`

### Weakly Inferred (Low Confidence / Unknown)

1. ❓ `status` values other than `1` (existence and meanings unknown)
2. ❓ `retailer_external_id` can be non-empty (always empty in samples)
3. ❓ `remarks` can be non-empty (always empty in samples)
4. ❓ Maximum `details` array length (no limit observed)
5. ❓ Same `sku_external_id` can appear multiple times in one invoice's `details`

---

## 12. VALIDATION RECOMMENDATIONS

Based on inferred rules, validation should check:

### Required Field Validation
- All required fields present
- `details` array non-empty
- `customFields` array has exactly 3 items

### Format Validation
- `invoice_date` matches `YYYY-MM-DD` regex: `^\d{4}-\d{2}-\d{2}$`
- `quantity` is numeric string: `^\d+$` (positive integers)
- `erp_invoice_number` is non-empty string
- `sku_external_id` is numeric string (15-18 chars typical)

### Type Validation
- `retailer_br_id` is number
- `status` is number
- `price_per_item` is number
- `discount_value` is number
- `quantity` is string (not number)
- `sku_uom` is string

### Value Range Validation
- `quantity` > 0 (positive integer)
- `price_per_item` > 0 (positive number)
- `discount_value` >= 0 (non-negative)

### Uniqueness Validation
- `erp_invoice_number` not already exists (deduplication)

### UOM Validation
- `sku_uom` is one of: "PC", "PCK", "TIN", "SET", "BDL", "BAG" (or allow any uppercase 2-3 char string if other values possible)

---

## 13. RISKS & GAPS

### High Risk Gaps
1. **Status codes unknown** - Only `1` observed. Other statuses may exist.
2. **Discount calculation unknown** - No samples with `discount_value > 0`.
3. **Empty field behavior unknown** - `retailer_external_id`, `remarks` always empty. Can they be populated?

### Medium Risk Gaps
1. **UOM validation** - Only 6 values observed. Others may be valid.
2. **Quantity maximum** - Only observed up to 32. Higher values may be valid.
3. **Invoice number format** - Only "S" + digits observed. Other formats may be valid.

### Low Risk Gaps
1. **Line item maximum** - Observed up to 23 items. Higher may be valid.
2. **Price range** - Observed 8-422 range. Wider range may be valid.

---

**END OF INFERRED RULES ANALYSIS**

