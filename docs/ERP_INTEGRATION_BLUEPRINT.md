# ERP Integration Blueprint

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Architecture Design - High-Level  
**Purpose:** Define integration strategy between Legacy ERP and Ecommerce Backend

---

## EXECUTIVE SUMMARY

This blueprint defines the integration architecture for synchronizing invoice/order data from the Legacy ERP system (source of truth) to the ecommerce backend. The design prioritizes **data consistency**, **inventory accuracy**, and **system resilience** while respecting ERP's authority over pricing, stock, and order management.

**Key Principles:**
1. **ERP is Source of Truth** - All authoritative data originates from ERP
2. **Mirror, Don't Duplicate** - Ecommerce mirrors ERP data, doesn't recalculate
3. **Stock Sync Separation** - Stock management is separate from invoice processing
4. **Idempotent Operations** - All operations are safe to retry
5. **Graceful Degradation** - System continues operating when ERP is unavailable

---

## 1. DATA FLOW ARCHITECTURE

### 1.1 Primary Flow: ERP → Ecommerce (Invoice Push)

```
┌─────────────────┐
│  Legacy ERP     │
│  (Windows/      │
│   Android/      │
│   BeatRoute)    │
└────────┬────────┘
         │
         │ 1. Invoice Created in ERP
         │    (PostgreSQL trigger/webhook)
         │
         ▼
┌─────────────────────────────────────────┐
│  ERP Integration Service                │
│  - Validates invoice data              │
│  - Formats JSON payload                │
│  - Queues for delivery                 │
└────────┬────────────────────────────────┘
         │
         │ 2. HTTP POST /api/integration/orders
         │    Headers: Authorization: Bearer <key>
         │    Body: [{ invoice_data }] or { invoice_data }
         │
         ▼
┌─────────────────────────────────────────┐
│  Ecommerce API Gateway                  │
│  /api/integration/orders                │
│  - Authentication (API key)             │
│  - Rate limiting                        │
│  - Request validation                   │
└────────┬────────────────────────────────┘
         │
         │ 3. Business Logic Layer
         │
         ▼
┌─────────────────────────────────────────┐
│  Order Processing Service               │
│  - Deduplication check                  │
│  - SKU validation                       │
│  - Data transformation                  │
│  - Transaction management               │
└────────┬────────────────────────────────┘
         │
         │ 4. Database Operations
         │
         ▼
┌─────────────────────────────────────────┐
│  Supabase Database                      │
│  - orders table                         │
│  - order_items table                    │
│  - integration_log table                │
└─────────────────────────────────────────┘
```

### 1.2 Flow Characteristics

**Direction:** Unidirectional (ERP → Ecommerce)  
**Trigger:** Push from ERP (webhook/API call)  
**Frequency:** Real-time or near-real-time  
**Idempotency:** Yes (via `erp_invoice_number` unique constraint)

### 1.3 Data Transformation Points

1. **ERP Format** → **API Contract Format**
   - ERP internal format converted to JSON payload
   - Handled by ERP integration service

2. **API Contract Format** → **Ecommerce Internal Format**
   - Transform at API gateway level
   - Map ERP fields to ecommerce schema
   - Preserve all ERP data in `metadata` JSONB column

3. **Ecommerce Internal Format** → **Database Schema**
   - Store canonical data in normalized tables
   - Store raw payload in `erp_payload` JSONB for audit

---

## 2. DATA STORAGE STRATEGY

### 2.1 Storage Classification

**Store Locally (Writable):**
- ✅ Invoice/Order records (mirrored from ERP)
- ✅ Order line items (derived from ERP invoice details)
- ✅ Integration audit logs
- ✅ Product catalog (synced separately, SKU mapping)

**Read-Only / Computed (Not Stored):**
- ❌ Real-time stock levels (query ERP when needed)
- ❌ Current pricing (use invoice price, query ERP for catalog)
- ❌ Active promotions (query ERP when needed)

**Hybrid (Cached with TTL):**
- ⚡ Product master data (cache for X hours, refresh periodically)
- ⚡ Retailer information (cache, refresh on invoice sync)
- ⚡ Stock snapshots (cache for display, query ERP for accuracy)

### 2.2 Storage Rationale

