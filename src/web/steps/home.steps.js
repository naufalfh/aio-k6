import { check } from 'k6';
import { HomePage } from '../pages/homePage.js';

// Reusable browser steps. All async. They receive the k6 `page` object so the
// caller (test file or BDD world) owns the page lifecycle.
//
// Note: group() does not support async functions in k6, so browser steps use
// descriptive check names instead of groups.

export async function openHome(page) {
  const home = new HomePage(page);
  await home.goto();
  const header = await home.headerText();
  check(header, {
    'WEB - homepage header is visible': (h) => !!h && h.includes('pizza'),
  });
  return home;
}

export async function requestPizza(page) {
  const home = new HomePage(page);
  await home.clickPizzaPlease();
  const text = await home.recommendationText();
  check(text, {
    'WEB - a pizza recommendation is shown': (t) => t.length > 0,
  });
  return text;
}
