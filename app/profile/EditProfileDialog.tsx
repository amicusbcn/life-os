'use client'

import { useState } from "react"
import { updateProfile } from "@/app/profile/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Loader2, Upload } from "lucide-react"
import imageCompression from 'browser-image-compression'

export function EditProfileDialog({ profile, open, onOpenChange }: any) {
  const [isLoading, setIsLoading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)

  const initialPreview = profile?.avatar_url
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
    : null
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true }
    try {
      const compressed = await imageCompression(file, options)
      setFileToUpload(compressed)
      setPreviewUrl(URL.createObjectURL(compressed))
    } catch (error) {
      setFileToUpload(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)

    if (profile?.avatar_url) {
      formData.append('old_avatar_path', profile.avatar_url)
    }
    if (fileToUpload) {
      formData.set('avatar', fileToUpload)
    }

    try {
      await updateProfile(formData)
      onOpenChange(false) // Cerramos diálogo en éxito
    } catch (error) {
      alert(`Error: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          <div className="flex justify-center">
            <div className="relative group cursor-pointer w-24 h-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Upload className="h-8 w-8" />
                </div>
              )}
              <input
                type="file"
                name="avatar"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Cuéntanos un poco sobre ti"
              className="resize-none"
              defaultValue={profile?.bio || ''}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}