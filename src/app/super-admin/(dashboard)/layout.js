import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SuperAdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/super-admin/login')
  }

  // Verify the user is a super admin
  const { data: superAdmin, error } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (error || !superAdmin) {
    // Not a super admin. Sign them out and redirect to login to prevent looping.
    await supabase.auth.signOut()
    redirect('/super-admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      {children}
    </div>
  )
}
