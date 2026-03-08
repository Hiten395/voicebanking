const twilio = require('twilio');

/**
 * Generate a 6-digit numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Twilio
 * OTP_MODE=twilio → real SMS
 * OTP_MODE=console  → print to terminal (local dev / fallback)
 *
 * @param {string} phone - 10-digit Indian number, no +91
 * @param {string} otp   - 6-digit OTP string
 */
const sendOTP = async (phone, otp) => {
  const mode = process.env.OTP_MODE || 'console';

  if (mode === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('⚠️ Twilio credentials missing in .env. Falling back to console.');
    } else {
      try {
        const client = twilio(accountSid, authToken);
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

        const message = await client.messages.create({
          body: `Your VoiceBank OTP is ${otp}. Valid for 5 minutes.`,
          from: twilioPhone,
          to: formattedPhone
        });

        console.log(`✅ OTP sent via Twilio to ${formattedPhone} (SID: ${message.sid})`);
        return true;
      } catch (error) {
        console.error('⚠️ Twilio failed:', error.message);
        console.log(`📱 OTP fallback for ${phone}: ${otp}`);
        return true;
      }
    }
  }

  // Console mode — local dev default
  console.log(`\n📱 ══════════════════════════`);
  console.log(`📱  OTP for ${phone}: ${otp}`);
  console.log(`📱 ══════════════════════════\n`);
  return true;
};

module.exports = { generateOTP, sendOTP };