'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ClinicContext = createContext({
  clinic: null,
  staffProfile: null,
  isLoading: true,
})

export function ClinicProvider({ children }) {
  const [clinic, setClinic] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadClinicData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsLoading(false)
          return
        }

        // Fetch staff profile to get clinic_id and role
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('*, clinics(*)')
          .eq('user_id', user.id)
          .maybeSingle()

        if (staffError) {
          throw staffError
        }

        if (!staff) {
          console.warn('User is logged in but has no linked staff profile. Please link the auth.uid() in the staff table.')
          setIsLoading(false)
          return
        }

        setStaffProfile(staff)
        setClinic(staff.clinics)
      } catch (error) {
        console.error('Error loading clinic data:', JSON.stringify(error, null, 2))
      } finally {
        setIsLoading(false)
      }
    }

    loadClinicData()
  }, [])

  return (
    <ClinicContext.Provider value={{ clinic, staffProfile, isLoading }}>
      {children}
    </ClinicContext.Provider>
  )
}

export const useClinic = () => useContext(ClinicContext)
