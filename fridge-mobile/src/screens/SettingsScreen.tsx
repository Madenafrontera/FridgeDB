import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ApiHealth, ApiVersion, getHealth, getVersion } from '@/services/api';
import {
  cancelExpiringItemNotifications,
  cancelDailyReminderNotifications,
  cancelWeeklyFridgeStatusNotifications,
  DEFAULT_DAILY_REMINDER_TIME,
  hasNotificationPermission,
  refreshFridgeNotifications,
  requestNotificationPermission,
  scheduleDailyReminderNotification,
} from '@/services/notifications';
import {
  getDailyReminderSettings,
  getWeeklyFridgeStatusSettings,
  saveDailyReminderSettings,
  saveWeeklyFridgeStatusSettings,
} from '@/services/settingsStorage';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';

const profile = {
  userName: 'Frankie',
  email: 'frankie@fridgedb.app',
};

const aboutOptions = [
  {
    title: 'App version',
    body: 'FridgeDB version 1.0.0. This is the first frontend-only build of the mobile app.',
  },
  {
    title: 'Privacy policy',
    body: `Privacy Policy for FridgeDB

Last updated: June 2026

FridgeDB is a personal fridge inventory application owned by Madenafrontera.

This Privacy Policy explains what information FridgeDB stores, how it is used, and what third-party services may be involved.

1. Scope

FridgeDB is currently designed as a personal-use application that can be self-hosted, for example on a local home server or development environment.

At this stage, FridgeDB does not provide a centralized public cloud service operated by Madenafrontera. Users who download, run, or self-host FridgeDB are responsible for the environment where the application and its database are deployed.

2. No Account Required

FridgeDB currently does not include login, authentication, or user account registration.

You do not need to create an account to use the application.

3. Information Stored by FridgeDB

FridgeDB stores only the information required to manage fridge inventory and related app functionality.

This may include:

- Fridge item names
- Item categories
- Item icons
- Item quantities
- Expiration dates
- Product notes
- Notification preferences

FridgeDB does not intentionally collect personal identity information such as full names, addresses, phone numbers, payment information, or government identifiers.

4. Where Data Is Stored

FridgeDB data is stored wherever the application backend and database are configured to run.

For development or personal use, this may be:

- A local development machine
- A private home server
- A self-hosted environment
- Any other environment chosen by the person running the application

Madenafrontera does not control where self-hosted users deploy the application or how they secure their infrastructure.

5. AI Recipe Suggestions

FridgeDB may include an AI-powered meal suggestion feature.

When this feature is used, only the names of the selected ingredients are sent to the configured AI provider in order to generate recipe or meal ideas.

FridgeDB does not intentionally send the following information to the AI provider:

- User identity
- Email addresses
- Product notes
- Quantities
- Categories
- Expiration dates
- Notification preferences
- Database identifiers

The AI provider may process the selected ingredient names according to its own terms and privacy policy. Users who self-host FridgeDB are responsible for configuring and managing their own AI provider API keys.

6. Notifications

FridgeDB uses local notifications for app reminders.

Notifications may be used for:

- Daily reminders to check whether new items were added to the fridge
- Alerts about items that are expired or close to expiration
- Weekly fridge status reminders

These notifications are intended to run locally on the user’s device. FridgeDB does not use third-party push notification tracking or advertising systems.

7. Analytics and Tracking

FridgeDB currently does not use analytics, advertising, tracking pixels, crash reporting tools, or behavioral tracking services.

Specifically, FridgeDB does not currently use:

- Google Analytics
- Firebase Analytics
- Sentry
- Crashlytics
- Advertising SDKs
- Third-party tracking tools

8. Data Sharing

FridgeDB does not sell personal data.

FridgeDB does not share stored fridge inventory data with third parties, except when the user intentionally uses the AI recipe suggestion feature. In that case, only the selected ingredient names are sent to the configured AI provider.

9. Data Security

Because FridgeDB is designed for self-hosted or personal use, the security of the application depends on the environment where it is deployed.

Users are responsible for:

- Securing their server or home server
- Protecting environment variables and API keys
- Restricting network access when needed
- Managing database backups
- Avoiding public exposure of the application without proper protection

API keys and secret configuration values should never be committed to public repositories.

10. Data Deletion

Since FridgeDB is self-hosted or personally deployed, data deletion is managed by the person running the application.

Users may delete fridge items from the application interface where supported, or directly from the configured database if they manage the backend environment.

11. Children’s Privacy

FridgeDB is not specifically directed toward children. The application is intended as a personal productivity and inventory management tool.

12. Changes to This Privacy Policy

This Privacy Policy may be updated as FridgeDB evolves, especially if features such as login, cloud hosting, public user accounts, analytics, or additional third-party integrations are added.

Users should review this policy when updating or deploying new versions of the application.

13. Contact

For privacy-related questions or requests, contact should be made through the FridgeDB GitHub repository, using the available issue tracker or discussion channels if enabled.`,
  },
  {
    title: 'Terms of use',
    body: `Terms of Use for FridgeDB

Last updated: June 2026

These Terms of Use apply to FridgeDB, a personal fridge inventory application owned by Madenafrontera.

By downloading, running, self-hosting, modifying, or using FridgeDB, you agree to these Terms of Use.

1. Purpose of FridgeDB

FridgeDB is designed to help users manage fridge inventory, track products, review expiration dates, receive reminders, and generate recipe or meal suggestions based on selected ingredients.

FridgeDB is intended for personal productivity and inventory management purposes.

2. Personal and Self-Hosted Use

FridgeDB is currently designed as a personal-use and self-hosted application.

Users may run FridgeDB in their own local development environment, private server, home server, or other self-managed infrastructure.

Madenafrontera does not provide a centralized hosted service for FridgeDB at this stage.

3. No Account Requirement

FridgeDB currently does not require user registration, login, or account creation.

If a user self-hosts or modifies FridgeDB to include authentication, they are responsible for securing and managing that authentication system.

4. User Responsibility

Users are responsible for:

* Installing and configuring FridgeDB correctly
* Securing their own server or hosting environment
* Managing their own database
* Protecting environment variables and API keys
* Creating and testing backups
* Managing network access to the application
* Keeping their deployment updated
* Reviewing generated recipe suggestions before using them

Users should not expose FridgeDB publicly without proper security controls.

5. Inventory and Expiration Information

FridgeDB may display expiration dates, expired item warnings, and close-to-expiration reminders.

These features are provided for convenience only.

Users remain responsible for checking food condition, food safety, expiration labels, smell, appearance, and proper storage before consuming any item.

FridgeDB should not be used as the only source of truth for food safety decisions.

6. AI Recipe Suggestions

FridgeDB may include AI-powered recipe or meal suggestions.

These suggestions are generated based on selected ingredient names and may be inaccurate, incomplete, unsafe, unsuitable, or impractical.

Users are responsible for reviewing AI-generated suggestions before preparing or consuming any food.

FridgeDB does not guarantee:

* Nutritional accuracy
* Allergy safety
* Food safety
* Ingredient compatibility
* Cooking accuracy
* Medical or dietary suitability

Any protein, carbohydrate, time, or difficulty estimates are approximate and should not be treated as professional nutritional or medical advice.

7. No Medical, Nutritional, or Professional Advice

FridgeDB does not provide medical, nutritional, dietary, or professional advice.

Users with allergies, medical conditions, dietary restrictions, or health-related concerns should consult a qualified professional before relying on any recipe or meal suggestion.

8. Notifications

FridgeDB may provide local notifications, including:

* Daily reminders
* Expiration or close-to-expiration alerts
* Weekly fridge status reminders

Notifications are provided for convenience only.

FridgeDB does not guarantee that notifications will always be delivered, delivered on time, or reflect the latest inventory state.

Users are responsible for manually reviewing their fridge inventory when needed.

9. Third-Party Services

FridgeDB may integrate with third-party services, such as an AI provider used for recipe suggestions.

Users who configure third-party services are responsible for:

* Reviewing the third-party provider’s terms and privacy policy
* Managing API keys
* Monitoring usage and costs
* Securing credentials
* Understanding how submitted data may be processed

Madenafrontera is not responsible for third-party service availability, pricing, behavior, data handling, or output quality.

10. Open Source / GitHub Availability

FridgeDB may be published through GitHub or other code hosting platforms.

Availability of the source code does not guarantee support, warranty, uptime, maintenance, or compatibility with any specific environment.

Users who modify the application are responsible for their own changes and deployments.

11. Acceptable Use

Users agree not to use FridgeDB for unlawful, harmful, abusive, or unauthorized purposes.

Users must not use FridgeDB to:

* Violate applicable laws
* Attack, overload, or abuse third-party services
* Expose API keys or secrets intentionally
* Misrepresent the application as an official service from another company
* Use generated content in a way that creates harm or risk to others

12. No Warranty

FridgeDB is provided “as is” and “as available.”

Madenafrontera makes no warranties, express or implied, including but not limited to:

* Fitness for a particular purpose
* Accuracy
* Reliability
* Availability
* Security
* Error-free operation
* Compatibility with all devices or environments

Use of FridgeDB is at the user’s own risk.

13. Limitation of Liability

To the maximum extent permitted by applicable law, Madenafrontera is not liable for any damages, losses, claims, or issues arising from the use, misuse, self-hosting, modification, or inability to use FridgeDB.

This includes but is not limited to:

* Data loss
* Misconfigured deployments
* Exposed API keys
* Food safety issues
* Incorrect AI-generated recipes
* Missed notifications
* Server downtime
* Database corruption
* Third-party service errors
* Security incidents caused by user deployment choices

14. Data and Backups

Users are responsible for managing their own data and backups.

FridgeDB may include backup or restore scripts, but users are responsible for verifying that backups work correctly and can be restored when needed.

15. Changes to the Application

FridgeDB may change over time.

Features may be added, removed, redesigned, or modified, including but not limited to:

* Login/authentication
* Cloud hosting
* AI integrations
* Notification behavior
* Database schema
* Monitoring and platform features

Users should review documentation and configuration before updating or deploying new versions.

16. Changes to These Terms

These Terms of Use may be updated as FridgeDB evolves.

Users should review these terms when downloading, deploying, modifying, or updating the application.

17. Contact

For questions, issues, or requests related to FridgeDB, contact should be made through the FridgeDB GitHub repository, using the available issue tracker or discussion channels if enabled.`,
  },
  {
    title: 'Feedback',
    body: 'Send me on Github c:',
  },
];

