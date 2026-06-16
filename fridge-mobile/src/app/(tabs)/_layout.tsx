import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';

type TabIconProps = {
  color: string;
  focused: boolean;
  icon: string;
};

function TabIcon({ color, focused, icon }: TabIconProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={[styles.iconText, { color }]}>{icon}</Text>
    </View>
  );
}

function AddProductTabButton() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      accessibilityLabel="Add product"
      accessibilityRole="button"
      style={styles.addButtonWrapper}
      onPress={() => router.push('/add-product')}>
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </View>
    </Pressable>
  );
}

function CenteredTabBar(props: BottomTabBarProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View pointerEvents="box-none" style={styles.tabBarWrapper}>
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Tabs
      tabBar={(props) => <CenteredTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} icon="⌂" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} icon="▦" />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => <AddProductTabButton />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} icon="✦" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} icon="⚙" />
          ),
        }}
      />
      <Tabs.Screen name="weekly-review" options={{ href: null }} />
    </Tabs>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    right: 0,
    bottom: 16,
    left: 0,
    alignItems: 'center',
  },
  tabBar: {
    width: '92%',
    maxWidth: 430,
    height: 78,
    paddingTop: 9,
    paddingBottom: 10,
    borderTopWidth: 0,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 15,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    ...typography.bodySemiBold,
    marginTop: 2,
    fontSize: 11,
  },
  iconContainer: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.primarySurface,
  },
  iconText: {
    ...typography.sectionTitle,
    fontSize: 20,
  },
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  addButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ translateY: -15 }],
  },
  addButtonText: {
    ...typography.screenTitle,
    marginTop: -5,
    fontSize: 40,
    color: theme.colors.card,
  },
  });