| Data Type | Storage Decision | Reason |
|-----------|------------------|--------|
| **Invoice Data** | Store locally | Historical record, audit trail, reporting needs |
| **Order Items** | Store locally | Line item details, fulfillment tracking |
| **Stock Levels** | Query ERP (or cache short TTL) | ERP is source of truth, changes frequently |
| **Pricing** | Store in invoice, query ERP for catalog | Invoice price is final, catalog pricing changes |
| **Product Master** | Cache with periodic sync | Changes infrequently, needs fast lookup |
| **Retailer Info** | Cache with sync on invoice | Changes infrequently, used for filtering |

### 2.3 Data Lifecycle

```
Invoice Received
    │
    ├─→ Store in orders table (permanent record)
    ├─→ Store in order_items table (line items)
    ├─→ Store raw payload in erp_payload JSONB (audit)
    └─→ Log in integration_log (processing history)

Product Catalog
    │
    ├─→ Cache in products table (TTL: 24 hours)
    └─→ Refresh via scheduled sync or on-demand

Stock Levels
    │
    ├─→ Query ERP API when needed (real-time)
    └─→ Cache in stock_snapshots (TTL: 5-15 minutes) for display
```

---

## 3. STOCK DISPLAY STRATEGY

### 3.1 Display Architecture

**Principle:** ERP owns stock, ecommerce displays cached/query values

```
┌─────────────────────────────────────────────────────────┐
│  Ecommerce Frontend (Product Page)                      │
│  User views product → Needs stock level                 │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Stock Query Service                                    │
│  1. Check cache (stock_snapshots table)                 │
│  2. If cache valid (< 15 min old) → return cached      │
│  3. If cache stale → Query ERP stock API               │
│  4. Update cache → return fresh value                   │
└────────┬────────────────────────────────────────────────┘
         │
         ├─→ Cache Hit: Return cached value (fast)
         │
         └─→ Cache Miss: Query ERP API (slower but accurate)
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  ERP Stock API                                          │
│  GET /api/erp/stock?sku_external_id=...                │
│  Returns: { sku, quantity, uom, updated_at }           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Cache Strategy

**Cache Table: `stock_snapshots`**
- `sku_external_id` (PK)
- `quantity` (cached value)
- `uom` (unit of measure)
- `cached_at` (timestamp)
- `erp_updated_at` (from ERP, for validation)

**Cache TTL:**
- **Display purposes:** 5-15 minutes (fast, slightly stale acceptable)
- **Critical operations (checkout):** Query ERP directly (always fresh)

**Cache Invalidation:**
- Time-based (TTL expiration)
- Event-based (if ERP sends stock update webhook)
- On-demand (admin refresh action)

### 3.3 Stock Display Rules

1. **Product Listing Pages**
   - Use cached stock (5-15 min TTL acceptable)
   - Show "In Stock" / "Out of Stock" / "Low Stock"
   - Fast response time prioritized

2. **Product Detail Page**
   - Use cached stock with timestamp
   - Show "Last updated: X minutes ago"
   - Option to refresh (queries ERP)

3. **Cart / Checkout**
   - **Always query ERP directly** (no cache)
   - Validate stock before payment
   - Prevent overselling with real-time check

4. **Admin Dashboard**
   - Show both cached and ERP values
   - Highlight discrepancies
   - Manual refresh option

### 3.4 Stock Status Labels

| Cache Age | Display Strategy |
|-----------|------------------|
| < 5 min | "In Stock (X units)" - Use cached |
| 5-15 min | "In Stock (X units) - Updated X min ago" - Use cached with note |
| > 15 min | "Checking availability..." - Query ERP |
| ERP Unavailable | "Stock information temporarily unavailable" - Use last known cache with warning |

---

## 4. SYNC STRATEGY

### 4.1 Recommended Strategy: **Hybrid Push-Pull**

**Primary: Push (Event-Driven)**
- ERP pushes invoices immediately upon creation
- Real-time sync for order data
- Most current data

**Secondary: Pull (Scheduled)**
- Periodic product catalog sync
- Periodic stock snapshot refresh
- Periodic retailer master sync
- Reconciliation queries

**Tertiary: On-Demand (Manual)**
- Admin-triggered syncs
- Reconciliation after issues
- Product refresh for specific SKUs

### 4.2 Push Strategy (Invoice Sync)

```
ERP Event: Invoice Created
    │
    ├─→ Trigger: Immediate (webhook/API call)
    ├─→ Delivery: HTTP POST to /api/integration/orders
    ├─→ Retry: Exponential backoff (3 attempts)
    └─→ Dead Letter: Queue for manual review if all retries fail

