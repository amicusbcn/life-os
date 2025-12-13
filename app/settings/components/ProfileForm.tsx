"use client";

import { useState, useRef } from "react";

import { updateProfile } from "../profile/actions";

// Importaciones de componentes de shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ProfileData {
  full_name?: string | null;
  bio?: string | null;
}

export function ProfileForm({ profile }: { profile: ProfileData | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para controlar los inputs, como en NewItemDialog.tsx
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    // Creamos el FormData manualmente a partir del estado
    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("bio", bio);

    try {
      await updateProfile(formData);
      alert("¡Perfil actualizado con éxito!");
    } catch (e) {
      const error = e as Error;
      alert(`Error al actualizar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Usamos un <form> normal, sin los componentes de react-hook-form
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre Completo</Label>
        <Input
          id="full_name"
          name="full_name"
          placeholder="Tu nombre"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Este es tu nombre público.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografía</Label>
        <Textarea
          id="bio"
          name="bio"
          placeholder="Cuéntanos un poco sobre ti"
          className="resize-none"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Puedes usar hasta 280 caracteres.
        </p>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  );
}