## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-02-23 - Refactoring Legacy Panels to Design System
**Learning:** Legacy feature components (like `LivePanel`) often implement their own raw form elements which miss accessibility features present in the design system components (like `Select`).
**Action:** Prioritize refactoring raw form elements in feature panels to use the shared UI library components to inherit accessibility wins (label association, error linking) for free.
