import { LocalNotifications } from '@capacitor/local-notifications';

export async function sendLocalNotification(title: string, body: string) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: undefined
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao agendar notificação local:', error);
  }
}
