Set-Location 'c:\Users\Lei\Documents\Linux-shared folder\BushArt'
# Rewrite to the E2E database (mirrors test-all.mjs stage-7 env rewrite)
# E2E credentials are supplied via the E2E_MONGODB_URI environment variable; never hardcode secrets.
$env:MONGODB_URI = $env:E2E_MONGODB_URI
$env:PLAYWRIGHT_JSON_OUTPUT_FILE = 'c:\Users\Lei\Documents\Linux-shared folder\BushArt\ci-reports\playwright.json'
node ./node_modules/tsx/dist/cli.mjs scripts/seed-e2e.ts > seed.log 2>&1
node ./node_modules/playwright/cli.js test --reporter=list,json > playwright.log 2>&1
