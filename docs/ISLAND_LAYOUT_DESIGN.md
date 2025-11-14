# Island Layout Design Documentation

## Overview
The Math Game App has been redesigned with an **Island Layout** design pattern, featuring floating UI elements, elevated cards, and a modern, cohesive visual hierarchy.

## Design Principles

### 1. Island Elements
Island elements are self-contained UI components that appear to "float" above the background:
- **Rounded corners** (24px for cards, 16-20px for buttons)
- **Elevated shadows** with varying depths
- **Semi-transparent backgrounds** for visual depth
- **Adequate spacing** between elements

### 2. Visual Hierarchy
The design uses three levels of elevation:
- **Subtle** (elevation: 4): Background cards and secondary elements
- **Elevated** (elevation: 8): Primary content cards
- **Floating** (elevation: 12): Interactive elements and key actions

### 3. Consistency
All island components share:
- Consistent border radius values
- Similar shadow properties
- Coordinated opacity levels
- Unified color palette

## Components

### IslandButton
A floating action button component with three size variants:
- **Small** (44x44px): Compact actions like close/quit buttons
- **Medium** (56x56px): Standard floating actions
- **Large** (68x68px): Primary call-to-action buttons

**Variants:**
- `primary`: White background for general actions
- `secondary`: Dark background for contrast
- `danger`: Red background for destructive actions

**Usage Example:**
```tsx
<IslandButton
  icon="✕"
  size="small"
  variant="danger"
  onPress={handleQuitGame}
/>
```

### IslandCard
A flexible card container with three elevation levels:
- **Elevated**: Standard content cards (elevation: 8)
- **Floating**: High-priority content (elevation: 12)
- **Subtle**: Background elements (elevation: 4)

**Usage Example:**
```tsx
<IslandCard variant="elevated" padding={20}>
  <Text>Card Content</Text>
</IslandCard>
```

### IslandMenu
A navigation menu bar with smooth animations:
- **Bottom**: Fixed to bottom of screen
- **Top**: Fixed to top of screen
- **Floating**: Positioned by parent (default)

**Usage Example:**
```tsx
<IslandMenu
  variant="floating"
  items={[
    { id: 'shop', icon: '🛍️', label: 'Shop', onPress: () => {} },
    { id: 'settings', icon: '⚙️', label: 'Settings', onPress: () => {} },
  ]}
/>
```

## Screen Implementations

### Setup Screen (Main Menu)
**Island Elements:**
1. **Profile Card** - Elevated island showing player stats
2. **Quick Actions Menu** - Horizontal island menu with 3 action buttons
3. **Game Mode Selection** - Three island buttons with active state styling
4. **Mode Detail Cards** - Large elevated cards with game mode information
5. **Coming Soon Card** - Subtle island with dashed border

**Design Features:**
- Ample spacing between sections (20-30px margins)
- Consistent white/light backgrounds with transparency
- Active states with green accent color (#4CAF50)
- Clear visual separation of interactive elements

### Game Screen
**Island Elements:**
1. **Header Island Bar** - Floating row with quit button, score card, and notepad button
2. **Timer Island** - Centered floating timer (Classic mode only)
3. **Equation Island** - Large floating card displaying the current equation
4. **Answer Input** - Pill-shaped input with color feedback
5. **Keypad** - Island-style numeric keypad with black buttons and white borders

**Design Features:**
- Floating buttons at screen edges for easy access
- Centered, elevated equation display
- Color-coded feedback (green for correct, red for incorrect)
- Compact keypad layout with clear visual distinction

### Results Screen
**Island Elements:**
1. **Stat Cards** - Three elevated cards showing score metrics
2. **Summary Island** - Large card with game statistics
3. **Play Again Button** - Prominent island button with green accent

**Design Features:**
- Grid layout for stat cards
- Consistent styling across all result elements
- Strong call-to-action with elevated button

## Color Palette

### Primary Colors
- **Primary Action**: `#4CAF50` (Green)
- **Danger**: `#FF4757` (Red)
- **Warning**: `#FF9800` (Orange)
- **Info**: `#2196F3` (Blue)

### Background Colors
- **Card Background**: `rgba(255, 255, 255, 0.95)` - Primary cards
- **Subtle Background**: `rgba(255, 255, 255, 0.85)` - Secondary cards
- **Floating Background**: `rgba(255, 255, 255, 0.9)` - Floating elements

### Shadow Colors
- **Standard Shadow**: `#000` with varying opacity (0.1-0.3)
- **Accent Shadow**: Matches button color for elevated states

## Spacing Guidelines

### Margins
- **Small**: 8-12px (Between related elements)
- **Medium**: 16-20px (Between sections)
- **Large**: 24-30px (Between major sections)

### Padding
- **Compact**: 8-12px (Tight spacing)
- **Standard**: 16-20px (Normal content)
- **Spacious**: 24-32px (Large cards)

### Border Radius
- **Buttons**: 16-20px
- **Cards**: 24px
- **Pills**: 30px+
- **Chips**: 20px

## Best Practices

1. **Maintain Consistency**: Use island components throughout the app
2. **Consider Elevation**: Higher elevation = more important/interactive
3. **Use Shadows Wisely**: Shadows convey depth and interactivity
4. **Respect Spacing**: Adequate white space improves readability
5. **Active States**: Provide clear visual feedback for interactions
6. **Color Coordination**: Use accent colors sparingly for emphasis
7. **Accessibility**: Ensure sufficient contrast for text and backgrounds

## Future Enhancements

Potential improvements to the island layout:
- [ ] Animated island transitions
- [ ] Haptic feedback for island interactions
- [ ] Dynamic elevation based on scroll position
- [ ] Glassmorphism effects for supported platforms
- [ ] Dark mode island variations
- [ ] Micro-interactions on hover/press states

## Technical Notes

### React Native Limitations
- `backdropFilter` is not supported in React Native StyleSheet
- Use semi-transparent backgrounds instead
- Shadow rendering may vary between iOS and Android
- Test on multiple devices for consistent appearance

### Performance Considerations
- Minimize nested island components
- Use `shouldComponentUpdate` or `React.memo` for complex islands
- Avoid excessive shadow usage on lower-end devices
- Consider reducing elevation on Android for better performance

## Testing Checklist

- [ ] All screens render correctly on iOS
- [ ] All screens render correctly on Android
- [ ] Shadows appear consistently across platforms
- [ ] Interactive elements have clear active states
- [ ] Spacing is consistent throughout the app
- [ ] Text remains readable on all backgrounds
- [ ] Touch targets are adequately sized (44x44px minimum)
- [ ] Animations are smooth and performant
