import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Get your Intercom Identity Verification secret from environment variables
  const intercomSecret = process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET;

  if (!intercomSecret) {
    console.error('INTERCOM_IDENTITY_VERIFICATION_SECRET not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // Generate HMAC SHA-256 hash
  const userHash = crypto
    .createHmac('sha256', intercomSecret)
    .update(email)
    .digest('hex');

  res.status(200).json({ user_hash: userHash });
} 