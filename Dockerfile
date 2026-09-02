FROM node:20.19.5-bookworm-slim AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/src ./src
ENV VITE_API_URL=/api
RUN npm run build

FROM node:20.19.5-bookworm-slim AS backend-dependencies

WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20.19.5-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=7860 \
    HOST=0.0.0.0 \
    DEMO_MODE=true \
    DEMO_RESET_ON_START=true \
    STATIC_DIR=/app/public

WORKDIR /app
COPY --chown=1000:1000 backend/package.json ./backend/package.json
COPY --chown=1000:1000 backend/src ./backend/src
COPY --chown=1000:1000 --from=backend-dependencies /build/backend/node_modules ./backend/node_modules
COPY --chown=1000:1000 --from=frontend-build /build/frontend/dist ./public

USER 1000:1000
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||7860)+'/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "backend/src/server.js"]
