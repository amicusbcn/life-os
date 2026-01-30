// utils/mail.ts
import { Resend } from 'resend';

// Inicializamos Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// REMITENTE OFICIAL (Ya verificado)
const SENDER = 'Life-OS Security <no-reply@app.jact.es>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY falta en las variables de entorno");
    return { success: false, error: "Configuration Error" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: SENDER,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Error enviando email:", error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Email enviado a ${to} (ID: ${data?.id})`);
    return { success: true, data };
    
  } catch (error: any) {
    console.error("❌ Excepción al enviar email:", error);
    return { success: false, error: error.message };
  }
};