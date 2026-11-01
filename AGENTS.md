## Project rules
- Persistence uses SQLite via built-in `node:sqlite` in `src/lib/db.server.ts`, accessed only from server functions in `src/lib/quests.functions.ts` — the app targets self-hosting in Docker (Node server preset), not edge runtimes.
- Quest completion rules live in `src/lib/quest-rules.ts` (zod schemas + pure helpers) so they are testable.
