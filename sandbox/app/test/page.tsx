'use client';

import { useState } from 'react';

export default function TestPage() {
  const [username, setUsername] = useState('test_erp_user');
  const [password, setPassword] = useState('test_password_123');
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);

  const [orderData, setOrderData] = useState({
    retailer_br_id: 15750504,
    erp_invoice_number: `TEST-${Date.now()}`,
    invoice_date: new Date().toISOString().split('T')[0],
    status: 1,
    remarks: '',
    customFields: [
      { id: '1128', value: 'TEST USER' },
      { id: '', value: '' },
      { id: '', value: '' },
    ],
    details: [
      {
        sku_external_id: '000005011200217250',
        quantity: '1',
        sku_uom: 'PCK',
        price_per_item: 91.8393,
        discount_value: 0.0000,
      },
    ],
  });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthResult(null);
    setToken(null);

    try {
      const response = await fetch('/api/integration/user/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setAuthResult({ status: response.status, data });

      if (data.success && data.data?.token) {
        setToken(data.data.token);
      }
    } catch (error) {
      setAuthResult({
        status: 'ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!token) {
      setOrderResult({
        status: 'ERROR',
        data: { error: 'Please authenticate first to get a token' },
      });
      return;
    }

    setOrderLoading(true);
    setOrderResult(null);

    try {
      const response = await fetch('/api/integration/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      setOrderResult({ status: response.status, data });
    } catch (error) {
      setOrderResult({
        status: 'ERROR',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '2rem' }}>Sandbox API Testing</h1>

      {/* Authentication Section */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Step 1: Authentication (Get Token)</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Username:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <button
          onClick={handleAuth}
          disabled={authLoading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: authLoading ? 'not-allowed' : 'pointer',
            opacity: authLoading ? 0.6 : 1,
          }}
        >
          {authLoading ? 'Authenticating...' : 'Get Token'}
        </button>

        {token && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
            <strong>✅ Token Received:</strong>
            <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
              {token}
            </div>
          </div>
        )}

        {authResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: authResult.status === 200 ? '#e8f5e9' : '#ffebee', borderRadius: '4px' }}>
            <strong>Response (Status: {authResult.status}):</strong>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.9rem', overflow: 'auto' }}>
              {JSON.stringify(authResult.data, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Order Creation Section */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Step 2: Create Order</h2>

        {!token && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '1rem' }}>
            ⚠️ Please authenticate first (Step 1) to get a token
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Invoice Number:
          </label>
          <input
            type="text"
            value={orderData.erp_invoice_number}
            onChange={(e) => setOrderData({ ...orderData, erp_invoice_number: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Retailer BR ID:
          </label>
          <input
            type="number"
            value={orderData.retailer_br_id}
            onChange={(e) => setOrderData({ ...orderData, retailer_br_id: parseInt(e.target.value) })}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Invoice Date:
          </label>
          <input
            type="date"
            value={orderData.invoice_date}
            onChange={(e) => setOrderData({ ...orderData, invoice_date: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            SKU External ID:
          </label>
          <input
            type="text"
            value={orderData.details[0].sku_external_id}
            onChange={(e) =>
              setOrderData({
                ...orderData,
                details: [{ ...orderData.details[0], sku_external_id: e.target.value }],
              })
            }
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Quantity:
          </label>
          <input
            type="text"
            value={orderData.details[0].quantity}
            onChange={(e) =>
              setOrderData({
                ...orderData,
                details: [{ ...orderData.details[0], quantity: e.target.value }],
              })
            }
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Price Per Item:
          </label>
          <input
            type="number"
            step="0.0001"
            value={orderData.details[0].price_per_item}
            onChange={(e) =>
              setOrderData({
                ...orderData,
                details: [{ ...orderData.details[0], price_per_item: parseFloat(e.target.value) }],
              })
            }
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <button
          onClick={handleCreateOrder}
          disabled={orderLoading || !token}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: token ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: orderLoading || !token ? 'not-allowed' : 'pointer',
            opacity: orderLoading ? 0.6 : 1,
          }}
        >
          {orderLoading ? 'Creating Order...' : 'Create Order'}
        </button>

        {orderResult && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: orderResult.status === 200 ? '#e8f5e9' : orderResult.status === 409 ? '#fff3cd' : '#ffebee',
              borderRadius: '4px',
            }}
          >
            <strong>Response (Status: {orderResult.status}):</strong>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.9rem', overflow: 'auto' }}>
              {JSON.stringify(orderResult.data, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Request Preview */}
      <section style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f5f5f5' }}>
        <h3 style={{ marginTop: 0 }}>Request Preview (for debugging)</h3>
        <div style={{ marginBottom: '1rem' }}>
          <strong>Auth Request:</strong>
          <pre style={{ fontSize: '0.85rem', overflow: 'auto', backgroundColor: 'white', padding: '0.5rem', borderRadius: '4px' }}>
            POST /api/integration/user/refresh{'\n'}
            {JSON.stringify({ username, password }, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Order Request:</strong>
          <pre style={{ fontSize: '0.85rem', overflow: 'auto', backgroundColor: 'white', padding: '0.5rem', borderRadius: '4px' }}>
            POST /api/integration/orders{'\n'}
            Headers: Authorization: Bearer {token || '[NO TOKEN]'}{'\n'}
            {JSON.stringify(orderData, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
