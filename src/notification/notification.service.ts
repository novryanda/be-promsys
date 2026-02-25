import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
    sendEmail?: boolean;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });

    // Send email notification if requested
    if (data.sendEmail) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (user?.email) {
        const emailSent = await this.emailService.sendEmail(
          user.email,
          data.title,
          `<h2>${data.title}</h2><p>${data.message}</p>`,
        );
        if (emailSent) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        }
      }
    }

    return notification;
  }

  async createMany(
    notifications: Array<{
      userId: string;
      type: string;
      title: string;
      message: string;
      referenceId?: string;
      referenceType?: string;
      sendEmail?: boolean;
    }>,
  ) {
    return Promise.all(notifications.map((n) => this.create(n)));
  }

  async findAllByUser(userId: string, params: { page: number; size: number }) {
    const { page, size } = params;
    const skip = (page - 1) * size;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async deleteRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return { deleted: result.count };
  }
}
