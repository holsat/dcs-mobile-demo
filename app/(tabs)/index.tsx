import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ServicesOverlay } from '@/components/ServicesOverlay';
import { useServices } from '@/contexts/ServicesContext';

// WebView is only available on native platforms (iOS/Android)
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

export default function HomeScreen() {
  const { selectedResource, openOverlay, clearSelectedResource } = useServices();
  const [htmlContent, setHtmlContent] = React.useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const webViewRef = React.useRef<any>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);

  // On web platform, fetch the HTML content using dynamic import to avoid bundling cheerio on native
  React.useEffect(() => {
    if (!selectedResource || Platform.OS !== 'web') {
      setHtmlContent(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;

    async function loadContent() {
      setIsLoadingHtml(true);
      setLoadError(null);
      try {
        // Use dynamic import to avoid bundling on native platforms
        const { fetchHtml } = await import('@/lib/dcs');
        const html = await fetchHtml(selectedResource.url);
        if (!cancelled) {
          setHtmlContent(html);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load service content:', error);
          setLoadError('Unable to load service content. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHtml(false);
        }
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedResource]);

  const handleBack = () => {
    if (Platform.OS === 'web') {
      // Navigate back in iframe history
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.history.back();
      }
    } else {
      // Navigate back in WebView history
      if (webViewRef.current) {
        webViewRef.current.goBack();
      }
    }
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  // Handle search in iframe on web platform
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !iframeRef.current || !searchQuery) return;

    const iframe = iframeRef.current;
    const timer = setTimeout(() => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Use the browser's find API to search
          if (iframe.contentWindow) {
            iframe.contentWindow.find(searchQuery, false, false, true, false, true, false);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {selectedResource ? (
          // Toolbar when content is loaded
          <View style={styles.toolbar}>
            <Pressable style={styles.toolbarButton} onPress={handleBack}>
              <Text style={styles.toolbarButtonText}>← Back</Text>
            </Pressable>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {selectedResource.serviceTitle}
            </Text>
            <Pressable style={styles.toolbarButton} onPress={toggleSearch}>
              <Text style={styles.toolbarButtonText}>🔍 Search</Text>
            </Pressable>
          </View>
        ) : (
          // Original header when no content is loaded
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>GOA Digital Chant Stand</Text>
              <Text style={styles.subHeading}>Mobile Services Viewer</Text>
            </View>
            <Pressable style={styles.actionButton} onPress={openOverlay}>
              <Text style={styles.actionButtonText}>Services</Text>
            </Pressable>
          </View>
        )}

        {selectedResource && searchVisible ? (
          <View style={styles.searchPanel}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search in service content..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable style={styles.clearButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            )}
          </View>
        ) : selectedResource && !searchVisible ? (
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
              isLoadingHtml ? (
                <View style={styles.viewerPlaceholder}>
                  <ActivityIndicator size="large" color="#1d4ed8" />
                  <Text style={[styles.viewerPlaceholderText, { marginTop: 12 }]}>
                    Loading service content...
                  </Text>
                </View>
              ) : loadError ? (
                <View style={styles.viewerPlaceholder}>
                  <Text style={[styles.viewerPlaceholderText, { color: '#dc2626' }]}>
                    {loadError}
                  </Text>
                </View>
              ) : htmlContent ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  style={{
                    flex: 1,
                    border: 'none',
                    width: '100%',
                    height: '100%',
                  }}
                  title="Service Content"
                />
              ) : null
            ) : (
              <WebView
                ref={webViewRef}
                source={{ uri: selectedResource.url }}
                startInLoadingState
                style={styles.webview}
                onNavigationStateChange={(navState: any) => {
                  setCanGoBack(navState.canGoBack);
                }}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#1e40af',
    borderRadius: 12,
    marginBottom: 12,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 8,
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
  searchPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1e40af',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
