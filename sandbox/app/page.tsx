export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Sandbox Environment</h1>
      <p>ERP Integration API Endpoints:</p>
      <ul>
        <li>POST /api/integration/user/refresh - Authentication</li>
        <li>POST /api/integration/orders - Create Order</li>
      </ul>
    </div>
  );
}
