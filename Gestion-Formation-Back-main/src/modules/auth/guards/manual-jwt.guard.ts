import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

@Injectable()
export class ManualJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | null = null;

    const auth = request.headers.authorization;
    if (auth) {
      token = auth.split(' ')[1];
    } else if (request.query.token) {
      token = request.query.token as string;
    }

    if (!token) throw new UnauthorizedException('No token');

    let payload: { sub: string; email: string; role: string };
    try {
      payload = this.jwtService.verify(token);
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    request.user = { ...payload, role: user.role };
    return true;
  }
}
