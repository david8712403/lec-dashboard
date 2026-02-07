import { Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body()
    body: {
      id_token?: string;
      idToken?: string;
      profile?: any;
      decoded?: any;
    },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const idToken = body?.id_token ?? body?.idToken;
    if (!idToken) {
      throw new UnauthorizedException('缺少 id_token');
    }
    const profile = await this.authService.verifyLineIdToken(idToken);
    await this.authService.upsertLineUser(profile, {
      profile: body.profile,
      decoded: body.decoded,
    });
    const allowed = await this.authService.isWhitelisted(profile.sub);
    if (!allowed) {
      throw new UnauthorizedException('無權限存取');
    }
    const token = this.authService.signSession({
      sub: profile.sub,
      name: profile.name,
      picture: profile.picture,
    });
    reply.header('Set-Cookie', this.authService.buildCookie(token));
    return {
      ok: true,
      user: {
        sub: profile.sub,
        name: profile.name,
        picture: profile.picture,
      },
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.header('Set-Cookie', this.authService.clearCookie());
    return { ok: true };
  }

  @Get('me')
  async me(@Req() request: FastifyRequest) {
    const session = this.authService.getSessionFromRequest(request);
    if (!session) {
      throw new UnauthorizedException('未登入或權限不足');
    }
    const lineUser = await this.authService.getLineUser(session.sub);
    return {
      ok: true,
      user: {
        sub: session.sub,
        name: lineUser?.system_display_name ?? lineUser?.line_display_name ?? lineUser?.display_name ?? session.name ?? '',
        picture: lineUser?.picture_url ?? session.picture ?? null,
      },
    };
  }

  @Patch('profile')
  async updateProfile(
    @Req() request: FastifyRequest,
    @Body() payload: { display_name?: string },
  ) {
    const session = this.authService.getSessionFromRequest(request);
    if (!session) {
      throw new UnauthorizedException('未登入或權限不足');
    }
    const name = String(payload.display_name ?? '').trim();
    if (!name) {
      throw new UnauthorizedException('顯示名稱不得為空');
    }
    const updated = await this.authService.updateLineUserDisplayName(session.sub, name);
    return {
      ok: true,
      user: {
        sub: session.sub,
        name: updated.system_display_name ?? updated.line_display_name ?? updated.display_name ?? session.name,
        picture: updated.picture_url ?? session.picture ?? null,
      },
    };
  }
}
