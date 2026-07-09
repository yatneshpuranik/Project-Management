import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('SMTP_USER loaded:', !!process.env.SMTP_USER);
console.log('SMTP_PASS loaded:', !!process.env.SMTP_PASS);
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length || 0);
console.log('SMTP_FROM loaded:', !!process.env.SMTP_FROM);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Transporter Verification Failed on Startup:', error.message || error);
  } else {
    console.log('SMTP Transporter Connection verified successfully on Startup.');
  }
});

// Shared Layout Wrapper
const getSharedLayout = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkSync</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.05em;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
    }
    .content h2 {
      margin-top: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
    }
    .content p {
      margin: 0 0 16px;
      color: #9ca3af;
      font-size: 14px;
    }
    .content ul {
      margin: 0 0 20px;
      padding-left: 20px;
      color: #9ca3af;
      font-size: 14px;
    }
    .content li {
      margin-bottom: 8px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #38bdf8;
      color: #0b0f19 !important;
      font-weight: 700;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
      font-size: 14px;
    }
    .footer {
      background-color: #0b0f19;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #1f2937;
      font-size: 12px;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>WorkSync</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; 2026 WorkSync. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// Helper to send general mail
const sendEmail = async ({ to, subject, html }) => {
  try {
    // Run transporter.verify() before sending email
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'WorkSync'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Nodemailer Error sending email:', error);
    throw error;
  }
};

// 1. Registration Verification
export const sendVerificationEmail = async (to, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const html = getSharedLayout(`
    <h2>Verify your email address</h2>
    <p>Hi ${name},</p>
    <p>Welcome to WorkSync! Please click the button below to verify your email address and activate your account.</p>
    <div class="button-container">
      <a href="${verificationUrl}" class="button">Verify Email</a>
    </div>
    <p>This verification link will expire in 24 hours and can only be used once.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `);
  return sendEmail({ to, subject: 'Verify your email address - WorkSync', html });
};

// 2. Invitation
export const sendInvitationEmail = async (to, senderName, boardTitle, token, isRegistered) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = isRegistered
    ? getSharedLayout(`
        <h2>You've been invited to join a Workspace</h2>
        <p>Hello,</p>
        <p><strong>${senderName}</strong> has invited you to join Workspace <strong>"${boardTitle}"</strong> on WorkSync.</p>
        <p>Please click the button below to view and accept your invitation in the app.</p>
        <div class="button-container">
          <a href="${frontendBase}/boards" class="button">Accept Invitation</a>
        </div>
      `)
    : getSharedLayout(`
        <h2>You've been invited to join WorkSync</h2>
        <p>Hello,</p>
        <p><strong>${senderName}</strong> has invited you to join Workspace <strong>"${boardTitle}"</strong> on WorkSync.</p>
        <p>Since you don't have an account yet, click the button below to register and collaborate. Your invitation will be accepted automatically upon registration.</p>
        <div class="button-container">
          <a href="${frontendBase}/login?inviteToken=${token}" class="button">Register to Join</a>
        </div>
        <p>Invitation Token: <code>${token}</code></p>
      `);

  const subject = isRegistered
    ? `You have been invited to join Workspace "${boardTitle}"`
    : `You have been invited to join WorkSync`;

  return sendEmail({ to, subject, html });
};

// 3. Workspace Created
export const sendWorkspaceCreatedEmail = async (to, ownerName, boardName, boardId, time) => {
  const html = getSharedLayout(`
    <h2>Your Workspace has been created</h2>
    <p>Hi ${ownerName},</p>
    <p>Your new workspace <strong>"${boardName}"</strong> has been created successfully!</p>
    <p>Details:</p>
    <ul>
      <li><strong>Workspace Name:</strong> ${boardName}</li>
      <li><strong>Workspace ID:</strong> ${boardId}</li>
      <li><strong>Creation Time:</strong> ${time}</li>
    </ul>
    <p>You can now start creating columns, adding tasks, and inviting team members to collaborate.</p>
  `);
  return sendEmail({ to, subject: 'Your Workspace has been created', html });
};

// 4. Ownership Transfer
export const sendOwnershipTransferEmail = async (oldOwnerEmail, oldOwnerName, newOwnerEmail, newOwnerName, boardName, time) => {
  const p1 = sendEmail({
    to: oldOwnerEmail,
    subject: `Workspace Ownership Transferred - "${boardName}"`,
    html: getSharedLayout(`
      <h2>Workspace Ownership Transferred</h2>
      <p>Hi ${oldOwnerName},</p>
      <p>This is to confirm that ownership of the workspace <strong>"${boardName}"</strong> has been successfully transferred to <strong>${newOwnerName}</strong>.</p>
      <p>Transfer Details:</p>
      <ul>
        <li><strong>Workspace:</strong> ${boardName}</li>
        <li><strong>Previous Owner:</strong> ${oldOwnerName}</li>
        <li><strong>New Owner:</strong> ${newOwnerName}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
      <p>Your administrative permissions for this workspace have been revoked. You remain a member of the workspace.</p>
    `)
  });

  const p2 = sendEmail({
    to: newOwnerEmail,
    subject: `You are now the Owner of Workspace "${boardName}"`,
    html: getSharedLayout(`
      <h2>Workspace Ownership Transferred</h2>
      <p>Hi ${newOwnerName},</p>
      <p>You have been transferred ownership of workspace <strong>"${boardName}"</strong> by <strong>${oldOwnerName}</strong>.</p>
      <p>Transfer Details:</p>
      <ul>
        <li><strong>Workspace:</strong> ${boardName}</li>
        <li><strong>Previous Owner:</strong> ${oldOwnerName}</li>
        <li><strong>New Owner:</strong> ${newOwnerName}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
      <p>You now have full administrator capabilities for this workspace, including inviting members, deleting the workspace, and managing roles.</p>
    `)
  });

  return Promise.all([p1, p2]);
};

