import nodemailer from "nodemailer"

type SendEmailArgs = {
  to: string
  subject: string
  text: string
  html?: string
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true"

  if (!host || !port || !user || !pass || !from) return null
  if (!Number.isFinite(port)) return null

  return { host, port, user, pass, from, secure }
}

export async function sendEmail({ to, subject, text, html }: SendEmailArgs) {
  const smtp = getSmtpConfig()
  if (!smtp) {
    const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL)
    if (isProd) {
      return {
        ok: false as const,
        mode: "missing_smtp" as const,
        error: "Email is not configured (set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM).",
      }
    }

    // Dev/test fallback: don't fail the whole flow.
    console.log("[email] SMTP not configured; would send:", { to, subject, text })
    return { ok: true as const, mode: "dev_log" as const }
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  })

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html,
  })

  return { ok: true as const, mode: "smtp" as const }
}
