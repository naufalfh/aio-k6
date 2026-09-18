// BDD use case: features/web/homepage.feature (browser)
// Run:  k6 run -e PROFILE=load tests/bdd/web-homepage.bdd.test.js

import { browser } from 'k6/browser';
import { buildOptions } from '../../src/core/options.js';
import { loadFeature, runFeature } from '../../src/bdd/runner.js';
import '../../src/bdd/steps/web.home.steps.js'; // registers Given/When/Then

const feature = loadFeature('features/web/homepage.feature');

export const options = buildOptions({ kind: 'web' });

export default async function () {
  const page = await browser.newPage();
  const world = { page };
  try {
    await runFeature(feature, world, { async: true });
  } finally {
    await page.close();
  }
}
