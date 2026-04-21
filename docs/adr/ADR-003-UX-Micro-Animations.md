# ADR 003: UX Principles and Micro-Animations

## Status
Accepted

## Context
A premium application feel is not just about static design but how it responds to user interaction. Initial implementations were using standard, abrupt transitions and basic Touchable components.

## Decision
1. **Interactive Feedback**: All buttons and pressable elements must use `AnimatedPressable` (scaling to 0.96-0.98 and opacity to 0.85).
2. **Tactile Response**: Haptics are layered. Primary actions use `Medium` impact, secondary actions use `Light`.
3. **Loading States**: Shimmer effects are preferred over static loaders or simple opacity pulses for a "modern" and "live" feel.
4. **Layout Transitions**: Use Reanimated's `LinearTransition` or `LayoutAnimation` for structural changes in the UI to prevent jarring jumps.

## Consequences
- **Positive**: High perceived quality and "premium" user experience.
- **Positive**: Reduced cognitive load as users get immediate, clear feedback from their actions.
- **Negative**: Slight overhead in component complexity due to Reanimated and Haptics integration.
