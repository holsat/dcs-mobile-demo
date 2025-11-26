import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

export default function AnnotationsSettingsScreen() {
  const colorScheme = useColorScheme();
  const { preferences, updatePreference } = usePreferences();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Annotations',
          headerShown: true,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      >
        <View style={styles.content}>
          {/* Altar Server Annotations */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Annotation Types
            </Text>
            
            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Altar Server Annotations
                  </Text>
                  <Text style={[styles.settingDescription, { color: Colors[colorScheme ?? 'light'].icon }]}>
                    Show liturgical action icons for altar servers
                  </Text>
                </View>
                <Switch
                  value={preferences.altarServerAnnotationsEnabled}
                  onValueChange={(value) => updatePreference('altarServerAnnotationsEnabled', value)}
                  trackColor={{ false: '#767577', true: Colors[colorScheme ?? 'light'].tint }}
                  thumbColor="#f4f3f4"
                />
              </View>
              
              <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
              
              <View style={styles.settingRow}>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Notes
                  </Text>
                  <Text style={[styles.settingDescription, { color: Colors[colorScheme ?? 'light'].icon }]}>
                    Allow adding text notes to content
                  </Text>
                </View>
                <Switch
                  value={preferences.notesEnabled}
                  onValueChange={(value) => updatePreference('notesEnabled', value)}
                  trackColor={{ false: '#767577', true: Colors[colorScheme ?? 'light'].tint }}
                  thumbColor="#f4f3f4"
                />
              </View>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              About Annotations
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' }]}>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text }]}>
                Annotations help you mark important moments in liturgical services.
              </Text>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text, marginTop: 12 }]}>
                <Text style={{ fontWeight: '600' }}>Altar Server Annotations:</Text> Visual icons that mark liturgical actions like ringing bells, carrying the censer, or lighting candles.
              </Text>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text, marginTop: 12 }]}>
                <Text style={{ fontWeight: '600' }}>Notes:</Text> Add custom text notes to any part of the service for personal reminders or instructions.
              </Text>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text, marginTop: 12 }]}>
                Toggle these features off if you don't need them to simplify your interface.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
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
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
