import { Global, Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { MaintenanceService } from './maintenance.service';

@Global()
@Module({
  controllers: [SystemController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class SystemModule {}
