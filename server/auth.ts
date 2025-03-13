import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import nodemailer from 'nodemailer';

// Password hashing
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  next();
}

// Email verification
export async function sendVerificationEmail(email: string, token: string) {
  // For development, log the verification link instead of sending an email
  const verificationLink = `http://localhost:5000/api/verify-email?token=${token}`;
  
  // In production, you would configure a real email service
  console.log(`Verification link (for ${email}): ${verificationLink}`);

  // Simulating email delivery
  return true;
}

// Session utilities
export async function createUserSession(req: Request, userId: number) {
  req.session.userId = userId;
}

export async function clearUserSession(req: Request) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
  });
}

// Get current user helper
export async function getCurrentUser(req: Request) {
  const userId = req.session?.userId;
  if (!userId) return null;
  
  return await storage.getUser(userId);
}