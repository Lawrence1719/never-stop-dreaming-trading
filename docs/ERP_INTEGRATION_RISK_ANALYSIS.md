# ERP Integration Risk Analysis

**Analysis Date:** 2025-01-27  
**Integration:** Legacy ERP → Ecommerce Backend  
**Risk Level:** **HIGH** - Production system with dual data sources  
**Status:** Pre-implementation risk assessment

---

## EXECUTIVE SUMMARY

This document identifies **critical risks** in integrating the Legacy ERP JSON payload contract into the ecommerce backend. The integration involves:

- **Source of Truth:** Legacy ERP (Windows ERP, Android apps, BeatRoute)
- **Target System:** Ecommerce backend (Next.js/Supabase)
- **Data Flow:** ERP → Ecommerce (one-way, invoice/order data)
- **Critical Concern:** Dual systems managing inventory/orders (ERP + Ecommerce)

**Top 5 Critical Risks:**
1. 🔴 **Stock Synchronization Conflicts** - Both systems may update inventory
2. 🔴 **Data Type Mismatches** - String numbers, decimal precision issues
3. 🔴 **Race Conditions** - Concurrent updates from ERP and ecommerce
4. 🟡 **Missing Field Handling** - Current implementation ignores `status`, `sku_uom`, `customFields`
5. 🟡 **Batch Processing Failures** - Partial success scenarios not handled

---

## 1. DATA TYPE MISMATCHES

### 1.1 Quantity as String (CRITICAL)

**Risk:** `quantity` is string type (`"12"`) but code converts to number

**Current Implementation:**
```typescript
quantity: typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity
```

**Risks:**
- ❌ **Loss of precision:** `parseInt("12.5")` → `12` (decimal quantities lost)
- ❌ **Invalid input:** `parseInt("abc")` → `NaN` (not validated)
- ❌ **Leading zeros:** `parseInt("012")` → `12` (may be intentional in ERP)
- ❌ **Type confusion:** Interface allows `string | number` but ERP always sends string

**Impact:** **HIGH** - Incorrect order quantities, financial discrepancies

**Mitigation:**
```typescript
// Validate quantity is numeric string
if (typeof detail.quantity !== 'string' || !/^\d+$/.test(detail.quantity)) {
  return { valid: false, error: 'quantity must be numeric string' };
}
const quantity = parseInt(detail.quantity, 10);
if (isNaN(quantity) || quantity <= 0) {
  return { valid: false, error: 'quantity must be positive integer' };
}
```

---

### 1.2 Decimal Precision Loss (HIGH)

**Risk:** `price_per_item` and `discount_value` have 4 decimal places, but database may truncate

**Current Implementation:**
```typescript
total: parseFloat(total.toFixed(2))  // ❌ Truncates to 2 decimals
```

**Risks:**
- ❌ **Precision loss:** ERP sends `23.7946`, stored as `23.79` (loss of `0.0046` per unit)
- ❌ **Accumulation error:** Over many line items, rounding errors compound
- ❌ **Financial discrepancy:** Invoice totals don't match ERP calculations

**Database Schema:**
```sql
total NUMERIC(10,2)  -- Only 2 decimal places!
```

**Impact:** **HIGH** - Financial discrepancies, audit trail issues

**Mitigation:**
- Change database column to `NUMERIC(12,4)` for prices/totals
- Store `price_per_item` and `discount_value` with 4 decimal precision
- Calculate totals with 4 decimals, round only for display

---

### 1.3 SKU ID Leading Zeros (CRITICAL)

**Risk:** `sku_external_id` is numeric string with leading zeros (e.g., `"000005015151498522"`)

**Current Implementation:**
```typescript
sku_external_id: detail.sku_external_id  // ✅ Preserved as string
```

**Risks:**
- ❌ **Conversion to number:** `Number("000005015151498522")` → `5015151498522` (zeros lost)
- ❌ **Database type mismatch:** If stored as `INTEGER` or `BIGINT`, leading zeros lost
- ❌ **Product lookup failures:** SKU matching fails if zeros stripped

**Impact:** **CRITICAL** - Product matching failures, wrong products in orders

