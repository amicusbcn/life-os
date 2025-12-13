// app/settings/profile/ProfileView.tsx (CLIENT COMPONENT REFRACTORIZADO)
'use client'

import { useState } from 'react'
import { Edit, KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditProfileDialog } from './EditProfileDialog'
import { requestPasswordChange } from '../profile/actions'
import { ProfileViewProps, UserProfile } from '@/types/settings'; // <-- Importar tipos centrales

// Nota: El componente ya no recibe 'user' y 'profile' sin tipado.
// Recibe un objeto que contiene {user:..., profile:...}
export function ProfileView({ user, profile }: { user: any, profile: UserProfile | null }) {
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const avatarUrl = profile?.avatar_url
		? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
		: `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`

	const handlePasswordChange = async () => {
		if (confirm("Se enviará un email a tu correo para cambiar la contraseña. ¿Continuar?")) {
			try {
				await requestPasswordChange(user.email!);
				alert("¡Email enviado! Revisa tu bandeja de entrada.");
			} catch (e) {
				alert(`Error: ${(e as Error).message}`);
			}
		}
	};

	return (
		<div className="max-w-2xl mx-auto p-4 space-y-6"> {/* El div principal ya no tiene el min-h-screen/bg-slate */}
        
        {/* Aquí integramos el botón de editar al inicio del contenido, si es necesario, 
           o lo dejamos como parte de una tarjeta de acción, que es más limpio. */}

        {/* TARJETA DE PERFIL */}
				<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center relative">
            
            {/* Botón de Editar (Acción de bajo nivel en la tarjeta) */}
            <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"
                onClick={() => setIsEditDialogOpen(true)}
                title="Editar Perfil"
            >
                <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
            
					  <img
						src={avatarUrl}
						alt="Avatar"
						className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white shadow-lg"
					/>
					<h2 className="text-2xl font-bold text-slate-800">{profile?.full_name || 'Sin nombre'}</h2>
					<p className="text-sm text-slate-500 mt-1 max-w-md">{profile?.bio || 'Sin biografía.'}</p>
				</div>

				{/* TARJETA DE CUENTA Y SEGURIDAD (Se mantiene igual) */}
				{/* ... */}

				{/* DIÁLOGO DE EDICIÓN (Se mantiene igual) */}
				<EditProfileDialog
					profile={profile}
					open={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
				/>
		</div>
	);
}