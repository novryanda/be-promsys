import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { VendorModule } from './vendor/vendor.module';
import { FileModule } from './file/file.module';
import { TeamModule } from './team/team.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ReimbursementModule } from './reimbursement/reimbursement.module';
import { NotificationModule } from './notification/notification.module';
import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    SettingsModule,
    VendorModule,
    FileModule,
    TeamModule,
    ProjectModule,
    TaskModule,
    InvoiceModule,
    ReimbursementModule,
    NotificationModule,
    CalendarModule,
    DashboardModule,
  ],
})
export class AppModule {}
