// components/emails/ResetPassword.ts
import { BaseLayout } from './BaseLayout';

export const ResetPasswordEmail = (url: string) => {
  const content = `
    <h1 style="color: #1e293b; margin-top: 0; font-size: 20px;">Recuperar Acceso 🔐</h1>
    <p>Hola,</p>
    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p>Si fuiste tú, haz clic en el botón de abajo para crear una nueva contraseña:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #4F46E5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
        Restablecer Contraseña
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 6px;">
      ${url}
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    
    <p style="font-size: 13px; color: #94a3b8;">
      Si no has solicitado este cambio, puedes ignorar este mensaje de forma segura.
    </p>
  `;
  
  return BaseLayout(content, 'Recuperación de Contraseña');
};