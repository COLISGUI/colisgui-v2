import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { MaintenanceService } from './maintenance.service';

// Mode maintenance (#13) : bloque tout le monde sauf DIRECTEUR / ADMIN.
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private reflector: Reflector, private maintenance: MaintenanceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const on = await this.maintenance.isOn();
    if (!on) return true;
    const { user } = context.switchToHttp().getRequest();
    if (user && (user.role === 'DIRECTEUR' || user.role === 'ADMIN')) return true;
    throw new ServiceUnavailableException('Système en maintenance. Réessayez plus tard.');
  }
}
