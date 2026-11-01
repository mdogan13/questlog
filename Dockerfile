FROM node:22-slim AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install -g bun && bun install
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/quests.db
VOLUME /data
EXPOSE 3000
CMD ["node", "--experimental-sqlite", ".output/server/index.mjs"]
