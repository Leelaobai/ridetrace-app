import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const tabs = [
  { name: 'cockpit', icon: 'bicycle', label: '驾驶舱' },
  { name: 'community', icon: 'people', label: '社区' },
  { name: 'routes', icon: 'map', label: '路书' },
  { name: 'profile', icon: 'person', label: '我的' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.glassBorder,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as any} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

