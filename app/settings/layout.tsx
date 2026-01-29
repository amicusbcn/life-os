// app/settings/layout.tsx
import { validateModuleAccess } from '@/utils/security'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Validamos acceso global una sola vez
  await validateModuleAccess('settings') 

  return <>{children}</>
}