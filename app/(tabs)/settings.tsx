import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type SettingsItem = {
  title: string;
  icon: string;
  route: string;
  description?: string;
};

const settingsItems: SettingsItem[] = [
  {
    title: 'Annotations',
    icon: '✏️',
    route: '/annotations-settings',
    description: 'Configure altar server and notes features',
  },
  {
    title: 'Cache & Storage',
    icon: '💾',
    route: '/cache-settings',
    description: 'Manage cached content and storage',
  },
  // Add more settings items here in the future
];

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            Settings
          </Text>
        </View>

        {/* Settings Menu */}
        <View style={styles.menuContainer}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={[styles.menuDescription, { color: Colors[colorScheme ?? 'light'].icon }]}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.chevron, { color: Colors[colorScheme ?? 'light'].icon }]}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: Colors[colorScheme ?? 'light'].icon }]}>
            DCS+ (Digital Chant Stand Plus) v1.0.0
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});
