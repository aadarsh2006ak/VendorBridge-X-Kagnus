import { prisma } from '../../lib/prisma.js';
import { ListNotificationsQuery } from './notification.schemas.js';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

export class NotificationService {
  /**
   * Retrieves paginated notifications for the requesting user with unread count.
   */
  public static async listUserNotifications(userId: string, query: ListNotificationsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Returns unread count for topbar badge.
   */
  public static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Marks a single notification as read.
   */
  public static async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return null;
    }

    return await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all notifications as read for a given user.
   */
  public static async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return { updatedCount: result.count };
  }

  /**
   * Creates a single notification.
   */
  public static async createNotification(params: CreateNotificationParams) {
    try {
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          link: params.link || null,
        },
      });
    } catch (err) {
      console.error('[NotificationService.createNotification Error]:', err);
      return null;
    }
  }

  /**
   * Dispatches notifications to all users with a specific role (e.g. MANAGER, ADMIN, PROCUREMENT_OFFICER).
   */
  public static async notifyRole(role: string, params: Omit<CreateNotificationParams, 'userId'>) {
    try {
      const users = await prisma.user.findMany({
        where: { role: role as any, isActive: true },
        select: { id: true },
      });

      if (!users.length) return [];

      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: params.title,
          message: params.message,
          type: params.type,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          link: params.link || null,
        })),
      });

      return users;
    } catch (err) {
      console.error(`[NotificationService.notifyRole ${role} Error]:`, err);
      return [];
    }
  }

  /**
   * Dispatches notifications to all registered users linked to a vendor company.
   */
  public static async notifyVendorMembers(vendorId: string, params: Omit<CreateNotificationParams, 'userId'>) {
    try {
      const members = await prisma.vendorMember.findMany({
        where: { vendorId },
        select: { userId: true },
      });

      if (!members.length) return [];

      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          link: params.link || null,
        })),
      });

      return members;
    } catch (err) {
      console.error(`[NotificationService.notifyVendorMembers ${vendorId} Error]:`, err);
      return [];
    }
  }

  /**
   * Dispatches notifications to all procurement officers and admins.
   */
  public static async notifyProcurementStaff(params: Omit<CreateNotificationParams, 'userId'>) {
    try {
      const staff = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'PROCUREMENT_OFFICER'] },
          isActive: true,
        },
        select: { id: true },
      });

      if (!staff.length) return [];

      await prisma.notification.createMany({
        data: staff.map((s) => ({
          userId: s.id,
          title: params.title,
          message: params.message,
          type: params.type,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          link: params.link || null,
        })),
      });

      return staff;
    } catch (err) {
      console.error('[NotificationService.notifyProcurementStaff Error]:', err);
      return [];
    }
  }
}