Benefits:
✅ Real-time data
✅ No polling overhead
✅ Event-driven architecture

Risks:
⚠️ ERP must be online to push
⚠️ Network failures cause delays
⚠️ Requires webhook infrastructure in ERP
```

### 4.3 Pull Strategy (Catalog & Stock Sync)

**Catalog Sync (Daily):**
```
Schedule: 2:00 AM daily (low traffic)
Source: ERP Product Master API
Target: products table (cache)
Method: Full sync (replace all) or incremental (update only changed)

Product Catalog Sync Flow:
1. Query ERP for all products
2. Compare with local cache (by sku_external_id)
3. Update changed products
4. Mark deleted products (soft delete)
5. Log sync results
```

**Stock Snapshot Sync (Every 15 minutes):**
```
Schedule: Every 15 minutes
Source: ERP Stock API
Target: stock_snapshots table (cache)
Method: Bulk query (all SKUs or high-traffic SKUs only)

Stock Snapshot Sync Flow:
1. Query ERP for stock levels (bulk endpoint if available)
2. Update stock_snapshots cache
3. Set cached_at timestamp
4. If ERP unavailable, keep existing cache with expired flag
```

**Reconciliation Sync (Weekly):**
```
Schedule: Weekly (e.g., Sunday 3:00 AM)
Purpose: Verify invoice data matches ERP records
Method: Query ERP for recent invoices, compare with local

Reconciliation Flow:
1. Query ERP for invoices from last 7 days
2. Compare erp_invoice_number with local orders
3. Identify discrepancies
4. Log reconciliation report
5. Alert on mismatches
```

### 4.4 Hybrid Strategy Benefits

| Aspect | Push | Pull | Hybrid (Recommended) |
|--------|------|------|----------------------|
| **Data Freshness** | Real-time | Delayed | Real-time (invoices), Cached (catalog) |
| **ERP Load** | Low (event-driven) | Higher (polling) | Balanced |
| **Reliability** | Depends on ERP availability | Depends on sync schedule | Resilient (fallback options) |
| **Complexity** | Medium (webhooks) | Low (scheduled jobs) | High (both systems) |

---

## 5. DUAL STOCK ENCODING HANDLING

### 5.1 Problem Statement

**Challenge:** Both ERP and Ecommerce systems may track stock independently, leading to:
- Divergent stock levels
- Double-counting when both systems reduce stock
- Reconciliation complexity
- Overselling risk

### 5.2 Solution: **ERP is Single Source of Truth**

**Architecture Decision:**
- ❌ **Ecommerce does NOT update stock from invoices**
- ✅ **Ecommerce queries ERP for stock levels**
- ✅ **Ecommerce only manages stock for direct ecommerce sales** (if separate)

**Rationale:**
1. ERP already decrements stock when invoice is created
2. Adding ecommerce stock reduction would double-count
3. ERP has complete inventory picture (warehouse + sales channels)
4. Prevents reconciliation nightmares

### 5.3 Stock Management Model

```
┌─────────────────────────────────────────────────────────┐
│  ERP Stock Management                                   │
│  - Warehouse stock                                      │
│  - All sales channels (Windows, Android, BeatRoute)    │
│  - Invoice processing reduces stock                     │
│  - Stock adjustments                                    │
│  - Returns/refunds increase stock                       │
└────────┬────────────────────────────────────────────────┘
         │
         │ Stock queries (read-only)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Ecommerce Stock Query                                  │
│  - Display stock on product pages                       │
│  - Validate stock at checkout                           │
│  - Does NOT decrement stock                             │
│  - Caches for performance                               │
└─────────────────────────────────────────────────────────┘

Ecommerce Invoice Processing:
- Invoice received → Store order record
- Do NOT update local stock
- Stock already reduced in ERP when invoice was created
```

### 5.4 If Ecommerce Also Sells (Direct Sales)

**Scenario:** Ecommerce has direct customers (not retailers), processes its own orders.

**Solution: Two-Track Stock Model**

```
ERP Stock = Warehouse stock - (All ERP invoices + Ecommerce direct sales)

Ecommerce Direct Sales:
1. Customer places order on ecommerce site
2. Ecommerce creates order → Updates ecommerce_stock (local tracking)
3. Ecommerce syncs to ERP → ERP reduces warehouse stock
4. ERP remains source of truth for total warehouse stock

Invoice from ERP (to retailer):
1. ERP creates invoice → ERP reduces warehouse stock
2. Ecommerce receives invoice → Stores order, does NOT update stock
3. Stock already accounted for in ERP

