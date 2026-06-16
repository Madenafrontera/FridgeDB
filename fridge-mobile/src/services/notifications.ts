import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getFridgeItems } from '@/services/api';
import { getDailyReminderSettings, getWeeklyFridgeStatusSettings } from '@/services/settingsStorage';
import { FridgeItem } from '@/types/product';

export const DEFAULT_DAILY_REMINDER_TIME = '20:00';

const DAILY_REMINDER_CHANNEL_ID = 'daily-reminder';
const DAILY_REMINDER_DATA_TYPE = 'dailyReminder';
const EXPIRING_ITEMS_CHANNEL_ID = 'expiring-items';
const EXPIRING_ITEMS_DATA_TYPE = 'expiringItems';
const EXPIRING_SOON_DAYS = 7;
const EXPIRING_ITEMS_NOTIFICATION_TIMES = [
  { hour: 10, minute: 0 },
  { hour: 18, minute: 0 },
];
const WEEKLY_FRIDGE_STATUS_CHANNEL_ID = 'weekly-fridge-status';
const WEEKLY_FRIDGE_STATUS_DATA_TYPE = 'weeklyFridgeStatus';
const WEEKLY_FRIDGE_STATUS_TIME = {
  weekday: 1,
  hour: 10,
  minute: 0,
};
const millisecondsPerDay = 1000 * 60 * 60 * 24;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function parseReminderTime(time: string) {
  const [hourValue, minuteValue] = time.split(':').map(Number);
  const hour = Number.isInteger(hourValue) ? hourValue : 20;
  const minute = Number.isInteger(minuteValue) ? minuteValue : 0;

  return {
    hour: Math.min(Math.max(hour, 0), 23),
    minute: Math.min(Math.max(minute, 0), 59),
  };
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

function getExpirationDateKey(expirationDate: string) {
  return expirationDate.slice(0, 10);
}

function parseDateKey(dateKey: string) {
  return new Date(dateKey + 'T00:00:00');
}

function getDaysUntilExpiration(expirationDate: string) {
  const today = parseDateKey(getDateKey(new Date()));
  const expiration = parseDateKey(getExpirationDateKey(expirationDate));

  return Math.round((expiration.getTime() - today.getTime()) / millisecondsPerDay);
}

function getExpiringItemSummary(items: FridgeItem[]) {
  let expiredCount = 0;
  let expiringSoonCount = 0;

  for (const item of items) {
    if (item.status !== 'active' || !item.expirationDate) {
      continue;
    }

    const daysUntilExpiration = getDaysUntilExpiration(item.expirationDate);

    if (daysUntilExpiration < 0) {
      expiredCount += 1;
      continue;
    }

    if (daysUntilExpiration <= EXPIRING_SOON_DAYS) {
      expiringSoonCount += 1;
    }
  }

  return {
    expiredCount,
    expiringSoonCount,
  };
}

function getExpiredItemCount(items: FridgeItem[]) {
  return items.filter(
    (item) => item.status === 'active' && item.expirationDate && getDaysUntilExpiration(item.expirationDate) < 0,
  ).length;
}

async function ensureAndroidNotificationChannel(id = DAILY_REMINDER_CHANNEL_ID, name = 'Daily reminder') {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(id, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission() {
  await ensureAndroidNotificationChannel();

  const existingPermission = await Notifications.getPermissionsAsync();
  if (existingPermission.granted) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

export async function hasNotificationPermission() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

export async function cancelDailyReminderNotifications(notificationId?: string | null) {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const dailyReminderNotifications = scheduledNotifications.filter(
    (notification) => notification.content.data?.fridgeDbType === DAILY_REMINDER_DATA_TYPE,
  );

  await Promise.all(
    dailyReminderNotifications
      .filter((notification) => notification.identifier !== notificationId)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export async function cancelExpiringItemNotifications() {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const expiringItemNotifications = scheduledNotifications.filter(
    (notification) => notification.content.data?.fridgeDbType === EXPIRING_ITEMS_DATA_TYPE,
  );

  await Promise.all(
    expiringItemNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}

export async function cancelWeeklyFridgeStatusNotifications() {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const weeklyFridgeStatusNotifications = scheduledNotifications.filter(
    (notification) => notification.content.data?.fridgeDbType === WEEKLY_FRIDGE_STATUS_DATA_TYPE,
  );

  await Promise.all(
    weeklyFridgeStatusNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}

export async function scheduleExpiringItemNotifications(items: FridgeItem[]) {
  await cancelExpiringItemNotifications();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return;
  }

  const { expiredCount, expiringSoonCount } = getExpiringItemSummary(items);
  if (expiredCount === 0 && expiringSoonCount === 0) {
    return;
  }

  await ensureAndroidNotificationChannel(EXPIRING_ITEMS_CHANNEL_ID, 'Expiring items');

  const body =
    expiredCount > 0
      ? 'Some fridge items may already be expired. Check your fridge.'
      : 'Some fridge items are close to expiring. Open FridgeDB to check them.';

  await Promise.all(
    EXPIRING_ITEMS_NOTIFICATION_TIMES.map((time) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'FridgeDB',
          body,
          data: {
            fridgeDbType: EXPIRING_ITEMS_DATA_TYPE,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: EXPIRING_ITEMS_CHANNEL_ID,
        },
      }),
    ),
  );
}

export async function scheduleWeeklyFridgeStatusNotification(items: FridgeItem[]) {
  await cancelWeeklyFridgeStatusNotifications();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return;
  }

  await ensureAndroidNotificationChannel(WEEKLY_FRIDGE_STATUS_CHANNEL_ID, 'Weekly fridge status');

  const expiredCount = getExpiredItemCount(items);
  const body =
    expiredCount >= 2
      ? 'You have 2 or more expired items. It might be time to clean your fridge.'
      : 'Weekly fridge check: open FridgeDB and review your inventory.';

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'FridgeDB',
      body,
      data: {
        fridgeDbType: WEEKLY_FRIDGE_STATUS_DATA_TYPE,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: WEEKLY_FRIDGE_STATUS_TIME.weekday,
      hour: WEEKLY_FRIDGE_STATUS_TIME.hour,
      minute: WEEKLY_FRIDGE_STATUS_TIME.minute,
      channelId: WEEKLY_FRIDGE_STATUS_CHANNEL_ID,
    },
  });
}

export async function refreshExpiringItemNotifications() {
  try {
    const [items, dailyReminderSettings] = await Promise.all([
      getFridgeItems(),
      getDailyReminderSettings(),
    ]);

    if (dailyReminderSettings.dailyReminderEnabled) {
      await scheduleExpiringItemNotifications(items);
      return;
    }

    await cancelExpiringItemNotifications();
  } catch (error) {
    console.warn('Could not refresh expiring item notifications', error);
  }
}

export async function refreshWeeklyFridgeStatusNotification() {
  try {
    const [items, weeklyFridgeStatusSettings] = await Promise.all([
      getFridgeItems(),
      getWeeklyFridgeStatusSettings(),
    ]);

    if (weeklyFridgeStatusSettings.weeklyFridgeStatusEnabled) {
      await scheduleWeeklyFridgeStatusNotification(items);
      return;
    }

    await cancelWeeklyFridgeStatusNotifications();
  } catch (error) {
    console.warn('Could not refresh weekly fridge status notification', error);
  }
}

export async function refreshFridgeNotifications() {
  try {
    const [items, dailyReminderSettings, weeklyFridgeStatusSettings] = await Promise.all([
      getFridgeItems(),
      getDailyReminderSettings(),
      getWeeklyFridgeStatusSettings(),
    ]);

    await Promise.all([
      dailyReminderSettings.dailyReminderEnabled
        ? scheduleExpiringItemNotifications(items)
        : cancelExpiringItemNotifications(),
      weeklyFridgeStatusSettings.weeklyFridgeStatusEnabled
        ? scheduleWeeklyFridgeStatusNotification(items)
        : cancelWeeklyFridgeStatusNotifications(),
    ]);
  } catch (error) {
    console.warn('Could not refresh fridge notifications', error);
  }
}

export async function scheduleDailyReminderNotification(time = DEFAULT_DAILY_REMINDER_TIME) {
  await ensureAndroidNotificationChannel();
  await cancelDailyReminderNotifications();

  const { hour, minute } = parseReminderTime(time);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'FridgeDB',
      body: 'Did you add something new to your fridge?',
      data: {
        fridgeDbType: DAILY_REMINDER_DATA_TYPE,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: DAILY_REMINDER_CHANNEL_ID,
    },
  });
}
