# Island Layout - Quick Start Guide

## 🏝️ What is Island Layout?

Island Layout is a modern UI design pattern where interface elements appear as elevated "islands" floating above the background. This creates visual depth, improves hierarchy, and provides a more engaging user experience.

## ✨ Key Characteristics

```
┌─────────────────────────────────────┐
│                                     │
│  ╔════════════════════════════╗    │
│  ║   Floating Island Card     ║◄───── Elevated with shadow
│  ║                            ║    │
│  ║  ┌──┐  Content  ┌──┐      ║    │
│  ║  │🔘│           │📝│      ║◄───── Rounded corners (24px)
│  ║  └──┘  Here     └──┘      ║    │
│  ║       ▲          ▲         ║    │
│  ╚═══════╪══════════╪═════════╝    │
│          │          │               │
│    Island Button  Island Button    │
│      (44x44)       (44x44)         │
│                                     │
└─────────────────────────────────────┘
        Background Gradient
```

## 🎨 Visual Hierarchy

The island layout uses three levels of elevation:

```
Level 1: Subtle (elevation: 4)
└─ Background cards, secondary information
   Example: Coming Soon section

Level 2: Elevated (elevation: 8)  ⭐ Most Common
└─ Primary content cards, main UI elements
   Example: Profile card, game mode cards

Level 3: Floating (elevation: 12)
└─ Interactive elements, focused content
   Example: Score display, timer, equation card
```

## 📦 Components Overview

### 1. IslandButton
**Small floating action buttons**
```tsx
<IslandButton 
  icon="✕" 
  size="small" 
  variant="danger" 
  onPress={handleQuit} 
/>
```
- 3 sizes: small (44px), medium (56px), large (68px)
- 3 variants: primary (white), secondary (dark), danger (red)

### 2. IslandCard
**Elevated content containers**
```tsx
<IslandCard variant="elevated" padding={20}>
  <Text>Your content here</Text>
</IslandCard>
```
- 3 variants: subtle, elevated, floating
- Automatic shadow and elevation
- Configurable padding

### 3. IslandMenu
**Horizontal navigation bar**
```tsx
<IslandMenu 
  variant="floating"
  items={[
    { id: 'shop', icon: '🛍️', label: 'Shop', onPress: openShop }
  ]}
/>
```
- 3 positions: top, bottom, floating
- Auto-distributed menu items
- Built-in styling and spacing

## 🎯 Where It's Used

### Setup Screen
```
┌─────────────────────────────────────┐
│         Math Game                   │
│     Challenge Your Mind             │
│                                     │
│  ╔═══════════════════════════╗     │
│  ║  👤  Username              ║     │ Profile Island
│  ║     Level 5 • 1000🪙      ║     │ (Elevated)
│  ╚═══════════════════════════╝     │
│                                     │
│  ╔═══════════════════════════╗     │
│  ║ 🛍️ Shop │ ⚙️ Settings │ 👥 ║     │ Quick Actions Island
│  ║    Friends                 ║     │ (Menu)
│  ╚═══════════════════════════╝     │
│                                     │
│  ╔═══╗  ╔═══╗  ╔═══╗              │ Mode Selection Islands
│  ║ ⚡ ║  ║ 🔢 ║  ║ 👥 ║              │ (Elevated)
│  ╚═══╝  ╚═══╝  ╚═══╝              │
│                                     │
│  ╔═══════════════════════════╗     │ Mode Detail Island
│  ║  ⚡ Classic Mode            ║     │ (Elevated)
│  ║                             ║     │
│  ║  [Easy][Medium][Hard]      ║     │ Difficulty Islands
│  ║                             ║     │
│  ║  ┌────────────────────┐    ║     │
│  ║  │   🎯 Play Now      │    ║     │ Action Button
│  ║  └────────────────────┘    ║     │
│  ╚═══════════════════════════╝     │
└─────────────────────────────────────┘
```

### Game Screen
```
┌─────────────────────────────────────┐
│  ┌──┐ ╔═════════════╗ ┌──┐         │
│  │✕ │ ║ Score: 10  ║ │📝│         │ Header Islands
│  └──┘ ╚═════════════╝ └──┘         │ (Floating row)
│                                     │
│        ╔═════════════╗              │
│        ║  ⏱️ 45s     ║              │ Timer Island
│        ╚═════════════╝              │ (Floating)
│                                     │
│     ╔══════════════════╗            │
│     ║   12 × 8 = ?     ║            │ Equation Island
│     ╚══════════════════╝            │ (Floating)
│                                     │
│     ┌──────────────────┐            │
│     │  Enter answer    │            │ Answer Input
│     └──────────────────┘            │ (Pill-shaped)
│                                     │
│      ╔════════════╗                 │
│      ║ 1   2   3  ║                 │ Keypad Island
│      ║ 4   5   6  ║                 │ (Elevated)
│      ║ 7   8   9  ║                 │
│      ║ ⌫   0   ✓  ║                 │
│      ╚════════════╝                 │
└─────────────────────────────────────┘
```

