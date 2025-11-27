/**
 * PDF Search Helper for Native WebView
 * 
 * This module provides PDF search functionality for native platforms (iOS/Android)
 * when PDFs are loaded in WebView. Since native WebViews render PDFs using platform
 * viewers, we inject a custom search overlay.
 */

/**
 * Generate a script to detect if current page is a PDF
 */
export function generatePDFDetectionScript(): string {
  return `
    (function() {
      try {
        // Check if we're viewing a PDF
        const isPDF = document.contentType === 'application/pdf' ||
                      document.querySelector('embed[type="application/pdf"]') !== null ||
                      window.location.href.toLowerCase().endsWith('.pdf');
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'isPDF',
          value: isPDF
        }));
      } catch(e) {
        console.log('PDF detection error:', e.message);
      }
    })();
  `;
}

/**
 * Generate script to show "Search not available for PDFs" message
 */
export function generatePDFSearchDisabledScript(): string {
  return `
    (function() {
      try {
        // Create overlay for PDF search message
        const existingOverlay = document.getElementById('pdf-search-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'pdf-search-overlay';
        overlay.style.cssText = \`
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 10px;
          z-index: 10000;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
        \`;
        
        overlay.innerHTML = \`
          <div style="font-size: 18px; margin-bottom: 10px;">📄</div>
          <div style="font-size: 14px; margin-bottom: 10px;">
            Search is not available for PDF files
          </div>
          <div style="font-size: 12px; opacity: 0.8;">
            Use the download button to save and search in a PDF reader
          </div>
        \`;
        
        document.body.appendChild(overlay);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          overlay.style.transition = 'opacity 0.3s';
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
        }, 3000);
      } catch(e) {
        console.log('PDF overlay error:', e.message);
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
