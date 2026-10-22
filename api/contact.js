// POST /api/contact
// Contact Us form on the homepage. Replaces send_email.php, which never ran
// on Vercel (no PHP runtime). Sends through Google Workspace SMTP using an
// App Password, so it needs SMTP_USER and SMTP_PASS set in Vercel.
// CONTACT_TO overrides the recipient (defaults to info@awp.global).

const nodemailer = require("nodemailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  // Hidden field real visitors never fill in; bots usually do.
  if (clean(body?.company, 200)) {
    return res.status(200).json({ status: "success" });
  }

  const name = clean(body?.name, 100).replace(/[\r\n]+/g, " ");
  const email = clean(body?.email, 200);
  const message = clean(body?.message, 5000);

  if (!name || !message || !EMAIL_RE.test(email)) {
    return res
      .status(400)
      .json({ status: "error", message: "Please complete the form and try again." });
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return res.status(503).json({ status: "error", message: "Contact form is not configured" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Altius Website" <${user}>`,
      to: process.env.CONTACT_TO || "info@awp.global",
      replyTo: { name, address: email },
      subject: `New website enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`,
    });
  } catch (err) {
    console.error("contact: sendMail failed", err);
    return res.status(502).json({
      status: "error",
      message: "We couldn't send your message. Please email info@awp.global directly.",
    });
  }

  return res.status(200).json({ status: "success" });
};
