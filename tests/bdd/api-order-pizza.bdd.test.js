// BDD use case: features/api/order-pizza.feature
// Run:  k6 run -e PROFILE=load tests/bdd/api-order-pizza.bdd.test.js
//       k6 run -e PROFILE=smoke -e TAGS=@smoke tests/bdd/api-order-pizza.bdd.test.js

import { sleep } from 'k6';
import { buildOptions } from '../../src/core/options.js';
import { loadFeature, runFeature } from '../../src/bdd/runner.js';
import '../../src/bdd/steps/api.pizza.steps.js'; // registers Given/When/Then

const feature = loadFeature('features/api/order-pizza.feature');

export const options = buildOptions({ kind: 'api' });

export default async function () {
  const world = {};
  await runFeature(feature, world);
  sleep(1);
}
