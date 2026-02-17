import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorator';
import { CalendarService } from './calendar.service';

@Controller('api/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  getEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.calendarService.getEvents(userId, role);
  }
}
