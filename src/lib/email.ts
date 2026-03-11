import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.EMAIL_USER ?? process.env.SMTP_USER;
const FROM_PASSWORD = process.env.EMAIL_PASS ?? process.env.SMTP_PASS;

if (!FROM_EMAIL || !FROM_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn(
    '[email] EMAIL_USER/EMAIL_PASS (или SMTP_USER/SMTP_PASS) не заданы. Отправка писем не будет работать.'
  );
}

const transporter =
  FROM_EMAIL && FROM_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: FROM_EMAIL,
          pass: FROM_PASSWORD,
        },
      })
    : null;

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!transporter || !FROM_EMAIL) {
    throw new Error('EMAIL_USER/EMAIL_PASS не настроены на сервере');
  }

  await transporter.sendMail({
    from: `"AgentWallet" <${FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? `<pre>${options.text}</pre>`,
  });
}

