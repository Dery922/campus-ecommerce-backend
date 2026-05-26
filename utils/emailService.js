// src/services/emailService.js
import nodemailer from "nodemailer";

// 1. Configure the SMTP Server connection details
// For development, we create an automatic fake account. 
// For production, swap this with your real SMTP settings (Gmail, SendGrid, Mailgun etc.)
const createTransporter = async () => {
  // Generates a mock account on the fly for safe development testing
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: testAccount.user, // Swap with process.env.EMAIL_USER in production
      pass: testAccount.pass, // Swap with process.env.EMAIL_PASS in production
    },
  });
};

/**
 * Core function to dispatch the 6-digit OTP email to the user
 */
export const sendOtpEmail = async (targetEmail, otpCode) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: '"Campus Media App" <security@campusmedia.com>', 
      to: targetEmail,
      subject: "Your Password Reset Verification Code",
      text: `Your password reset verification code is: ${otpCode}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your account password. Use the verification code below to proceed:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 20px 0; color: #1E3A8A;">
            ${otpCode}
          </div>
          <p>This code is security-sensitive and will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // 📋 DEVELOPMENT EXTRA: Prints a real web browser link to preview your email message!
    console.log(`\n📬 [EMAIL SENT] Preview available at: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error("Nodemailer Email Error:", error);
    throw new Error("Failed to send verification email.");
  }
};
