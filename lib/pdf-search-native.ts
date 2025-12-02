/**
 * PDF Search Helper for Native WebView
 * 
 * This module provides PDF search functionality for native platforms (iOS/Android)
 * when PDFs are loaded in WebView using the browser's native PDF.js viewer.
 */

/**
 * Generate script to search within PDF using browser's built-in find functionality
 */
export function generatePDFSearchScript(searchTerm: string): string {
  // Escape the search term for safe injection
  const escapedTerm = searchTerm.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  
  return `
    (function() {
      try {
        const searchText = '${escapedTerm}';
        
        // Try multiple methods to search PDF
        
        // Method 1: Use browser's native find API if available
        if (window.find) {
          // Clear any previous search
          if (window.getSelection) {
            window.getSelection().removeAllRanges();
          }
          
          // Perform the search
          const found = window.find(searchText, false, false, true, false, true, false);
          
          if (found) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pdfSearchResult',
              found: true,
              method: 'window.find'
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pdfSearchResult',
              found: false,
              method: 'window.find'
            }));
          }
        } 
        // Method 2: Try to access PDF.js viewer if embedded
        else if (window.PDFViewerApplication) {
          const pdfViewer = window.PDFViewerApplication;
          if (pdfViewer.findController) {
            pdfViewer.findController.executeCommand('find', {
              query: searchText,
              caseSensitive: false,
              highlightAll: true,
              findPrevious: false
            });
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pdfSearchResult',
              found: true,
              method: 'PDFViewerApplication'
            }));
          }
        }
        // Method 3: Check if PDF is in an embed/object tag with accessible content
        else {
          const embeds = document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"]');
          if (embeds.length > 0) {
            // Try to access the embed's document
            const embed = embeds[0];
            if (embed.contentDocument) {
              const found = embed.contentDocument.body.textContent.toLowerCase().includes(searchText.toLowerCase());
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pdfSearchResult',
                found: found,
                method: 'embed.textContent'
              }));
            } else {
              // PDF is rendered natively, can't search
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pdfSearchResult',
                found: false,
                method: 'native-viewer',
                message: 'PDF rendered by native viewer - search not available'
              }));
            }
          } else {
            // Last resort: try to search in any text layer if PDF.js rendered it
            const textLayers = document.querySelectorAll('.textLayer');
            if (textLayers.length > 0) {
              let found = false;
              textLayers.forEach(layer => {
                if (layer.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                  found = true;
                  // Highlight the layer
                  layer.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
                }
              });
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pdfSearchResult',
                found: found,
                method: 'textLayer'
              }));
            } else {
              // No searchable content available
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pdfSearchResult',
                found: false,
                method: 'no-text-layer',
                message: 'PDF has no searchable text layer'
              }));
            }
          }
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pdfSearchError',
          error: e.message
        }));
      }
    })();
  `;
}

/**
 * Generate script to clear PDF search highlights
 */
export function generateClearPDFSearchScript(): string {
  return `
    (function() {
      try {
        // Clear window.find selection
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
        
        // Clear PDF.js highlights
        if (window.PDFViewerApplication && window.PDFViewerApplication.findController) {
          window.PDFViewerApplication.findController.executeCommand('findagain', {
            query: '',
            caseSensitive: false
          });
        }
        
        // Clear any manual highlights we added
        document.querySelectorAll('.textLayer').forEach(layer => {
          layer.style.backgroundColor = '';
        });
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pdfSearchCleared'
        }));
      } catch(e) {
        console.log('Clear PDF search error:', e.message);
      }
    })();
  `;
}

/**
 * Check if a URL points to a PDF
 */
export function isPDFUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.pdf') ||
         lowerUrl.includes('.pdf?') ||
         lowerUrl.includes('application/pdf');
}
