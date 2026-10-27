# Headless test-runner image. The base tag MUST match the @playwright/test version in
# package.json so browsers, fonts and screenshot baselines are byte-for-byte reproducible.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /e2e
ENV CI=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

# Reports and test-results are bind-mounted by docker-compose so they survive the container.
ENTRYPOINT ["npx", "playwright", "test"]
