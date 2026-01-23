# ERP Integration API Endpoint Specification

**Date:** 2025-01-27  
**Purpose:** API endpoint details for ERP system to push invoice/order data to e-commerce system

---

## API Endpoint Details

### Endpoint URL
```
POST https://<YOUR_DOMAIN>/api/integration/orders
```

**Note:** Replace `<YOUR_DOMAIN>` with your actual e-commerce domain (e.g., `https://yourstore.com` or `https://api.yourstore.com`)

### Authentication Method
**Bearer Token (API Key)**

**Header:**
```
Authorization: Bearer <INTEGRATION_API_KEY>
Content-Type: application/json
```

**Note:** We will provide the `INTEGRATION_API_KEY` separately (via secure channel).

---

## Request Format

### HTTP Method
`POST`

### Headers
```
Content-Type: application/json
Authorization: Bearer <INTEGRATION_API_KEY>
```

### Request Body (JSON)

**Single Invoice:**
```json
{
  "retailer_br_id": 15750504,
  "retailer_external_id": "",
  "erp_invoice_number": "S56723",
  "invoice_date": "2025-10-14",
  "status": 1,
  "remarks": "",
  "customFields": [
    {
      "id": "1128",
      "value": "ALJON YU"
    },
    {
      "id": "",
      "value": ""
    },
    {
      "id": "",
      "value": ""
    }
  ],
  "details": [
    {
      "sku_external_id": "000005011200217250",
      "quantity": "20",
      "sku_uom": "PCK",
      "price_per_item": 91.8393,
      "discount_value": 0.0000
    },
    {
      "sku_external_id": "000005011200217255",
      "quantity": "6",
      "sku_uom": "PCK",
      "price_per_item": 91.8393,
      "discount_value": 0.0000
    }
  ]
}
```

**Multiple Invoices (Array):**
```json
[
  {
    "retailer_br_id": 15750504,
    "erp_invoice_number": "S56723",
    "invoice_date": "2025-10-14",
    "status": 1,
    "remarks": "",
    "customFields": [...],
    "details": [...]
  },
  {
    "retailer_br_id": 15750519,
    "erp_invoice_number": "S56721",
    "invoice_date": "2025-10-14",
    "status": 1,
    "remarks": "",
    "customFields": [...],
    "details": [...]
  }
]
```

---

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Order created successfully",
  "reference": "S56723",
  "total": 1836.786,
  "item_count": 2
}
```

### Error Responses

**401 Unauthorized (Invalid API Key):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**400 Bad Request (Invalid Data):**
```json
{
  "success": false,
  "error": "Invalid request data",
  "message": "retailer_br_id is required and must be a number"
}
```

**409 Conflict (Duplicate Order):**
```json
{
  "success": false,
  "error": "Duplicate order",
  "message": "Order with invoice number S56723 already exists",
  "order_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "error": "Server error",
  "message": "Failed to create order"
}
```

---

## Required Fields

### Invoice-Level Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `retailer_br_id` | number | ✅ Yes | Retailer's BR ID |
| `erp_invoice_number` | string | ✅ Yes | Unique invoice number (used for deduplication) |
| `invoice_date` | string | ✅ Yes | Date in YYYY-MM-DD format |
| `status` | number | ✅ Yes | Invoice status code |
| `remarks` | string | ⚠️ Optional | Remarks/notes (can be empty string) |
| `retailer_external_id` | string | ⚠️ Optional | External retailer ID (can be empty string) |
| `customFields` | array | ✅ Yes | Array of custom fields (must have 3 items) |
| `details` | array | ✅ Yes | Array of line items (must have at least 1 item) |

### Line Item Fields (details[])
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sku_external_id` | string | ✅ Yes | Product SKU (preserve leading zeros) |
| `quantity` | string | ✅ Yes | Quantity as string (e.g., "20") |
| `sku_uom` | string | ✅ Yes | Unit of measure (e.g., "PCK", "PC", "TIN") |
| `price_per_item` | number | ✅ Yes | Unit price (4 decimal precision supported) |
| `discount_value` | number | ✅ Yes | Discount amount (4 decimal precision) |

---

## Example cURL Request

```bash
curl -X POST https://yourstore.com/api/integration/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "retailer_br_id": 15750504,
    "erp_invoice_number": "S56723",
    "invoice_date": "2025-10-14",
    "status": 1,
    "remarks": "",
    "customFields": [
      {"id": "1128", "value": "ALJON YU"},
      {"id": "", "value": ""},
      {"id": "", "value": ""}
    ],
    "details": [
      {
        "sku_external_id": "000005011200217250",
        "quantity": "20",
        "sku_uom": "PCK",
        "price_per_item": 91.8393,
        "discount_value": 0.0000
      }
    ]
  }'
```

---

## Example Postman/API Client Setup

1. **Method:** POST
2. **URL:** `https://yourstore.com/api/integration/orders`
3. **Headers:**
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer YOUR_API_KEY_HERE`
4. **Body:** Select "raw" → "JSON" → Paste your invoice JSON

---

## Testing Steps

1. **Get API Key** from e-commerce team
2. **Test with single invoice** first
3. **Verify response** is `{"success": true, ...}`
4. **Test duplicate** (send same invoice twice) - should return 409
5. **Test invalid data** - should return 400 with error message
6. **Test invalid API key** - should return 401

---

## Important Notes

1. **Deduplication:** 
   - We check for duplicate invoices using `erp_invoice_number`
   - If duplicate found, returns 409 with existing `order_id`

2. **Idempotency:**
   - Safe to retry same request (if duplicate, returns existing order)

3. **Data Types:**
   - `quantity` must be string (e.g., `"20"` not `20`)
   - `price_per_item` and `discount_value` are numbers (4 decimal precision)
   - `sku_external_id` must be string (preserve leading zeros)

4. **Array Support:**
   - Can send single invoice object `{...}` OR array `[{...}, {...}]`
   - If array, each invoice processed separately

5. **Error Handling:**
   - Always check `success` field in response
   - If `success: false`, check `error` and `message` fields

---

## Support

For questions or issues:
- Check response `message` field for specific error details
- Verify API key is correct
- Verify all required fields are present
- Verify data types match specification

---

**END OF API SPECIFICATION**