**Mitigation:**
- ✅ **Current:** Stored as string (correct)
- Ensure database column is `TEXT` or `VARCHAR`, never numeric
- Validate SKU format: `^\d{15,18}$` (numeric string, 15-18 chars)

---

### 1.4 Date Format Parsing (MEDIUM)

**Risk:** `invoice_date` is string `"YYYY-MM-DD"` but may be parsed incorrectly

**Current Implementation:**
```typescript
invoice_date: orderData.invoice_date  // Stored as string
```

**Risks:**
- ❌ **Invalid dates:** `"2025-13-45"` (not validated)
- ❌ **Timezone issues:** Date stored as string, no timezone handling
- ❌ **Future dates:** `"2025-10-14"` (may be valid or error)

**Impact:** **MEDIUM** - Date-based queries may fail, sorting issues

**Mitigation:**
```typescript
// Validate date format
if (!/^\d{4}-\d{2}-\d{2}$/.test(orderData.invoice_date)) {
  return { valid: false, error: 'invoice_date must be YYYY-MM-DD format' };
}
// Validate date is valid
const date = new Date(orderData.invoice_date + 'T00:00:00Z');
if (isNaN(date.getTime())) {
  return { valid: false, error: 'invoice_date is not a valid date' };
}
```

---

## 2. MISSING FIELD ISSUES

### 2.1 Missing Required Fields in Current Implementation (HIGH)

**Current Implementation Missing:**

| ERP Field | Current Status | Risk |
|-----------|---------------|------|
| `status` | ❌ **NOT STORED** | Cannot track invoice status from ERP |
| `sku_uom` | ❌ **NOT STORED** | Cannot handle unit conversions (PC vs PCK) |
| `customFields` | ❌ **NOT STORED** | Loses metadata (salesperson, route info) |
| `remarks` | ❌ **NOT STORED** | Loses order notes/comments |
| `retailer_external_id` | ❌ **NOT STORED** | Loses alternative retailer identifier |

**Impact:** **HIGH** - Data loss, incomplete order records, cannot replicate ERP state

**Mitigation:**
- Add all ERP fields to database schema
- Store `status` as number (not ecommerce status enum)
- Store `sku_uom` for inventory management
- Store `customFields` as JSONB for extensibility
- Store `remarks` as text (nullable)

---

### 2.2 Optional Fields Always Present (MEDIUM)

**Risk:** Fields like `retailer_external_id` and `remarks` always empty but may be populated in future

**Current Behavior:**
- Code doesn't validate these fields
- Database may not have columns

**Impact:** **MEDIUM** - Future ERP updates may send data that's ignored

**Mitigation:**
- Add nullable columns for all optional fields
- Validate but allow empty/null values
- Log warnings if non-empty values received (for monitoring)

---

### 2.3 Array Length Validation (MEDIUM)

**Risk:** `customFields` must have exactly 3 items, but not validated

**Current Implementation:**
```typescript
// No validation for customFields array length
```

**Risks:**
- ❌ ERP sends 2 items → Missing data
- ❌ ERP sends 4 items → Extra data ignored or error
- ❌ ERP sends 0 items → Structure violation

**Impact:** **MEDIUM** - Data loss or processing errors

**Mitigation:**
```typescript
if (!Array.isArray(req.customFields) || req.customFields.length !== 3) {
  return { valid: false, error: 'customFields must be array with exactly 3 items' };
}
```

---

## 3. STOCK SYNCHRONIZATION RISKS

### 3.1 Dual Inventory Management (CRITICAL)

**Risk:** Both ERP and Ecommerce may maintain inventory counts

**Scenario:**
1. ERP creates invoice → Reduces ERP stock
2. Ecommerce receives invoice → Should reduce ecommerce stock?
3. Ecommerce also sells products → Reduces ecommerce stock
4. **Result:** Stock counts diverge

**Impact:** **CRITICAL** - Stock discrepancies, overselling, inventory reconciliation issues

**Mitigation Options:**

**Option A: ERP is Source of Truth (Recommended)**
- Ecommerce does NOT update stock from invoices
- Ecommerce queries ERP for stock levels (separate API)
- Ecommerce only manages stock for direct ecommerce sales