### Results Screen
```
┌─────────────────────────────────────┐
│      🎯 Game Complete!              │
│                                     │
│  ╔════╗  ╔════╗  ╔════╗            │
│  ║ 10 ║  ║85% ║  ║ 6s ║            │ Stat Islands
│  ║Ans ║  ║Acc ║  ║Avg ║            │ (Elevated)
│  ╚════╝  ╚════╝  ╚════╝            │
│                                     │
│  ╔═══════════════════════════╗     │
│  ║    Game Summary            ║     │ Summary Island
│  ║                             ║     │ (Elevated)
│  ║  Total: 12 equations       ║     │
│  ║  Difficulty: HARD          ║     │
│  ║  Time: 60s                 ║     │
│  ╚═══════════════════════════╝     │
│                                     │
│      ┌────────────────────┐         │
│      │  🔄 Play Again     │         │ Action Button
│      └────────────────────┘         │ (Island)
└─────────────────────────────────────┘
```

## 🎨 Design Tokens

### Colors
```typescript
// Backgrounds
const backgrounds = {
  card: 'rgba(255, 255, 255, 0.95)',     // Primary cards
  cardSubtle: 'rgba(255, 255, 255, 0.85)', // Secondary
  cardFloating: 'rgba(255, 255, 255, 0.9)', // Floating
}

// Accents
const accents = {
  primary: '#4CAF50',   // Green - success, active
  danger: '#FF4757',    // Red - danger, alerts
  warning: '#FF9800',   // Orange - warnings
  info: '#2196F3',      // Blue - information
}

// Text
const text = {
  primary: '#333',      // Main text
  secondary: '#666',    // Supporting text
  tertiary: '#999',     // Hints, labels
}
```

### Spacing
```typescript
const spacing = {
  xs: 8,    // Tight spacing
  sm: 12,   // Small gaps
  md: 16,   // Standard gaps
  lg: 20,   // Section gaps
  xl: 24,   // Large gaps
  xxl: 30,  // Major sections
}
```

### Border Radius
```typescript
const radius = {
  button: 16,   // Small buttons
  chip: 20,     // Pill buttons, chips
  card: 24,     // Cards, containers
  pill: 30,     // Full pill shape
}
```

### Elevation
```typescript
const elevation = {
  subtle: 4,    // Background elements
  elevated: 8,  // Primary content
  floating: 12, // Interactive, focused
}
```

## 🚀 Quick Start

### 1. Import Components
```tsx
import { IslandButton } from './components/IslandButton';
import { IslandCard } from './components/IslandCard';
import { IslandMenu } from './components/IslandMenu';
```

### 2. Use in Your Screen
```tsx
function MyScreen() {
  return (
    <View style={styles.container}>
      {/* Profile Card */}
      <IslandCard variant="elevated">
        <Text>User Profile</Text>
      </IslandCard>

      {/* Quick Actions */}
      <IslandMenu
        variant="floating"
        items={[
          { id: 'action1', icon: '⚡', label: 'Action', onPress: () => {} }
        ]}
      />

      {/* Floating Button */}
      <IslandButton
        icon="▶"
        size="large"
        variant="primary"
        onPress={startAction}
      />
    </View>
  );
}
```

## 📚 Documentation

Detailed documentation available:
- **`docs/ISLAND_LAYOUT_DESIGN.md`** - Complete design guide
- **`docs/ISLAND_COMPONENTS_REFERENCE.md`** - API reference
- **`docs/UI_CHANGES_SUMMARY.md`** - What changed

## 🔧 Customization

### Custom Island Card
```tsx
<IslandCard 
  variant="floating"
  padding={24}
  style={{
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  }}
>
  <Text>Custom Styled Island</Text>
</IslandCard>
```

### Custom Button
```tsx
<IslandButton
  icon="🎮"
  size="large"
  variant="primary"
  style={{
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  }}
  onPress={handlePress}
/>
```

## ✅ Best Practices

1. **Use appropriate elevation** - Higher = more important
2. **Maintain consistent spacing** - Use design tokens
3. **Group related items** - Use IslandMenu for actions
4. **Provide visual feedback** - Active states on press
5. **Consider touch targets** - Minimum 44x44px
6. **Test on devices** - Shadows render differently

## 🎯 Common Patterns

### Action Row
```tsx
<View style={{ flexDirection: 'row' }}>
  <IslandButton icon="✕" size="small" variant="danger" />
  <IslandCard variant="floating" padding={12}>
    <Text>Info</Text>
  </IslandCard>
  <IslandButton icon="✓" size="small" variant="primary" />
</View>
```

### Card Grid
```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <IslandCard variant="elevated" style={{ flex: 1, margin: 8 }}>
    <Text>Card 1</Text>
  </IslandCard>
  <IslandCard variant="elevated" style={{ flex: 1, margin: 8 }}>
    <Text>Card 2</Text>
  </IslandCard>
</View>
```

## 🐛 Troubleshooting

**Shadows not visible?**
- Check elevation is set
- Verify shadowColor is '#000'
- Test on physical device

**Touch not working?**
- Wrap island in TouchableOpacity
- Ensure minimum 44x44px size
- Check z-index stacking

**Performance issues?**
- Use subtle elevation
- Reduce shadow complexity
- Memoize island components

## 🎉 Result

A modern, cohesive UI with:
- ✨ Elevated floating elements
- 🎨 Consistent visual language
- 📱 Better user experience
- 🚀 Reusable components
- 📚 Complete documentation

---

**Need Help?** Check the full documentation in `/docs/` or review the examples in `App.tsx`
