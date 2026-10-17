# Running Chrome locally without root

Date: 2026-10-17

## Context

`agent-browser`'s Chrome did not start in the sandbox: system libraries were missing and there is no root, no Docker. Looking at the UI then required pushing to CI for screenshots, and every push starts a CI run, which the user does not want while iterating on the look.

## Recipe (works without root)

1. Install the browser once: `npx agent-browser install`.
2. Fetch the missing libraries as plain `.deb` files with `apt` using user-space state, and unpack them (the sandbox is Debian bookworm):
   ```bash
   mkdir -p /tmp/apt/state/lists/partial /tmp/apt/cache/archives/partial /tmp/chromelibs/debs && cd /tmp/chromelibs/debs
   OPTS="-o Dir::State=/tmp/apt/state -o Dir::Cache=/tmp/apt/cache -o Debug::NoLocking=1"
   apt-get $OPTS update
   for p in libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdbus-1-3 libcups2 libxkbcommon0 libasound2 libgbm1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libatspi2.0-0 libavahi-common3 libavahi-client3 libdrm2 libwayland-server0 libxi6; do apt-get $OPTS download "$p"; done
   for f in *.deb; do dpkg -x "$f" /tmp/chromelibs/root; done
   echo 'export LD_LIBRARY_PATH=/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:/tmp/chromelibs/root/lib/x86_64-linux-gnu' > /tmp/chromelibs/env.sh
   ```
   Check with `ldd ~/.agent-browser/browsers/chrome-*/chrome | grep "not found"` (should print nothing).
3. Build and serve: `npx vite build && npx vite preview --port 4173` (it listens on `localhost`, not `127.0.0.1`).
4. Screenshot at the kiosk size:
   ```bash
   . /tmp/chromelibs/env.sh; export AGENT_BROWSER_SESSION=local-ui AGENT_BROWSER_ARGS=--no-sandbox
   npx agent-browser set viewport 1600 2400 && npx agent-browser open http://localhost:4173
   npx agent-browser wait 1500 && npx agent-browser screenshot /tmp/local.png
   ```
   `/tmp` is wiped between sandboxes; repeat step 2 when needed.

## Rules

- While iterating on the UI, commit locally and push only when asked or when finished; look at local screenshots instead of CI ones.
- CI screenshots (artifact `integration-screenshots`) stay the check for the finished, pushed work.
