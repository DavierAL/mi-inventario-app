# ADR 001: Performance Optimization for Large Lists

## Status
Accepted

## Context
The application handles inventory datasets exceeding 4,000 items. Standard `FlatList` implementations caused significant frame drops (jank) and high memory usage. Filtering in JavaScript memory blocked the main thread, leading to poor user experience on mid-range devices.

## Decision
1. **FlashList**: We use `@shopify/flash-list` instead of `FlatList` to leverage cell recycling and improved memory management.
2. **SQL-Level Filtering**: All search and filter operations (including date-based caducity filters) are offloaded to the SQLite engine via WatermelonDB `Query` objects.
3. **Memoization**: `ProductoCard` uses `React.memo` with a custom comparison function to prevent redundant re-renders of list items.
4. **Estimated Item Size**: A fixed `estimatedItemSize` of 110 is enforced to optimize FlashList's initial layout calculation.

## Consequences
- **Positive**: Rendering time for initial lists reduced to <300ms. Main thread remains responsive during filtering.
- **Negative**: Increased complexity in `useFiltrosInventario` hook to generate complex SQL clauses.
- **Positive**: 60fps scrolling achieved on most devices.