Display Stock on Ecommerce:
- Query ERP warehouse stock (includes all channels)
- Show accurate total available stock
```

**Alternative: Ecommerce Reports Sales to ERP**
```
Ecommerce Order → ERP API (reduces ERP stock immediately)
               → Ecommerce stores order (audit)
ERP Invoice     → Ecommerce stores order (audit)
               → Stock already reduced in ERP
```

**Recommendation:** Ecommerce reports sales to ERP immediately, ERP manages all stock. Ecommerce does not maintain separate stock counts.

---

## 6. OVERSELLING & NEGATIVE STOCK PREVENTION

### 6.1 Prevention Strategy: **Real-Time Validation**

**Principle:** Validate stock at critical checkpoints, not just on display

### 6.2 Validation Checkpoints

**Checkpoint 1: Product Page (Display)**
```
Action: User views product
Validation: Cached stock (may be slightly stale)
Purpose: User experience (informative)
Risk: Low (display only, not commitment)
```

**Checkpoint 2: Add to Cart**
```
Action: User adds product to cart
Validation: Query ERP stock (real-time)
Purpose: Prevent adding unavailable products
Risk: Medium (cart is not order, can expire)

Flow:
1. User clicks "Add to Cart"
2. Query ERP: GET /api/erp/stock?sku=...
3. If stock >= quantity → Add to cart
4. If stock < quantity → Show error "Only X available"
```

**Checkpoint 3: Cart Display**
```
Action: User views cart
Validation: Query ERP stock for all items (real-time)
Purpose: Show current availability, remove out-of-stock items
Risk: Medium (cart is not order)

Flow:
1. Load cart items
2. Batch query ERP stock for all SKUs
3. Update cart display:
   - ✅ In Stock: Show quantity
   - ⚠️ Low Stock: "Only X left"
   - ❌ Out of Stock: Remove or disable item
```

**Checkpoint 4: Checkout Initiation (CRITICAL)**
```
Action: User proceeds to checkout
Validation: Query ERP stock (real-time, lock if possible)
Purpose: Final validation before payment
Risk: HIGH (prevent overselling)

Flow:
1. User clicks "Checkout"
2. Query ERP stock for all cart items
3. If all items available:
   - Proceed to payment
   - (Optional) Reserve stock in ERP (if reservation API exists)
4. If any item unavailable:
   - Prevent checkout
   - Update cart (remove out-of-stock items)
   - Show message: "Some items no longer available"
```

**Checkpoint 5: Payment Confirmation (CRITICAL)**
```
Action: Payment successful
Validation: Final ERP stock check before order creation
Purpose: Last chance to prevent overselling
Risk: CRITICAL (order is being created)

Flow:
1. Payment processor confirms payment
2. Immediately query ERP stock (real-time)
3. If stock available:
   - Create order in ecommerce
   - Report sale to ERP (if required)
   - ERP reduces stock
4. If stock unavailable:
   - Cancel payment (refund immediately)
   - Show error: "Item no longer available, payment refunded"
   - Log incident for investigation
```

### 6.3 Stock Locking (Optional, if ERP Supports)

**Concept:** Reserve stock temporarily during checkout

```
Flow:
1. User proceeds to checkout
2. Ecommerce calls ERP: POST /api/erp/stock/reserve
   Body: { sku, quantity, reservation_id, ttl: 15min }
3. ERP reserves stock (prevents other sales)
4. User completes payment within 15 min
5. Ecommerce confirms reservation → ERP converts reservation to sale
6. If payment fails/timeout → ERP releases reservation
```

**Benefit:** Prevents race conditions between checkout and payment  
**Requirement:** ERP must support reservation/locking API  
**Fallback:** If not supported, rely on Checkpoint 4 & 5 validation

### 6.4 Negative Stock Prevention Rules

1. **Never allow negative stock display**
   - If ERP returns negative, show "Out of Stock" (0)
   - Log error for investigation

2. **Reject orders that would cause negative stock**
   - Check `stock - quantity >= 0` before order creation
   - If negative, reject order with clear message

3. **Handle race conditions gracefully**
   - Multiple users checkout simultaneously
   - First payment succeeds, subsequent payments see "Out of Stock"
   - Better to reject than allow overselling

4. **Monitor for stock discrepancies**
   - Alert if cached stock differs significantly from ERP
   - Alert if negative stock detected in ERP
   - Daily reconciliation report

---

## 7. ERP OFFLINE / DELAY HANDLING

### 7.1 Resilience Strategy: **Graceful Degradation**

**Principle:** System continues operating with cached data when ERP is unavailable

### 7.2 Offline Scenarios

**Scenario 1: ERP Temporarily Unavailable (Minutes)**

```
Impact: Stock queries fail, invoice push fails
Strategy: Use cached data, queue invoices for retry

