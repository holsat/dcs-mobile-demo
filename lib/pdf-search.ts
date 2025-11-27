/**
 * PDF Search Utility
 * 
 * Provides text search functionality for PDFs using PDF.js
 * Supports searching, highlighting, and navigation through matches
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker URL for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFSearchMatch {
  page: number;
  text: string;
  position: { x: number; y: number; width: number; height: number }[];
}

export interface PDFSearchResult {
  matches: PDFSearchMatch[];
  totalMatches: number;
  currentIndex: number;
}

/**
 * Search for text in a PDF document
 */
export async function searchPDF(
  pdfUrl: string,
  searchTerm: string,
  caseSensitive: boolean = false
): Promise<PDFSearchResult> {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const matches: PDFSearchMatch[] = [];
    const searchRegex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let pageText = '';
      const charPositions: Array<{ char: string; position: any }> = [];

      textContent.items.forEach((item: any) => {
        if (item.str) {
          pageText += item.str;
          charPositions.push({
            char: item.str,
            position: {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
            },
          });
        }
      });

      // Find all matches on this page
      let match;
      while ((match = searchRegex.exec(pageText)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        // Get positions of matched text
        let charIndex = 0;
        const positions: Array<{ x: number; y: number; width: number; height: number }> = [];

        charPositions.forEach(({ position }) => {
          if (charIndex >= startIndex && charIndex < endIndex) {
            positions.push(position);
          }
          charIndex++;
        });

        matches.push({
          page: pageNum,
          text: match[0],
          position: positions,
        });
      }
    }

    return {
      matches,
      totalMatches: matches.length,
      currentIndex: 0,
    };
  } catch (error) {
    console.error('PDF search error:', error);
    throw error;
  }
}

/**
 * Extract text from a specific page of a PDF
 */
export async function extractPageText(pdfUrl: string, pageNum: number): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    return textContent.items.map((item: any) => item.str).join('');
  } catch (error) {
    console.error('Failed to extract page text:', error);
    throw error;
  }
}

/**
 * Get total number of pages in PDF
 */
export async function getPDFPageCount(pdfUrl: string): Promise<number> {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Failed to get page count:', error);
    throw error;
  }
}

/**
 * Create HTML string to render searchable PDF viewer
 */
export function createPDFSearchHTML(pdfUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PDF Viewer</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.min.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: #f5f5f5;
        }
        #controls {
          position: sticky;
          top: 0;
          background: white;
          padding: 12px;
          border-bottom: 1px solid #ddd;
          display: flex;
          gap: 8px;
          align-items: center;
          z-index: 100;
        }
        #searchInput {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        button {
          padding: 8px 12px;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover {
          background: #0051D5;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        #matchCount {
          font-size: 14px;
          color: #666;
          min-width: 80px;
          text-align: right;
        }
        #pdfContainer {
          padding: 12px;
          max-width: 900px;
          margin: 0 auto;
        }
        .pdf-page {
          background: white;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        .pdf-page canvas {
          display: block;
          width: 100%;
          height: auto;
        }
        .pdf-page-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .search-highlight {
          position: absolute;
          background: rgba(255, 255, 0, 0.4);
          border: 1px solid rgba(255, 165, 0, 0.8);
          pointer-events: none;
        }
        .search-highlight.current {
          background: rgba(255, 165, 0, 0.6);
          border: 1px solid rgba(255, 69, 0, 1);
        }
        .page-number {
          text-align: center;
          padding: 8px;
          font-size: 12px;
          color: #999;
          background: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div id="controls">
        <input 
          type="text" 
          id="searchInput" 
          placeholder="Search PDF..."
          autocomplete="off"
        />
        <button id="prevBtn" disabled>← Previous</button>
        <button id="nextBtn" disabled>Next →</button>
        <div id="matchCount">0 of 0</div>
      </div>
      <div id="pdfContainer"></div>

      <script>
        const pdfUrl = '${pdfUrl}';
        let pdfDoc = null;
        let currentPage = 1;
        let searchMatches = [];
        let currentMatchIndex = 0;
        let scale = 1.5;

        const searchInput = document.getElementById('searchInput');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const matchCount = document.getElementById('matchCount');
        const pdfContainer = document.getElementById('pdfContainer');

        // Initialize PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = \`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/\${pdfjsLib.version}/pdf.worker.min.js\`;

        // Load PDF
        async function loadPDF() {
          try {
            pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
            renderAllPages();
          } catch (error) {
            console.error('Error loading PDF:', error);
            pdfContainer.innerHTML = '<p style="color: red; padding: 20px;">Error loading PDF</p>';
          }
        }

        // Render all pages
        async function renderAllPages() {
          pdfContainer.innerHTML = '';
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            await renderPage(i);
          }
        }

        // Render single page
        async function renderPage(pageNum) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const pageDiv = document.createElement('div');
          pageDiv.className = 'pdf-page';
          pageDiv.id = \`page-\${pageNum}\`;
          pageDiv.appendChild(canvas);

          // Add page number
          const pageNum_el = document.createElement('div');
          pageNum_el.className = 'page-number';
          pageNum_el.textContent = \`Page \${pageNum}\`;
          pageDiv.appendChild(pageNum_el);

          pdfContainer.appendChild(pageDiv);
        }

        // Search functionality
        async function searchPDF() {
          const searchTerm = searchInput.value.trim();
          if (!searchTerm) {
            searchMatches = [];
            currentMatchIndex = 0;
            updateMatchCount();
            clearHighlights();
            return;
          }

          searchMatches = [];
          const searchRegex = new RegExp(searchTerm, 'gi');

          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();

            let pageText = '';
            textContent.items.forEach(item => {
              if (item.str) {
                pageText += item.str;
              }
            });

            let match;
            while ((match = searchRegex.exec(pageText)) !== null) {
              searchMatches.push({
                page: pageNum,
                text: match[0],
              });
            }
          }

          currentMatchIndex = 0;
          updateMatchCount();
          if (searchMatches.length > 0) {
            scrollToMatch(0);
          }
        }

        // Navigate to previous match
        function prevMatch() {
          if (searchMatches.length === 0) return;
          currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
          scrollToMatch(currentMatchIndex);
          updateMatchCount();
        }

        // Navigate to next match
        function nextMatch() {
          if (searchMatches.length === 0) return;
          currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
          scrollToMatch(currentMatchIndex);
          updateMatchCount();
        }

        // Scroll to match
        function scrollToMatch(index) {
          if (searchMatches.length === 0) return;
          const match = searchMatches[index];
          const pageEl = document.getElementById(\`page-\${match.page}\`);
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        // Clear highlights
        function clearHighlights() {
          document.querySelectorAll('.search-highlight').forEach(el => el.remove());
        }

        // Update match count display
        function updateMatchCount() {
          prevBtn.disabled = searchMatches.length === 0;
          nextBtn.disabled = searchMatches.length === 0;
          if (searchMatches.length > 0) {
            matchCount.textContent = \`\${currentMatchIndex + 1} of \${searchMatches.length}\`;
          } else {
            matchCount.textContent = '0 of 0';
          }
        }

        // Event listeners
        searchInput.addEventListener('input', searchPDF);
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              prevMatch();
            } else {
              nextMatch();
            }
          }
        });
        prevBtn.addEventListener('click', prevMatch);
        nextBtn.addEventListener('click', nextMatch);

        // Load PDF on startup
        loadPDF();
      </script>
    </body>
    </html>
  `;
}
