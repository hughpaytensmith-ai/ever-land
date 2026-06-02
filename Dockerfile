# ── Build the SPA (same-origin sync so it works behind any TLS host) ──────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV VITE_SYNC_SAME_ORIGIN=1
RUN npm run build

# ── Runtime: combined static + y-websocket server ────────────────────────────
FROM node:20-alpine AS run
WORKDIR /app
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server/server.mjs ./server/server.mjs
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.mjs"]
