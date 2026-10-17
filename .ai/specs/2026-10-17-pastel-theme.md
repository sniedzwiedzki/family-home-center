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
- Background: a real photo of the High Tatras (`src/assets/tatry.jpg`), a 1600 x 2400 crop of "Tatry - panorama z Polskiego Spiszu" by Qvidemus (CC BY 3.0, attribution in `src/assets/ATTRIBUTION.md`), under a 30% white veil to keep it pastel. The first proposal was a drawn SVG ridge; the photo replaced it. Any replacement photo must be free to use (CC0 / public domain / CC BY with attribution) because it ends up in the repository.

## Notes

- The photo was found through the Wikimedia Commons API (read-only) because the web search tool was blocked in this session; the user had authorised searching.
- Date column and month column were compacted (5.25rem and 1.625rem) to leave room for the person columns.
