# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@11.15.1
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @be-human/api...

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN pnpm --filter @be-human/api... build

FROM node:24-alpine AS runner
ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /workspace
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /workspace/node_modules ./node_modules
COPY --from=build --chown=app:app /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=app:app /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:app /workspace/packages/domain ./packages/domain
COPY --from=build --chown=app:app /workspace/package.json ./package.json
COPY --from=build --chown=app:app /workspace/apps/api/package.json ./apps/api/package.json
USER app
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=4 CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
