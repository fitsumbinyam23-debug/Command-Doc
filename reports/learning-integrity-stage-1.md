# Learning Integrity Stage 1 Report

Stage branch: feature/learning-integrity-stage-1-data
Base commit: 25bcd622fa73cd304020f5af2c3417046fde0387
Runtime baseline: bdd1fc2abdf8b62ffe672d61b0f5f16f7d5ce155
Approved runtime source: ea4bf7ce2223dc1a22db3de18c9f48c1427b155c

## Summary
- Canonical command count: 163
- Objective count: 163
- Module count: 44
- Raw duplicate IDs detected: aruba_show_spanning_tree, windows_netstat_ano
- Normalized learning records consolidated: aruba_show_spanning_tree, windows_netstat_ano
- Raw command source records deleted: no
- Executable command ID renames required: no
- ID migrations: 0 renames; 2 consolidations.
- Commands without practice: 122
- Routes with missing handlers: 72
- Commands without verification: 3
- Commands without rollback guidance: 10
- Review coverage: 0%

## Status Counts
~~~json
{
  "lesson_status_counts": {
    "dedicated": 35,
    "grouped": 128
  },
  "practice_status_counts": {
    "runtime_free_practice": 29,
    "explanation_only": 24,
    "planned": 69,
    "blocked_by_missing_handler": 33,
    "grouped_route": 8
  },
  "verification_status_counts": {
    "command_guidance": 119,
    "missing": 3,
    "route_guidance": 33,
    "runtime_policy": 8
  },
  "rollback_status_counts": {
    "command_guidance": 30,
    "missing": 10,
    "not_applicable": 112,
    "route_guidance": 11
  },
  "review_status_counts": {
    "planned": 163
  },
  "migration_status_counts": {
    "blocked_by_practice": 97,
    "explanation_only": 22,
    "blocked_by_verification": 3,
    "blocked_by_runtime": 33,
    "batch_ready": 5,
    "pilot_ready": 3
  }
}
~~~

## Migration Readiness
- Pilot ready: 3
- Batch ready: 5
- Blocked by runtime: 33
- Blocked by verification: 3
- Blocked by practice: 97
- Blocked by content: 0
- Explanation only: 22
- Unsupported: 0

## Integrity Findings
- Broken references: 0
- Vendor errors: 0
- Prerequisite cycles: 0
- Module ordering warnings: 10
- Deterministic generation: passed

## Rollback Gaps
- aruba_lacp_mode_active (aruba_cx, explanation_only_but_still_recommended)
- aruba_lacp_system_priority (aruba_cx, explanation_only_but_still_recommended)
- aruba_reload (aruba_cx, explanation_only_but_still_recommended)
- aruba_stp_priority (aruba_cx, explanation_only_but_still_recommended)
- cisco_reload (cisco_ios, explanation_only_but_still_recommended)
- cisco_stp_root_primary (cisco_ios, genuinely_missing)
- cisco_svi_ip_address (cisco_ios, explanation_only_but_still_recommended)
- hp_irf_member_priority (hp_comware, explanation_only_but_still_recommended)
- hp_irf_member_renumber (hp_comware, explanation_only_but_still_recommended)
- hp_reboot (hp_comware, explanation_only_but_still_recommended)

## Required Honesty Notes
- Planned or blocked content is not presented as complete.
- Routes with missing handlers do not authorize practical-execution mastery.
- Explanation-only commands do not authorize configuration, verification, Save, safety, or documentation mastery.
- Review eligibility is defined, but no student review records are created and Home review counts are unchanged.
