# Verify Google behaviour against the docs before writing it down

Date: 2026-10-18

## What happened

The first version of the README's Google section (and the spec) was written from memory: it described a Cloud Console flow with scopes in the consent-screen wizard and said the browser token would be renewed silently while the Google session lasts. Reading Google's current documentation showed both were wrong or unsafe:

- The Google Auth platform wizard (Get Started: App Information, Audience, Contact Information, Finish) has no scopes step. Scopes are added afterwards under **Data Access**, and test users under **Audience**.
- The token model's documentation says a new access token must be obtained by calling `requestAccessToken()` from a user-driven event; `prompt: 'none'` may work without UI but is not promised. An unattended kiosk may therefore need a tap about hourly.
- In Testing, authorizations by test users expire seven days after consent (not only refresh tokens).

## Rules

- Before documenting or building on third-party console flows, quotas, scopes or token behaviour, read the vendor's current documentation (agent-browser can read it: `npx agent-browser read <url>`), and cite the sources in the doc with the date checked.
- Consoles that need a login cannot be browsed by the agent; say so and rely on the documentation instead of guessing menu names.
- Treat "works silently" assumptions about auth on an unattended device as risks to test on the real device before committing to an architecture.
