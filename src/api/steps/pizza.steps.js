import { group, check } from 'k6';
import { client } from '../../core/httpClient.js';
import { pizzaOrder } from '../data/pizza.data.js';

// Reusable API steps. Each step:
//   - wraps its work in a k6 group() so it shows up separately in the summary
//   - performs its own checks
//   - returns something useful to the caller (response / parsed body)
//
// Compose these in test files or bind them to Gherkin steps in src/bdd/steps.

/** GET / and verify the homepage responds. */
export function openHomepage() {
  return group('API - Open homepage', () => {
    const res = client.get('/', { headers: { Accept: 'text/html' }, tags: { name: 'GET /' } });
    check(res, {
      'homepage status is 200': (r) => r.status === 200,
    });
    return res;
  });
}

/**
 * POST /api/pizza with the default payload merged with `overrides`.
 * Returns { res, body, order } so callers can assert further.
 */
export function orderPizza(overrides = {}) {
  return group('API - Order a pizza', () => {
    const order = pizzaOrder(overrides);
    const res = client.postJson('/api/pizza', order, { tags: { name: 'POST /api/pizza' } });
    const body = client.json(res);

    check(res, {
      'order status is 200': (r) => r.status === 200,
      'order returns a pizza name': () => !!(body && body.pizza && body.pizza.name),
      'order returns ingredients': () =>
        !!(body && body.pizza && Array.isArray(body.pizza.ingredients) && body.pizza.ingredients.length > 0),
    });

    return { res, body, order };
  });
}

function ingredientCount(result) {
  return result && result.body && result.body.pizza && Array.isArray(result.body.pizza.ingredients)
    ? result.body.pizza.ingredients.length
    : -1;
}

/**
 * Assert the ingredient count of a pizza result is >= min (and <= max when given).
 * Note: QuickPizza counts dough/sauce/cheese as ingredients too, so the total is
 * usually higher than maxNumberOfToppings.
 */
export function verifyIngredientCount(result, min, max) {
  const count = ingredientCount(result);
  const label =
    max === undefined ? `ingredient count is at least ${min}` : `ingredient count is between ${min} and ${max}`;
  return check(count, {
    [label]: (c) => c >= min && (max === undefined || c <= max),
  });
}

/** Assert the API reports the pizza as vegetarian. */
export function verifyVegetarian(result) {
  return check(result && result.body, {
    'pizza is vegetarian': (b) => !!b && b.vegetarian === true,
  });
}