Flow:
1. Stock query fails → Use cached stock (with "Last updated X min ago" warning)
2. Invoice push fails → Queue in dead-letter queue
3. Retry invoice push when ERP returns (exponential backoff)
4. User experience: Slightly degraded (cached data shown)
```

**Scenario 2: ERP Extended Outage (Hours)**

```
Impact: Stock cache expires, invoices queued
Strategy: Extend cache TTL, batch process invoices when available

Flow:
1. Stock cache expires → Continue using expired cache (with prominent warning)
2. Invoice queue grows → Batch process when ERP returns
3. Display warning: "Stock information may be outdated. ERP is temporarily unavailable."
4. Admin dashboard shows: ERP connection status, queued invoice count
```

**Scenario 3: ERP Delayed Data (Data Arrives Late)**

```
Impact: Invoices arrive hours/days after creation
Strategy: Accept late data, update order timestamps if needed

Flow:
1. Invoice arrives with old invoice_date
2. Accept invoice (historical data is valid)
3. Store both:
   - invoice_date (from ERP - when invoice was created)
   - received_at (when ecommerce received it)
4. Log delay for analysis (receive_time - invoice_date)
```

### 7.3 Circuit Breaker Pattern

**Implementation: Prevent cascading failures**

```
Circuit Breaker States:

CLOSED (Normal):
- All requests to ERP succeed
- Stock queries work normally
- Invoices process immediately

