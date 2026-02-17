import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { NotificationService } from './notification.service';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('size') size: number = 20,
  ) {
    return this.notificationService.findAllByUser(userId, {
      page: Number(page),
      size: Number(size),
    });
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }
}
