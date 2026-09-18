// Use case: order a pizza through the API.
// Run:  k6 run -e PROFILE=load   tests/api/order-pizza.test.js
//       k6 run -e PROFILE=stress tests/api/order-pizza.test.js

import { sleep } from 'k6';
import { buildOptions } from '../../src/core/options.js';
import { openHomepage, orderPizza } from '../../src/api/steps/pizza.steps.js';

export const options = buildOptions({ kind: 'api' });

export default function () {
  openHomepage();
  orderPizza();
  sleep(1);
}
