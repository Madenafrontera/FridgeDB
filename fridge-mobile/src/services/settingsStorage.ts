import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_DAILY_REMINDER_TIME = '20:00';

const DAILY_REMINDER_ENABLED_KEY = 'fridgedb:dailyReminderEnabled';
const DAILY_REMINDER_TIME_KEY = 'fridgedb:dailyReminderTime';
const DAILY_REMINDER_NOTIFICATION_ID_KEY = 'fridgedb:scheduledDailyReminderNotificationId';
const WEEKLY_FRIDGE_STATUS_ENABLED_KEY = 'fridgedb:weeklyFridgeStatusEnabled';
const WEEKLY_FRIDGE_STATUS_NOTIFICATION_ID_KEY = 'fridgedb:weeklyFridgeStatusNotificationId';

export type DailyReminderSettings = {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  scheduledDailyReminderNotificationId: string | null;
};

export type WeeklyFridgeStatusSettings = {
  weeklyFridgeStatusEnabled: boolean;
  scheduledWeeklyFridgeStatusNotificationId: string | null;
};

export async function getDailyReminderSettings(): Promise<DailyReminderSettings> {
  const [enabled, time, notificationId] = await Promise.all([
    AsyncStorage.getItem(DAILY_REMINDER_ENABLED_KEY),
    AsyncStorage.getItem(DAILY_REMINDER_TIME_KEY),
    AsyncStorage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY),
  ]);

  return {
    dailyReminderEnabled: enabled === 'true',
    dailyReminderTime: time ?? DEFAULT_DAILY_REMINDER_TIME,
    scheduledDailyReminderNotificationId: notificationId,
  };
}

export async function saveDailyReminderSettings(settings: DailyReminderSettings) {
  await AsyncStorage.multiSet([
    [DAILY_REMINDER_ENABLED_KEY, String(settings.dailyReminderEnabled)],
    [DAILY_REMINDER_TIME_KEY, settings.dailyReminderTime],
    [DAILY_REMINDER_NOTIFICATION_ID_KEY, settings.scheduledDailyReminderNotificationId ?? ''],
  ]);

  if (!settings.scheduledDailyReminderNotificationId) {
    await AsyncStorage.removeItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
  }
}

export async function getWeeklyFridgeStatusSettings(): Promise<WeeklyFridgeStatusSettings> {
  const [enabled, notificationId] = await Promise.all([
    AsyncStorage.getItem(WEEKLY_FRIDGE_STATUS_ENABLED_KEY),
    AsyncStorage.getItem(WEEKLY_FRIDGE_STATUS_NOTIFICATION_ID_KEY),
  ]);

  return {
    weeklyFridgeStatusEnabled: enabled === 'true',
    scheduledWeeklyFridgeStatusNotificationId: notificationId,
  };
}

export async function saveWeeklyFridgeStatusSettings(settings: WeeklyFridgeStatusSettings) {
  await AsyncStorage.multiSet([
    [WEEKLY_FRIDGE_STATUS_ENABLED_KEY, String(settings.weeklyFridgeStatusEnabled)],
    [WEEKLY_FRIDGE_STATUS_NOTIFICATION_ID_KEY, settings.scheduledWeeklyFridgeStatusNotificationId ?? ''],
  ]);

  if (!settings.scheduledWeeklyFridgeStatusNotificationId) {
    await AsyncStorage.removeItem(WEEKLY_FRIDGE_STATUS_NOTIFICATION_ID_KEY);
  }
}
