# Accessibility and Responsive Audit

This audit documents current risk areas for the v0.3.0-rc.1 planning milestone. No CSS, HTML, JavaScript, runtime, or test change is made here.

## Severity Findings
| Severity | Issue | Current risk | Recommended next action |
| --- | --- | --- | --- |
| Critical | Mode isolation and completion proof are product-integrity issues with accessibility impact. | Students can receive mastery/completion from text or copied answers; assistive tech users may get unequal proof paths. | Fix in lesson engine before broad premium migration; do not rely on hidden visual state. |
| Critical | Runtime terminal output needs an accessible review path. | Raw terminal output can be difficult to navigate with screen readers and small screens. | Provide structured command event/evidence panel tied to terminal output. |
| High | Dialog and destructive action focus management needs manual audit. | Instructor reset/unlock, reports, and modal-like flows may not trap/return focus consistently. | Add focus trap, focus return, and clear confirmation language in implementation stage. |
| High | Status and error announcements are inconsistent. | Some live regions exist, but result changes, empty filters, and route verification outcomes need consistent politeness/severity. | Centralize status messaging and assert only blocking errors. |
| High | Color/status badges need non-color cues. | Progress, mastery, route support, and warnings should not depend on color alone. | Pair color with icon/text and expose accessible names. |
| High | Mobile terminal and Workbench panels need dedicated layout. | Command input, output, workbench panels, and verification compete on narrow viewports. | Use full-screen terminal mode, collapsible panels, and stable touch targets. |
| Medium | Visible focus and focus order need end-to-end testing. | Complex tabbed Library, Learn modules, and route cards need predictable keyboard order. | Run keyboard QA for every target screen. |
| Medium | Long lesson pages need headings and landmarks. | Premium lessons will be long; headings, stepper labels, and region names must be explicit. | Use semantic regions and step headings. |
| Medium | Reduced motion preference must be honored. | Progress or visual lab animation must not be required for comprehension. | Gate nonessential motion and provide static evidence. |
| Medium | Touch targets and filters need sizing review. | Dense filters/search/select controls may crowd on phones. | Adopt minimum target sizes and responsive filter drawers. |
| Low | Course-map responsiveness needs polish. | Generated modules can become long scannable lists. | Use compact grouping, sticky context, and skip links. |
| Low | Copy length and command strings can overflow. | Vendor command syntax can be wider than cards/buttons. | Use wrapping, monospace overflow rules, and abbreviations only with labels. |

## Required Audit Coverage for Implementation Stages
- Keyboard navigation: every top-level view, tab group, route card, lesson stage, terminal input, modal, and report action must be reachable without a pointer.
- Visible focus: focus indicators must be visible against all backgrounds and must not be hidden by scroll containers.
- Focus order: changing views, opening dialogs, and finishing lessons must move focus to the new context.
- Dialog focus: modal-like flows must trap focus, label the dialog, and return focus to the invoking control.
- Accessible labels: icon buttons, filters, selectors, terminal input, verification controls, and destructive actions need names that explain outcome.
- Status announcements: lesson stage completion, command result, route verification, due review, save/rollback, and empty search results need consistent live-region behavior.
- Error announcements: blocking errors should be assertive and include recovery action; nonblocking hints should not interrupt screen readers.
- Contrast: badges, terminal text, disabled states, and warning panels need contrast checks.
- Color-only states: mastered, due, warning, verified, failed, support-level, and vendor status must include text/icon equivalents.
- Reduced motion: visual lab and progress transitions must respect reduced-motion preference.
- Touch targets: command controls, tabs, filters, step controls, and terminal actions need stable target sizes.
- Mobile navigation: top nav and secondary tabs need wrapping/overflow behavior that does not hide key actions.
- Mobile lesson length: long premium lessons need steppers, anchors, and resume points.
- Terminal usability on small screens: provide full-screen terminal mode, command history controls, and structured evidence output.
- Workbench panel behavior: panels need collapse/expand controls, headings, and keyboard order.
- Course-map responsiveness: generated modules need filtering, grouping, and skip links so long catalogs remain usable.

## Acceptance Standard
Before visible redesign or premium migration ships, critical and high findings must be closed or explicitly accepted by product owner and accessibility reviewer. Medium findings must be triaged into the stage roadmap. Low findings may be deferred only when they do not block comprehension or task completion.
