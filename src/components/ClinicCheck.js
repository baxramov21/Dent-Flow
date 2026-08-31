'use client'

import { useClinic } from '@/context/ClinicContext'
import LogoutButton from '@/components/LogoutButton'

export default function ClinicCheck({ children }) {
  const { clinic, isLoading } = useClinic()

  if (isLoading) return <div>Loading your clinic workspace...</div>
  
  if (!clinic) return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Setup Incomplete</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        You are logged in, but your user account is not linked to any clinic in the database.
      </p>
      <div style={{ textAlign: 'left', backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>How to fix this:</h3>
        <ol style={{ fontSize: '14px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Go to Supabase Dashboard ➔ <strong>Authentication</strong> and copy your user's <code>User UID</code>.</li>
          <li>Go to <strong>Table Editor</strong> ➔ <code>clinics</code> table and make sure you have at least 1 clinic row. Copy its <code>id</code>.</li>
          <li>Go to the <code>staff</code> table, insert a new row.</li>
          <li>Paste the clinic <code>id</code> into <code>clinic_id</code>.</li>
          <li>Paste your user <code>UID</code> into <code>user_id</code>.</li>
          <li>Set <code>full_name</code> (e.g. "Dr. Admin") and <code>role</code> to "admin".</li>
        </ol>
      </div>
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
          I fixed it (Refresh)
        </button>
        <LogoutButton variant="text" />
      </div>
    </div>
  )

  const isSubscriptionValid = clinic && clinic.is_active && (!clinic.subscription_end_date || new Date(clinic.subscription_end_date) > new Date())

  if (clinic && !isSubscriptionValid) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Obuna Yakunlangan</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Sizning klinikangiz obunasi yakunlangan yoki faoliyati to'xtatilgan. Iltimos, tizim ma'muri bilan bog'laning.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <LogoutButton variant="text" />
        </div>
      </div>
    )
  }

  return children
}
