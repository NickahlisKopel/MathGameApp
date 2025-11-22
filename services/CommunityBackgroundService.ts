import { CommunityBackground } from '../types/Shop';
import { getServerUrl } from '../config/ServerConfig';

export class CommunityBackgroundService {
  /**
   * Upload a community background image
   */
  static async uploadBackground(
    imageUri: string,
    name: string,
    description: string,
    tags: string[],
    uploadedBy: string,
    uploaderName: string
  ): Promise<{ success: boolean; background?: CommunityBackground; error?: string }> {
    try {
      const serverUrl = getServerUrl();
      
      // Create form data
      const formData = new FormData();
      
      // Add image file
      const filename = imageUri.split('/').pop() || 'background.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
      
      // Add metadata
      formData.append('name', name);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));
      formData.append('uploadedBy', uploadedBy);
      formData.append('uploaderName', uploaderName);
      
      const response = await fetch(`${serverUrl}/api/community-backgrounds/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Upload failed' };
      }
      
      return { success: true, background: data.background };
    } catch (error) {
      console.error('Error uploading background:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload background' 
      };
    }
  }

  /**
   * Get list of community backgrounds
   */
  static async getCommunityBackgrounds(
    options: {
      limit?: number;
      skip?: number;
      sortBy?: 'uploadedAt' | 'likes' | 'downloads';
      sortOrder?: 1 | -1;
    } = {}
  ): Promise<CommunityBackground[]> {
    try {
      const serverUrl = getServerUrl();
      const { limit = 50, skip = 0, sortBy = 'uploadedAt', sortOrder = -1 } = options;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: skip.toString(),
        sortBy,
        sortOrder: sortOrder.toString(),
      });
      
      const response = await fetch(`${serverUrl}/api/community-backgrounds?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch community backgrounds');
      }
      
      const data = await response.json();
      return data.backgrounds.map((bg: any) => ({
        ...bg,
        uploadedAt: new Date(bg.uploadedAt),
      }));
    } catch (error) {
      console.error('Error fetching community backgrounds:', error);
      return [];
    }
  }

  /**
   * Get a specific community background
   */
  static async getCommunityBackground(backgroundId: string): Promise<CommunityBackground | null> {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/community-backgrounds/${backgroundId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return {
        ...data.background,
        uploadedAt: new Date(data.background.uploadedAt),
      };
    } catch (error) {
      console.error('Error fetching background:', error);
      return null;
    }
  }

  /**
   * Like or unlike a background
   */
  static async toggleLike(
    backgroundId: string,
    userId: string
  ): Promise<{ success: boolean; liked: boolean; likes: number }> {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/community-backgrounds/${backgroundId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, liked: false, likes: 0 };
    }
  }

  /**
   * Record a download/use of a background
   */
  static async recordDownload(backgroundId: string): Promise<boolean> {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/community-backgrounds/${backgroundId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error recording download:', error);
      return false;
    }
  }

  /**
   * Report a background
   */
  static async reportBackground(
    backgroundId: string,
    userId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/community-backgrounds/${backgroundId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, reason }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error reporting background:', error);
      return false;
    }
  }
}
