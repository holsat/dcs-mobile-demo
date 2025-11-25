import type { Annotation, AnnotationPosition } from '@/types/annotations';
import { ICON_DEFINITIONS, NOTE_EMOJI } from '@/types/annotations';

/**
 * Generate JavaScript to inject annotations into WebView
 */
export function generateAnnotationInjectionScript(annotations: Annotation[]): string {
  // Convert annotations to JSON that can be safely embedded
  const annotationsJson = JSON.stringify(annotations);
  
  return `
    (function() {
      const annotations = ${annotationsJson};
      
      // Helper: Get XPath element
      function getElementByXPath(xpath) {
        try {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue;
        } catch (error) {
          console.error('XPath evaluation error:', error);
          return null;
        }
      }
      
      // Helper: Find text snippet
      function findTextInDocument(textSnippet) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node = walker.nextNode();
        while (node) {
          if (node.textContent && node.textContent.includes(textSnippet)) {
            return node;
          }
          node = walker.nextNode();
        }
        return null;
      }
      
      // Helper: Create annotation marker
      function createAnnotationMarker(annotation) {
        const marker = document.createElement('span');
        marker.className = 'dcs-annotation dcs-annotation-' + annotation.type;
        marker.setAttribute('data-annotation-id', annotation.id);
        marker.style.cssText = \`
          display: inline-block;
          margin: 0 4px;
          padding: 2px 6px;
          background-color: \${annotation.type === 'note' ? '#fef3c7' : '#dbeafe'};
          border-radius: 6px;
          font-size: 18px;
          cursor: pointer;
          user-select: none;
          vertical-align: middle;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        \`;
        
        // Get emoji for the annotation
        let emoji = '${NOTE_EMOJI}';
        if (annotation.type === 'icon' && annotation.iconType) {
          const iconDefs = ${JSON.stringify(ICON_DEFINITIONS)};
          const iconDef = iconDefs.find(d => d.type === annotation.iconType);
          if (iconDef) {
            emoji = iconDef.emoji;
          }
        }
        
        marker.textContent = emoji;
        
        // Add click handler
        marker.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'annotationClick',
            annotationId: annotation.id
          }));
        });
        
        return marker;
      }
      
      // Helper: Insert marker at position
      function insertAnnotationMarker(position, marker) {
        try {
          let targetNode = getElementByXPath(position.xpath);
          
          if (!targetNode) {
            targetNode = findTextInDocument(position.textSnippet);
          }
          
          if (!targetNode) {
            console.error('Could not find target node for annotation');
            return false;
          }
          
          if (targetNode.nodeType === 3) {
            const parent = targetNode.parentNode;
            if (!parent) return false;
            
            const text = targetNode.textContent || '';
            const offset = Math.min(position.offset, text.length);
            
            const beforeText = text.substring(0, offset);
            const afterText = text.substring(offset);
            
            const beforeNode = document.createTextNode(beforeText);
            const afterNode = document.createTextNode(afterText);
            
            parent.insertBefore(beforeNode, targetNode);
            parent.insertBefore(marker, targetNode);
            parent.insertBefore(afterNode, targetNode);
            parent.removeChild(targetNode);
            
            return true;
          } else {
            targetNode.appendChild(marker);
            return true;
          }
        } catch (error) {
          console.error('Error inserting annotation marker:', error);
          return false;
        }
      }
      
      // Remove existing annotation markers
      const existingMarkers = document.querySelectorAll('.dcs-annotation');
      existingMarkers.forEach(m => m.remove());
      
      // Insert all annotations
      annotations.forEach(function(annotation) {
        const marker = createAnnotationMarker(annotation);
        insertAnnotationMarker(annotation.position, marker);
      });
    })();
  `;
}

/**
 * Generate JavaScript to capture long-press position in WebView
 */
export function generateLongPressListenerScript(): string {
  return `
    (function() {
      let longPressTimer = null;
      let touchStartPos = null;
      
      document.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          touchStartPos = { x: touch.clientX, y: touch.clientY };
          
          longPressTimer = setTimeout(function() {
            // Get position information
            const range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
            if (!range) return;
            
            const node = range.startContainer;
            const offset = range.startOffset;
            
            // Get XPath
            function getXPath(element) {
              if (element.nodeType === 9) return '/';
              
              function getIndex(el) {
                let index = 1;
                let sibling = el.previousSibling;
                while (sibling) {
                  if (sibling.nodeType === 1 && sibling.nodeName === el.nodeName) {
                    index++;
                  }
                  sibling = sibling.previousSibling;
                }
                return index;
              }
              
              const parts = [];
              let current = element;
              
              while (current && current.nodeType === 1) {
                const index = getIndex(current);
                const tagName = current.nodeName.toLowerCase();
                parts.unshift(tagName + '[' + index + ']');
                current = current.parentNode;
              }
              
              return '/' + parts.join('/');
            }
            
            const xpath = node.nodeType === 3 && node.parentNode
              ? getXPath(node.parentNode)
              : getXPath(node);
            
            const text = node.textContent || '';
            const snippetStart = Math.max(0, offset - 20);
            const snippetEnd = Math.min(text.length, offset + 20);
            const textSnippet = text.substring(snippetStart, snippetEnd);
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'longPress',
              position: {
                xpath: xpath,
                offset: offset,
                textSnippet: textSnippet
              }
            }));
          }, 500); // 500ms for long press
        }
      }, false);
      
      document.addEventListener('touchmove', function(e) {
        if (touchStartPos && e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - touchStartPos.x;
          const dy = touch.clientY - touchStartPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Cancel long press if finger moved too much
          if (distance > 10 && longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
      }, false);
      
      document.addEventListener('touchend', function(e) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        touchStartPos = null;
      }, false);
      
      document.addEventListener('touchcancel', function(e) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        touchStartPos = null;
      }, false);
    })();
  `;
}
