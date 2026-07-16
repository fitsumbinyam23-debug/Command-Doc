# Command Doctor Mission Studio Design

Mission Studio is Command Doctor's approved learning interface direction. It should feel like a professional technician workspace: clear, guided, visual, and practical without pretending planned curriculum is finished.

## Approved Direction

- Use a calm premium product surface with strong hierarchy, compact panels, practical visuals, and direct paths into work.
- Preserve the beginner navigation model: Home, Course, Practice, Progress, Tools.
- Keep Instructor Mode outside beginner navigation.
- Home must be path-adaptive. A learner who chose Learn From Zero resumes Level 0. A learner who chose Practice opens the practice library. A learner who chose Tools resumes the most recent technician tool.
- Course must show the full approved phase and level structure while clearly marking planned levels as preview-only.
- Level 0 is the authored beginner experience. Levels 1-39 remain planned outlines until real lesson, practice, verification, rollback, and review evidence exists.
- Lesson pages use a stepper: Mission, Learn, See, Key words, Predict, Try, Explain, Confidence, Continue.
- Every learning visual needs a local asset, alt text, a text alternative, and traceable evidence requirements.
- No remote images, fonts, vendor photos, or hotlinked assets are part of the Mission Studio layer.

## Design Tokens

The runtime token layer lives in `src/learning-experience/mission-studio-tokens.js`. CSS consumes the same values through custom properties in `styles.css`.

- Ink: near-black for professional contrast.
- Accent: network teal for active states and progress.
- Blue: focused action color.
- Success, warning, and risk colors are reserved for status and evidence.
- Radius stays at 8px or less for app controls and cards.
- Typography uses system fonts only.

## Experience Contract

- Desktop navigation is a left rail.
- Mobile navigation reuses the same navigation buttons as a fixed bottom bar so duplicate labels are not visible.
- The first screen is the usable app, not a marketing landing page.
- Tool destinations must open working local app surfaces.
- Focus moves to the active view heading after navigation and to the active lesson step after step changes.
- Planned content must be honest and human-readable.

## Visual Lesson Contract

The registry lives in `data/curriculum/lesson-visual-assets.json` with schema `data/curriculum/lesson-visual-assets.schema.json`.

Each visual asset must include:

- stable `asset_id`
- `lesson_id` and `level_id`
- one or more covered step IDs
- local asset path
- alt text
- text alternative
- evidence requirements
- visual component type
- status

Grouped future lessons are allowed, but each command or concept inside a group must retain its own objectives, syntax coverage, evidence requirements, mastery records, review records, and traceability.

## Command Placement Safety

Final command placement QA remains a separate curriculum review before full lesson authoring. Mission Studio may display planned Levels 1-39 and their provisional command mapping, but it must not claim final placement, SME verification, or completion for those levels.
