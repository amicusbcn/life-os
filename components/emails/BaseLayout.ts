// components/emails/BaseLayout.ts

const MAIN_COLOR = '#4F46E5'; // Indigo-600
const BG_COLOR = '#f9fafb';   // Slate-50

export const BaseLayout = (content: string, title: string = 'Life-OS') => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="background-color: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 0; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <div style="background-color: ${MAIN_COLOR}; padding: 24px; text-align: center;">
      <h2 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Life-OS</h2>
    </div>

    <div style="padding: 40px; color: #334155; line-height: 1.6; font-size: 16px;">
      ${content}
    </div>

    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} Life-OS. Todos los derechos reservados.
      </p>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #cbd5e1;">
        Este es un mensaje automático, por favor no respondas a este correo.
      </p>
    </div>
  </div>
</body>
</html>
`;