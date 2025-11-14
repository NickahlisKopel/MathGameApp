# Island Components Quick Reference

## IslandButton

### Props
```typescript
interface IslandButtonProps {
  onPress: () => void;        // Button press handler
  icon: string;               // Emoji or icon character
  size?: 'small' | 'medium' | 'large';  // Button size (default: 'medium')
  variant?: 'primary' | 'secondary' | 'danger';  // Style variant (default: 'primary')
  style?: ViewStyle;          // Additional custom styles
  testID?: string;            // Testing identifier
}
```

### Sizes
| Size   | Dimensions | Use Case                    |
|--------|------------|-----------------------------|
| small  | 44x44px    | Secondary actions, close    |
| medium | 56x56px    | Standard floating actions   |
| large  | 68x68px    | Primary CTAs                |

### Variants
| Variant   | Background               | Use Case                |
|-----------|--------------------------|-------------------------|
| primary   | White (0.95 opacity)     | General actions         |
| secondary | Black (0.7 opacity)      | Contrast/dark mode      |
| danger    | Red (#FF4757)            | Destructive actions     |

### Examples
```tsx
// Quit button (small, danger)
<IslandButton
  icon="✕"
  size="small"
  variant="danger"
  onPress={handleQuit}
/>

// Notepad button (small, primary)
<IslandButton
  icon="📝"
  size="small"
  variant="primary"
  onPress={openNotepad}
/>

// Play button (large, primary)
<IslandButton
  icon="▶"
  size="large"
  variant="primary"
  onPress={startGame}
/>
```

---

## IslandCard

### Props
```typescript
interface IslandCardProps {
  children: React.ReactNode;  // Card content
  variant?: 'elevated' | 'floating' | 'subtle';  // Elevation level (default: 'elevated')
  style?: ViewStyle;          // Additional custom styles
  padding?: number;           // Internal padding (default: 20)
}
```

### Variants
| Variant  | Elevation | Shadow Opacity | Use Case                    |
|----------|-----------|----------------|------------------------------|
| subtle   | 4         | 0.15           | Background cards, secondary  |
| elevated | 8         | 0.20           | Primary content cards        |
| floating | 12        | 0.25           | Interactive elements, focus  |

### Examples
```tsx
// Profile card (elevated)
<IslandCard variant="elevated" style={styles.profileCard}>
  <View>
    <Text>Username</Text>
    <Text>Stats</Text>
  </View>
</IslandCard>

// Score display (floating)
<IslandCard variant="floating" padding={12}>
  <Text>Score: {score}</Text>
</IslandCard>

// Coming soon section (subtle)
<IslandCard variant="subtle" padding={20}>
  <Text>Coming Soon...</Text>
</IslandCard>
```

---

## IslandMenu

### Props
```typescript
interface IslandMenuItem {
  id: string;                 // Unique identifier
  icon: string;               // Emoji or icon character
  label: string;              // Button label text
  onPress: () => void;        // Press handler
}

interface IslandMenuProps {
  items: IslandMenuItem[];    // Menu items array
  variant?: 'bottom' | 'top' | 'floating';  // Position variant (default: 'bottom')
  style?: any;                // Additional custom styles
}
```

### Variants
| Variant  | Position                              | Use Case              |
|----------|---------------------------------------|-----------------------|
| bottom   | Absolute bottom (20px from edges)     | Main navigation       |
| top      | Absolute top (20px from edges)        | Header actions        |
| floating | Positioned by parent                  | Inline menus          |

### Examples
```tsx
// Quick actions menu (floating)
<IslandMenu
  variant="floating"
  items={[
    { id: 'shop', icon: '🛍️', label: 'Shop', onPress: () => setShowShop(true) },
    { id: 'settings', icon: '⚙️', label: 'Settings', onPress: () => openSettings() },
    { id: 'friends', icon: '👥', label: 'Friends', onPress: () => setShowFriends(true) },
  ]}
/>

// Bottom navigation (bottom)
<IslandMenu
  variant="bottom"
  items={[
    { id: 'home', icon: '🏠', label: 'Home', onPress: () => navigate('home') },
    { id: 'play', icon: '🎮', label: 'Play', onPress: () => navigate('play') },
    { id: 'profile', icon: '👤', label: 'Profile', onPress: () => navigate('profile') },
  ]}
/>
```

---

## Common Patterns

### Floating Action Row
Combine IslandButton components with IslandCard for headers:
```tsx
<View style={styles.headerRow}>
  <IslandButton icon="✕" size="small" variant="danger" onPress={onClose} />
  <IslandCard variant="floating" padding={12} style={styles.centerCard}>
    <Text>Score: {score}</Text>
  </IslandCard>
  <IslandButton icon="📝" size="small" variant="primary" onPress={onNote} />
</View>
```

### Card Grid
Create responsive grids with IslandCard:
```tsx
<View style={styles.cardGrid}>
  <IslandCard variant="elevated" style={styles.gridCard}>
    <Text>Card 1</Text>
  </IslandCard>
  <IslandCard variant="elevated" style={styles.gridCard}>
    <Text>Card 2</Text>
  </IslandCard>
  <IslandCard variant="elevated" style={styles.gridCard}>
    <Text>Card 3</Text>
  </IslandCard>
</View>
```

### Nested Islands
For complex layouts, nest islands carefully:
```tsx
<IslandCard variant="elevated" padding={24}>
  <Text style={styles.title}>Game Mode</Text>
  <IslandMenu
    variant="floating"
    items={menuItems}
  />
  <IslandButton icon="▶" size="large" variant="primary" onPress={startGame} />
</IslandCard>
```

---

## Styling Tips

### Custom Shadows
Enhance island components with custom shadows:
```tsx
<IslandCard 
  variant="floating"
  style={{
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  }}
>
  {/* Content */}
</IslandCard>
```

### Active States
Add visual feedback for interactions:
```tsx
<TouchableOpacity
  activeOpacity={0.8}
  onPress={onPress}
>
  <IslandCard variant="elevated">
    {/* Content */}
  </IslandCard>
</TouchableOpacity>
```

### Spacing
Use consistent spacing values:
- Small gap: 8-12px
- Medium gap: 16-20px
- Large gap: 24-30px

### Color Coordination
Match island background opacity to context:
- Solid backgrounds: Use elevated variant
- Gradient backgrounds: Use floating variant
- Dark backgrounds: Use primary variant with higher opacity

---

## Migration Guide

### From Standard Cards to IslandCard
**Before:**
```tsx
<View style={[styles.card, { backgroundColor: '#fff' }]}>
  <Text>Content</Text>
</View>
```

**After:**
```tsx
<IslandCard variant="elevated">
  <Text>Content</Text>
</IslandCard>
```

### From Standard Buttons to IslandButton
**Before:**
```tsx
<TouchableOpacity style={styles.button} onPress={onPress}>
  <Text>X</Text>
</TouchableOpacity>
```

**After:**
```tsx
<IslandButton
  icon="✕"
  size="small"
  variant="danger"
  onPress={onPress}
/>
```

### From Button Rows to IslandMenu
**Before:**
```tsx
<View style={styles.buttonRow}>
  <TouchableOpacity onPress={onShop}>
    <Text>🛍️ Shop</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={onSettings}>
    <Text>⚙️ Settings</Text>
  </TouchableOpacity>
</View>
```

**After:**
```tsx
<IslandMenu
  variant="floating"
  items={[
    { id: 'shop', icon: '🛍️', label: 'Shop', onPress: onShop },
    { id: 'settings', icon: '⚙️', label: 'Settings', onPress: onSettings },
  ]}
/>
```

---

## Troubleshooting

### Shadows Not Appearing (Android)
Ensure elevation is set along with shadow properties:
```tsx
<IslandCard 
  variant="elevated"  // This sets elevation automatically
  style={{ /* additional styles */ }}
/>
```

### Overlapping Islands
Check z-index and elevation values:
```tsx
<View style={{ zIndex: 10 }}>
  <IslandCard variant="floating">
    {/* Higher priority content */}
  </IslandCard>
</View>
```

### Touch Target Too Small
Ensure minimum 44x44px touch area:
```tsx
<IslandButton
  size="small"  // Already 44x44px minimum
  icon="✕"
  variant="danger"
  onPress={onPress}
/>
```

### Performance Issues
Reduce shadow complexity on older devices:
```tsx
<IslandCard 
  variant="subtle"  // Lower elevation = better performance
  style={{ /* additional styles */ }}
/>
```
