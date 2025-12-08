import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileView } from "./ProfileView";

/**
 * Página de perfil (Componente de Servidor)
 * Obtiene los datos del perfil y los pasa al formulario del cliente.
 */
export default async function ProfilePage() {
  const supabase = await createClient();

  // 1. Obtener el usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener los datos del perfil desde la tabla 'profiles'
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found, lo cual es normal si el perfil no se ha creado
    console.error("Error fetching profile:", error);
  }

  return (
    <ProfileView user={user} profile={profile} />
  );
}
