# PILOT — Session context

**Phase:** P01 Foundation (J4) · **Last verdict:** none · **Open carry-forwards:** none

## Done steps

| Step | What | State |
|---|---|---|
| B0 | Bootstrap: method documents, models, approved design, fence T01, automation | committed by the human (signs OD-01 to OD-06) |
| T01 | Foundation | fence issued: `docs/fences/T01.md` |

## Next action

Run the `devos-cycle` workflow (Actions tab → devos-cycle → Run workflow, inputs blank). The
runner picks T01, Cursor builds it on `task/T01`, Claude reviews it, and on PASS the runner merges
and starts T02, which stops at the G-Foundation human gate.