**Option B: Ecommerce Mirrors ERP**
- Ecommerce reduces stock when invoice received
- Risk: Double-counting if ERP already reduced stock
- Requires coordination with ERP team

**Option C: Event Sourcing**
- Store all inventory events (sales, returns, adjustments)
- Reconcile periodically with ERP
- Complex but accurate

**Recommendation:** **Option A** - Do not update stock from invoice integration. Treat invoices as historical records only.

---

### 3.2 Stock Update Race Conditions (HIGH)

**Risk:** Concurrent invoice processing and ecommerce sales update stock simultaneously

**Scenario:**
```
Time 1: Stock = 100
Time 2: ERP invoice arrives (qty: 10) → Reads stock = 100
Time 3: Ecommerce sale (qty: 5) → Reads stock = 100
Time 4: ERP updates stock = 90
Time 5: Ecommerce updates stock = 95
Result: Stock = 95 (should be 90) ❌
```

**Impact:** **HIGH** - Stock overselling, negative inventory

**Mitigation:**
- Use database transactions with row-level locking
- Use optimistic locking (version numbers)
- Use database constraints (CHECK stock >= 0)
- Separate stock management (see Option A above)

---

### 3.3 UOM Conversion Issues (HIGH)

**Risk:** `sku_uom` not stored, cannot convert between units (PC vs PCK)

**Example:**
- ERP sends: `quantity: "6"`, `sku_uom: "PCK"` (6 packs)
- Ecommerce stock: `100 PC` (100 pieces)
- **Problem:** Cannot convert PCK to PC without conversion factor

**Impact:** **HIGH** - Incorrect stock calculations, inventory mismatches

**Mitigation:**
- Store `sku_uom` in order_items table
- Maintain UOM conversion table (1 PCK = 12 PC, etc.)
- Validate UOM against known values
- Convert all stock to base unit (PC) for calculations

---

## 4. RACE CONDITIONS

### 4.1 Duplicate Invoice Processing (CRITICAL)

**Risk:** Same invoice processed twice simultaneously

**Current Implementation:**
```typescript
// Check for duplicate
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id')
  .eq('external_reference', orderData.erp_invoice_number)
  .limit(1)
  .single();

// If exists, return 409
if (existingOrder) {
  return NextResponse.json({ error: 'Duplicate order' }, { status: 409 });
}

// Create order (RACE CONDITION WINDOW HERE)
const { data: newOrder } = await supabase.from('orders').insert(...);
```

**Race Condition:**
```
Request A: Checks duplicate → None found
Request B: Checks duplicate → None found (A hasn't inserted yet)
Request A: Inserts order
Request B: Inserts order (DUPLICATE!)
```

**Impact:** **CRITICAL** - Duplicate orders, financial discrepancies, stock double-counting

**Mitigation:**
```typescript
// Use database unique constraint
ALTER TABLE orders ADD CONSTRAINT unique_erp_invoice 
  UNIQUE (external_reference);

// Use INSERT ... ON CONFLICT
const { data: newOrder, error } = await supabase
  .from('orders')
  .insert({ ... })
  .select()
  .single();

if (error?.code === '23505') {  // Unique violation
  // Order already exists, fetch it
  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('external_reference', orderData.erp_invoice_number)
    .single();
  return NextResponse.json({ 
    success: true, 
    order_id: existing.id,
    duplicate: true 
  });
}
```

---

### 4.2 Concurrent Stock Updates (HIGH)

**Risk:** Multiple invoices processed simultaneously, all read same stock level

**Scenario:**
```
Stock = 50
Invoice A (qty: 30) reads stock = 50
Invoice B (qty: 25) reads stock = 50
Invoice A updates stock = 20
Invoice B updates stock = 25 (should be -5, but constraint prevents)
```

**Impact:** **HIGH** - Stock inconsistencies, order failures

**Mitigation:**
- Use database transactions
- Use row-level locks: `SELECT ... FOR UPDATE`
- Use atomic updates: `UPDATE stock SET quantity = quantity - ? WHERE id = ?`

---

### 4.3 Batch Processing Race Conditions (MEDIUM)

