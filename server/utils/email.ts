import nodemailer from 'nodemailer'

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) return null

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer; contentType: string }[]
}): Promise<void> {
  const transporter = createTransporter()

  if (!transporter) {
    console.log('⚠️  GMAIL_USER / GMAIL_APP_PASSWORD non configurés — email non envoyé')
    return
  }

  await transporter.sendMail({
    from: `Skin Guru <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })
}
