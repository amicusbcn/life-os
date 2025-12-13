// app/settings/profile/page.tsx (CORREGIDO DE IMPORTS Y HEADERS)

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import { ProfileView } from "../components/ProfileView";

import { getFullProfileData } from './data'; 
import { SettingsMenu }  from '../components/SettingsMenu';

/**
 * Página de perfil (Componente de Servidor)
 */
export default async function ProfilePage() {
	const supabase = await createClient();

	// 1. Control de acceso
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	// 4. Obtener todos los datos necesarios
	const fullData = await getFullProfileData(user.id);
    
  if (!fullData) {
      return <div>Error al cargar datos del perfil.</div>;
  }

	return (
    <div className="min-h-screen bg-slate-100 font-sans">
      
      {/* 1. HEADER UNIFICADO */}
      <UnifiedAppHeader
        title="Mi Perfil"
        backHref="/"
        userEmail={fullData.user.email || ''}
        userRole={fullData.userRole}
        maxWClass="max-w-2xl"
        rightAction={null}
        moduleMenu={<SettingsMenu />}
      />

      {/* 2. VISTA PRINCIPAL (Cliente) */}
      <ProfileView 
        user={fullData.user} 
        profile={fullData.profile} 
      />
    </div>
	);
}