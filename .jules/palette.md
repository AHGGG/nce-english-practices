## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-02-24 - Legacy Panel Refactoring with Flexible Components
**Learning:** Legacy feature-specific panels (like `TTSPanel`) often use raw HTML elements to apply specific styles (e.g., `font-mono`) which prevents reuse of accessible shared components.
**Action:** Enhance shared components (like `Textarea`) with `inputClassName` props to allow legacy styles to be applied while gaining the accessibility benefits of the shared component system.
