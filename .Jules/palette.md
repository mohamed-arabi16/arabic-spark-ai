## 2024-05-23 - Accessibility Improvements
**Learning:** Icon-only buttons are a common accessibility trap. Adding `aria-label` is critical, but wrapping them in `Tooltip` components provides a better experience for both screen reader users (context) and sighted users (clarity).
**Action:** Always check for icon-only buttons in lists and cards, and wrap them in Tooltips with descriptive labels.
