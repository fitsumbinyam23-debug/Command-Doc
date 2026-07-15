# Target Product Experience

Milestone target: v0.3.0-rc.1 should turn Command Doctor into a learning journey whose screens all serve the core loop: Diagnose -> Understand -> Practise -> Troubleshoot -> Verify -> Document -> Review.

## Top-Level Experience
### HOME
Purpose: orient the student in one screen. The student should immediately understand what Command Doctor is, what to do next, what was last completed, what reviews are due, and what skill needs improvement.

Hierarchy:
1. Current track/profile and next recommended action.
2. Continue Learning.
3. Review Due Commands.
4. Practise on a Switch.
5. Diagnose Output.
6. Weak-skill and recent evidence summary.

Main actions: Continue Learning, Review Due Commands, Practise on a Switch, Diagnose Output.

### LEARN
Purpose: provide the structured curriculum path without mixing reference lookup into the primary journey.

Hierarchy: Vendor -> Level -> Module -> Lesson -> Practice -> Mastery -> Review.

Main action: start or resume the next lesson that has declared objectives, required stages, mode, practice path, mastery dimensions, and review schedule.

### SWITCH LAB
Purpose: act as the practical proving ground for command execution, route tasks, verification, Save safety, rollback, and technician documentation.

Hierarchy: Choose Switch -> Choose Workspace -> Terminal | Workbench | Visual Lab -> Complete Task -> Verify -> Save or Roll Back.

Main action: complete a runtime-backed route or lesson practice task and produce evidence.

### DIAGNOSE
Purpose: keep the fast evidence-first workflow for pasted output.

Hierarchy: Paste output -> identify vendor and command -> highlight evidence -> explain meaning -> recommend safe next checks -> create ticket note.

Main action: turn raw output into evidence, safe next checks, and a technician note without requiring a full lesson context.

### LIBRARY
Purpose: organize reference and support content without mixing it into the primary student journey.

Hierarchy: Command Lookup, Practice Library, Knowledge Base, Saved Reports, Instructor Tools.

Main action: find supporting material, not award mastery unless the user enters an assessed lesson or practice flow.

## Target Screens
| Screen | Purpose | Hierarchy | Main action |
| --- | --- | --- | --- |
| Home dashboard | Orientation and next action | Track status, due reviews, last work, weak skill | Continue the highest-value action |
| Vendor track selector | Choose isolated vendor path | Vendor, profile, support level | Enter selected track |
| Module overview | Show level/topic progress | Level, module, lesson status | Start or resume lesson |
| Lesson stage view | Teach one command/objective | Mission, objective, stages, mode | Complete required current stage |
| Practice adapter | Execute through runtime | Prompt, terminal/workbench, evidence | Submit runtime-backed evidence |
| Verification review | Prove the result | Expected evidence, actual evidence, Save/rollback | Verify and decide Save/rollback |
| Ticket note | Document work | Symptom, evidence, action, verification, rollback | Submit technician note |
| Review queue | Retain skills | Due command, weak skill, review type | Complete due review |
| Switch chooser | Select simulated platform | Vendor, profile, capabilities | Launch workspace |
| Workspace chooser | Pick practice surface | Terminal, Workbench, Visual Lab | Open chosen workspace |
| Diagnose output | Interpret pasted evidence | Vendor/command detection, evidence, meaning | Create next-check plan or ticket note |
| Command lookup | Reference syntax safely | Search, filters, command details | Open lesson/practice/reference |
| Practice library | Browse routes | Vendor, support, route status | Start route |
| Knowledge base | Read supporting concepts | Topic/article | Read or link to lesson objective |
| Saved reports | Review local technician notes | Reports, dates, source | Open/export/delete local report |
| Instructor tools | Demo/admin controls | Unlock/reset/import/export | Perform confirmed instructor action |

## Experience Rules
- Home counts actual due review records, not inferred route flags.
- Learn does not award mastery from reading alone.
- Switch Lab surfaces runtime support and missing-handler limitations before practice starts.
- Diagnose remains useful without enrollment in a lesson.
- Library content can link into lessons but cannot silently complete lessons.
- Every screen has a keyboard path, focus target, accessible status messaging, and a mobile layout decision.
