# Pastel theme with a Tatra background

Date: 2026-10-17
Status: implemented

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

## Calm direction (shaped with om-ux-shape after "colours too strong")

Rule: colour appears only where it carries meaning (which person, which day type, today) and always at low saturation; everything else is neutral blue-grey.

- Month strip: one quiet blue-grey (`#dde5ed`) for every month, slate text (`#3b4d63`, weight 600). The first attempt used a different saturated pastel per month and was rejected as too strong.
- Person header: a pill tinted 34% of the person's colour over white with a hairline border; no shadow, no solid fill. "Inne" uses a neutral blue-grey.
- Weekends: very light tints (Saturday cool grey-blue, Sunday dusty rose, ~66% opacity) and muted date numerals (`#6a88ad`, `#ae7681`); Monday to Friday neutral.
- Today: thin (2px) soft coral frame (`#e08a78`) on a 9% coral tint; the date numeral in the same coral.
- Event chips: person colour at 28% over white with a 50% border; muted time text.

Evidence limits: judged from screenshots and the user's reactions only; no user testing. Biggest risk: chips and tints may now be too pale on the kiosk panel, which can render lighter than a laptop screen; check on the tablet.