**Risk:** ERP sends array of invoices `[{...}, {...}]`, processed sequentially but may overlap

**Current Implementation:**
- Processes single invoice per request
- No batch processing logic

**Risk if Batch Added:**
- Multiple invoices in one request
- Partial success scenarios
- Transaction rollback complexity

**Impact:** **MEDIUM** - Partial data, inconsistent state

**Mitigation:**
- Process invoices in transaction
- If any fails, rollback all
- Return detailed success/failure per invoice
- Implement idempotency per invoice (not per batch)

---

## 5. API RELIABILITY ISSUES

### 5.1 Batch Submission Failures (HIGH)

**Risk:** ERP sends array `[{invoice1}, {invoice2}]` but current code expects single object

**Current Implementation:**
```typescript
// Expects: { retailer_br_id, erp_invoice_number, ... }
// ERP sends: [{ retailer_br_id, erp_invoice_number, ... }]
```

**Impact:** **HIGH** - All invoices rejected, data loss

**Mitigation:**
```typescript
// Handle both single object and array
let invoices: OrderRequest[];
if (Array.isArray(body)) {
  invoices = body;
} else {
  invoices = [body];
}

// Process each invoice
const results = [];
for (const invoice of invoices) {
  try {
    const result = await processInvoice(invoice);
    results.push({ success: true, ...result });
  } catch (error) {
    results.push({ success: false, error: error.message });
  }
}

// Return batch result
return NextResponse.json({
  success: results.every(r => r.success),
  data: results
});
```

---

### 5.2 Partial Success Scenarios (HIGH)

**Risk:** Batch of 10 invoices, 3 succeed, 7 fail. How to handle?

**Current Implementation:**
- No batch processing
- Single invoice: all-or-nothing

**Impact:** **HIGH** - Data inconsistency, manual reconciliation needed

**Mitigation:**
- Process each invoice in separate transaction
- Return detailed results per invoice
- Implement retry mechanism for failed invoices
- Log all failures for manual review

---

### 5.3 Network Timeouts & Retries (MEDIUM)

**Risk:** ERP retries failed requests, causing duplicate processing

**Scenario:**
1. ERP sends invoice → Network timeout
2. ERP retries → Invoice processed
3. Original request completes → Duplicate invoice

**Impact:** **MEDIUM** - Duplicate orders (mitigated by unique constraint)

**Mitigation:**
- Idempotency key per invoice (`erp_invoice_number` is natural idempotency key)
- Return 200 OK for duplicates (not error)
- Log duplicate attempts for monitoring

---

### 5.4 API Response Format Mismatch (MEDIUM)

**Risk:** ERP expects specific response format, current format may differ

**ERP Expects (from samples):**
```json
{
  "success": true,
  "data": [{
    "success": true,
    "br_id": 84418668,
    "external_id": "S56723",
    "message": "Success"
  }],
  "status": 200
}
```

**Current Implementation:**
```json
{
  "success": true,
  "order_id": "...",
  "message": "Order created successfully",
  "reference": "S56723",
  "total": 1234.56,
  "item_count": 5
}
```

**Impact:** **MEDIUM** - ERP may not recognize success, retry unnecessarily

**Mitigation:**
- Match ERP expected response format
- Include `br_id` (internal order ID)
- Include `external_id` (echo of `erp_invoice_number`)
- Wrap in `data` array for consistency

---

## 6. INVALID/INCOMPLETE DATA HANDLING

### 6.1 Missing Required Fields (HIGH)

**Risk:** ERP sends invoice without required fields

**Current Validation:**
```typescript
// Validates: retailer_br_id, erp_invoice_number, invoice_date, details
// Missing: status, customFields, sku_uom validation
```

**Impact:** **HIGH** - Processing fails, data loss, manual intervention

**Mitigation:**
- Validate ALL required fields
- Return detailed error messages
- Log invalid payloads for ERP team review
- Implement dead-letter queue for invalid invoices

---

### 6.2 Invalid SKU References (CRITICAL)

**Risk:** `sku_external_id` doesn't exist in ecommerce product catalog

