# Command Doctor Mission Studio Design Contract

Mission Studio is the approved Command Doctor product direction for beginner learning and technician practice. It must feel like a professional mission workspace: calm, structured, visual, practical, and honest about what is authored versus what is planned.

## Approved Mission Studio Direction

Command Doctor should open directly into a usable learning and technician experience, not a marketing page. The interface should guide a beginner from orientation into safe local practice while still giving an experienced user fast access to diagnostic tools.

Binding requirements:

- Home, Course, Practice, Progress, and Tools remain the beginner navigation model.
- Instructor Mode stays outside beginner navigation.
- Level 0 is authored. Levels 1-39 are planned previews until real lesson, practice, verification, rollback, and review evidence exists.
- Planned content must never be displayed as complete, ready, SME approved, or final.
- Final command placement QA remains a separate curriculum review before full lesson authoring.
- No command-placement, runtime, route, profile, service-worker, or build-identity work belongs to the Mission Studio UI correction.

## Three Product Journeys

Mission Studio supports three explicit journeys:

- Learn From Zero: starts or resumes Level 0 orientation with beginner-safe language, visual evidence, prediction, practice, explanation, confidence, and checkpoint gates.
- Practise and Specialize: opens local practice routes and shows specialization paths honestly as planned when mapping is not complete.
- Technician Tools: opens diagnostic and reference surfaces for users who need the working app rather than the beginner course.

Home must adapt after a journey is selected. It must not continue to show three equal journey cards as if the user has not chosen a path.

## Visual Personality

The visual personality is clear, friendly, and professional. It should resemble a premium technician mission studio without copying any specific vendor console or device model.

Required qualities:

- Bright readable surfaces for all-day use.
- Strong hierarchy, compact panels, and low visual noise.
- Network-specific visuals that teach real concepts.
- Original local assets only.
- Cards use 8px radius or less.
- No decorative empty hero blocks.
- No remote fonts, stock photos, hotlinked images, vendor product photos, or fake model claims.

## Desktop Layout

Desktop uses one left navigation rail and one main work area.

Binding requirements:

- Exactly one visible desktop navigation.
- Main content uses the available width.
- Desktop content screens should use at least 80% of the available main width unless a narrower reading layout is explicitly approved.
- Course and lesson pages should support scanning and repeated use, not broad empty marketing composition.
- Browser review screenshots must not show narrow content strips, stale hidden views, or large accidental blank regions.

## Mobile Layout

Mobile uses the same navigation buttons as a fixed bottom bar.

Binding requirements:

- The fixed bottom navigation must not reduce content width.
- The fixed bottom navigation must not duplicate in full-page capture.
- Mobile content should use at least 88% of the available content width unless a narrower reading layout is explicitly approved.
- Course, lesson visuals, and Tools must remain readable at 390 CSS px.
- Long pages must maintain full content width while scrolling.

## Navigation

Navigation labels are:

- Home
- Course
- Practice
- Progress
- Tools

The active view must be visually clear and programmatically reflected. Focus moves to the active heading after view navigation. The app must not expose duplicate visible navigation labels from two nav systems at the same viewport.

## Home Hierarchy

Home must include:

- A clear welcome or current-path identity.
- One dominant Continue Mission or Start Mission action.
- Current phase and level context.
- Meaningful progress.
- Recent activity.
- One Technician Tools shortcut card.
- A planned-content or safety note where helpful.

Home must not contain an empty decorative navy rectangle. Home must not render repeated equal journey cards after a path is selected.

## Course Structure

Course must include:

- A phase rail or phase progression.
- Current phase highlight.
- Current, completed, locked, and planned level states.
- About-this-phase context panel.
- Meaningful preview action for planned levels.
- Human-readable planned states.

The Course map previews the complete approved structure while keeping completion claims honest.

## Lesson Page Structure

Level 0 lesson pages use this stepper:

- Mission
- Learn
- See
- Key words
- Predict
- Try
- Explain
- Confidence
- Continue

The active step exposes `aria-current="step"`. Step changes move focus to the active step heading. The page includes a timeline, a step panel, text, interaction controls where relevant, and visual evidence when an authored asset exists.

## Mandatory Lesson Visual Types

The visual system must support:

- realistic_device
- annotated_device_view
- topology
- sequence
- healthy_fault_comparison
- cli_to_visual_evidence
- text_alternative

Each visual must include local path, title, caption, alt text, text alternative, source type, rights status, generic/model scope, mobile behavior, content status, and evidence requirements.

## Image Asset And Rights Rules

All visuals must be original local assets.

Binding rules:

- No remote asset dependency.
- No hotlinking.
- No vendor photos.
- No real vendor model claim.
- Generic device visuals must be labeled as generic.
- Preview visuals do not make the related lesson authored.
- Every image has alt text and a text alternative.
- Every image has explicit rights metadata.

## What Is A Switch Example

The planned "What is a switch?" preview may show:

- a generic 24-port Ethernet switch front view
- annotated switch ports, LEDs, uplink, and console markers
- a small endpoint topology
- healthy link versus disconnected link comparison

This preview teaches the future visual pattern only. It must remain `preview_contract` or equivalent and must not mark Level 1 as authored.

## Reusable Component List

Mission Studio-specific rendering must be expressed through reusable component factories or stable render descriptions for at least:

- AppShell state helpers
- RecommendedActionCard
- ContinueMissionCard
- CoursePhaseRail
- LevelCard
- PhaseContextPanel
- LessonTimeline
- LessonStepPanel
- VisualLearningPanel
- TechnicianToolCard
- ProgressSummary
- PlannedContentNotice
- AccessibleStatusMessage

Components accept explicit data/config, avoid hidden global mutation, expose accessible labels/states, and are unit-testable without rendering the entire application.

## Typography And Spacing

Typography uses system fonts. Font size must not scale continuously with viewport width. Letter spacing remains `0` except short uppercase labels may use readable positive tracking. Compact panels use compact headings; hero-scale type is reserved for true top-level Home identity.

Spacing must keep repeated operational screens dense but not cramped. Buttons and fixed-format UI elements must have stable dimensions so labels, icons, step states, and loading text do not shift layout.

## Accessibility

Required accessibility behavior:

- Active view focus movement after navigation.
- Active lesson-step focus movement after step change.
- `aria-current="step"` on the active lesson step.
- Meaningful button labels and status text.
- Image alt text and text alternatives.
- Keyboard reachable navigation and actions.
- No content overlap at 1280 desktop or 390 mobile.
- Reduced-motion behavior must remain respected.

## Runtime Boundaries

Mission Studio UI must not modify:

- `src/switch-runtime.js`
- `src/lab-engine.js`
- command data
- route data
- switch profiles
- `sw.js`
- build identity
- curriculum placement
- PR #10
- PR #9

The UI may read generated curriculum and visual registry data but must not alter authoritative command placement or runtime execution semantics.

No production device access, live network connection, or external control path belongs to Mission Studio UI rendering.

## Acceptance Standard

Acceptance requires:

- Full design contract present in repository.
- Reusable component layer used by app rendering.
- Visual registry validated against schema with negative fixtures.
- Desktop and mobile browser evidence generated from isolated profiles.
- Screenshot and metrics are bound by scenario ID and screenshot SHA-256.
- Active-content geometry matches screenshot pixel content bounds.
- No horizontal overflow.
- No duplicate fixed navigation or duplicated root content.
- Protected-file hash report compares base and candidate using a documented normalization policy.
- All required tests and build/startup checks pass.
- Draft PR #11 is updated only; no merge and no deployment.
