import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/auth.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.dashboardService.getSummary(userId, role);
  }

  @Get('finance')
  @Roles(Role.ADMIN, Role.FINANCE)
  getFinanceDashboard() {
    return this.dashboardService.getFinanceDashboard();
  }

  @Get('projects')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  getProjectDashboard() {
    return this.dashboardService.getProjectDashboard();
  }
}
