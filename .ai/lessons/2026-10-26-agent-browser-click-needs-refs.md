# agent-browser: click by CSS text selector silently no-ops on this app

Date: 2026-10-26

## Context

While checking the kiosk UI locally (per `.ai/lessons/2026-10-17-local-chrome-without-root.md`), `agent-browser click "button:text-is('Ustawienia')"` and similar CSS-ish selectors reported `✓ Done` but did not actually open the settings dialog or advance the PIN pad; screenshots kept showing the same screen.

## Fix

Use the snapshot-and-ref workflow instead of guessing selectors: `agent-browser snapshot -i -c [-s <scope>]` to get `@eN` refs for the actual interactive elements, then `agent-browser click eN`. Re-snapshot (scoped to the dialog's container class, e.g. `-s ".settings-overlay"`) after every state change, since refs for newly rendered elements only appear in a fresh snapshot.

## Why it matters

A `✓ Done` from `agent-browser click <selector>` is not proof the click landed on the intended element — it can match nothing meaningful and still report success. Don't trust it without a follow-up screenshot or snapshot confirming the expected state change.
