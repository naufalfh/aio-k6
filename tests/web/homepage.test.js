// Use case: request a pizza from the homepage in a real browser.
// Run:  k6 run -e PROFILE=load   tests/web/homepage.test.js
//       k6 run -e PROFILE=stress tests/web/homepage.test.js

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
