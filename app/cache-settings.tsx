import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { getCacheStats, clearCache, isOnline, CacheStats } from '@/lib/cache';

export default function CacheSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const [cacheStats, onlineStatus] = await Promise.all([
        getCacheStats(),
        isOnline(),
      ]);
      setStats(cacheStats);
      setOnline(onlineStatus);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached services and content. You\'ll need to re-download them when you access services again.\n\nAre you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearCache();
              Alert.alert('Success', 'Cache cleared successfully!');
              await loadStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
              console.error('Failed to clear cache:', error);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };

  const totalSize = (stats?.asyncStorageSize || 0) + (stats?.fileSystemSize || 0);
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cache & Storage',
          headerShown: true,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Network Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Network Status
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' }]}>
              <View style={styles.row}>
                <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                  Connection
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: online ? '#10b981' : '#ef4444' }]}>
                  <Text style={styles.statusText}>
                    {online ? '● Online' : '● Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cache Statistics */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Cache Statistics
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' }]}>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Total Size
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].tint }]}>
                    {formatBytes(totalSize)}
                  </Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
                
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Storage Size
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {formatBytes(stats?.asyncStorageSize || 0)}
                  </Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
                
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    FileSystem Size
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {formatBytes(stats?.fileSystemSize || 0)}
                  </Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
                
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Cached Items
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {stats?.entryCount || 0}
                  </Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
                
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Oldest Entry
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {formatDate(stats?.oldestEntry)}
                  </Text>
                </View>
                
                <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />
                
                <View style={styles.row}>
                  <Text style={[styles.label, { color: Colors[colorScheme ?? 'light'].text }]}>
                    Newest Entry
                  </Text>
                  <Text style={[styles.value, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {formatDate(stats?.newestEntry)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Cache Management */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              Cache Management
            </Text>
            
            <TouchableOpacity
              style={[styles.button, clearing && styles.buttonDisabled]}
              onPress={handleClearCache}
              disabled={clearing}
            >
              {clearing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
                  <Text style={styles.buttonSubtext}>
                    Remove all cached content
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Cache Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              About Cache
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#f3f4f6' }]}>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text }]}>
                The app caches services and content to improve performance and enable offline access.
              </Text>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text, marginTop: 12 }]}>
                Cached data is automatically refreshed in the background when content changes.
              </Text>
              <Text style={[styles.infoText, { color: Colors[colorScheme ?? 'light'].text, marginTop: 12 }]}>
                Clear the cache if you're experiencing issues or want to free up storage space.
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
});
