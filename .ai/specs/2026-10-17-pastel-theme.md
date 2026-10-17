# Pastel theme with a Tatra background

Date: 2026-10-17
Status: in progress (proposal, awaiting the user's reaction)

## Requirement (from the user)

Completely different colours and design: pastel colours overall, perhaps a beautiful photo of the Tatra mountains in the background.

## Decisions

- Light theme (`color-scheme: light`): misty blue-white surfaces, dark slate text (`#263646`), coral accent for "today" (`#ec6f58`).
- Surfaces are translucent white (rows) or frosted glass (top bar, bottom bar, column headers) so the scenery shows through; the pinned today row is opaque so it covers rows scrolling beneath it.
- Saturday: pastel blue tint with a blue date; Sunday: pastel rose tint with a rose date; Monday to Friday: neutral translucent white. Today: coral-tinted row with a coral frame.
- Default family colours become pastels (rose, sky, mint, butter, lavender, aqua); event chips are the person's colour mixed with white, with dark text.
- Background: a stylised illustration of the Tatra ridge (`src/assets/tatry.svg`), drawn for this project so there is no licensing question. A real photo can replace it by dropping a file next to it and changing the single `url()` in `src/index.css`; a photo must be free to use (CC0 / public domain / CC BY with attribution) because it ends up in the repository.

## Open items

- A real photo needs a source the user approves (own photo, a URL, or permission to search the web for a freely licensed one).
