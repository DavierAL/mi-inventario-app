# Mascotify Design System (Notion-Inspired)

## Philosophy
The design system is inspired by Notion's minimalist, clean, and functional aesthetic. It prioritizes readability, whitespace, and subtle elevations over flashy colors.

## Design Tokens (`core/ui/tokens.ts`)
- **Spacing**: Base-4 scale (sm: 8, md: 16, lg: 24, xl: 32).
- **Typography**:
  - `h1`: 24px, Bold, letterSpacing -0.5.
  - `body`: 16px, Regular.
  - `small`: 14px, Medium.
  - `tiny`: 12px, Bold (Uppercase for labels).
- **Colors**:
  - `primario`: #4ba042 (Notion Green).
  - `textoPrincipal`: #37352f.
  - `superficie`: #ffffff (Light) / #2f3437 (Dark).

## Core Components (`core/ui/components/`)

### Surface
A container with predefined variants for different contexts.
- `elevated`: Used for cards with subtle shadows.
- `flat`: Used for sections or nested blocks.
- `inset`: Used for secondary information areas.

### Button
- `primary`: Solid green background, white text.
- `secondary`: Ghost style with border.
- `danger`: Red text/border for destructive actions.

### Badge
Small indicators for statuses (e.g., "Pendiente", "Vencido").
- `success`: Green.
- `error`: Red.
- `warning`: Yellow.
- `info`: Blue.

## Best Practices
1. **Haptics**: Always use `Haptics.impactAsync` on button presses and `Haptics.notificationAsync` on success/error.
2. **Skeleton Loaders**: Use `SkeletonCard` during asynchronous database loads.
3. **Memoization**: All list components must be memoized to preserve the 60fps target.
