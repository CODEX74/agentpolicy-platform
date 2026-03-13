import nodemailer from 'nodemailer';

// Почта для логов по умолчанию. Можно переопределить через LOG_EMAIL_TO.
const EMAIL_TO = process.env.LOG_EMAIL_TO || 'agengpolicywallet@gmail.com';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const url = process.env.EMAIL_SERVER;
  if (!url) {
    throw new Error('EMAIL_SERVER is not configured');
  }
  transporter = nodemailer.createTransport(url);
  return transporter;
}

export async function sendLogEmail(subject: string, text: string) {
  try {
    const from = process.env.EMAIL_FROM || 'noreply@agentwallet.com';
    const t = getTransporter();
    await t.sendMail({
      to: EMAIL_TO,
      from,
      subject,
      text,
    });
    // диагностический лог об успешной отправке
    console.log('[AgentWallet email] sent', { to: EMAIL_TO, subject });
  } catch (err) {
    // логируем причину, но не падаем
    console.error('[AgentWallet email] sendLogEmail failed', {
      to: EMAIL_TO,
      error:
        err instanceof Error
          ? { message: err.message, name: err.name }
          : String(err),
    });
  }
}

