import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface FileInfo {
  url: string;
  name: string;
  type: 'pdf' | 'audio';
}

/**
 * Download and share a file (PDF or audio)
 */
export async function downloadAndShareFile(fileInfo: FileInfo): Promise<void> {
  try {
    // Generate filename
    const filename = fileInfo.name || `download.${fileInfo.type === 'pdf' ? 'pdf' : 'mp3'}`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Show downloading alert
    Alert.alert('Downloading', `Downloading ${filename}...`, [], { cancelable: false });

    // Download file
    const downloadResult = await FileSystem.downloadAsync(fileInfo.url, fileUri);

    if (downloadResult.status === 200) {
      // Share or open file
      if (Platform.OS === 'web') {
        // Web: Open in new tab
        window.open(fileInfo.url, '_blank');
      } else if (Platform.OS === 'ios') {
        // iOS: Use Sharing API
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: fileInfo.type === 'pdf' ? 'application/pdf' : 'audio/mpeg',
            dialogTitle: `Share ${filename}`,
          });
        } else {
          Alert.alert('Success', `Downloaded to: ${fileUri}`);
        }
      } else if (Platform.OS === 'android') {
        // Android: Use Sharing API
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: fileInfo.type === 'pdf' ? 'application/pdf' : 'audio/mpeg',
            dialogTitle: `Share ${filename}`,
          });
        } else {
          Alert.alert('Success', `Downloaded to: ${fileUri}`);
        }
      }
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (error) {
    console.error('Download error:', error);
    Alert.alert('Download Error', `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file type from URL
 */
export function getFileType(url: string): 'pdf' | 'audio' | null {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('application/pdf')) {
    return 'pdf';
  }
  
  if (lowerUrl.match(/\.(mp3|wav|m4a|aac|ogg)($|\?)/)) {
    return 'audio';
  }
  
  return null;
}

/**
 * Extract filename from URL
 */
export function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename || 'download';
  } catch {
    return 'download';
  }
}
