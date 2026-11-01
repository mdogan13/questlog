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

Quest validation and completion rules live in `src/lib/quest-rules.ts`. Database
access is confined to server functions in `src/lib/quests.functions.ts` and the
SQLite connection in `src/lib/db.server.ts`.
