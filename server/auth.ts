import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, UserRole } from '../src/types/pharmacy.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : EPHEMERAL_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function verifyConstantTimeSecret(candidate: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

interface TokenPayload {
  sub: string;
  role: UserRole;
  name: string;
  username: string;
  shift?: string;
  jobTitle?: string;
  exp: number;
}

export function issueToken(user: AuthUser, ttlSeconds = 60 * 60 * 24): string {
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
    shift: user.shift,
    jobTitle: user.jobTitle,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      id: parsed.sub,
      role: parsed.role,
      name: parsed.name,
      username: parsed.username,
      shift: parsed.shift,
      jobTitle: parsed.jobTitle,
    };
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice('Bearer '.length).trim();
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  req.authUser = user;
  next();
}

export function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'owner') {
    return res.status(403).json({ error: 'Owner authorization required' });
  }
  next();
}

export function requireManagerOrOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || (req.authUser.role !== 'owner' && req.authUser.role !== 'manager')) {
    return res.status(403).json({ error: 'Owner or Manager authorization required' });
  }
  next();
}

interface VendorTokenPayload {
  scope: 'vendor_admin';
  exp: number;
}

export function issueVendorToken(ttlSeconds = 60 * 60 * 12): string {
  const payload: VendorTokenPayload = {
    scope: 'vendor_admin',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`vendor:${payloadB64}`)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyVendorToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return false;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`vendor:${payloadB64}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as VendorTokenPayload;
    return parsed.scope === 'vendor_admin' && Boolean(parsed.exp) && parsed.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Developer vendor authentication required' });
  }
  const token = header.slice('Bearer '.length).trim();
  if (!verifyVendorToken(token)) {
    return res.status(401).json({ error: 'Vendor session expired or invalid' });
  }
  next();
}
