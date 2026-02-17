import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Role } from '../auth/roles.enum';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'project' | 'task';
  status: string;
  projectId?: string;
}

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getEvents(userId: string, userRole: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Project timelines
    const projectWhere =
      userRole === Role.EMPLOYEES
        ? { members: { some: { userId } } }
        : undefined;

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    for (const p of projects) {
      if (!p.startDate || !p.endDate) continue;
      events.push({
        id: p.id,
        title: p.name,
        start: p.startDate,
        end: p.endDate,
        type: 'project',
        status: p.status,
        projectId: p.id,
      });
    }

    // Task deadlines
    const taskWhere =
      userRole === Role.EMPLOYEES ? { assignedToId: userId } : undefined;

    const tasks = await this.prisma.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        projectId: true,
      },
    });

    for (const t of tasks) {
      events.push({
        id: t.id,
        title: t.title,
        start: t.deadline,
        end: t.deadline,
        type: 'task',
        status: t.status,
        projectId: t.projectId,
      });
    }

    return events;
  }
}
