
export class NotificationService {
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    return await Notification.requestPermission();
  }

  static async showNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      }
    }
  }

  static async showChatNotification(message: string) {
    await this.showNotification('New AI Response', {
      body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      tag: 'chat-response',
    });
  }

  static async showSystemNotification(title: string, body: string) {
    await this.showNotification(title, {
      body,
      tag: 'system-notification',
    });
  }
}