export function SettingsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [apiVersion, setApiVersion] = useState<ApiVersion | null>(null);
  const [isApiStatusLoading, setIsApiStatusLoading] = useState(true);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState(DEFAULT_DAILY_REMINDER_TIME);
  const [scheduledDailyReminderNotificationId, setScheduledDailyReminderNotificationId] = useState<
    string | null
  >(null);
  const [isDailyReminderUpdating, setIsDailyReminderUpdating] = useState(false);
  const [weeklyFridgeStatusEnabled, setWeeklyFridgeStatusEnabled] = useState(false);
  const [isWeeklyFridgeStatusUpdating, setIsWeeklyFridgeStatusUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationSettings() {
      try {
        const [dailySettings, weeklySettings] = await Promise.all([
          getDailyReminderSettings(),
          getWeeklyFridgeStatusSettings(),
        ]);

        if (!isMounted) {
          return;
        }

        setDailyReminderTime(dailySettings.dailyReminderTime);
        setScheduledDailyReminderNotificationId(dailySettings.scheduledDailyReminderNotificationId);
        setWeeklyFridgeStatusEnabled(weeklySettings.weeklyFridgeStatusEnabled);

        if (dailySettings.dailyReminderEnabled) {
          const hasPermission = await hasNotificationPermission();
          if (!hasPermission) {
            await saveDailyReminderSettings({
              dailyReminderEnabled: false,
              dailyReminderTime: dailySettings.dailyReminderTime,
              scheduledDailyReminderNotificationId: null,
            });
            if (isMounted) {
              setDailyReminderEnabled(false);
              setScheduledDailyReminderNotificationId(null);
            }
          }

          if (hasPermission) {
            const notificationId = await scheduleDailyReminderNotification(dailySettings.dailyReminderTime);

            if (!isMounted) {
              return;
            }

            setScheduledDailyReminderNotificationId(notificationId);
            await saveDailyReminderSettings({
              dailyReminderEnabled: true,
              dailyReminderTime: dailySettings.dailyReminderTime,
              scheduledDailyReminderNotificationId: notificationId,
            });
            setDailyReminderEnabled(true);
          }
        }

        if (weeklySettings.weeklyFridgeStatusEnabled) {
          const hasPermission = await hasNotificationPermission();
          if (!hasPermission) {
            await saveWeeklyFridgeStatusSettings({
              weeklyFridgeStatusEnabled: false,
              scheduledWeeklyFridgeStatusNotificationId: null,
            });
            if (isMounted) {
              setWeeklyFridgeStatusEnabled(false);
            }
            return;
          }
        }
      } catch {
        if (isMounted) {
          setDailyReminderEnabled(false);
          setScheduledDailyReminderNotificationId(null);
          setWeeklyFridgeStatusEnabled(false);
          Alert.alert(
            'Notifications unavailable',
            'FridgeDB could not restore your notification settings. Please try enabling them again.',
          );
        }
      }
    }

    loadNotificationSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadApiStatus() {
      setIsApiStatusLoading(true);
      setApiStatusError(null);

      try {
        const [health, version] = await Promise.all([getHealth(), getVersion()]);

        if (!isMounted) {
          return;
        }

        setApiHealth(health);
        setApiVersion(version);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setApiHealth(null);
        setApiVersion(null);
        setApiStatusError(error instanceof Error ? error.message : 'Unable to reach the API');
      } finally {
        if (isMounted) {
          setIsApiStatusLoading(false);
        }
      }
    }

    loadApiStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDailyReminderChange(enabled: boolean) {
    if (isDailyReminderUpdating) {
      return;
    }

    setIsDailyReminderUpdating(true);

    try {
      if (!enabled) {
        try {
          await cancelDailyReminderNotifications(scheduledDailyReminderNotificationId);
          await cancelExpiringItemNotifications();
          setDailyReminderEnabled(false);
          setScheduledDailyReminderNotificationId(null);
          await saveDailyReminderSettings({
            dailyReminderEnabled: false,
            dailyReminderTime,
            scheduledDailyReminderNotificationId: null,
          });
        } catch {
          Alert.alert(
            'Daily reminder still active',
            'FridgeDB could not cancel the scheduled reminder. Please try again.',
          );
        }
        return;
      }

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        setDailyReminderEnabled(false);
        setScheduledDailyReminderNotificationId(null);
        await saveDailyReminderSettings({
          dailyReminderEnabled: false,
          dailyReminderTime,
          scheduledDailyReminderNotificationId: null,
        });
        Alert.alert(
          'Notifications disabled',
          'FridgeDB needs notification permission to schedule the daily reminder.',
        );
        return;
      }

      const notificationId = await scheduleDailyReminderNotification(dailyReminderTime);
      setDailyReminderEnabled(true);
      setScheduledDailyReminderNotificationId(notificationId);
      await saveDailyReminderSettings({
        dailyReminderEnabled: true,
        dailyReminderTime,
        scheduledDailyReminderNotificationId: notificationId,
      });
      await refreshFridgeNotifications();
    } catch {
      setDailyReminderEnabled(false);
      setScheduledDailyReminderNotificationId(null);
      await saveDailyReminderSettings({
        dailyReminderEnabled: false,
        dailyReminderTime,
        scheduledDailyReminderNotificationId: null,
      });
      Alert.alert(
        'Daily reminder unavailable',
        'FridgeDB could not update the daily reminder. Please try again.',
      );
    } finally {
      setIsDailyReminderUpdating(false);
    }
  }

  async function handleWeeklyFridgeStatusChange(enabled: boolean) {
    if (isWeeklyFridgeStatusUpdating) {
      return;
    }

    setIsWeeklyFridgeStatusUpdating(true);

    try {
      if (!enabled) {
        await cancelWeeklyFridgeStatusNotifications();
        setWeeklyFridgeStatusEnabled(false);
        await saveWeeklyFridgeStatusSettings({
          weeklyFridgeStatusEnabled: false,
          scheduledWeeklyFridgeStatusNotificationId: null,
        });
        return;
      }

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        setWeeklyFridgeStatusEnabled(false);
        await saveWeeklyFridgeStatusSettings({
          weeklyFridgeStatusEnabled: false,
          scheduledWeeklyFridgeStatusNotificationId: null,
        });
        Alert.alert(
          'Notifications disabled',
          'FridgeDB needs notification permission to schedule the weekly fridge status.',
        );
        return;
      }

      setWeeklyFridgeStatusEnabled(true);
      await saveWeeklyFridgeStatusSettings({
        weeklyFridgeStatusEnabled: true,
        scheduledWeeklyFridgeStatusNotificationId: null,
      });
      await refreshFridgeNotifications();
    } catch {
      setWeeklyFridgeStatusEnabled(false);
      await saveWeeklyFridgeStatusSettings({
        weeklyFridgeStatusEnabled: false,
        scheduledWeeklyFridgeStatusNotificationId: null,
      });
      Alert.alert(
        'Weekly status unavailable',
        'FridgeDB could not update the weekly fridge status. Please try again.',
      );
    } finally {
      setIsWeeklyFridgeStatusUpdating(false);
    }
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Preferences</Text>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.userName.charAt(0)}</Text>
          </View>

          <View style={styles.profileText}>
            <Text style={styles.userName}>{profile.userName}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Daily reminder</Text>
              <Text style={styles.settingDescription}>
                Get a daily reminder to check if you added something new to your fridge, and receive
                daily alerts when items are expired or close to expiring.
              </Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleDailyReminderChange}
              disabled={isDailyReminderUpdating}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Weekly Fridge Status</Text>
              <Text style={styles.settingDescription}>
                Get a weekly Sunday reminder to review your fridge status.
              </Text>
            </View>
            <Switch
              value={weeklyFridgeStatusEnabled}
              onValueChange={handleWeeklyFridgeStatusChange}
              disabled={isWeeklyFridgeStatusUpdating}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.settingTitle}>Backend</Text>
              <View
                style={[
                  styles.statusBadge,
                  apiHealth?.status === 'ok' ? styles.statusBadgeHealthy : styles.statusBadgeUnavailable,
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    apiHealth?.status === 'ok'
                      ? styles.statusBadgeTextHealthy
                      : styles.statusBadgeTextUnavailable,
                  ]}>
                  {isApiStatusLoading ? 'Checking' : apiHealth?.status === 'ok' ? 'Healthy' : 'Unavailable'}
                </Text>
              </View>
            </View>

            <Text style={styles.settingDescription}>
              {isApiStatusLoading
                ? 'Checking API status...'
                : apiStatusError
                  ? 'FridgeDB could not reach the backend API.'
                  : apiHealth
                    ? apiHealth.service + ' is reachable.'
                    : 'API status is unavailable.'}
            </Text>

            <View style={styles.infoRows}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Service</Text>
                <Text style={styles.infoValue}>{apiHealth?.service ?? 'Unavailable'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>
                  {apiVersion ? apiVersion.name + ' ' + apiVersion.version : 'Unavailable'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About FridgeDB</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.settingDescription}>
              FridgeDB helps track fridge inventory, quantities, categories, and expiration dates.
            </Text>
            <Text style={styles.settingDescription}>
              This MVP focuses on inventory CRUD, backend-connected fridge data, and basic local settings.
            </Text>
            <Text style={styles.settingDescription}>
              The app uses Expo React Native, an Express API, Prisma, and PostgreSQL.
            </Text>
            <Text style={styles.settingDescription}>
              Chef AI and richer notification flows are planned for later sprints.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutList}>
            {aboutOptions.map((option) => (
              <Pressable
                key={option.title}
                style={styles.aboutRow}
                onPress={() =>
                  router.push({
                    pathname: '/settings-about',
                    params: {
                      title: option.title,
                      body: option.body,
                    },
                  })
                }>
                <Text style={styles.aboutTitle}>{option.title}</Text>
                <Text style={styles.aboutChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: 24,
    paddingTop: 18,
    paddingBottom: 112,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: theme.colors.primary,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 34,
    color: theme.colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
  },
  avatarText: {
    ...typography.screenTitle,
    fontSize: 26,
    color: theme.colors.card,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  userName: {
    ...typography.sectionTitle,
    fontSize: 19,
    color: theme.colors.text,
  },
  email: {
    ...typography.body,
    fontSize: 15,
    color: theme.colors.mutedText,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: theme.colors.text,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  settingText: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  settingDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  statusCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  statusBadgeHealthy: {
    backgroundColor: theme.colors.successSurface,
  },
  statusBadgeUnavailable: {
    backgroundColor: theme.colors.dangerSurface,
  },
  statusBadgeText: {
    ...typography.bodySemiBold,
    fontSize: 12,
  },
  statusBadgeTextHealthy: {
    color: theme.colors.success,
  },
  statusBadgeTextUnavailable: {
    color: theme.colors.danger,
  },
  infoRows: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  infoValue: {
    ...typography.bodySemiBold,
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'right',
  },
  aboutCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  aboutList: {
    gap: 10,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  aboutTitle: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  aboutChevron: {
    ...typography.sectionTitle,
    fontSize: 28,
    color: theme.colors.mutedText,
  },
  });
