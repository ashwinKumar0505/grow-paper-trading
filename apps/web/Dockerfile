FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional build-time overrides for Firebase client config (defaults to firebase-applet-config.json)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_DATABASE_ID

# Google Analytics 4 measurement ID (build-time Vite env var; enabled only in production after user consent)
ARG VITE_GA_MEASUREMENT_ID

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-semi-space-size=4"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3000

CMD ["node", "dist-server/server.mjs"]
