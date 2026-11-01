# Quest Log

A fantasy RPG quest journal for your todos, built with React, TanStack Start,
Tailwind CSS, and a Node.js server backed by SQLite.

Create main and side quests with descriptions, locations, and objectives. Complete
objectives individually or finish a whole quest, and browse completed quests in
your journal.

Use **Track Quest** beside **Complete Quest** to pin a quest to the top of its
category. Tracked quests show a gold pin and stay tracked across refreshes.
Completing a quest automatically untracks it. Completed quests cannot be tracked;
reopen them first. Existing SQLite databases are upgraded
automatically when the updated server starts handling quests.

## Development

Use Node.js 22.13+ and Bun to install dependencies. Run the app with Node.js so
the server can use the built-in `node:sqlite` module.

```sh
bun install --frozen-lockfile
npm run dev
```

```sh
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm run build
npm run preview
```

## Self-hosting

The production build targets a Node.js server. SQLite data is stored in
`./data/quests.db` by default; set `DATABASE_PATH` to use another location.

```sh
npm run build
node .output/server/index.mjs
```

Build and run the Docker image with a persistent database volume:

```sh
docker build -t questlog .
docker run -d --name questlog -p 3000:3000 -v questlog-data:/data questlog
```

### Update the LXC deployment

After pushing changes to GitHub, run inside the LXC:

```sh
cd /opt/questlog
bash scripts/update-lxc.sh
```

The first time, run `git pull --ff-only` first to download the script.
It pulls the current branch, builds the image while the app stays available,
stops the app, backs up the entire `/data` directory, and recreates the container
using the same `questlog-data` volume and automatic restart policy. It checks
that the updated app responds before reporting success. Refresh your browser
afterward.

This script targets the default `questlog` container on port 3000. It refuses
to proceed if the existing container uses a different data mount or the checkout
has changes to tracked files. Backups are saved under `/opt/questlog-backups`
(override with `BACKUP_DIR`). If the build fails, the running app is left alone;
if the backup fails, the old container is restarted. A startup failure is reported
with the backup location; backups are never restored automatically. Copy important
backups off the LXC as well.

Quest validation and completion rules live in `src/lib/quest-rules.ts`. Database
access is confined to server functions in `src/lib/quests.functions.ts` and the
SQLite connection in `src/lib/db.server.ts`.
