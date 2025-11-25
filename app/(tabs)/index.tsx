import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ServicesOverlay } from '@/components/ServicesOverlay';
import { AnnotationSelector } from '@/components/AnnotationSelector';
import { NoteViewer } from '@/components/NoteViewer';
import { useServices } from '@/contexts/ServicesContext';
import { useAnnotations } from '@/contexts/AnnotationsContext';
import { ICON_DEFINITIONS, NOTE_EMOJI, type IconType, type Annotation, type AnnotationPosition } from '@/types/annotations';

// WebView is only available on native platforms (iOS/Android)
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

export default function HomeScreen() {
  const { selectedResource, openOverlay, clearSelectedResource } = useServices();
  const { 
    getAnnotationsForService, 
    addIconAnnotation, 
    addNoteAnnotation, 
    updateNoteAnnotation, 
    removeAnnotation 
  } = useAnnotations();
  
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
  
  // Annotation state
  const [annotationSelectorVisible, setAnnotationSelectorVisible] = React.useState(false);
  const [pendingAnnotationPosition, setPendingAnnotationPosition] = React.useState<AnnotationPosition | null>(null);
  const [noteViewerVisible, setNoteViewerVisible] = React.useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = React.useState<Annotation | null>(null);
  const [annotationMode, setAnnotationMode] = React.useState(false);

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
    const newSearchVisible = !searchVisible;
    setSearchVisible(newSearchVisible);
    if (!newSearchVisible) {
      setSearchQuery('');
      clearSearchHighlights();
    }
  };

  // Clear all search highlights
  const clearSearchHighlights = () => {
    if (Platform.OS !== 'web' || !iframeRef.current) return;
    
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const highlights = iframeDoc.querySelectorAll('.search-highlight, .search-highlight-current');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    
    matchElementsRef.current = [];
    setMatchCount(0);
    setCurrentMatchIndex(0);
  };

  // Search and highlight matches in iframe
  const performSearch = (query: string) => {
    if (Platform.OS !== 'web' || !iframeRef.current || !query) {
      clearSearchHighlights();
      return;
    }

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) {
      console.log('No iframe document found');
      return;
    }

    // Clear previous highlights
    clearSearchHighlights();

    // Find all text nodes and highlight matches
    const matches: HTMLElement[] = [];
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    console.log('Searching for:', query, 'Escaped:', escapedQuery);
    
    const walkTextNodes = (node: Node) => {
      if (node.nodeType === 3) { // Text node
        const text = node.textContent || '';
        // Use a fresh regex for each test to avoid lastIndex issues
        const testRegex = new RegExp(escapedQuery, 'i');
        if (testRegex.test(text)) {
          const span = iframeDoc.createElement('span');
          const parent = node.parentNode;
          if (!parent) return;
          
          // Use a fresh regex for replacement
          const replaceRegex = new RegExp(escapedQuery, 'gi');
          span.innerHTML = text.replace(replaceRegex, (match) => {
            return `<mark class="search-highlight" style="background-color: #fef08a; padding: 2px 0;">${match}</mark>`;
          });
          
          parent.replaceChild(span, node);
          
          // Collect all highlight elements
          const highlightElements = span.querySelectorAll('.search-highlight');
          highlightElements.forEach(el => matches.push(el as HTMLElement));
        }
      } else if (node.nodeType === 1) { // Element node
        const element = node as HTMLElement;
        // Skip script, style, and other non-visible elements
        if (!['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)) {
          Array.from(node.childNodes).forEach(walkTextNodes);
        }
      }
    };

    if (iframeDoc.body) {
      walkTextNodes(iframeDoc.body);
      console.log('Found matches:', matches.length);
    } else {
      console.log('No iframe body found');
    }
    
    matchElementsRef.current = matches;
    setMatchCount(matches.length);
    
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      highlightCurrentMatch(0);
    }
  };

  // Highlight the current match and scroll to it
  const highlightCurrentMatch = (index: number) => {
    const matches = matchElementsRef.current;
    if (!matches.length || index < 0 || index >= matches.length) return;

    // Remove current highlight from all matches
    matches.forEach(match => {
      match.className = 'search-highlight';
      match.style.backgroundColor = '#fef08a';
    });

    // Highlight current match
    const currentMatch = matches[index];
    currentMatch.className = 'search-highlight-current';
    currentMatch.style.backgroundColor = '#facc15';
    currentMatch.style.fontWeight = 'bold';
    
    // Scroll to current match
    currentMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Navigate to next match
  const nextMatch = () => {
    const matches = matchElementsRef.current;
    if (matches.length === 0) return;
    
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    highlightCurrentMatch(nextIndex);
  };

  // Navigate to previous match
  const previousMatch = () => {
    const matches = matchElementsRef.current;
    if (matches.length === 0) return;
    
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    highlightCurrentMatch(prevIndex);
  };

  // Perform search on native WebView
  const performNativeSearch = (query: string) => {
    if (!webViewRef.current || !query) {
      // Clear highlights
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            const highlights = document.querySelectorAll('.search-highlight, .search-highlight-current');
            highlights.forEach(highlight => {
              const parent = highlight.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
                parent.normalize();
              }
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'searchResults', count: 0 }));
          })();
        `);
      }
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Inject search JavaScript into WebView
    const searchScript = `
      (function() {
        // Clear previous highlights
        const oldHighlights = document.querySelectorAll('.search-highlight, .search-highlight-current');
        oldHighlights.forEach(highlight => {
          const parent = highlight.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
            parent.normalize();
          }
        });

        // Search and highlight
        const matches = [];
        const searchRegex = new RegExp('${escapedQuery}', 'gi');
        
        function walkTextNodes(node) {
          if (node.nodeType === 3) { // Text node
            const text = node.textContent || '';
            const testRegex = new RegExp('${escapedQuery}', 'i');
            if (testRegex.test(text)) {
              const span = document.createElement('span');
              const parent = node.parentNode;
              if (!parent) return;
              
              const replaceRegex = new RegExp('${escapedQuery}', 'gi');
              span.innerHTML = text.replace(replaceRegex, function(match) {
                return '<mark class="search-highlight" style="background-color: #fef08a; padding: 2px 0;">' + match + '</mark>';
              });
              
              parent.replaceChild(span, node);
              
              const highlightElements = span.querySelectorAll('.search-highlight');
              highlightElements.forEach(function(el) {
                matches.push(el);
              });
            }
          } else if (node.nodeType === 1) {
            const element = node;
            if (!['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)) {
              Array.from(node.childNodes).forEach(walkTextNodes);
            }
          }
        }

        if (document.body) {
          walkTextNodes(document.body);
        }

        // Store matches globally for navigation
        window._searchMatches = matches;
        window._currentMatchIndex = 0;

        // Highlight first match
        if (matches.length > 0) {
          matches[0].className = 'search-highlight-current';
          matches[0].style.backgroundColor = '#facc15';
          matches[0].style.fontWeight = 'bold';
          matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Send results back to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'searchResults',
          count: matches.length,
          currentIndex: 0
        }));
      })();
    `;

    webViewRef.current.injectJavaScript(searchScript);
  };

  // Navigate to next match in native WebView
  const nativeNextMatch = () => {
    if (!webViewRef.current) return;

    const navScript = `
      (function() {
        const matches = window._searchMatches || [];
        if (matches.length === 0) return;

        const currentIndex = window._currentMatchIndex || 0;
        const nextIndex = (currentIndex + 1) % matches.length;

        // Remove current highlight from all matches
        matches.forEach(function(match) {
          match.className = 'search-highlight';
          match.style.backgroundColor = '#fef08a';
          match.style.fontWeight = 'normal';
        });

        // Highlight current match
        matches[nextIndex].className = 'search-highlight-current';
        matches[nextIndex].style.backgroundColor = '#facc15';
        matches[nextIndex].style.fontWeight = 'bold';
        matches[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

        window._currentMatchIndex = nextIndex;

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'searchResults',
          count: matches.length,
          currentIndex: nextIndex
        }));
      })();
    `;

    webViewRef.current.injectJavaScript(navScript);
  };

  // Navigate to previous match in native WebView
  const nativePreviousMatch = () => {
    if (!webViewRef.current) return;

    const navScript = `
      (function() {
        const matches = window._searchMatches || [];
        if (matches.length === 0) return;

        const currentIndex = window._currentMatchIndex || 0;
        const prevIndex = currentIndex === 0 ? matches.length - 1 : currentIndex - 1;

        // Remove current highlight from all matches
        matches.forEach(function(match) {
          match.className = 'search-highlight';
          match.style.backgroundColor = '#fef08a';
          match.style.fontWeight = 'normal';
        });

        // Highlight current match
        matches[prevIndex].className = 'search-highlight-current';
        matches[prevIndex].style.backgroundColor = '#facc15';
        matches[prevIndex].style.fontWeight = 'bold';
        matches[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

        window._currentMatchIndex = prevIndex;

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'searchResults',
          count: matches.length,
          currentIndex: prevIndex
        }));
      })();
    `;

    webViewRef.current.injectJavaScript(navScript);
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'searchResults') {
        setMatchCount(data.count);
        setCurrentMatchIndex(data.currentIndex);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Handle search with debouncing
  React.useEffect(() => {
    if (!searchQuery) {
      if (Platform.OS === 'web') {
        clearSearchHighlights();
      } else {
        performNativeSearch('');
      }
      return;
    }

    const timer = setTimeout(() => {
      if (Platform.OS === 'web') {
        performSearch(searchQuery);
      } else {
        performNativeSearch(searchQuery);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ==================== ANNOTATIONS LOGIC ====================
  
  // Get service type from selected resource
  const getServiceType = (): string => {
    if (!selectedResource) return '';
    // Extract service type from title (e.g., "Matins", "Vespers", etc.)
    return selectedResource.serviceTitle;
  };

  // Load and inject annotations when content loads (WEB)
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !iframeLoaded || !iframeRef.current || !selectedResource) {
      return;
    }

    const serviceType = getServiceType();
    const annotations = getAnnotationsForService(serviceType);
    
    // Inject annotations into iframe
    const injectAnnotations = async () => {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;

      // Import helper functions dynamically
      const { 
        createAnnotationMarker, 
        insertAnnotationMarker, 
        removeAllAnnotationMarkers 
      } = await import('@/lib/annotations-helper');

      // Remove existing annotations
      removeAllAnnotationMarkers(iframeDoc);

      // Insert each annotation
      annotations.forEach((annotation) => {
        const iconDef = annotation.type === 'icon' && annotation.iconType
          ? ICON_DEFINITIONS.find(d => d.type === annotation.iconType)
          : null;
        
        const emoji = annotation.type === 'note' 
          ? NOTE_EMOJI 
          : (iconDef?.emoji || '🔖');

        const marker = createAnnotationMarker(
          iframeDoc,
          annotation.id,
          emoji,
          annotation.type
        );

        // Add click handler
        marker.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (annotation.type === 'note') {
            setSelectedAnnotation(annotation);
            setNoteViewerVisible(true);
          }
        });

        insertAnnotationMarker(iframeDoc, annotation.position, marker);
      });
    };

    injectAnnotations();
  }, [iframeLoaded, selectedResource, getAnnotationsForService]);

  // Load and inject annotations when content loads (NATIVE)
  React.useEffect(() => {
    if (Platform.OS === 'web' || !webViewRef.current || !selectedResource) {
      return;
    }

    const serviceType = getServiceType();
    const annotations = getAnnotationsForService(serviceType);

    // Inject annotations into WebView
    const injectAnnotations = async () => {
      const { generateAnnotationInjectionScript } = await import('@/lib/annotations-native');
      const script = generateAnnotationInjectionScript(annotations);
      webViewRef.current?.injectJavaScript(script);
    };

    // Small delay to ensure content is loaded
    const timer = setTimeout(injectAnnotations, 500);
    return () => clearTimeout(timer);
  }, [selectedResource, getAnnotationsForService]);

  // Setup click listener for web when in annotation mode
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !iframeLoaded || !iframeRef.current || !annotationMode) {
      return;
    }

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const handleClick = async (e: MouseEvent) => {
      // Don't trigger if clicking on an existing annotation marker
      const target = e.target as HTMLElement;
      if (target.classList.contains('dcs-annotation')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      
      const { getPositionFromEvent } = await import('@/lib/annotations-helper');
      const position = getPositionFromEvent(iframeDoc, e);
      if (position) {
        setPendingAnnotationPosition(position);
        setAnnotationSelectorVisible(true);
      }
    };

    iframeDoc.addEventListener('click', handleClick as any, true);

    return () => {
      iframeDoc.removeEventListener('click', handleClick as any, true);
    };
  }, [iframeLoaded, annotationMode]);

  // Setup long-press listener for native
  React.useEffect(() => {
    if (Platform.OS === 'web' || !webViewRef.current) {
      return;
    }

    // Inject long-press listener script
    const injectLongPressListener = async () => {
      const { generateLongPressListenerScript } = await import('@/lib/annotations-native');
      const script = generateLongPressListenerScript();
      webViewRef.current?.injectJavaScript(script);
    };

    injectLongPressListener();
  }, [selectedResource]);

  // Enhanced WebView message handler for annotations
  const handleWebViewMessageWithAnnotations = (event: any) => {
    // Call existing handler first
    handleWebViewMessage(event);

    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'longPress' && data.position) {
        setPendingAnnotationPosition(data.position);
        setAnnotationSelectorVisible(true);
      } else if (data.type === 'annotationClick' && data.annotationId) {
        const serviceType = getServiceType();
        const annotations = getAnnotationsForService(serviceType);
        const annotation = annotations.find(a => a.id === data.annotationId);
        
        if (annotation && annotation.type === 'note') {
          setSelectedAnnotation(annotation);
          setNoteViewerVisible(true);
        }
      }
    } catch (error) {
      console.error('Error parsing annotation WebView message:', error);
    }
  };

  // Handle annotation icon selection
  const handleSelectIcon = async (iconType: IconType) => {
    if (!pendingAnnotationPosition) return;
    
    const serviceType = getServiceType();
    await addIconAnnotation(serviceType, iconType, pendingAnnotationPosition);
    
    // Reload annotations
    if (Platform.OS === 'web' && iframeRef.current) {
      // Trigger re-render by updating a state
      setIframeLoaded(false);
      setTimeout(() => setIframeLoaded(true), 50);
    } else if (webViewRef.current) {
      // Reinject for native
      const annotations = getAnnotationsForService(serviceType);
      const { generateAnnotationInjectionScript } = await import('@/lib/annotations-native');
      const script = generateAnnotationInjectionScript(annotations);
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Handle note creation
  const handleCreateNote = async (noteText: string) => {
    if (!pendingAnnotationPosition) return;
    
    const serviceType = getServiceType();
    await addNoteAnnotation(serviceType, noteText, pendingAnnotationPosition);
    
    // Reload annotations (same as icon)
    if (Platform.OS === 'web' && iframeRef.current) {
      setIframeLoaded(false);
      setTimeout(() => setIframeLoaded(true), 50);
    } else if (webViewRef.current) {
      const annotations = getAnnotationsForService(serviceType);
      const { generateAnnotationInjectionScript } = await import('@/lib/annotations-native');
      const script = generateAnnotationInjectionScript(annotations);
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Handle note update
  const handleUpdateNote = async (newText: string) => {
    if (!selectedAnnotation) return;
    
    await updateNoteAnnotation(selectedAnnotation.id, newText);
    
    // Reload annotations
    const serviceType = getServiceType();
    if (Platform.OS === 'web' && iframeRef.current) {
      setIframeLoaded(false);
      setTimeout(() => setIframeLoaded(true), 50);
    } else if (webViewRef.current) {
      const annotations = getAnnotationsForService(serviceType);
      const { generateAnnotationInjectionScript } = await import('@/lib/annotations-native');
      const script = generateAnnotationInjectionScript(annotations);
      webViewRef.current.injectJavaScript(script);
    }
  };

  // Handle annotation deletion
  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotation) return;
    
    await removeAnnotation(selectedAnnotation.id);
    
    // Reload annotations
    const serviceType = getServiceType();
    if (Platform.OS === 'web' && iframeRef.current) {
      setIframeLoaded(false);
      setTimeout(() => setIframeLoaded(true), 50);
    } else if (webViewRef.current) {
      const annotations = getAnnotationsForService(serviceType);
      const { generateAnnotationInjectionScript } = await import('@/lib/annotations-native');
      const script = generateAnnotationInjectionScript(annotations);
      webViewRef.current.injectJavaScript(script);
    }
  };

  // ==================== END ANNOTATIONS LOGIC ====================

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
            <Pressable 
              style={[styles.toolbarButton, annotationMode && styles.toolbarButtonActive]} 
              onPress={() => setAnnotationMode(!annotationMode)}
            >
              <Text style={styles.toolbarButtonText}>📌 {annotationMode ? 'Done' : 'Note'}</Text>
            </Pressable>
            <Pressable style={styles.toolbarButton} onPress={toggleSearch}>
              <Text style={styles.toolbarButtonText}>🔍</Text>
            </Pressable>
          </View>
        ) : (
          // Original header when no content is loaded
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>GOA Digital Chant Stand</Text>
              <Text style={styles.subHeading}>Enhanced Digital Chant Stand Viewer</Text>
            </View>
          </View>
        )}

        {selectedResource && searchVisible ? (
          <View style={styles.searchContainer}>
            <View style={styles.searchPanel}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search in service content..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {matchCount > 0 && (
                <View style={styles.matchInfo}>
                  <Text style={styles.matchText}>
                    {currentMatchIndex + 1} of {matchCount}
                  </Text>
                  <View style={styles.navButtons}>
                    <Pressable style={styles.navButton} onPress={Platform.OS === 'web' ? previousMatch : nativePreviousMatch}>
                      <Text style={styles.navButtonText}>↑</Text>
                    </Pressable>
                    <Pressable style={styles.navButton} onPress={Platform.OS === 'web' ? nextMatch : nativeNextMatch}>
                      <Text style={styles.navButtonText}>↓</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {searchQuery.length > 0 && matchCount === 0 && (
                <Text style={styles.noMatchText}>No matches</Text>
              )}
              <Pressable style={styles.clearButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            </View>
          </View>
        ) : !selectedResource ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Select a Service</Text>
            <Text style={styles.placeholderText}>
              Tap the Services calendar icon below to choose a date and load the DCS resources for that day.
            </Text>
          </View>
        ) : null}

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
                  onLoad={() => {
                    console.log('Iframe loaded');
                    setIframeLoaded(true);
                    // Re-run search if there's a query
                    if (searchQuery) {
                      performSearch(searchQuery);
                    }
                  }}
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
                onMessage={handleWebViewMessageWithAnnotations}
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
      
      {/* Annotation Modals */}
      <AnnotationSelector
        visible={annotationSelectorVisible}
        onClose={() => {
          setAnnotationSelectorVisible(false);
          setPendingAnnotationPosition(null);
        }}
        onSelectIcon={handleSelectIcon}
        onCreateNote={handleCreateNote}
      />
      
      <NoteViewer
        visible={noteViewerVisible}
        noteText={selectedAnnotation?.noteText || ''}
        onClose={() => {
          setNoteViewerVisible(false);
          setSelectedAnnotation(null);
        }}
        onUpdate={handleUpdateNote}
        onDelete={handleDeleteAnnotation}
      />
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
  toolbarButtonActive: {
    backgroundColor: '#facc15',
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
  searchContainer: {
    marginBottom: 12,
  },
  searchPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#1e40af',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    paddingVertical: 8,
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  matchText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 8,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    backgroundColor: '#1e40af',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  noMatchText: {
    fontSize: 14,
    color: '#ef4444',
    fontStyle: 'italic',
    marginLeft: 8,
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
