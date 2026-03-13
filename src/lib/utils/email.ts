import nodemailer from 'nodemailer';

const EMAIL_TO = process.env.LOG_EMAIL_TO || 'rusakvtl666@gmail.com';

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
  } catch {
    // don't crash logger on email errors
  }
}

