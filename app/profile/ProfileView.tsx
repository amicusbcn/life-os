'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditProfileDialog } from './EditProfileDialog'
import { requestPasswordChange } from './actions'

export function ProfileView({ user, profile }: { user: any, profile: any }) {
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
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      {/* HEADER STICKY */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-slate-800 truncate flex-1">Mi Perfil</h1>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* TARJETA DE PERFIL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white shadow-lg"
          />
          <h2 className="text-2xl font-bold text-slate-800">{profile?.full_name || 'Sin nombre'}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md">{profile?.bio || 'Sin biografía.'}</p>
        </div>

        {/* TARJETA DE CUENTA Y SEGURIDAD */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Cuenta</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-slate-400 mr-4" />
              <div>
                <p className="text-sm font-medium text-slate-800">Email</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center">
              <KeyRound className="h-5 w-5 text-slate-400 mr-4" />
              <div>
                <p className="text-sm font-medium text-slate-800">Contraseña</p>
                <Button variant="secondary" size="sm" className="mt-1" onClick={handlePasswordChange}>
                  Cambiar contraseña
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIÁLOGO DE EDICIÓN */}
      <EditProfileDialog
        profile={profile}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}