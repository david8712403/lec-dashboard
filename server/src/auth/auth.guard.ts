import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request?.method ?? '';
    const url = request?.url ?? '';

    if (method === 'OPTIONS') return true;
    if (url.startsWith('/api/auth')) return true;

    const session = this.authService.getSessionFromRequest(request);
    if (!session) {
      throw new UnauthorizedException('未登入或權限不足');
    }
    request.user = session;
    return true;
  }
}
