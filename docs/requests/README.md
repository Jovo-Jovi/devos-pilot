# Change requests

One file per request the reviewer accepted, written by the intake run (`devos-intake`, OD-08 §3):
what was asked, what was decided, what was left out and why. The intake PR that adds the file also
drafts the OD, the new task rows and the first fence; merging that PR signs the OD.

A **method fix** (issue form "Dev OS method fix", PR-28) writes `issue-N.md` too: the symptom, the
evidence from the run logs, the root cause to the line, the fix as a specification, and how it is
proven. Its task is a Phase `PM` row that runs before product tasks and always waits for your merge.
