# 📊 System Flowcharts — Never Stop Dreaming Trading
**Capstone Project | Full System Flow Documentation**

---

## 1. Overall System Architecture Flow

```mermaid
flowchart TD
    User(["👤 User (Browser)"])

    User --> MW["🔀 Next.js Middleware\nRoute Guard / RBAC"]

    MW -->|"No session"| AUTH["🔐 /login or /register"]
    MW -->|"role = admin"| ADMIN["🖥️ Admin Portal\n/admin/*"]
    MW -->|"role = customer"| SHOP["🛒 Customer Shop\n/ • /products • /orders"]
    MW -->|"role = courier"| COURIER["🚚 Courier Dashboard\n/courier/dashboard"]

    ADMIN --> API_ADMIN["⚙️ /api/admin/*\nServer API Routes"]
    SHOP --> API_PUB["⚙️ /api/*\nPublic API Routes"]
    COURIER --> API_COURIER["⚙️ /api/courier/*\nCourier API Routes"]

    API_ADMIN --> SB[("🗄️ Supabase\nPostgreSQL + RLS")]
    API_PUB --> SB
    API_COURIER --> SB

    SB -->|"Realtime CDC"| NOTIF["🔔 Realtime Notifications\n(Supabase Channels)"]
    NOTIF --> SHOP
    NOTIF --> ADMIN

    SB --> STORAGE["📦 Supabase Storage\n(Product Images)"]
    API_ADMIN --> SMTP["📧 Nodemailer SMTP\n(Transactional Email)"]
    API_PUB --> ERP["🔌 ERP Integration\n/api/integration"]
```

---

## 2. User Authentication & Role Routing

```mermaid
flowchart TD
    Start(["🌐 Request Received"]) --> MW["Next.js Middleware\nupdateSession()"]

    MW --> GetUser["supabase.auth.getUser()"]
    GetUser -->|"No session"| IsProtected{{"Is protected\nroute?"}}
    GetUser -->|"Has session"| GetRole["Read role from\nJWT metadata"]

    IsProtected -->|"Yes"| RedirLogin["↩️ Redirect to /login\n?next=original_path"]
    IsProtected -->|"No"| Allow["✅ Allow Request"]

    GetRole --> RoleMatch{{"JWT role\nvalid?"}}
    RoleMatch -->|"No / missing"| DBCheck["🔍 DB Fallback:\nSELECT role FROM profiles\nWHERE id = user.id"]
    RoleMatch -->|"Yes"| RouteByRole

    DBCheck --> DBMatch{{"DB role\nmatches?"}}
    DBMatch -->|"No"| ForbidRedirect["⛔ Redirect to /\nor /courier/dashboard"]
    DBMatch -->|"Yes"| SelfHeal["🔧 Self-Heal:\nupdateUser metadata\nto match DB role"]
    SelfHeal --> RouteByRole

    RouteByRole{{"Route by\nrole"}} -->|"admin"| AdminAccess["✅ /admin/*\n/api/admin/*"]
    RouteByRole -->|"customer"| CustomerAccess["✅ / • /products\n/orders • /profile"]
    RouteByRole -->|"courier"| CourierAccess["✅ /courier/dashboard\nONLY"]
    RouteByRole -->|"auth page + logged in"| RedirHome["↩️ Redirect to\nrole home page"]

    subgraph "🔐 Supabase Auth"
        Register["📝 /register\n↓ name, email, phone, password"]
        Register --> Verify["📨 Email verification\nvia Nodemailer SMTP"]
        Verify --> Confirmed["✅ Account Active\nProfile created via DB trigger"]

        ForgotPW["🔑 /forgot-password\n↓ Send reset link"]
        ForgotPW --> ResetLink["📨 Time-limited reset link\nvia Nodemailer"]
        ResetLink --> NewPW["🔑 Set new password"]
    end
```

---

## 3. Customer Shopping Flow

