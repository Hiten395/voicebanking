const axios = require('axios');

/**
 * Generate a 6-digit numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to Indian mobile number via Fast2SMS
 * OTP_MODE=fast2sms → real SMS
 * OTP_MODE=console  → print to terminal (local dev / fallback)
 *
 * @param {string} phone - 10-digit Indian number, no +91
 * @param {string} otp   - 6-digit OTP string
 */
const sendOTP = async (phone, otp) => {
  const mode = process.env.OTP_MODE || 'console';

  if (mode === 'fast2sms') {
    try {
      const response = await axios.post(
  'https://www.fast2sms.com/dev/bulkV2',
  {
    route: 'q',                              // ← 'otp' se 'q' karo
    message: `Your VoiceBank OTP is ${otp}. Valid for 5 minutes.`,
    numbers: phone,
    flash: 0,
  },
  {
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      'Content-Type': 'application/json',
    },
  }
);

      if (response.data?.return === true) {
        console.log(`✅ OTP sent via Fast2SMS to ${phone}`);
        return true;
      } else {
        // Fast2SMS returned error response
        console.error('⚠️ Fast2SMS error response:', response.data);
        console.log(`📱 OTP fallback for ${phone}: ${otp}`);
        return true;
      }

    } catch (error) {
  console.error('⚠️ Fast2SMS failed:', error.response?.data); // ← yeh add karo
  console.log(`📱 OTP fallback for ${phone}: ${otp}`);
  return true;
}
  }

  // Console mode — local dev default
  console.log(`\n📱 ══════════════════════════`);
  console.log(`📱  OTP for ${phone}: ${otp}`);
  console.log(`📱 ══════════════════════════\n`);
  return true;
};

module.exports = { generateOTP, sendOTP };