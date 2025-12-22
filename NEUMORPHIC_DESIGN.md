# Neumorphic Design System

Modern UI redesign using neumorphic design principles - soft shadows, subtle depth, and tactile feeling.

## 📁 File Structure

```
styles/
  └── neumorphicTheme.ts        # Design tokens, colors, shadows, helpers

components/neumorphic/
  ├── NeumorphicButton.tsx       # Reusable button component
  ├── NeumorphicCard.tsx         # Reusable card component
  ├── NeumorphicInput.tsx        # Reusable input component
  └── NeumorphicMainMenu.tsx     # Example: Redesigned main menu
```

## 🎨 Design Principles

### Color Palette
- **Base**: Soft grays (#E0E5EC, #DDE1E7, #C8CDD3)
- **Primary**: Blue-gray tones (#7C8DB5)
- **Secondary**: Purple-gray tones (#967CB5)
- **Success**: Muted green (#7CB58D)
- **Error**: Muted red (#B57C7C)

### Shadow System
- **Raised**: Double shadow (light top-left, dark bottom-right)
- **Inset**: Pressed/concave effect
- **Floating**: Elevated with soft drop shadow

### Typography
- **H1**: 32px, Bold
- **H2**: 24px, Semibold
- **H3**: 20px, Semibold
- **Body**: 16px, Regular
- **Caption**: 14px, Regular

## 🚀 Quick Start

### Using Neumorphic Components

#### Button
\`\`\`tsx
import { NeumorphicButton } from './components/neumorphic/NeumorphicButton';

<NeumorphicButton
  title="Play Game"
  icon="🎮"
  onPress={() => console.log('Pressed!')}
  variant="primary"  // primary | secondary | success | error
  size="medium"      // small | medium | large
  fullWidth={false}
  disabled={false}
/>
\`\`\`

#### Card
\`\`\`tsx
import { NeumorphicCard } from './components/neumorphic/NeumorphicCard';

<NeumorphicCard
  variant="raised"  // raised | inset | floating
  padding={20}
>
  <Text>Your content here</Text>
</NeumorphicCard>
\`\`\`

#### Input
\`\`\`tsx
import { NeumorphicInput } from './components/neumorphic/NeumorphicInput';

<NeumorphicInput
  label="Username"
  icon="👤"
  placeholder="Enter username"
  value={username}
  onChangeText={setUsername}
  error={usernameError}
/>
\`\`\`

### Using Theme Helpers

\`\`\`tsx
import {
  neumorphicColors,
  getNeumorphicStyle,
  spacing,
  borderRadius,
  typography
} from './styles/neumorphicTheme';

const styles = StyleSheet.create({
  myButton: {
    ...getNeumorphicStyle('raised'),
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  myText: {
    ...typography.h2,
    color: neumorphicColors.text.primary,
  },
});
\`\`\`

## 📱 Screen Examples

### Main Menu (Complete Example)

The new `NeumorphicMainMenu` component is a fully functional replacement for the current main menu with:
- Modern neumorphic design
- Game mode cards with icons and descriptions
- Multiplayer section
- Quick action buttons
- Responsive grid layout

To use it:
\`\`\`tsx
import { NeumorphicMainMenu } from './components/neumorphic/NeumorphicMainMenu';

<NeumorphicMainMenu
  onClassicMode={startClassicMode}
  onTimesTableMode={startTimesTableMode}
  onBubblePopMode={startBubblePop}
  onBubblePlusMode={startBubblePlus}
  onLocalPvPMode={startLocalPvP}
  onOnlinePvPMode={startOnlinePvP}
  onShop={openShop}
  onFriends={openFriends}
  onProfile={openProfile}
  onSettings={openSettings}
  playerName="YourName"
/>
\`\`\`

## 🎯 Migration Guide

### Gradual Adoption Strategy

1. **Start with one screen** (recommended: Main Menu)
   - Replace current MainMenuIslands with NeumorphicMainMenu
   - Test on device to see the new design

2. **Update button by button**
   - Replace TouchableOpacity with NeumorphicButton
   - Add appropriate variant and size

3. **Replace card components**
   - Replace IslandCard with NeumorphicCard
   - Adjust padding and variant as needed

4. **Update backgrounds**
   - Set main background to `neumorphicColors.background.main`
   - Remove gradient backgrounds for pure neumorphic effect

### Example Migration

**Before:**
\`\`\`tsx
<TouchableOpacity
  style={styles.button}
  onPress={onPlay}
>
  <Text style={styles.buttonText}>Play</Text>
</TouchableOpacity>
\`\`\`

**After:**
\`\`\`tsx
<NeumorphicButton
  title="Play"
  icon="▶️"
  onPress={onPlay}
  variant="primary"
  size="large"
/>
\`\`\`

## 🎨 Customization

### Changing Colors

Edit `styles/neumorphicTheme.ts`:

\`\`\`typescript
export const neumorphicColors = {
  background: {
    main: '#YOUR_COLOR',  // Change base color
  },
  primary: {
    main: '#YOUR_COLOR',  // Change primary accent
  },
};
\`\`\`

### Adjusting Shadow Intensity

Edit shadow values in `neumorphicShadows`:

\`\`\`typescript
export const neumorphicShadows = {
  raised: {
    shadowOpacity: 0.7,  // Increase for stronger shadows
    shadowRadius: 12,    // Increase for softer shadows
  },
};
\`\`\`

## 💡 Tips

1. **Keep backgrounds clean** - Neumorphism works best on solid, light backgrounds
2. **Use subtle colors** - Avoid bright, vibrant colors
3. **Consistent spacing** - Use the `spacing` object for margins/padding
4. **Test on device** - Shadows look different on real devices vs simulators
5. **Accessibility** - Ensure sufficient contrast for text

## 🐛 Troubleshooting

### Shadows not showing on Android
- Android has limited shadow support
- The `getNeumorphicStyle` helper automatically uses elevation for Android
- Test on real device, not just emulator

### Performance issues
- Too many shadows can impact performance
- Use `raised` sparingly for large lists
- Consider using `inset` for list items (less shadow rendering)

## 📚 Resources

- [Neumorphism.io](https://neumorphism.io/) - Shadow generator
- [Figma Neumorphism Plugin](https://www.figma.com/community/plugin/739178038208413829/Neumorphism)
- [Soft UI Design System](https://www.creative-tim.com/learning-lab/react-native/overview/soft-ui)

---

**Next Steps:**
1. Review the NeumorphicMainMenu component
2. Test on your device
3. Gradually migrate other screens
4. Provide feedback for adjustments
