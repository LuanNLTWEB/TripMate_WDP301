import nodemailer from 'nodemailer';

/**
 * Send email utility with dev console fallback
 * @param {Object} options { to, subject, html, text }
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // Development fallback: if no email credentials configured, log clearly in terminal
  if (!emailUser || !emailPass) {
    console.log('\n================== [DEV EMAIL SERVICE] ==================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('---------------------------------------------------------');
    console.log(text || html);
    console.log('=========================================================\n');
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  const mailOptions = {
    from: `"TripMate Support" <${emailUser}>`,
    to,
    subject,
    text: text || '',
    html: html || ''
  };

  await transporter.sendMail(mailOptions);
  return true;
};

export default sendEmail;
