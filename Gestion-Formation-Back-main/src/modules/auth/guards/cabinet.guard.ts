import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/role.enum';

@Injectable()
export class CabinetGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== UserRole.CABINET) {
      throw new ForbiddenException('Accès réservé aux cabinets');
    }
    return true;
  }
}
