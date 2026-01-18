## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-02-20 - Missing Form Primitives Lead to Inconsistency
**Learning:** The absence of a base `Textarea` component led to consumers implementing raw `<textarea>` elements with inconsistent styling (fonts, borders, rounded corners) and accessibility (missing `aria-describedby`).
**Action:** Audit `ui/index.jsx` for missing standard HTML form primitives (Textarea, Checkbox, Radio) and implement them to prevent inconsistent "one-off" implementations.
