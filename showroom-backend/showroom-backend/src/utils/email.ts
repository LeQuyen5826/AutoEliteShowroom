import https from 'https'

function postJson(url: string, headers: Record<string, string>, body: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, response => {
      let raw = ''
      response.on('data', chunk => { raw += chunk })
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) resolve()
        else reject(new Error(`Email API lỗi ${response.statusCode}: ${raw.slice(0, 500)}`))
      })
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => req.destroy(new Error('Email API timeout')))
    req.write(payload)
    req.end()
  })
}

/**
 * Gửi email qua Resend nếu được cấu hình. Ở development, URL vẫn được log
 * để giảng viên có thể kiểm thử mà không cần dịch vụ email bên ngoài.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESET_FROM_EMAIL?.trim()

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PasswordReset] ${email}: ${resetUrl}`)
    }
    return false
  }

  await postJson('https://api.resend.com/emails', {
    Authorization: `Bearer ${apiKey}`,
  }, {
    from,
    to: [email],
    subject: 'Đặt lại mật khẩu AutoElite Showroom',
    html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu AutoElite Showroom.</p>
      <p><a href="${resetUrl}">Nhấn vào đây để đặt mật khẩu mới</a></p>
      <p>Liên kết có hiệu lực trong 15 phút và chỉ sử dụng được một lần.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
    `,
  })
  return true
}
