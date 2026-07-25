export const getWelcomeTemplate = (fullName) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #0d0f14; color: #f0f2f5; margin: 0; padding: 20px; }
    .card { background-color: #161a23; padding: 20px; border-radius: 8px; border: 1px solid #2a3140; max-width: 600px; margin: 0 auto; }
    h1 { color: #7c5cbf; font-family: 'Syne', sans-serif; }
    p { line-height: 1.6; color: #8a94a6; }
    .footer { font-size: 12px; color: #4a5568; margin-top: 20px; border-top: 1px solid #2a3140; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to Flare</h1>
    <p>Hello ${fullName},</p>
    <p>Thank you for registering with Flare. Our app is dedicated to providing swift emergency response and real-time safety tracking for women.</p>
    <p>Please log in to customize your safety profile and add emergency contacts so you are fully prepared.</p>
    <div class="footer">
      This is an automated message from Flare. Please do not reply.
    </div>
  </div>
</body>
</html>
`;

export const getPasswordResetTemplate = (resetUrl) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #0d0f14; color: #f0f2f5; margin: 0; padding: 20px; }
    .card { background-color: #161a23; padding: 20px; border-radius: 8px; border: 1px solid #2a3140; max-width: 600px; margin: 0 auto; }
    h1 { color: #7c5cbf; }
    p { line-height: 1.6; color: #8a94a6; }
    .btn { display: inline-block; background-color: #7c5cbf; color: #f0f2f5; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
    .footer { font-size: 12px; color: #4a5568; margin-top: 20px; border-top: 1px solid #2a3140; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Password Reset Request</h1>
    <p>We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
    <a class="btn" href="${resetUrl}" target="_blank">Reset Password</a>
    <p>If you did not make this request, please ignore this email.</p>
    <div class="footer">
      This is an automated message from Flare. Please do not reply.
    </div>
  </div>
</body>
</html>
`;

export const getSosAlertTemplate = (fullName, locationUrl) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #0d0f14; color: #f0f2f5; margin: 0; padding: 20px; }
    .card { background-color: #161a23; padding: 20px; border-radius: 8px; border: 2px solid #c0392b; max-width: 600px; margin: 0 auto; }
    h1 { color: #c0392b; text-transform: uppercase; letter-spacing: 1px; }
    p { line-height: 1.6; color: #8a94a6; }
    .btn { display: inline-block; background-color: #c0392b; color: #f0f2f5; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; font-weight: bold; }
    .footer { font-size: 12px; color: #4a5568; margin-top: 20px; border-top: 1px solid #2a3140; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Emergency Alert (SOS)</h1>
    <p>Dear Emergency Contact,</p>
    <p><strong>${fullName}</strong> has triggered an SOS alert! They may be in danger and need your assistance immediately.</p>
    <p>You can view their real-time location and response tracking at the following link:</p>
    <a class="btn" href="${locationUrl}" target="_blank">View Live Tracking Map</a>
    <p>Please contact emergency services (police, medical) if you cannot reach them directly.</p>
    <div class="footer">
      This is an automated high-priority safety alert from Flare.
    </div>
  </div>
</body>
</html>
`;

export default {
  getWelcomeTemplate,
  getPasswordResetTemplate,
  getSosAlertTemplate,
};