**Scenario:**
- ERP sends invoice with `sku_external_id: "000005015151498522"`
- Ecommerce doesn't have this SKU
- Order created but product missing

**Impact:** **CRITICAL** - Orders with unknown products, fulfillment failures

**Mitigation:**
```typescript
// Validate SKU exists
for (const detail of orderData.details) {
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku_external_id', detail.sku_external_id)
    .single();
  
  if (!product) {
    // Option A: Reject entire invoice
    return { valid: false, error: `SKU ${detail.sku_external_id} not found` };
    
    // Option B: Create placeholder product
    // Option C: Log warning, continue with unknown SKU
  }
}
```

**Recommendation:** Reject invoice if SKU not found. Force product sync before invoice processing.

---

### 6.3 Invalid Date Values (MEDIUM)

**Risk:** `invoice_date` is invalid date string

**Examples:**
- `"2025-13-45"` (invalid month/day)
- `"invalid-date"`
- `"2025-02-30"` (Feb 30 doesn't exist)

**Impact:** **MEDIUM** - Database errors, query failures

**Mitigation:**
```typescript
// Validate date format and value
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(orderData.invoice_date)) {
  return { valid: false, error: 'invoice_date must be YYYY-MM-DD format' };
}

const date = new Date(orderData.invoice_date + 'T00:00:00Z');
if (isNaN(date.getTime())) {
  return { valid: false, error: 'invoice_date is not a valid date' };
}
```

---

### 6.4 Negative or Zero Quantities (MEDIUM)

**Risk:** `quantity` is `"0"` or `"-5"` (invalid business logic)

**Current Validation:**
```typescript
// Only checks quantity exists, not if > 0
if (d.quantity === undefined || d.quantity === null) {
  return { valid: false, error: 'Each detail must have quantity' };
}
```

**Impact:** **MEDIUM** - Invalid orders, financial discrepancies

**Mitigation:**
```typescript
const quantity = parseInt(detail.quantity, 10);
if (isNaN(quantity) || quantity <= 0) {
  return { valid: false, error: 'quantity must be positive integer' };
}
```

---

### 6.5 Invalid Price Values (MEDIUM)

**Risk:** `price_per_item` is negative, zero, or NaN

**Current Validation:**
```typescript
// Only checks type, not value
if (typeof d.price_per_item !== 'number') {
  return { valid: false, error: 'price_per_item must be number' };
}
```

**Impact:** **MEDIUM** - Invalid order totals, financial errors

**Mitigation:**
```typescript
if (typeof d.price_per_item !== 'number' || 
    isNaN(d.price_per_item) || 
    d.price_per_item <= 0) {
  return { valid: false, error: 'price_per_item must be positive number' };
}
```

---

## 7. UNKNOWN/EXPANDABLE FIELDS

### 7.1 customFields Array Expansion (MEDIUM)

**Risk:** `customFields` currently has 3 items, but ERP may add more in future

**Current Pattern:**
```json
"customFields": [
  {"id": "1128", "value": "ALJON YU"},
  {"id": "", "value": ""},
  {"id": "", "value": ""}
]
```

**Future Risk:**
- ERP adds 4th item with new field ID
- Current code expects exactly 3 items
- New data ignored or causes error

**Impact:** **MEDIUM** - Data loss, processing errors

**Mitigation:**
- Store `customFields` as JSONB (flexible)
- Validate minimum 3 items, allow more
- Log warnings for unexpected field IDs
- Document known field IDs (e.g., "1128" = salesperson)

---

### 7.2 Unknown Status Codes (HIGH)

**Risk:** `status` is always `1` in samples, but other codes may exist

**Current Implementation:**
```typescript
// status not stored or validated
```

**Impact:** **HIGH** - Cannot handle cancelled/voided invoices, status tracking lost

**Mitigation:**
- Store `status` as number (preserve ERP value)
- Map to ecommerce status if needed
- Document known status codes with ERP team
- Handle unknown statuses gracefully (log warning, default to 'pending')

---

### 7.3 Future Field Additions (MEDIUM)

**Risk:** ERP adds new fields to payload in future

**Examples:**
- `discount_percentage`
- `tax_amount`
- `shipping_cost`
- `payment_terms`

**Impact:** **MEDIUM** - New data ignored, may break if required

**Mitigation:**
- Use flexible schema (JSONB for invoice metadata)
- Validate only known required fields
- Ignore unknown fields (don't reject)
- Log unknown fields for review
- Version API contract

---

### 7.4 UOM Value Expansion (MEDIUM)

**Risk:** New UOM values beyond known 6 types (PC, PCK, TIN, SET, BDL, BAG)

**Current Known:**
- PC, PCK, TIN, SET, BDL, BAG

**Future Risk:**
- ERP introduces "KG", "L", "M" (weight/volume units)
- Conversion logic breaks
- Stock calculations fail

**Impact:** **MEDIUM** - Inventory management errors

**Mitigation:**
- Store UOM as string (don't validate against fixed list)
- Maintain UOM conversion table (extensible)
- Log unknown UOM values for review
- Default to "no conversion" for unknown UOMs

---

## 8. TRANSACTION & CONSISTENCY RISKS

### 8.1 Partial Order Creation (HIGH)

**Risk:** Order created but order_items insert fails

**Current Implementation:**
```typescript
// Create order
const { data: newOrder } = await supabase.from('orders').insert(...);

// Create order_items (separate, non-atomic)
const { error: itemsError } = await supabase.from('order_items').insert(...);
// If fails, order exists but items missing
```

**Impact:** **HIGH** - Inconsistent data, orders without line items

**Mitigation:**
- Use database transaction
- Wrap in `BEGIN` / `COMMIT` / `ROLLBACK`
- If order_items fails, rollback order creation

---

### 8.2 Total Calculation Mismatch (MEDIUM)

**Risk:** Calculated total doesn't match ERP total (not provided in payload)

**Current Implementation:**
```typescript
const total = orderData.details.reduce((sum, detail) => {
  const quantity = parseInt(detail.quantity);
  const discount = detail.discount_value || 0;
  return sum + (quantity * detail.price_per_item) - discount;
}, 0);
```

**Risks:**
- Rounding differences
- Missing invoice-level discounts
- Tax calculations (not in payload)
- Shipping costs (not in payload)

**Impact:** **MEDIUM** - Financial discrepancies

**Mitigation:**
- Store calculated total
- Log if ERP provides total for comparison
- Reconcile periodically
- Document calculation method

---

## 9. SECURITY & AUTHORIZATION RISKS

### 9.1 API Key Exposure (MEDIUM)

**Risk:** API key in environment variable, may be exposed

**Current Implementation:**
```typescript
const expectedApiKey = process.env.INTEGRATION_API_KEY;
```

**Impact:** **MEDIUM** - Unauthorized invoice creation

**Mitigation:**
- Rotate API keys regularly
- Use different keys per environment
- Monitor API usage for anomalies
- Implement rate limiting

---

### 9.2 Retailer ID Validation (LOW)

**Risk:** `retailer_br_id` not validated against authorized retailers

**Current Implementation:**
```typescript
// No validation of retailer_br_id
```

**Impact:** **LOW** - Invalid retailer IDs accepted

**Mitigation:**
- Maintain authorized retailer list
- Validate `retailer_br_id` exists
- Reject invoices from unknown retailers

---

## 10. MONITORING & OBSERVABILITY RISKS

### 10.1 Silent Failures (HIGH)

**Risk:** Errors logged but not alerted

**Current Implementation:**
```typescript
console.error('Error creating order:', insertError);
// No alerting, no metrics
```

**Impact:** **HIGH** - Issues go unnoticed, data loss

**Mitigation:**
- Implement structured logging
- Set up alerts for error rates
- Monitor duplicate detection
- Track processing latency
- Dashboard for integration health

---

### 10.2 Data Quality Metrics (MEDIUM)

**Risk:** No visibility into data quality issues

**Missing Metrics:**
- Invalid payload rate
- SKU not found rate
- Duplicate invoice rate
- Processing latency
- Success/failure rates

**Impact:** **MEDIUM** - Cannot identify issues proactively

**Mitigation:**
- Track all metrics above
- Set up dashboards
- Alert on threshold breaches

---

## 11. RISK PRIORITY MATRIX

| Risk | Severity | Likelihood | Priority | Mitigation Status |
|------|----------|------------|----------|-------------------|
| Stock sync conflicts | 🔴 CRITICAL | High | P0 | Not implemented |
| SKU ID leading zeros | 🔴 CRITICAL | High | P0 | ✅ Handled (string) |
| Duplicate invoice race | 🔴 CRITICAL | Medium | P0 | ⚠️ Partial (check exists) |
| Missing required fields | 🟡 HIGH | Medium | P1 | ⚠️ Partial (some missing) |
| Decimal precision loss | 🟡 HIGH | High | P1 | ❌ Not handled |
| Invalid SKU references | 🟡 HIGH | Medium | P1 | ❌ Not validated |
| Batch processing | 🟡 HIGH | Low | P2 | ❌ Not implemented |
| UOM conversion | 🟡 HIGH | Medium | P2 | ❌ Not stored |
| Unknown status codes | 🟠 MEDIUM | Low | P2 | ❌ Not handled |
| customFields expansion | 🟠 MEDIUM | Low | P3 | ⚠️ Partial (JSONB) |

---

## 12. RECOMMENDED MITIGATION ROADMAP

### Phase 1: Critical Fixes (Week 1)
1. ✅ Add database unique constraint on `external_reference`
2. ✅ Change decimal precision to `NUMERIC(12,4)` for prices
3. ✅ Validate all required fields (status, sku_uom, customFields)
4. ✅ Add SKU existence validation
5. ✅ Implement proper quantity validation (positive integer)

### Phase 2: Data Completeness (Week 2)
1. ✅ Store all ERP fields (status, sku_uom, customFields, remarks)
2. ✅ Handle batch processing (array of invoices)
3. ✅ Implement transaction wrapping for atomicity
4. ✅ Add comprehensive error logging

### Phase 3: Stock Management (Week 3)
1. ✅ **Decision:** ERP is source of truth for stock
2. ✅ Do NOT update stock from invoices
3. ✅ Implement separate stock sync API (if needed)
4. ✅ Document stock management strategy

### Phase 4: Monitoring & Observability (Week 4)
1. ✅ Set up structured logging
2. ✅ Implement metrics collection
3. ✅ Create monitoring dashboards
4. ✅ Set up alerts for errors/duplicates

---

## 13. DECISION POINTS REQUIRED

### Critical Decisions Needed:

1. **Stock Management Strategy**
   - ❓ Does ecommerce update stock from ERP invoices?
   - ❓ Or is ERP the only source of truth for stock?
   - **Recommendation:** ERP is source of truth. Ecommerce queries ERP for stock.

2. **Batch Processing**
   - ❓ Support array of invoices in one request?
   - ❓ Or require one invoice per request?
   - **Recommendation:** Support both (single object or array).

3. **Unknown SKU Handling**
   - ❓ Reject invoice if SKU not found?
   - ❓ Create placeholder product?
   - ❓ Log warning and continue?
   - **Recommendation:** Reject invoice. Force product sync first.

4. **Status Mapping**
   - ❓ Map ERP status to ecommerce status?
   - ❓ Or store ERP status separately?
   - **Recommendation:** Store both (ERP status + ecommerce status).

5. **Error Handling Strategy**
   - ❓ Fail fast (reject entire invoice)?
   - ❓ Best effort (process valid parts)?
   - **Recommendation:** Fail fast for data integrity.

---

## 14. TESTING RECOMMENDATIONS

### Test Cases Required:

1. **Data Type Tests**
   - Quantity as string "12"
   - Quantity as invalid "abc"
   - Price with 4 decimals
   - SKU with leading zeros

2. **Missing Field Tests**
   - Missing required fields
   - Empty arrays
   - Null values

3. **Race Condition Tests**
   - Duplicate invoice simultaneous requests
   - Concurrent stock updates

4. **Batch Processing Tests**
   - Single invoice
   - Multiple invoices
   - Partial success scenarios

5. **Invalid Data Tests**
   - Invalid dates
   - Negative quantities
   - Non-existent SKUs
   - Invalid UOM values

---

**END OF RISK ANALYSIS**

