import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// WebView is only available on native platforms (iOS/Android)
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

const BOOKS_INDEX_URL = 'https://dcs.goarch.org/goa/dcs/booksindex.html';

export default function SacramentsScreen() {
  const [htmlContent, setHtmlContent] = React.useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const webViewRef = React.useRef<any>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = React.useState(0);
  const matchElementsRef = React.useRef<HTMLElement[]>([]);
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [isPdfContent, setIsPdfContent] = React.useState(false);
  const [pdfSearchEnabled, setPdfSearchEnabled] = React.useState(false);

  // Load sacraments content with caching
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;

    async function loadContent() {
      setIsLoadingHtml(true);
      setLoadError(null);
      try {
        // Use dynamic imports for both caching and fetching
        const { fetchHtml } = await import('@/lib/dcs');
        const { getWithRevalidate, getServiceContentKey, TTL } = await import('@/lib/cache');
        
        // Generate cache key from URL
        const cacheKey = getServiceContentKey('booksindex', 'en');
        
        // Use stale-while-revalidate for HTML content
        const html = await getWithRevalidate(
          cacheKey,
          () => fetchHtml(BOOKS_INDEX_URL),
          TTL.ONE_MONTH, // Cache content for 30 days
          true // Use FileSystem for large HTML files
        );
        
        if (!cancelled) {
          setHtmlContent(html);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load sacraments content:', error);
          setLoadError('Unable to load content. Please try again later.');
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
  }, []);

  const handleBack = () => {
    if (Platform.OS === 'web') {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && canGoBack) {
        iframe.contentWindow.history.back();
      }
    } else if (Platform.OS !== 'web' && webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleSearch = () => {
    if (Platform.OS === 'web') {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) return;

      const doc = iframe.contentDocument;

      // Clear previous highlights
      const previousHighlights = doc.querySelectorAll('.search-highlight');
      previousHighlights.forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
      matchElementsRef.current = [];

      if (!searchQuery.trim()) {
        setMatchCount(0);
        setCurrentMatchIndex(0);
        return;
      }

      // Find and highlight matches
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
      const matches: HTMLElement[] = [];

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent || '';
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        if (regex.test(text)) {
          const parent = node.parentElement;
          if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
            const fragment = doc.createDocumentFragment();
            let lastIndex = 0;
            let match;

            text.replace(regex, (matchStr, index) => {
              if (index > lastIndex) {
                fragment.appendChild(doc.createTextNode(text.substring(lastIndex, index)));
              }

              const mark = doc.createElement('span');
              mark.className = 'search-highlight';
              mark.style.backgroundColor = '#ffeb3b';
              mark.style.padding = '2px';
              mark.textContent = matchStr;
              fragment.appendChild(mark);
              matches.push(mark);

              lastIndex = index + matchStr.length;
              return matchStr;
            });

            if (lastIndex < text.length) {
              fragment.appendChild(doc.createTextNode(text.substring(lastIndex)));
            }

            parent.replaceChild(fragment, node);
          }
        }
      }

      matchElementsRef.current = matches;
      setMatchCount(matches.length);
      
      if (matches.length > 0) {
        setCurrentMatchIndex(1);
        matches[0].style.backgroundColor = '#ff9800';
        matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Native WebView search
      if (webViewRef.current) {
        const script = `
          (function() {
            // Remove previous highlights
            document.querySelectorAll('.search-highlight').forEach(el => {
              el.outerHTML = el.textContent;
            });
            
            if ('${searchQuery.trim()}') {
              // Simplified search for native
              const regex = new RegExp('${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}', 'gi');
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
              let node;
              let count = 0;
              
              while (node = walker.nextNode()) {
                const text = node.textContent;
                if (regex.test(text)) {
                  const parent = node.parentElement;
                  if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
                    const newHTML = text.replace(regex, '<span class="search-highlight" style="background-color: #ffeb3b; padding: 2px;">$&</span>');
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = newHTML;
                    parent.replaceChild(wrapper.firstChild, node);
                    count++;
                  }
                }
              }
              
              // Scroll to first match
              const firstMatch = document.querySelector('.search-highlight');
              if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'searchResults', count }));
            }
          })();
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    const matches = matchElementsRef.current;
    if (matches.length === 0) return;

    matches[currentMatchIndex - 1].style.backgroundColor = '#ffeb3b';

    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex >= matches.length ? 1 : currentMatchIndex + 1;
    } else {
      newIndex = currentMatchIndex <= 1 ? matches.length : currentMatchIndex - 1;
    }

    setCurrentMatchIndex(newIndex);
    matches[newIndex - 1].style.backgroundColor = '#ff9800';
    matches[newIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    
    // Track navigation state
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const checkBackState = () => {
        try {
          setCanGoBack(iframe.contentWindow!.history.length > 1);
        } catch (e) {
          // Cross-origin restriction
        }
      };
      
      checkBackState();
      iframe.contentWindow.addEventListener('popstate', checkBackState);
      iframe.contentWindow.addEventListener('pushState', checkBackState);
    }
  };

  // Loading screen
  if (!htmlContent && isLoadingHtml) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading Sacraments and Other Services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error screen
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Web platform - show iframe with toolbar
  if (Platform.OS === 'web' && htmlContent) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Pressable
            style={[styles.toolbarButton, !canGoBack && styles.toolbarButtonDisabled]}
            onPress={handleBack}
            disabled={!canGoBack}
          >
            <Text style={styles.toolbarButtonText}>←</Text>
          </Pressable>

          <Pressable
            style={styles.toolbarButton}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <Text style={styles.toolbarButtonText}>🔍</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        {searchVisible && (
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Go</Text>
            </Pressable>
            {matchCount > 0 && (
              <View style={styles.matchNavigation}>
                <Pressable style={styles.navButton} onPress={() => navigateMatch('prev')}>
                  <Text style={styles.navButtonText}>↑</Text>
                </Pressable>
                <Text style={styles.matchCounter}>
                  {currentMatchIndex}/{matchCount}
                </Text>
                <Pressable style={styles.navButton} onPress={() => navigateMatch('next')}>
                  <Text style={styles.navButtonText}>↓</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={handleIframeLoad}
        />
      </SafeAreaView>
    );
  }

  // Native platform - show WebView with toolbar
  if (Platform.OS !== 'web' && WebView) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Toolbar for native */}
        <View style={styles.toolbar}>
          <Pressable
            style={[styles.toolbarButton, !canGoBack && styles.toolbarButtonDisabled]}
            onPress={handleBack}
            disabled={!canGoBack}
          >
            <Text style={styles.toolbarButtonText}>←</Text>
          </Pressable>

          <Text style={styles.toolbarTitle}>Sacraments & Music</Text>

          <Pressable
            style={styles.toolbarButton}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <Text style={styles.toolbarButtonText}>🔍</Text>
          </Pressable>
        </View>

        {/* Search Bar for native */}
        {searchVisible && (
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Trigger search immediately for native
                if (text.length > 0) {
                  // Search for native WebView
                  if (webViewRef.current) {
                    const searchTerm = text;
                    const script = `
                      (function() {
                        try {
                          // Clear previous highlights
                          const oldHighlights = document.querySelectorAll('.search-highlight');
                          oldHighlights.forEach(el => {
                            const parent = el.parentNode;
                            if (parent) {
                              while (el.firstChild) {
                                parent.insertBefore(el.firstChild, el);
                              }
                              parent.removeChild(el);
                            }
                          });
                          document.normalize();
                          
                          // Search and highlight
                          const searchText = '${searchTerm}';
                          const bodyHTML = document.body.innerHTML;
                          const lowerHTML = bodyHTML.toLowerCase();
                          const lowerSearch = searchText.toLowerCase();
                          
                          if (lowerHTML.indexOf(lowerSearch) !== -1) {
                            const regex = new RegExp(searchText, 'gi');
                            const newHTML = bodyHTML.replace(regex, '<span class="search-highlight" style="background-color: #ffeb3b; color: #000; padding: 2px; border-radius: 2px;">$&</span>');
                            document.body.innerHTML = newHTML;
                            
                            // Scroll to first match
                            const firstMatch = document.querySelector('.search-highlight');
                            if (firstMatch) {
                              firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        } catch(e) {
                          console.log('Search error:', e.message);
                        }
                      })();
                    `;
                    webViewRef.current.injectJavaScript(script);
                  }
                } else {
                  // Clear highlights when search is cleared
                  if (webViewRef.current) {
                    const clearScript = `
                      document.querySelectorAll('.search-highlight').forEach(el => {
                        const parent = el.parentNode;
                        if (parent) {
                          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
                          parent.normalize();
                        }
                      });
                    `;
                    webViewRef.current.injectJavaScript(clearScript);
                  }
                }
              }}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.searchButtonText}>✕</Text>
            </Pressable>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: BOOKS_INDEX_URL }}
          style={styles.webView}
          onNavigationStateChange={(navState: any) => {
            setCanGoBack(navState.canGoBack);
            
            // Detect if current page is a PDF
            const url = navState.url || '';
            const isPdf = url.toLowerCase().endsWith('.pdf') || 
                          url.toLowerCase().includes('.pdf?') ||
                          url.toLowerCase().includes('application/pdf');
            
            setIsPdfContent(isPdf);
          }}
        />
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
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
  toolbarButtonDisabled: {
    opacity: 0.4,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  matchNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4,
  },
  navButtonText: {
    fontSize: 18,
  },
  matchCounter: {
    fontSize: 14,
    color: '#666',
  },
  webView: {
    flex: 1,
  },
});