OPEN (ERP Failing):
- After X consecutive failures
- Immediately fail requests (don't wait for timeout)
- Use cached data
- Queue invoices for later

HALF-OPEN (Recovery Testing):
- After timeout period
- Send test request to ERP
- If succeeds → CLOSED
- If fails → OPEN (reset timeout)

Configuration:
- Failure threshold: 5 consecutive failures
- Timeout: 60 seconds
- Half-open test interval: 30 seconds
```

### 7.4 Fallback Mechanisms

**Fallback 1: Cached Stock Display**
```
ERP Unavailable → Use stock_snapshots cache
                 → Show "Last updated: X minutes ago"
                 → Disable checkout if cache > 30 min old
```

**Fallback 2: Invoice Queuing**
```
ERP Unavailable → Store invoices in integration_queue table
                 → Retry with exponential backoff
                 → Process batch when ERP returns
```

**Fallback 3: Catalog Caching**
```
ERP Unavailable → Use products table cache
                 → Product pages work (may show outdated prices)
                 → Checkout requires ERP (fail gracefully)
```

**Fallback 4: Read-Only Mode**
```
ERP Extended Outage → Switch ecommerce to "read-only" mode
                    → Users can browse (cached data)
                    → Checkout disabled (requires ERP stock check)
                    → Show maintenance message
```

### 7.5 Monitoring & Alerts

**Health Checks:**
- ERP API availability (ping every 30 seconds)
- Response time monitoring
- Error rate tracking
- Queue depth monitoring (integration_queue)

**Alerts:**
- ERP API down > 1 minute
- Stock cache age > 30 minutes
- Invoice queue depth > 100
- Circuit breaker OPEN state
- Reconciliation discrepancies

**Dashboard:**
```
Integration Health Dashboard:
├─ ERP Connection Status: ✅ Online / ❌ Offline
├─ Stock Cache Age: 5 minutes (Fresh / Stale / Expired)
├─ Queued Invoices: 0 (Normal / Warning / Critical)
├─ Last Successful Sync: 2 minutes ago
└─ Error Rate: 0.1% (Normal / Warning / Critical)
```

---

## 8. DATA CONSISTENCY & RECONCILIATION

### 8.1 Consistency Guarantees

**Eventual Consistency Model:**
- Invoice data: Eventually consistent (may arrive late)
- Stock data: Eventually consistent (cache may be stale)
- Product catalog: Eventually consistent (periodic sync)

**Strong Consistency Where Needed:**
- Checkout stock validation: Always query ERP (no cache)
- Payment confirmation: Always query ERP (no cache)
- Invoice deduplication: Database unique constraint (immediate)

### 8.2 Reconciliation Strategy

**Daily Reconciliation:**
```
Schedule: Daily at 3:00 AM
Purpose: Verify invoice data matches ERP records

Process:
1. Query ERP for invoices from last 24 hours (by invoice_date)
2. Compare with local orders (by erp_invoice_number)
3. Identify:
   - Missing invoices (in ERP, not in ecommerce)
   - Extra invoices (in ecommerce, not in ERP)
   - Data discrepancies (amounts, items differ)
4. Generate reconciliation report
5. Alert on mismatches
```

**Weekly Stock Reconciliation:**
```
Schedule: Weekly at Sunday 3:00 AM
Purpose: Verify stock cache matches ERP stock

Process:
1. Query ERP for all product stock levels
2. Compare with stock_snapshots cache
3. Identify discrepancies > 5%
4. Update cache
5. Log reconciliation report
```

**Monthly Full Audit:**
```
Schedule: Monthly (first day, 2:00 AM)
Purpose: Comprehensive data integrity check

Process:
1. Compare all invoices from last 30 days
2. Verify totals match (ERP vs Ecommerce)
3. Check for orphaned orders (no ERP source)
4. Verify SKU mappings (all products exist)
5. Generate audit report
6. Alert on critical issues
```

---

## 9. SECURITY & AUTHENTICATION

### 9.1 API Authentication

**Method:** Bearer Token (API Key)
```
Header: Authorization: Bearer <api_key>
Storage: Environment variable (INTEGRATION_API_KEY)
Rotation: Quarterly or on security incident
```

**Additional Security:**
- IP allowlist (if ERP has fixed IPs)
- Rate limiting (prevent abuse)
- Request signing (HMAC, if ERP supports)
- TLS/HTTPS only

### 9.2 Data Privacy

**Invoice Data:**
- Contains retailer information (retailer_br_id)
- Contains order details (amounts, products)
- Store in encrypted database
- Access logs for audit

**Audit Trail:**
- Log all invoice processing (integration_log table)
- Log all ERP API calls (for debugging)
- Retain logs for 90 days (compliance)

---

## 10. SCALABILITY CONSIDERATIONS

### 10.1 Expected Load

**Invoice Volume:**
- Estimate: 100-1000 invoices/day
- Peak: 5000 invoices/day (seasonal)
- Average invoice: 5-10 line items

**Stock Queries:**
- Estimate: 10,000-50,000 queries/day
- Peak: 100,000 queries/day (promotions)
- Cache hit rate target: > 80%

### 10.2 Scaling Strategies

**Horizontal Scaling:**
- API servers can scale horizontally (stateless)
- Database read replicas for stock queries
- Cache layer (Redis) for stock_snapshots

**Performance Optimization:**
- Stock query batching (query multiple SKUs at once)
- Async invoice processing (queue-based)
- Database indexing (erp_invoice_number, sku_external_id)

---

## 11. MONITORING & OBSERVABILITY

### 11.1 Key Metrics

**Integration Health:**
- ERP API availability (% uptime)
- Invoice processing success rate
- Stock query response time
- Cache hit rate

**Data Quality:**
- Duplicate invoice rate
- SKU not found rate
- Stock discrepancy rate
- Reconciliation mismatch rate

**Performance:**
- API response time (p50, p95, p99)
- Database query time
- Cache refresh time

### 11.2 Alerting Rules

**Critical Alerts (Immediate Action):**
- ERP API down > 5 minutes
- Invoice processing failure rate > 10%
- Stock cache age > 1 hour
- Database connection failures

**Warning Alerts (Investigation):**
- ERP API response time > 5 seconds
- Invoice queue depth > 50
- Stock discrepancy > 5%
- Duplicate invoice detected

---

## 12. DECISION LOG

### 12.1 Architecture Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **ERP is source of truth** | Prevents dual encoding conflicts | Stock management simplified |
| **Ecommerce does NOT update stock from invoices** | Avoids double-counting | Requires separate stock query API |
| **Hybrid push-pull sync** | Balance between freshness and reliability | More complex but resilient |
| **Stock cache with TTL** | Performance vs accuracy trade-off | Faster pages, slightly stale data acceptable |
| **Real-time stock check at checkout** | Prevent overselling | Slightly slower checkout, but accurate |
| **Circuit breaker pattern** | Prevent cascading failures | Graceful degradation when ERP down |

---

**END OF INTEGRATION BLUEPRINT**

