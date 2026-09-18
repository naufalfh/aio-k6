# aio-k6

Modular [k6](https://grafana.com/docs/k6/latest/) performance-test framework:

- **Load / Stress / Spike / Smoke** profiles selected at runtime (`-e PROFILE=...`)
- **API** tests (`k6/http`) and **Web** tests (`k6/browser`, real headless Chrome)
- **Reusable steps**: test files only compose steps that already exist
- **BDD**: Gherkin `.feature` files executed by a lightweight, pure-k6 runner

Target application used by the examples: [QuickPizza](https://quickpizza.grafana.com).

## Requirements

- k6 `>= 1.0` (developed on `v2.0.0-rc1`)
- A Chromium-based browser (Google Chrome) for Web tests. k6 auto-detects it.
- Node/npm only for the convenience `npm run ...` scripts (k6 itself needs no `npm install`).

## Quick start

```bash
# API use case, smoke profile (default)
k6 run tests/api/order-pizza.test.js

# Same use case, other workload profiles
k6 run -e PROFILE=load   tests/api/order-pizza.test.js
k6 run -e PROFILE=stress tests/api/order-pizza.test.js
k6 run -e PROFILE=spike  tests/api/order-pizza.test.js

# Web (browser) use case
k6 run -e PROFILE=load tests/web/homepage.test.js

# BDD use cases (feature files in ./features)
k6 run -e PROFILE=smoke tests/bdd/api-order-pizza.bdd.test.js
k6 run -e PROFILE=smoke tests/bdd/web-homepage.bdd.test.js

# Only scenarios tagged @smoke
k6 run -e TAGS=@smoke tests/bdd/api-order-pizza.bdd.test.js
```

Or via npm: `npm run test:api:load`, `npm run test:web:stress`, `npm run test:bdd:api`, `npm run test:smoke` (runs all four examples with the smoke profile). See `package.json` for the full list.

### Runtime variables (`-e KEY=VALUE`)

| Variable    | Default                          | Purpose                                   |
| ----------- | -------------------------------- | ----------------------------------------- |
| `PROFILE`   | `smoke`                          | `smoke`, `load`, `stress`, `spike` (api) / `smoke`, `load`, `stress` (web) |
| `BASE_URL`  | `https://quickpizza.grafana.com` | System under test                         |
| `API_TOKEN` | `abcdef0123456789`               | Sent as `Authorization: token <value>`    |
| `TAGS`      | *(empty = all)*                  | BDD tag filter: `@smoke`, `@a,@b`, `~@slow` |
| `HEADLESS`  | `true`                           | Reserved for browser options              |

### k6 web dashboard

```powershell
$env:K6_WEB_DASHBOARD = "true"; k6 run -e PROFILE=load tests/api/order-pizza.test.js
```

```bash
K6_WEB_DASHBOARD=true k6 run -e PROFILE=load tests/api/order-pizza.test.js
```

Dashboard: http://127.0.0.1:5665/

## Project structure

```
config/
  env.js            runtime variables (BASE_URL, PROFILE, ...)
  profiles.js       workload profiles per kind: api.{smoke,load,stress,spike}, web.{smoke,load,stress}
  thresholds.js     default pass/fail criteria per kind + profile
src/
  core/options.js       buildOptions({ kind }) -> k6 `options` (scenario + thresholds + tags)
  core/httpClient.js    k6/http wrapper: BASE_URL, default headers, auth, custom metrics
  api/data/             request payload builders
  api/steps/            reusable API steps (group + checks)
  web/pages/            Page Objects (selectors + interactions)
  web/steps/            reusable browser steps (checks)
  bdd/gherkin.js        .feature parser (Feature, Background, Scenario, Outline+Examples, tags, tables)
  bdd/registry.js       Given / When / Then step-definition registry
  bdd/runner.js         loadFeature() + runFeature()
  bdd/steps/            Gherkin bindings -> framework steps
features/               .feature files (api/, web/)
tests/
  api/                  one file per API use case
  web/                  one file per Web use case
  bdd/                  one file per feature file
common/metrics.js       custom Rate/Counter metrics fed by httpClient
```

## Writing tests

### 1. A new API use case

Compose existing steps; the profile and thresholds come from `buildOptions`:

```js
// tests/api/my-use-case.test.js
import { sleep } from 'k6';
import { buildOptions } from '../../src/core/options.js';
import { openHomepage, orderPizza } from '../../src/api/steps/pizza.steps.js';

export const options = buildOptions({ kind: 'api' });

export default function () {
  openHomepage();
  orderPizza({ mustBeVegetarian: true });
  sleep(1);
}
```

Override thresholds or the scenario for a specific test:

```js
export const options = buildOptions({
  kind: 'api',
  thresholds: { http_req_duration: ['p(95)<500'] },
  scenario: { gracefulRampDown: '10s' },
});
```

### 2. A new reusable API step

```js
// src/api/steps/ratings.steps.js
import { group, check } from 'k6';
import { client } from '../../core/httpClient.js';

export function ratePizza(pizzaId, stars) {
  return group('API - Rate a pizza', () => {
    const res = client.postJson('/api/ratings', { pizza_id: pizzaId, stars });
    check(res, { 'rating status is 201': (r) => r.status === 201 });
    return res;
  });
}
```

`client` prefixes `BASE_URL`, adds JSON + `Authorization` headers and records the custom metrics, so steps never repeat that boilerplate.

### 3. A new Web use case

Steps are `async` and receive the k6 `page`:

```js
// tests/web/my-flow.test.js
import { browser } from 'k6/browser';
import { buildOptions } from '../../src/core/options.js';
import { openHome, requestPizza } from '../../src/web/steps/home.steps.js';

export const options = buildOptions({ kind: 'web' });

export default async function () {
  const page = await browser.newPage();
  try {
    await openHome(page);
    await requestPizza(page);
  } finally {
    await page.close();
  }
}
```

Add selectors to a Page Object in `src/web/pages/`, assertions to a step in `src/web/steps/`.

### 4. A new BDD feature

1. Write `features/<area>/<name>.feature`.
2. Bind sentences to framework steps in `src/bdd/steps/<area>.<name>.steps.js`:

   ```js
   import { Given, When, Then } from '../registry.js';
   import { orderPizza } from '../../api/steps/pizza.steps.js';

   When('I order a pizza with min {int} and max {int} toppings', function (min, max) {
     this.order = orderPizza({ minNumberOfToppings: min, maxNumberOfToppings: max });
   });
   ```

   Placeholders: `{string}` `{int}` `{float}` `{word}` `{}`; a RegExp is accepted too.
   `this` is the *world* object shared by all steps of an iteration.
   A data table or doc string on the step is passed as the last argument.
3. Create `tests/bdd/<name>.bdd.test.js`:

   ```js
   import { buildOptions } from '../../src/core/options.js';
   import { loadFeature, runFeature } from '../../src/bdd/runner.js';
   import '../../src/bdd/steps/api.pizza.steps.js';

   const feature = loadFeature('features/api/order-pizza.feature'); // init context only

   export const options = buildOptions({ kind: 'api' });

   export default async function () {
     await runFeature(feature, {});
   }
   ```

   For browser features create the page first and pass `{ async: true }`:
   `await runFeature(feature, { page }, { async: true })` (k6 `group()` cannot wrap async code, so
   async scenarios are tagged with `bdd_scenario` and recorded as a `Scenario: ... passed` check instead).

Supported Gherkin: `Feature`, `Background`, `Scenario`, `Scenario Outline` + `Examples`,
`Given/When/Then/And/But`, `@tags`, `# comments`, data tables, doc strings.

## Adding a workload profile

Edit `config/profiles.js` (scenario definition) and `config/thresholds.js` (criteria), then run with
`-e PROFILE=<name>`. Unknown profile names fail fast with a clear error.

## Notes

- k6 v2 removed the `externally-controlled` executor and renamed `browser_web_vital_fid` to
  `browser_web_vital_inp`; nothing here depends on the removed pieces.
- The public QuickPizza demo often has TTFB > 2s, so the default Web Vitals thresholds are
  intentionally loose. Tighten them per test with `buildOptions({ thresholds })` for your own environment.
- Browser VU counts are deliberately small: every browser VU launches a Chrome instance.
