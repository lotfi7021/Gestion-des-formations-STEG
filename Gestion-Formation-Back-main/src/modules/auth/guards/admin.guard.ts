import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/role.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }
    return true;
  }
}
