#!/usr/bin/env bash
set -Eeuo pipefail

# Run inside the LXC. This targets the default deployment documented in README.md.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
project_dir="$PWD"
backup_root="${BACKUP_DIR:-/opt/questlog-backups}"
backup_path=""
restart_on_error=false

on_error() {
  local status=$?
  trap - ERR
  printf '\nUpdate failed.\n' >&2
  if "$restart_on_error"; then
    printf 'Restarting the existing container.\n' >&2
    docker start questlog || true
  fi
  if [[ -n "$backup_path" ]]; then
    printf 'Data backup: %s\n' "$backup_path" >&2
  fi
  printf 'Check the error above and docker logs --tail 50 questlog.\n' >&2
  exit "$status"
}
trap on_error ERR

for command in git docker flock; do
  command -v "$command" >/dev/null || { printf 'Missing command: %s\n' "$command" >&2; exit 1; }
done

# Prevent overlapping updates of this checkout.
exec 9>"$(git rev-parse --git-dir)/questlog-update.lock"
flock -n 9 || { printf 'Another update is already running.\n' >&2; exit 1; }

if ! git diff --quiet || ! git diff --cached --quiet; then
  printf 'Commit or discard local tracked-file changes before updating.\n' >&2
  exit 1
fi

# Refuse to replace a container using a different database mount.
mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Type}}:{{.Name}}{{end}}{{end}}' questlog)
if [[ "$mount" != "volume:questlog-data" ]]; then
  printf 'Expected questlog to mount the questlog-data volume at /data; found: %s\n' "$mount" >&2
  exit 1
fi

printf 'Pulling the latest code...\n'
git pull --ff-only
printf 'Building the new image while the existing app stays running...\n'
docker build -t questlog "$project_dir"

# Prepare a unique backup directory before stopping the app.
mkdir -p -- "$backup_root"
backup_path=$(mktemp -d "$backup_root/quests-$(date +%Y%m%d-%H%M%S)-XXXXXX")
chmod 700 "$backup_path"

printf 'Stopping the app and backing up /data to %s...\n' "$backup_path"
restart_on_error=true
docker stop --time 30 questlog
# Copy the whole directory, including any SQLite journal/WAL files.
docker cp questlog:/data/. "$backup_path/"

printf 'Replacing the container, keeping questlog-data...\n'
docker rm questlog
restart_on_error=false
docker run -d \
  --name questlog \
  --restart unless-stopped \
  -p 3000:3000 \
  -v questlog-data:/data \
  questlog

printf 'Waiting for the app...\n'
for attempt in {1..30}; do
  if docker exec questlog node -e \
    'fetch("http://127.0.0.1:3000", {signal: AbortSignal.timeout(2000)}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))' \
    >/dev/null 2>&1; then
    printf 'Quest Log updated successfully. Backup: %s\n' "$backup_path"
    exit 0
  fi
  sleep 2
done

printf 'The app did not become ready.\n' >&2
docker logs --tail 50 questlog
false
