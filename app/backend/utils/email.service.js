const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For production, use actual SMTP credentials
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // For development - use Ethereal Email (fake SMTP)
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || 'test@ethereal.email',
      pass: process.env.ETHEREAL_PASS || 'testpass'
    }
  });
};

let transporter = null;

const getTransporter = async () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// Send email with OTP (displays in terminal for testing)
const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject = type === 'password_reset'
    ? 'Password Reset OTP - College Events'
    : 'Email Verification OTP - College Events';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">College Event Management System</h2>
      <p>Hello,</p>
      <p>Your OTP for ${type === 'password_reset' ? 'password reset' : 'email verification'} is:</p>
      <div style="background: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #4F46E5; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
      <p style="color: #6B7280; font-size: 12px;">
        This is an automated email from the Engineering College Event Management System.
      </p>
    </div>
  `;

  const text = `Your OTP is: ${otp}. This OTP will expire in 5 minutes.`;

  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: process.env.FROM_EMAIL || 'College Events <noreply@college.edu>',
      to: email,
      subject,
      text,
      html
    });

    // ALWAYS display OTP in terminal for testing
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL OTP SENT');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Type: ${type}`);
    console.log(`OTP: ${otp}`);
    console.log(`Subject: ${subject}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('Email sending error:', error);

    // Still display OTP in terminal even if email fails
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL OTP (DISPLAY ONLY - EMAIL FAILED)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Type: ${type}`);
    console.log(`OTP: ${otp}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true, // Return true so user can still use OTP from terminal
      otp, // Return OTP for testing
      error: error.message
    };
  }
};

// Send approval notification
const sendApprovalEmail = async (email, name, status, role) => {
  const subject = status === 'approved'
    ? 'Account Approved - College Events'
    : 'Account Update - College Events';

  const html = status === 'approved'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Account Approved!</h2>
        <p>Hello ${name},</p>
        <p>Your ${role} account has been <strong>approved</strong> by the administrator.</p>
        <p>You can now log in and start using the system.</p>
        <a href="${process.env.FRONTEND_URL}/login" 
           style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Login Now
        </a>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Account Status Update</h2>
        <p>Hello ${name},</p>
        <p>Your ${role} account has been <strong>${status}</strong>.</p>
        <p>If you have any questions, please contact the administrator.</p>
      </div>
    `;

  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: process.env.FROM_EMAIL || 'College Events <noreply@college.edu>',
      to: email,
      subject,
      html
    });

    console.log(`Approval email sent to ${email}: ${status}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Approval email error:', error);
    return { success: false, error: error.message };
  }
};

// Send event notification
const sendEventEmail = async (email, name, eventTitle, type = 'registration') => {
  const subjects = {
    registration: 'Event Registration Confirmed',
    reminder: 'Event Reminder',
    cancellation: 'Event Cancelled'
  };

  const templates = {
    registration: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Registration Confirmed!</h2>
        <p>Hello ${name},</p>
        <p>You have successfully registered for <strong>${eventTitle}</strong>.</p>
        <p>Your ticket is available in your dashboard.</p>
      </div>
    `,
    reminder: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Event Reminder</h2>
        <p>Hello ${name},</p>
        <p>This is a reminder for <strong>${eventTitle}</strong> happening soon.</p>
        <p>Don't forget to bring your ticket!</p>
      </div>
    `,
    cancellation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Event Cancelled</h2>
        <p>Hello ${name},</p>
        <p>We regret to inform you that <strong>${eventTitle}</strong> has been cancelled.</p>
        <p>If you paid for this event, a refund will be processed shortly.</p>
      </div>
    `
  };

  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: process.env.FROM_EMAIL || 'College Events <noreply@college.edu>',
      to: email,
      subject: subjects[type],
      html: templates[type]
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Event email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendApprovalEmail,
  sendEventEmail
};
