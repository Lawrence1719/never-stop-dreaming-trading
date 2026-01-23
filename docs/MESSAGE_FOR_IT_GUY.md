# Message to Send to IT Guy

---

Good afternoon po, sir!

Eto po yung API endpoint details para sa integration:

## API Endpoint

**URL:** `https://<YOUR_DOMAIN>/api/integration/orders`  
**Method:** `POST`

**Note:** I-send ko po yung actual domain name mamaya (pag ready na po yung deployment).

---

## Authentication

**Method:** Bearer Token (API Key)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

**Note:** I-provide ko po yung API key separately (via secure channel).

---

## Request Format

**Body (JSON):** Same structure po ng binigay ninyo sa `API_INTEGRATION.md`

Example:
```json
{
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
}
```

---

## Response Format

**Success (200):**
```json
{
  "success": true,
  "order_id": "...",
  "message": "Order created successfully",
  "reference": "S56723",
  "total": 1836.786,
  "item_count": 2
}
```

**Error (401 - Invalid API Key):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**Error (409 - Duplicate):**
```json
{
  "success": false,
  "error": "Duplicate order",
  "message": "Order with invoice number S56723 already exists"
}
```

---

## Testing

1. Try muna po natin yung **API key authentication** (Bearer token)
2. Test with **single invoice** first
3. Check po yung response - dapat `"success": true`

---

## Questions:

1. **Ano po yung actual domain/URL** na gagamitin ninyo para sa production? (para ma-configure ko po yung endpoint)

2. **Pwede po ba yung Bearer token** (API key) style, or need po talaga ninyo ng username/password style?

3. **May IP whitelist po ba kayo?** (para ma-allow lang yung specific IP addresses)

---

Maraming salamat po, sir! 🙏

---
