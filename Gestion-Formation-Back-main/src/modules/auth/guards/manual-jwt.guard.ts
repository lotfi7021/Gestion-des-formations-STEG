import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ManualJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    let token: string | null = null;

    const auth = request.headers.authorization;
    if (auth) {
      token = auth.split(' ')[1];
    } else if (request.query.token) {
      token = request.query.token as string;
    }

    if (!token) throw new UnauthorizedException('No token');

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }
  }
}