// 5. Ownership Revoked / Removal
export const sendOwnershipRevokedEmail = async (to, name, boardName, reason, currentOwnerName) => {
  const html = getSharedLayout(`
    <h2>Workspace Ownership Updated</h2>
    <p>Hi ${name},</p>
    <p>Your ownership of the workspace <strong>"${boardName}"</strong> has been transferred away.</p>
    <p>Details:</p>
    <ul>
      <li><strong>Workspace:</strong> ${boardName}</li>
      <li><strong>Current Owner:</strong> ${currentOwnerName}</li>
      <li><strong>Reason:</strong> ${reason || 'Ownership transfer requested'}</li>
    </ul>
    <p>Your administrative permissions for this workspace have been updated. You remain a member of the workspace.</p>
  `);
  return sendEmail({ to, subject: `Workspace Ownership Updated - "${boardName}"`, html });
};

// 6. Invitation Status (Accepted / Rejected / Revoked)
export const sendInvitationStatusEmail = async (status, ownerEmail, ownerName, inviteeEmail, inviteeName, boardName) => {
  if (status === 'accepted') {
    const p1 = sendEmail({
      to: ownerEmail,
      subject: `Invitation Accepted - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Invitation Accepted</h2>
        <p>Hi ${ownerName},</p>
        <p><strong>${inviteeName}</strong> has accepted your invitation to join workspace <strong>"${boardName}"</strong>.</p>
      `)
    });
    const p2 = sendEmail({
      to: inviteeEmail,
      subject: `Joined Workspace - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Joined Workspace Successfully</h2>
        <p>Hi ${inviteeName},</p>
        <p>You have successfully joined the workspace <strong>"${boardName}"</strong> owned by <strong>${ownerName}</strong>.</p>
      `)
    });
    return Promise.all([p1, p2]);
  } else if (status === 'rejected') {
    const p1 = sendEmail({
      to: ownerEmail,
      subject: `Invitation Declined - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Invitation Declined</h2>
        <p>Hi ${ownerName},</p>
        <p><strong>${inviteeName}</strong> has declined your invitation to join workspace <strong>"${boardName}"</strong>.</p>
      `)
    });
    const p2 = sendEmail({
      to: inviteeEmail,
      subject: `Declined Invitation - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Invitation Declined</h2>
        <p>Hi ${inviteeName},</p>
        <p>You have declined the invitation to join the workspace <strong>"${boardName}"</strong> owned by <strong>${ownerName}</strong>.</p>
      `)
    });
    return Promise.all([p1, p2]);
  } else if (status === 'revoked') {
    const p1 = sendEmail({
      to: ownerEmail,
      subject: `Invitation Revoked - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Invitation Revoked</h2>
        <p>Hi ${ownerName},</p>
        <p>You have successfully revoked the pending invitation for <strong>${inviteeName}</strong> to join workspace <strong>"${boardName}"</strong>.</p>
      `)
    });
    const p2 = sendEmail({
      to: inviteeEmail,
      subject: `Invitation Revoked - "${boardName}"`,
      html: getSharedLayout(`
        <h2>Invitation Revoked</h2>
        <p>Hi ${inviteeName},</p>
        <p>Your pending invitation to join workspace <strong>"${boardName}"</strong> has been revoked by the owner.</p>
      `)
    });
    return Promise.all([p1, p2]);
  }
};

// 7. Password Reset
export const sendPasswordResetEmail = async (to, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = getSharedLayout(`
    <h2>Reset your password</h2>
    <p>Hi ${name},</p>
    <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
    <p>Please click the button below to choose a new password:</p>
    <div class="button-container">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `);
  return sendEmail({ to, subject: 'Reset your password - WorkSync', html });
};

// 8. Email Changed
export const sendEmailChangedEmail = async (to, name) => {
  const html = getSharedLayout(`
    <h2>Email Address Changed</h2>
    <p>Hi ${name},</p>
    <p>This is a confirmation email to notify you that your WorkSync account email address was successfully updated.</p>
    <p>If you did not make this change, please contact platform security immediately.</p>
  `);
  return sendEmail({ to, subject: 'Email address updated - WorkSync', html });
};