```mermaid
flowchart TD
    Home(["🏠 Homepage"]) --> Browse["Browse Products\n/products"]
    Browse --> Filter["Filter by Category\nSearch / Sort"]
    Filter --> PDP["📦 Product Detail Page\n/products/slug"]

    PDP --> VariantSel["Select Variant\n(1kg, 5kg, 1L, etc.)"]
    VariantSel --> StockCheck{{"In Stock?"}}
    StockCheck -->|"Out of stock"| OOS["🚫 Show Out of Stock\nDisable Add to Cart"]
    StockCheck -->|"In stock"| AddCart["➕ Add to Cart"]

    AddCart --> Cart["🛒 Cart\nView Items + Quantities"]
    Cart --> Coupon["🏷️ Apply Coupon Code\n(optional)"]
    Coupon --> ValidCoupon{{"Valid\nCoupon?"}}
    ValidCoupon -->|"Invalid"| CouponErr["❌ Show Error Message"]
    ValidCoupon -->|"Valid"| Discount["✅ Discount Applied"]

    Cart --> Checkout["💳 Proceed to Checkout"]
    Discount --> Checkout

    Checkout --> AddrSel["📍 Select Shipping Address\n(saved or new)"]
    AddrSel --> ShipMethod["🚚 Select Shipping Method"]
    ShipMethod --> Payment["💰 Select Payment Method\n(COD / GCash / etc.)"]
    Payment --> Review["📋 Review Order\nSubtotal + Discount + Shipping = Total"]
    Review --> PlaceOrder["✅ Place Order\n↓ POST /api/orders"]

    PlaceOrder --> RPC["⚙️ process_checkout RPC\n(Atomic DB Transaction)"]
    RPC --> Confirm["🎉 Order Confirmation\n/order-confirmation?id=xxx"]
    Confirm --> Email["📧 Confirmation Email\n(Nodemailer)"]
    Confirm --> Notif["🔔 In-App Notification\nOrder placed"]

    PDP --> Reviews["⭐ Read/Write Reviews"]
    PDP --> Wishlist["❤️ Add to Wishlist"]
```

---

## 4. Atomic Checkout RPC Flow (`process_checkout`)

```mermaid
flowchart TD
    Start(["Checkout Triggered\nPOST /api/orders"]) --> IdCheck{{"Idempotency\nKey exists?"}}

    IdCheck -->|"Duplicate key found"| ReturnDup["↩️ Return existing order\nDuplicate = true"]
    IdCheck -->|"New key"| CalcSub["Calculate Subtotal\nLoop through items"]

    CalcSub --> LockVariants["🔒 SELECT ... FOR UPDATE\nLock variant rows"]
    LockVariants --> StockLoop{{"Each item:\nstock ≥ qty?"}}
    StockLoop -->|"No"| RaiseOOS["❌ RAISE EXCEPTION\n'Out of stock: Only X left'"]
    StockLoop -->|"Yes, all items"| CouponCheck{{"Coupon\napplied?"}}

    CouponCheck -->|"Yes"| LockCoupon["🔒 Lock coupon row\nFOR UPDATE"]
    LockCoupon --> CouponValid{{"Coupon\nvalid?"}}
    CouponValid -->|"Inactive / expired / limit reached"| RaiseCoupon["❌ RAISE EXCEPTION\nCoupon error message"]
    CouponValid -->|"Valid"| CalcDiscount["Calculate Discount\npercentage / fixed / free_shipping"]
    CalcDiscount --> CalcTotal["Final Total =\nSubtotal - Discount + Shipping"]

    CouponCheck -->|"No"| CalcTotal2["Final Total =\nSubtotal + Shipping"]
    CalcTotal --> DeductStock
    CalcTotal2 --> DeductStock

    DeductStock["📦 UPDATE product_variants\nstock = stock - qty"] --> CreateOrder["INSERT INTO orders\n(all fields)"]
    CreateOrder --> RecordCoupon{{"Coupon\nused?"}}
    RecordCoupon -->|"Yes"| InsertUsage["INSERT coupon_usages\nUPDATE coupons usage_count +1"]
    RecordCoupon -->|"No"| InsertItems

    InsertUsage --> InsertItems["INSERT order_items\n(one row per line item)"]
    InsertItems --> InsertHistory["INSERT order_status_history\n(initial status log)"]
    InsertHistory --> Return["✅ Return order JSON\nDuplicate = false"]
```

---

## 5. Admin Order Management Lifecycle

