# Deploy to GitHub Pages

Date: 2026-10-18
Status: in progress

## Requirement (from the user)

Host the app on a free host that can be deployed directly from GitHub, so the tablet (Fully Kiosk Browser) opens a normal URL and updates need no file copying. Chosen host: GitHub Pages.

## Decisions

- Site: `https://sniedzwiedzki.github.io/family-home-center/` (a project site, so the app lives under a sub-path). The repository is public, which GitHub Pages needs on the free plan.
- Build: Vite `base: './'` for every build, so asset paths are relative and the same bundle works under any sub-path (Pages, a local web server such as Fully's) and at the root. The root-absolute default produced a blank page when served from a sub-path (verified).
- Workflow `.github/workflows/deploy.yml`: runs after the `CI` workflow completes successfully on `main` (or by hand with `workflow_dispatch`), builds with `npm run build`, uploads `dist` as the Pages artifact and deploys it with `actions/deploy-pages`. Nothing is deployed when CI is red.
- Pages must be switched to the source "GitHub Actions" once by hand (Settings, Pages): the agent's token gets `403 Resource not accessible by personal access token` from the Pages API, so it cannot do it. A token with Pages write permission could (`POST /repos/{owner}/{repo}/pages` with `build_type=workflow`).
- No secrets are in the bundle: the Google client id, secret and refresh token are typed into the app's settings on the tablet and live only in its local storage.

## Consequences

- The site is public: anyone who knows the address can open it and sees an empty app with their own (empty) local storage.
- Local storage belongs to the address `https://sniedzwiedzki.github.io` (path is not part of the origin). Moving to another host or domain loses the settings stored on the tablet, so keep the address stable (a custom domain would allow changing the host later).
- Google: an HTTPS origin works with the token flow and with the refresh-token path; only the origin (no path) goes into "Authorized JavaScript origins" if the sign-in popup is ever used.
- The tablet cannot start the app without internet after a restart unless a service worker caches it (not part of this change).

## Verification

- The deploy workflow can only deploy from `main` (the `github-pages` environment allows the default branch), so the first real deployment happens after the merge; before that the build job can be run from the branch with `workflow_dispatch`.
