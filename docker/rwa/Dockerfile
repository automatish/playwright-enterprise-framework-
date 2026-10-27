# Cypress Real World App, built from a pinned upstream commit for reproducible test runs.
# The React app is compiled once (vite build) and served statically, which is faster and far
# more deterministic than the Vite dev server.
ARG BASE_IMAGE=node:22-bookworm-slim
FROM ${BASE_IMAGE}

ARG RWA_REPO=https://github.com/cypress-io/cypress-realworld-app.git
ARG RWA_REF=0729f68ac220f7cda4ad09c5693dba11d7c532c6

ENV CYPRESS_INSTALL_BINARY=0 \
    HUSKY=0 \
    NODE_ENV=test \
    CI=true

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && (command -v yarn >/dev/null || (corepack enable && corepack prepare yarn@1.22.22 --activate))

WORKDIR /app
RUN git init -q . \
 && git remote add origin "${RWA_REPO}" \
 && git fetch -q --depth 1 origin "${RWA_REF}" \
 && git checkout -q FETCH_HEAD

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --ignore-engines --network-timeout 600000

RUN yarn predev:cognito:ci \
 && yarn db:seed:dev \
 && npx vite build

EXPOSE 3000 3001

HEALTHCHECK --interval=5s --timeout=5s --start-period=60s --retries=30 \
  CMD node -e "Promise.all([fetch('http://localhost:3000'),fetch('http://localhost:3001/checkAuth')]).then(([f,b])=>process.exit(f.ok&&b.status===401?0:1)).catch(()=>process.exit(1))"

# start:ci = static front-end proxy server (3000) + Express API (3001), NODE_ENV=test (enables /testData).
CMD ["yarn", "start:ci"]
