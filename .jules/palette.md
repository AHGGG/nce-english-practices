## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-05-21 - Global Focus Visibility Strategy
**Learning:** The application relies on browser default focus styles which are often invisible or suppressed by Tailwind resets. The `Button` component and custom view-specific buttons lack explicit `focus-visible` styles, making keyboard navigation difficult.
**Action:** Enforce `focus-visible:ring` styles on all interactive elements in the base design system and update custom implementations to match.
