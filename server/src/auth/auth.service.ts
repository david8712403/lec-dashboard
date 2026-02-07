import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const COOKIE_NAME = 'lec_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthSession {
  sub: string;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly secret = process.env.AUTH_SECRET ?? 'dev-secret';
  private readonly channelId =
    process.env.LINE_CHANNEL_ID ??
    process.env.LIFF_ID?.split('-')[0] ??
    '';

  getCookieName() {
    return COOKIE_NAME;
  }

  buildCookie(token: string) {
    const secure = process.env.NODE_ENV === 'production';
    const parts = [
      `${COOKIE_NAME}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
  }

  clearCookie() {
    const parts = [
      `${COOKIE_NAME}=`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=0`,
    ];
    return parts.join('; ');
  }

  signSession(payload: Omit<AuthSession, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const session: AuthSession = {
      ...payload,
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    };
    const encoded = base64UrlEncode(JSON.stringify(session));
    const signature = createHmac('sha256', this.secret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifySession(token?: string | null): AuthSession | null {
    if (!token) return null;
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;
    const expected = createHmac('sha256', this.secret)
      .update(encoded)
      .digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }
    try {
      const payload = JSON.parse(base64UrlDecode(encoded)) as AuthSession;
      if (!payload?.exp || payload.exp * 1000 < Date.now()) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  extractTokenFromRequest(request: any): string | null {
    const authHeader = request?.headers?.authorization ?? '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }
    const cookies = parseCookies(request?.headers?.cookie);
    return cookies[COOKIE_NAME] ?? null;
  }

  getSessionFromRequest(request: any): AuthSession | null {
    const token = this.extractTokenFromRequest(request);
    return this.verifySession(token);
  }

  async verifyLineIdToken(idToken: string) {
    if (!this.channelId) {
      throw new Error('LINE_CHANNEL_ID or LIFF_ID is required.');
    }
    const body = new URLSearchParams({
      id_token: idToken,
      client_id: this.channelId,
    });
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LINE verify failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<{
      sub: string;
      name?: string;
      picture?: string;
      email?: string;
      exp?: number;
      iat?: number;
      aud?: string;
      iss?: string;
    }>;
  }

  async isWhitelisted(lineUid: string) {
    const record = await this.prisma.lineUserWhitelist.findUnique({
      where: { line_uid: lineUid },
    });
    return !!record;
  }

  async upsertLineUser(
    profile: { sub: string; name?: string; picture?: string; email?: string },
    extras?: { profile?: any; decoded?: any },
  ) {
    const lineDisplayName = extras?.profile?.displayName ?? profile.name ?? null;
    const systemDisplayName = extras?.decoded?.system_display_name ?? null;
    const pictureUrl = extras?.profile?.pictureUrl ?? profile.picture ?? null;
    const statusMessage = extras?.profile?.statusMessage ?? null;
    const email = extras?.decoded?.email ?? profile.email ?? null;

    return this.prisma.lineUser.upsert({
      where: { line_uid: profile.sub },
      create: {
        line_uid: profile.sub,
        display_name: lineDisplayName,
        line_display_name: lineDisplayName,
        system_display_name: systemDisplayName ?? lineDisplayName,
        picture_url: pictureUrl,
        status_message: statusMessage,
        email,
        id_token_payload: extras?.decoded ?? profile ?? {},
        profile_payload: extras?.profile ?? null,
        last_login_at: new Date(),
      },
      update: {
        display_name: lineDisplayName,
        line_display_name: lineDisplayName,
        ...(systemDisplayName ? { system_display_name: systemDisplayName } : {}),
        picture_url: pictureUrl,
        status_message: statusMessage,
        email,
        id_token_payload: extras?.decoded ?? profile ?? {},
        profile_payload: extras?.profile ?? null,
        last_login_at: new Date(),
      },
    });
  }

  async updateLineUserDisplayName(lineUid: string, displayName: string) {
    return this.prisma.lineUser.update({
      where: { line_uid: lineUid },
      data: { system_display_name: displayName },
    });
  }

  async getLineUser(lineUid: string) {
    return this.prisma.lineUser.findUnique({
      where: { line_uid: lineUid },
    });
  }
}
