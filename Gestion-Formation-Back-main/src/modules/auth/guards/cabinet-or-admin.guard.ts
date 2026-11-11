import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/role.enum';

@Injectable()
export class CabinetOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;
    if (role !== UserRole.CABINET && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès réservé aux administrateurs et cabinets');
    }
    return true;
  }
}
