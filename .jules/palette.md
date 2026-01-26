## 2024-05-23 - Accessible Form Validation Pattern
**Learning:** Using `React.useId()` in base `Input` and `Select` components allows for automatic, robust linking of error messages to form fields via `aria-describedby`, significantly improving screen reader experience without requiring manual ID management from consumers.
**Action:** Apply this pattern to all future form components (Textarea, Checkbox, etc.) to ensure consistent accessibility.

## 2025-02-18 - Label Association for Raw Inputs
**Learning:** Raw `<input>`/`<select>` elements in feature panels often lack `id` and `htmlFor` associations, unlike the base UI components which handle this.
**Action:** When auditing feature panels, check for disconnected labels on raw form elements and use `useId` to fix them.

## 2025-05-20 - Inconsistent Labeling Patterns in UI Library
**Learning:** The `Select` component accepts a `label` prop and renders it, while `Input` (and now `Textarea`) expects the consumer to render the label. This forces consumers to mix patterns (using component props vs manual JSX) in the same form.
**Action:** In a future refactor, standardize on one pattern (preferably passing `label` prop to all form components for encapsulation and automatic ID association).