```mermaid
flowchart LR
    Placed(["📬 Order Placed\nstatus: pending"]) --> AdminView["Admin views order\n/admin/orders"]

    AdminView --> Confirm["Admin confirms payment\nstatus → processing"]
    Confirm --> PrepareShip["Admin prepares shipment\nAssign courier + tracking #"]
    PrepareShip --> Ship["Mark as Shipped\nstatus → shipped"]

    Ship --> CourierDeliver["🚚 Courier delivers\nUploads proof photo"]
    CourierDeliver --> MarkDelivered["status → delivered\ndeliveredAt = NOW()"]

    MarkDelivered --> CustomerConfirm{{"Customer\nconfirms receipt?"}}
    CustomerConfirm -->|"Yes (manual)"| Completed["✅ status → completed\nconfirmedByCustomerAt = NOW()"]
    CustomerConfirm -->|"No (timeout)"| CronJob["⏰ /api/cron\nAuto-confirm after X days"]
    CronJob --> AutoComplete["✅ status → completed\nautoConfirmed = true"]

    Completed --> ReviewPrompt["⭐ Customer prompted\nto rate & review"]
    ReviewPrompt --> ReviewSubmit["Review submitted\n(status: pending)"]
    ReviewSubmit --> AdminMod["Admin moderates review\n/admin/cms"]
    AdminMod -->|"Approve"| Published["✅ Review published\nProduct rating updated"]
    AdminMod -->|"Reject"| Rejected["❌ Review rejected"]

    AdminView --> Cancel["❌ Admin cancels order\nstatus → cancelled"]

    subgraph "📋 Status History"
        SH["Every status change\nINSERT → order_status_history\n(old_status, new_status, notes, timestamp)"]
    end
```

---

## 6. Courier Delivery Flow

```mermaid
flowchart TD
    Login(["🚚 Courier Logs In\n/login"]) --> MW["Middleware checks\nrole = courier"]
    MW --> Dashboard["📋 Courier Dashboard\n/courier/dashboard"]

    Dashboard --> ViewAssigned["View Assigned Deliveries\nGET /api/courier/orders"]
    ViewAssigned --> SelectOrder["Select an Order"]
    SelectOrder --> OrderDetail["View Order Detail\n- Customer name\n- Shipping address\n- Items list"]

    OrderDetail --> Navigate["📍 Navigate to address\n(Leaflet map)"]
    Navigate --> Deliver{{"Delivered?"}}

    Deliver -->|"Yes"| UploadProof["📸 Upload Proof of Delivery\n(photo)"]
    UploadProof --> SaveStorage["Store in Supabase Storage\nSave URL to order"]
    SaveStorage --> UpdateStatus["PATCH /api/courier/orders\nstatus → delivered"]
    UpdateStatus --> NotifyAdmin["🔔 Admin notified\n(Realtime)"]
    NotifyAdmin --> NotifyCustomer["🔔 Customer notified\n(Realtime)"]

    Deliver -->|"Failed"| FailNote["📝 Add delivery notes\n(reason for failed attempt)"]
    FailNote --> UpdateFailed["PATCH status\n→ back to shipped / pending"]

    subgraph "🔒 Courier Lockdown"
        Lock["Middleware:\nCourier can ONLY access\n/courier/* routes\nAll other routes → redirect"]
    end
```

---

## 7. Admin Dashboard & Reporting Flow

```mermaid
flowchart TD
    AdminLogin(["👤 Admin logs in"]) --> Dashboard["📊 /admin/dashboard"]

    Dashboard --> DatePicker["🗓️ Select Date Range\n(DateRangePicker)"]
    DatePicker --> FetchAPI["GET /api/admin/dashboard\n?startDate=...&endDate=..."]

    FetchAPI --> AdminLib["lib/supabase/admin.ts\n(Service Role — bypasses RLS)"]

    AdminLib --> KPIs["Calculate KPIs in parallel"]
    KPIs --> Revenue["getTotalRevenue()\nSUM orders.total"]
    KPIs --> Orders["getTotalOrders()\nCOUNT orders"]
    KPIs --> Customers["getTotalCustomers()\nCOUNT profiles"]
    KPIs --> AOV["getAverageOrderValue()\nRevenue / Orders"]

    AdminLib --> Growth["getGrowthRate()\nCurrent vs Previous period\n↓ % change + direction"]
    AdminLib --> SalesRPC["get_sales_overview_rpc()\n↓ Revenue + Orders per day/hour"]
    AdminLib --> CatRPC["get_sales_by_category_rpc()\n↓ Revenue % per category"]
    AdminLib --> Recent["getRecentOrders()\nLast 5 orders + customer names"]

    Revenue & Orders & Customers & AOV & Growth & SalesRPC & CatRPC & Recent --> Response["📦 JSON Response\nto Dashboard UI"]

    Response --> Charts["📈 Recharts\nLine Chart + Pie Chart"]
    Response --> StatCards["📊 KPI Cards\nwith growth indicator"]
    Response --> OrderTable["📋 Recent Orders Table"]

    Dashboard --> Reports["📑 /admin/reports"]
    Reports --> SalesReport["Sales Report\n/admin/reports/sales"]
    Reports --> CustReport["Customer Report\n/admin/reports/customers"]
    Reports --> InvReport["Inventory Report\n/admin/reports/inventory"]

    SalesReport --> Export["⬇️ Export\n📄 PDF (jsPDF)\n📊 Excel (XLSX)"]
    CustReport --> Export
    InvReport --> Export
```

