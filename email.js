const nodemailer = require('nodemailer');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporterPromise = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporterPromise;
  }

  console.log('📧 SMTP não configurado. Criando conta Ethereal...');
  const account = await nodemailer.createTestAccount();
  transporterPromise = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
  console.log('📧 Ethereal email: ' + account.user);
  return transporterPromise;
}

async function sendVerificationEmail(email, token, username) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const link = `${baseUrl}/verify-email?token=${token}`;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"AdultHub" <noreply@adulthub.com>',
    to: email,
    subject: 'Confirme seu email - AdultHub',
    html: `
      <div style="max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0a12;color:#f0eef5;font-family:sans-serif;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:32px;color:#e82c5f">◆</span>
          <h1 style="font-size:20px;font-weight:800;margin:8px 0 0;letter-spacing:-0.5px">AdultHub</h1>
        </div>
        <p style="font-size:14px;margin-bottom:8px">Olá <strong>${username}</strong>,</p>
        <p style="font-size:14px;color:#9a94b0;line-height:1.7;margin-bottom:24px">
          Clique no botão abaixo para confirmar seu email e ativar sua conta:
        </p>
        <div style="text-align:center;margin-bottom:28px">
          <a href="${link}" style="display:inline-block;padding:14px 32px;background:#e82c5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
            Confirmar Email
          </a>
        </div>
        <p style="font-size:12px;color:#5c5570;margin-bottom:4px">
          Se você não criou uma conta, ignore este email.
        </p>
        <p style="font-size:12px;color:#5c5570">
          Link expira em 24 horas.
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.05);margin:24px 0" />
        <p style="font-size:11px;color:#5c5570;text-align:center">
          AdultHub · Conteúdo Premium 18+
        </p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log('📧 Email de verificação (Ethereal): ' + nodemailer.getTestMessageUrl(info));
  }
  return info;
}

async function sendPasswordResetEmail(email, token, username) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"AdultHub" <noreply@adulthub.com>',
    to: email,
    subject: 'Redefinir senha - AdultHub',
    html: `
      <div style="max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0a12;color:#f0eef5;font-family:sans-serif;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:32px;color:#e82c5f">◆</span>
          <h1 style="font-size:20px;font-weight:800;margin:8px 0 0;letter-spacing:-0.5px">AdultHub</h1>
        </div>
        <p style="font-size:14px;margin-bottom:8px">Olá <strong>${username}</strong>,</p>
        <p style="font-size:14px;color:#9a94b0;line-height:1.7;margin-bottom:24px">
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align:center;margin-bottom:28px">
          <a href="${link}" style="display:inline-block;padding:14px 32px;background:#e82c5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
            Redefinir Senha
          </a>
        </div>
        <p style="font-size:12px;color:#5c5570;margin-bottom:4px">
          Se você não solicitou esta alteração, ignore este email.
        </p>
        <p style="font-size:12px;color:#5c5570">
          Link expira em 1 hora.
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.05);margin:24px 0" />
        <p style="font-size:11px;color:#5c5570;text-align:center">
          AdultHub · Conteúdo Premium 18+
        </p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log('📧 Email de redefinição (Ethereal): ' + nodemailer.getTestMessageUrl(info));
  }
  return info;
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
