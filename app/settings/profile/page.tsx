// app/settings/profile/page.tsx

import { redirect } from "next/navigation";
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'; 
import { ProfileView } from "../components/ProfileView";
import { getFullProfileData } from './data'; 
import { SettingsMenu }  from '../components/SettingsMenu';


export default async function ProfilePage() {
	const { profile, accessibleModules, userRole } = await getUserData();;

	// 4. Obtener todos los datos necesarios
	const fullData = await getFullProfileData(profile.id);
    
  if (!fullData) {
      return <div>Error al cargar datos del perfil.</div>;
  }

	return (
    <UnifiedAppSidebar
      title="Mi Perfil"
      profile={profile}
      modules={accessibleModules}
      // Mismo menú que la home: operativo vacío y configuración con SettingsMenu
      moduleMenu={userRole === 'admin' ? <SettingsMenu /> : null}
    > 

      <div className="max-w-2xl mx-auto">
        <ProfileView 
          user={fullData.user} 
          profile={fullData.profile} 
        />
      </div>
    </UnifiedAppSidebar>
	);
}