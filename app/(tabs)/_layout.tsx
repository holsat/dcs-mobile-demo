import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useServices } from '@/contexts/ServicesContext';

// Custom label component for multi-line text
const TabLabel = ({ label, color }: { label: string; color: string }) => {
  // Split "Sacraments & Music" into ["Sacraments &", "Music"]
  const parts = label.split(' & ');
  const lines = parts.length > 1 ? [parts[0] + ' &', parts[1]] : [label];
  
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', maxWidth: 60 }}>
      {lines.map((line, index) => (
        <Text
          key={index}
          style={{
            color,
            fontSize: 10,
            fontWeight: '500',
            textAlign: 'center',
            lineHeight: 12,
          }}
          numberOfLines={1}
        >
          {line}
        </Text>
      ))}
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { openOverlay } = useServices();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            openOverlay();
          },
        }}
      />
      <Tabs.Screen
        name="sacraments"
        options={{
          title: 'Sacraments & Music',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
          tabBarLabel: ({ color }) => (
            <TabLabel label="Sacraments & Music" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
