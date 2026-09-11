import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendOTP } from '../lib/email.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, department_id, role = 'visitor', roll_number } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma.host.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    let assignedRole: 'admin' | 'guard' | 'host' | 'visitor' | 'student' = 'visitor';
    let cleanRoll: string | null = null;
    let userName = name;

    if (role === 'student') {
      if (!roll_number || typeof roll_number !== 'string' || !roll_number.trim()) {
        return res.status(400).json({ error: 'College Roll Number is required for student registration.' });
      }

      cleanRoll = roll_number.trim().toUpperCase();

      const studentProfile = await prisma.student.findUnique({
        where: { roll_number: cleanRoll },
      });

      if (!studentProfile) {
        return res.status(400).json({
          error: `Verification Failed: Roll Number "${cleanRoll}" is not found in the College Student Directory. Please contact the Hostel Warden / Administration Office.`,
        });
      }

      const studentEmail = (studentProfile.email || '').toLowerCase().trim();
      if (studentEmail && studentEmail !== cleanEmail) {
        return res.status(400).json({
          error: `Verification Failed: Email address (${cleanEmail}) does not match the official student email registered in directory (${studentEmail}) for Roll Number "${cleanRoll}".`,
        });
      }

      const existingRollUser = await prisma.host.findUnique({
        where: { roll_number: cleanRoll },
      });

      if (existingRollUser) {
        return res.status(409).json({
          error: `An account has already been registered with Roll Number "${cleanRoll}". If this is your roll number, please log in or reset your password.`,
        });
      }

      assignedRole = 'student';
      userName = studentProfile.name;
    } else if (role === 'host' || role === 'guard' || role === 'admin') {
      assignedRole = role === 'host' ? 'host' : 'visitor';
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000);

    const host = await prisma.host.create({
      data: {
        email: cleanEmail,
        name: userName,
        password_hash,
        department_id: department_id || null,
        roll_number: cleanRoll,
        role: assignedRole,
        is_verified: false,
        otp,
        otp_expiry,
      },
    });

    try {
      await sendOTP(host.email, otp);
    } catch (err) {
      console.error('Failed to send OTP on signup:', err);
    }

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      requiresVerification: true,
      email: host.email,
    });
  } catch (err) {
    console.error('[Auth Signup Error]', err);
    res.status(500).json({
      error: 'Failed to create account',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const host = await prisma.host.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!host || !host.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, host.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!host.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    if (!host.is_verified) {
      return res.status(403).json({
        error: 'Account not verified. Please verify your email.',
        requiresVerification: true,
      });
    }

    const token = jwt.sign({ userId: host.id, role: host.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      token,
      user: {
        id: host.id,
        name: host.name,
        email: host.email,
        role: host.role,
        department_id: host.department_id,
        roll_number: host.roll_number,
      },
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({
      error: 'Failed to login',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const host = await prisma.host.findUnique({
      where: { id: req.user!.id },
      include: { department: { select: { name: true } } },
    });

    if (!host) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(host);
  } catch (err) {
    console.error('[API GET /auth/me]', err);
    res.status(500).json({
      error: 'Failed to authenticate token',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const host = await prisma.host.findUnique({ where: { id: userId } });
    if (!host) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, host.password_hash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.host.update({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[API POST /auth/change-password]', err);
    res.status(500).json({
      error: 'Failed to update password',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const host = await prisma.host.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!host) return res.status(404).json({ error: 'User not found' });

    if (host.is_verified) return res.status(400).json({ error: 'Already verified' });
    if (host.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!host.otp_expiry || new Date() > host.otp_expiry) return res.status(400).json({ error: 'OTP expired' });

    await prisma.host.update({
      where: { id: host.id },
      data: { is_verified: true, otp: null, otp_expiry: null },
    });

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[Auth Verify OTP Error]', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const host = await prisma.host.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!host) {
      return res.status(200).json({ success: true, message: 'If the email exists, an OTP was sent.' });
    }

    const otp = generateOTP();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.host.update({
      where: { id: host.id },
      data: { otp, otp_expiry },
    });

    await sendOTP(host.email, otp);

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('[Auth Forgot Password Error]', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' });

    const host = await prisma.host.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!host) return res.status(404).json({ error: 'User not found' });

    if (host.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!host.otp_expiry || new Date() > host.otp_expiry) return res.status(400).json({ error: 'OTP expired' });

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.host.update({
      where: { id: host.id },
      data: { password_hash, otp: null, otp_expiry: null, is_verified: true },
    });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('[Auth Reset Password Error]', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    const { email, name, sub: google_id } = payload;
    const cleanEmail = email.toLowerCase().trim();
    let host = await prisma.host.findUnique({ where: { email: cleanEmail } });

    const matchedStudent = await prisma.student.findUnique({ where: { email: cleanEmail } });

    if (host) {
      if (!host.google_id || (matchedStudent && host.role !== 'student')) {
        host = await prisma.host.update({
          where: { id: host.id },
          data: {
            google_id,
            is_verified: true,
            ...(matchedStudent ? { role: 'student', roll_number: matchedStudent.roll_number, name: matchedStudent.name } : {}),
          },
        });
      }
    } else {
      host = await prisma.host.create({
        data: {
          email: cleanEmail,
          name: matchedStudent ? matchedStudent.name : (name || 'Google User'),
          google_id,
          role: matchedStudent ? 'student' : 'visitor',
          roll_number: matchedStudent?.roll_number || null,
          is_verified: true,
        },
      });
    }

    if (!host.active) return res.status(403).json({ error: 'Account is deactivated' });

    const token = jwt.sign({ userId: host.id, role: host.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      token,
      user: {
        id: host.id,
        name: host.name,
        email: host.email,
        role: host.role,
        department_id: host.department_id,
        roll_number: host.roll_number,
      },
    });
  } catch (err) {
    console.error('[Auth Google Error]', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

router.post('/claim-student', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { roll_number } = req.body;
    if (!roll_number || typeof roll_number !== 'string' || !roll_number.trim()) {
      return res.status(400).json({ error: 'College Roll Number is required.' });
    }

    const cleanRoll = roll_number.trim().toUpperCase();

    const student = await prisma.student.findUnique({
      where: { roll_number: cleanRoll },
    });

    if (!student) {
      return res.status(404).json({
        error: `Not found in Student Directory: Roll Number "${cleanRoll}" is not registered in the student directory. Please contact the Hostel Warden / Administration Office.`,
      });
    }

    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const studentEmail = (student.email || '').toLowerCase().trim();

    if (!userEmail || !studentEmail || userEmail !== studentEmail) {
      return res.status(403).json({
        error: `Email Verification Failed: Your account email (${userEmail || 'unknown'}) does not match the official student directory email (${studentEmail}) registered for Roll Number "${cleanRoll}". Student pass can only be claimed if your account email matches the student directory.`,
      });
    }

    const existingClaim = await prisma.host.findFirst({
      where: {
        roll_number: cleanRoll,
        id: { not: req.user!.id },
      },
    });

    if (existingClaim) {
      return res.status(409).json({
        error: `Roll Number "${cleanRoll}" has already been linked to another account.`,
      });
    }

    const updatedUser = await prisma.host.update({
      where: { id: req.user!.id },
      data: {
        role: 'student',
        roll_number: cleanRoll,
        name: student.name,
      },
    });

    const token = jwt.sign({ userId: updatedUser.id, role: updatedUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Successfully verified as Resident Student (${student.name}, ${student.roll_number}). Your role has been switched to Student and your Student GatePass is active!`,
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        roll_number: updatedUser.roll_number,
        department_id: updatedUser.department_id,
      },
      student,
    });
  } catch (err) {
    console.error('[API POST /auth/claim-student]', err);
    res.status(500).json({
      error: 'Failed to claim student pass',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
