const shell = (title, body) => `
<div style="font-family:Segoe UI,Arial,sans-serif;background:#f6f4f0;padding:32px">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:20px;padding:36px;border:1px solid #ece8e1">
    <div style="font-size:22px;font-weight:700;color:#4f46e5;margin-bottom:18px">● Connectly</div>
    <h2 style="margin:0 0 12px;color:#17151c">${title}</h2>
    ${body}
    <p style="color:#9a95a3;font-size:12px;margin-top:28px">If you didn't request this, you can safely ignore this email.</p>
  </div>
</div>`

export const otpEmail = (name, otp) => ({
  subject: `${otp} is your Connectly verification code`,
  text: `Hi ${name}, your Connectly verification code is ${otp}. It expires in 10 minutes.`,
  html: shell(
    'Verify your email',
    `<p style="color:#55515e">Hi ${name}, enter this code to finish creating your account:</p>
     <div style="font-size:34px;letter-spacing:10px;font-weight:700;color:#17151c;background:#f3f1ff;border-radius:14px;padding:16px;text-align:center">${otp}</div>
     <p style="color:#55515e">This code expires in 10 minutes.</p>`
  ),
})

export const resetEmail = (name, link) => ({
  subject: 'Reset your Connectly password',
  text: `Hi ${name}, reset your password using this link (valid for 30 minutes): ${link}`,
  html: shell(
    'Reset your password',
    `<p style="color:#55515e">Hi ${name}, click the button below to choose a new password. The link is valid for 30 minutes.</p>
     <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 24px;border-radius:12px;font-weight:600">Reset password</a>
     <p style="color:#9a95a3;font-size:12px;word-break:break-all">Or paste this link: ${link}</p>`
  ),
})
