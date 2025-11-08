import { useState, useEffect } from 'react';
import { ShopService } from '../services/ShopService';
import { Background } from '../types/Shop';

export const useBackground = () => {
  const [backgroundColors, setBackgroundColors] = useState<string[]>(['#667eea', '#764ba2']);
  const [backgroundType, setBackgroundType] = useState<'solid' | 'gradient' | 'custom' | 'animated'>('gradient');
  const [animationType, setAnimationType] = useState<'space' | 'particle' | 'wave' | 'forest' | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const loadActiveBackground = async () => {
    try {
      setIsLoading(true);
      console.log('Loading active background...');
      
      // Get the full background object
      const activeBackground = await ShopService.getActiveBackground();
      console.log('Active background:', activeBackground);
      
      if (activeBackground) {
        setBackgroundColors(activeBackground.colors);
        setBackgroundType(activeBackground.type);
        setAnimationType(activeBackground.animationType);
      } else {
        // Fallback to default
        setBackgroundColors(['#667eea', '#764ba2']);
        setBackgroundType('gradient');
        setAnimationType(undefined);
      }
    } catch (error) {
      console.error('Error loading active background:', error);
      // Keep default colors on error
      setBackgroundColors(['#667eea', '#764ba2']);
      setBackgroundType('gradient');
      setAnimationType(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBackground = async () => {
    console.log('Refreshing background...');
    await loadActiveBackground();
  };

  useEffect(() => {
    loadActiveBackground();
  }, []);

  return {
    backgroundColors,
    backgroundType,
    animationType,
    isLoading,
    refreshBackground,
  };
};
