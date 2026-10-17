# CLAUDE.md

Instructions for AI agents working on **Family Home Center** (React + TypeScript + Vite). See `README.md` for the product description.

## The `.ai/` directory

All agent-related knowledge lives in `.ai/`:

```
.ai/
├── specs/                  Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md  Active specs
│   ├── implemented/        Specs that have been implemented
│   └── archive/            Abandoned, superseded or obsolete specs
├── runs/                   Logs of autonomous AI runs: YYYY-MM-DD-slug.md
├── lessons.md              Index of lessons (long-term memory)
└── lessons/                Detailed lessons: YYYY-MM-DD-slug.md
```

`.ai/cezar/` is managed by the cezar tool; do not edit it by hand.

Naming: `YYYY-MM-DD` is the creation date, `slug` is lowercase kebab-case (e.g. `2026-10-17-google-calendar-auth.md`).

## Mandatory rules

1. **Read lessons first.** Before starting any task, read `.ai/lessons.md` and any linked lesson relevant to the task.
2. **Spec first (SDD).** Non-trivial features and changes must be driven by a spec in `.ai/specs/`. If none exists for the requested work, write one (or ask the user to confirm it) before implementing. Follow the spec; if it must change, update the spec first.
3. **Spec lifecycle.** When a spec is fully implemented, move it to `.ai/specs/implemented/`. When it is abandoned or superseded, move it to `.ai/specs/archive/`. Never delete specs.
4. **Log every autonomous run.** Any autonomous or multi-step run must produce a log in `.ai/runs/YYYY-MM-DD-slug.md` (goal, spec, steps, decisions, files changed, verification, open issues). Create it at the start and update it as you go.
5. **Record lessons.** After fixing a bug, hitting a surprising problem, or discovering a useful convention or improvement, write a lesson in `.ai/lessons/YYYY-MM-DD-slug.md` and add a one-line entry (newest first) to `.ai/lessons.md`. Record what is not obvious from the code.
6. **Keep README current.** `README.md` describes the product; update it when product requirements change.
7. **Follow naming.** Files in `specs/`, `runs/` and `lessons/` must use the `YYYY-MM-DD-slug.md` format. Files named `README.md` and `.gitkeep` are the only exceptions.
8. **English only in the repo.** The user may write prompts in Polish, but everything in the repository (code, comments, commit messages, docs, specs, run logs, lessons) must be written in English. The only exception is the Polish UI text of the calendar app itself.

## Project commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

Run `npm run lint` and `npm run build` before reporting work as done.
