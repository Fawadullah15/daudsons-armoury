# =========================================================================
# DAUDSONS ARMOURY (PVT.) LTD. — PRODUCTION CONTAINER IMAGE
# Precision Small Arms, Defense Equipment & Aerospace Assemblies
# Established 1953 • Peshawar, Pakistan • AS9100 Rev D & ISO 9001:2015
# =========================================================================

FROM node:24-alpine AS runner

WORKDIR /app

# Install security and maintenance utilities
RUN apk add --no-cache curl ca-certificates tzdata

ENV NODE_ENV=production \
    PORT=3053 \
    TZ=Asia/Karachi

# Create non-root dedicated service user
RUN addgroup -S daudsons && adduser -S daudsons -G daudsons

# Copy application files and dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

COPY auth.js database.js server.js seed-data.json ./
COPY public ./public

# Ensure database directory is writable by daudsons user
RUN mkdir -p /app/data && chown -R daudsons:daudsons /app

USER daudsons

EXPOSE 3053

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3053/api/health || exit 1

CMD ["node", "server.js"]
