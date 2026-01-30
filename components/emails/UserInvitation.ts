import { BaseLayout } from './BaseLayout';

export const InvitationEmail = (url: string) => {
  const content = `
    <h1 style="color: #1e293b; margin-top: 0; font-size: 20px;">¡Bienvenido a Life-OS! 🚀</h1>
    <p>Hola,</p>
    <p>Has sido invitado a formar parte de nuestra plataforma de gestión.</p>
    <p>Para activar tu cuenta y configurar tu contraseña, haz clic en el siguiente botón:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
        Aceptar Invitación
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Este enlace es personal e intransferible. Caducará en 24 horas.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    
    <p style="font-size: 12px; color: #94a3b8;">
      Link directo: <br />
      <span style="color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${url}</span>
    </p>
  `;
  
  return BaseLayout(content, 'Invitación a Life-OS');
};