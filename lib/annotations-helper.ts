import type { AnnotationPosition } from '@/types/annotations';

/**
 * Get XPath for a DOM node
 */
export function getXPathForElement(element: Node): string {
  if (element.nodeType === Node.DOCUMENT_NODE) {
    return '/';
  }

  // Get index among siblings of the same type
  const getElementIndex = (el: Node): number => {
    let index = 1;
    let sibling = el.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    return index;
  };

  const parts: string[] = [];
  let currentNode: Node | null = element;

  while (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
    const index = getElementIndex(currentNode);
    const tagName = currentNode.nodeName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    currentNode = currentNode.parentNode;
  }

  return '/' + parts.join('/');
}

/**
 * Get element from XPath
 */
export function getElementByXPath(doc: Document, xpath: string): Node | null {
  try {
    const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
  } catch (error) {
    console.error('XPath evaluation error:', error);
    return null;
  }
}

/**
 * Find text snippet in document to establish fallback position
 */
export function findTextInDocument(doc: Document, textSnippet: string): Node | null {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.textContent?.includes(textSnippet)) {
      return node;
    }
    node = walker.nextNode();
  }
  
  return null;
}

/**
 * Create annotation marker element
 */
export function createAnnotationMarker(
  doc: Document,
  annotationId: string,
  emoji: string,
  type: 'icon' | 'note'
): HTMLSpanElement {
  const marker = doc.createElement('span');
  marker.className = `dcs-annotation dcs-annotation-${type}`;
  marker.setAttribute('data-annotation-id', annotationId);
  marker.style.cssText = `
    display: inline-block;
    margin: 0 4px;
    padding: 2px 6px;
    background-color: ${type === 'note' ? '#fef3c7' : '#dbeafe'};
    border-radius: 6px;
    font-size: 18px;
    cursor: pointer;
    user-select: none;
    vertical-align: middle;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;
  marker.textContent = emoji;
  
  // Add hover effect
  marker.addEventListener('mouseenter', () => {
    marker.style.transform = 'scale(1.1)';
    marker.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  });
  
  marker.addEventListener('mouseleave', () => {
    marker.style.transform = 'scale(1)';
    marker.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  });
  
  return marker;
}

/**
 * Insert annotation marker at position
 */
export function insertAnnotationMarker(
  doc: Document,
  position: AnnotationPosition,
  marker: HTMLSpanElement
): boolean {
  try {
    // Try XPath first
    let targetNode = getElementByXPath(doc, position.xpath);
    
    // Fallback to text snippet search
    if (!targetNode) {
      targetNode = findTextInDocument(doc, position.textSnippet);
    }
    
    if (!targetNode) {
      console.error('Could not find target node for annotation');
      return false;
    }
    
    // If it's a text node, split at the offset and insert marker
    if (targetNode.nodeType === Node.TEXT_NODE) {
      const parent = targetNode.parentNode;
      if (!parent) return false;
      
      const text = targetNode.textContent || '';
      const offset = Math.min(position.offset, text.length);
      
      // Split the text node
      const beforeText = text.substring(0, offset);
      const afterText = text.substring(offset);
      
      const beforeNode = doc.createTextNode(beforeText);
      const afterNode = doc.createTextNode(afterText);
      
      parent.insertBefore(beforeNode, targetNode);
      parent.insertBefore(marker, targetNode);
      parent.insertBefore(afterNode, targetNode);
      parent.removeChild(targetNode);
      
      return true;
    } else {
      // Element node - append as child
      targetNode.appendChild(marker);
      return true;
    }
  } catch (error) {
    console.error('Error inserting annotation marker:', error);
    return false;
  }
}

/**
 * Remove all annotation markers from document
 */
export function removeAllAnnotationMarkers(doc: Document): void {
  const markers = doc.querySelectorAll('.dcs-annotation');
  markers.forEach(marker => marker.remove());
}

/**
 * Get position from click/touch event
 */
export function getPositionFromEvent(
  doc: Document,
  event: MouseEvent | Touch
): AnnotationPosition | null {
  try {
    const range = doc.caretRangeFromPoint
      ? doc.caretRangeFromPoint(event.clientX, event.clientY)
      : null;
    
    if (!range) {
      console.error('Could not get range from point');
      return null;
    }
    
    const node = range.startContainer;
    const offset = range.startOffset;
    
    // Get XPath for the node
    const xpath = node.nodeType === Node.TEXT_NODE && node.parentNode
      ? getXPathForElement(node.parentNode)
      : getXPathForElement(node);
    
    // Get text snippet for fallback
    const text = node.textContent || '';
    const snippetStart = Math.max(0, offset - 20);
    const snippetEnd = Math.min(text.length, offset + 20);
    const textSnippet = text.substring(snippetStart, snippetEnd);
    
    return {
      xpath,
      offset,
      textSnippet,
    };
  } catch (error) {
    console.error('Error getting position from event:', error);
    return null;
  }
}
