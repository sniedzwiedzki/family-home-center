# Check shared-chip changes with two and with three or more people

Date: 2026-10-27

## What happened

Shared chips (one event for several neighbouring people) were made as wide as their text, to fix a two-person case. A three-person all-day event with a short title then shrank into the middle person's column and no longer touched the other two columns; the user saw it as broken.

## Lesson

- A shared chip must visibly reach every participant's column; only then does it read as "these people together".
- When changing the size or placement of shared chips, test at least: two people, three or more people, a short and a long title, all-day and timed, and two bands meeting in one column.
- Two-person chips can be text-wide (the column boundary is under their centre); chips of three or more fill their band (`is-wide`).