---

## 8. ERP Integration Flow

```mermaid
flowchart LR
    ERP(["🏭 External ERP System\n(Manufacturing / Warehouse)"]) -->|"POST /api/integration\nBearer token auth"| TokenCheck{{"Valid\nintegration_tokens\nrecord?"}}

    TokenCheck -->|"Invalid / expired"| Reject["❌ 401 Unauthorized"]
    TokenCheck -->|"Valid"| SyncAction{{"Action type"}}

    SyncAction -->|"Product sync"| ProductSync["Upsert products\n+ variants\n+ stock levels"]
    SyncAction -->|"Inventory update"| StockUpdate["UPDATE product_variants\nSET stock = new_qty"]
    SyncAction -->|"Order export"| OrderExport["SELECT orders\n→ return to ERP"]

    ProductSync --> DB[("🗄️ Supabase DB")]
    StockUpdate --> DB
    OrderExport --> DB

    DB -->|"Low stock detected"| Alert["🔔 Admin notification\nLow stock alert"]

    subgraph "🔑 Token Management"
        AdminPanel["Admin generates token\n/admin/integration"]
        AdminPanel --> TokenTable["INSERT integration_tokens\n(hashed, expiry)"]
    end
```

---

## 9. Notification System Flow

```mermaid
flowchart TD
    Trigger(["⚡ Triggering Event"]) --> EventType{{"Event Type"}}

    EventType -->|"Order placed"| OrderNotif["INSERT notifications\ntarget_role: admin\ntype: order"]
    EventType -->|"Status changed"| StatusNotif["INSERT notifications\ntarget_role: customer\ntype: order"]
    EventType -->|"Low stock"| StockNotif["INSERT notifications\ntarget_role: admin\ntype: stock"]
    EventType -->|"New user"| UserNotif["INSERT notifications\ntarget_role: admin\ntype: user"]

    OrderNotif & StatusNotif & StockNotif & UserNotif --> DB[("🗄️ notifications table\n(Realtime enabled via CDC)")]

    DB -->|"Postgres CDC\nWAL listener"| SupabaseRT["Supabase Realtime\nChannel broadcast"]

    SupabaseRT -->|"Admin channel"| AdminUI["🖥️ Admin\n/admin/notifications"]
    SupabaseRT -->|"Customer channel"| CustomerUI["👤 Customer\n/notifications"]

    AdminUI --> Bell["🔔 Bell icon badge\nunread count"]
    CustomerUI --> Bell2["🔔 Bell icon badge\nunread count"]

    subgraph "📧 Email Notifications"
        SMTP["Nodemailer SMTP"]
        OrderPlaced["Order confirmation email"]
        PasswordReset["Password reset email"]
        StaffInvite["Staff invitation email"]
        SMTP --- OrderPlaced & PasswordReset & StaffInvite
    end
```

---

## 10. Product Management Flow (Admin)

```mermaid
flowchart TD
    AdminProd(["📦 /admin/products"]) --> ActionType{{"Action"}}

    ActionType -->|"Create"| ProductForm["📝 Product Form\n- Name, description, category\n- Specifications\n- Upload images"]
    ActionType -->|"Edit"| EditForm["✏️ Edit existing product"]
    ActionType -->|"Delete"| SoftDelete["🗑️ Soft delete\nis_active = false"]

    ProductForm --> ImageUpload["📸 Upload images\nto Supabase Storage\n↓ Save URLs to product_images"]
    ImageUpload --> SaveProduct["INSERT products\n+ product_images"]

    SaveProduct --> VariantMgmt["⚙️ Manage Variants\n/admin/products/variants"]
    EditForm --> VariantMgmt

    VariantMgmt --> AddVariant["➕ Add Variant\n- Label (1kg, 5kg, etc.)\n- Price\n- Stock\n- SKU / Item Code\n- Unit / Packaging"]
    AddVariant --> SaveVariant["INSERT product_variants"]
    SaveVariant --> StockWatch{{"Stock ≤\nreorder_threshold?"}}
    StockWatch -->|"Yes"| LowStockAlert["🔔 Low stock notification\n→ Admin"]
    StockWatch -->|"No"| Done["✅ Variant saved"]

    ActionType -->|"Manage Categories"| CatModal["🏷️ Category Modal\n/admin/products + categories tab"]
    CatModal --> CatCRUD["CRUD categories\nCascade name update to products"]
```
