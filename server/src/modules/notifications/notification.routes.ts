import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { NotificationController } from './notification.controller.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

// Get current user's notifications
notificationRouter.get('/', authorize('notification:read'), NotificationController.listNotifications);

// Get unread badge count
notificationRouter.get('/unread-count', authorize('notification:read'), NotificationController.getUnreadCount);

// Mark all as read
notificationRouter.patch('/mark-all-read', authorize('notification:update'), NotificationController.markAllAsRead);

// Mark single notification as read
notificationRouter.patch('/:id/read', authorize('notification:update'), NotificationController.markAsRead);
