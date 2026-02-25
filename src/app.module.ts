import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
