export function emailHtml(greeting: string, intro: string, lien: string, label: string): string {
  const frontUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
  <div style="background:#0a7c6e;padding:28px 32px;">
    <span style="font-size:22px;font-weight:700;color:#fff;">steg_form</span>
  </div>
  <div style="padding:36px 32px;">
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${greeting},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${intro}</p>
    <a href="${frontUrl}${lien}" style="display:inline-block;background:#0a7c6e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>
  </div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Cet email a été envoyé automatiquement depuis steg_form.</p>
  </div>
</div>`;
}
