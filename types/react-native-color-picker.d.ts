declare module 'react-native-color-picker' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface ColorPickerProps extends ViewProps {
    onColorSelected?: (color: string) => void;
    onColorChange?: (color: string) => void;
    defaultColor?: string;
  }

  export const ColorPicker: ComponentType<ColorPickerProps>;
  export default ColorPicker;
}
