import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ServicesOverlay } from '@/components/ServicesOverlay';
import { useServices } from '@/contexts/ServicesContext';

// WebView is only available on native platforms (iOS/Android)
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

export default function HomeScreen() {
  const { selectedResource, openOverlay } = useServices();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>GOA Digital Chant Stand</Text>
            <Text style={styles.subHeading}>Mobile Services Viewer</Text>
          </View>
          <Pressable style={styles.actionButton} onPress={openOverlay}>
            <Text style={styles.actionButtonText}>Services</Text>
          </Pressable>
        </View>

        {selectedResource ? (
          <View style={styles.metaPanel}>
            <View>
              <Text style={styles.metaLabel}>Service</Text>
              <Text style={styles.metaValue}>{selectedResource.serviceTitle}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Language</Text>
              <Text style={styles.metaValue}>{selectedResource.language}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{selectedResource.date}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Select a Service</Text>
            <Text style={styles.placeholderText}>
              Tap the Services tab below to choose a date and load chant resources from the GOA DCS.
            </Text>
          </View>
        )}

        <View style={styles.viewer}>
          {selectedResource ? (
            Platform.OS === 'web' ? (
              <iframe
                src={selectedResource.url}
                style={{
                  flex: 1,
                  border: 'none',
                  width: '100%',
                  height: '100%',
                }}
                title="Service Content"
              />
            ) : (
              <WebView
                source={{ uri: selectedResource.url }}
                startInLoadingState
                style={styles.webview}
              />
            )
          ) : (
            <View style={styles.viewerPlaceholder}>
              <Text style={styles.viewerPlaceholderText}>Service content will appear here.</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
      <ServicesOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subHeading: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  metaPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 12,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  placeholder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 20,
  },
  viewer: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  viewerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  viewerPlaceholderText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
