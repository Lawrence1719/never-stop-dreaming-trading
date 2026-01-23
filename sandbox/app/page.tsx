import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sandbox Environment</h1>
      <p>ERP Integration API Endpoints:</p>
      <ul>
        <li>POST /api/integration/user/refresh - Authentication</li>
        <li>POST /api/integration/orders - Create Order</li>
      </ul>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>🧪 Test the API</h2>
        <p>Use the interactive test page to test the endpoints:</p>
        <Link
          href="/test"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginTop: '0.5rem',
          }}
        >
          Go to Test Page →
        </Link>
      </div>
    </div>
  );
}
