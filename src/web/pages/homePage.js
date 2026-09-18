import { ENV } from '../../../config/env.js';

// Page Object for the QuickPizza homepage. Only knows about selectors and
// low-level interactions; assertions live in src/web/steps.

export class HomePage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('h1');
    this.pizzaButton = page.getByRole('button', { name: 'Pizza, Please!' });
    this.recommendations = page.locator('div#recommendations');
  }

  async goto() {
    await this.page.goto(`${ENV.BASE_URL}/`, { waitUntil: 'networkidle' });
  }

  async headerText() {
    return this.header.textContent();
  }

  async clickPizzaPlease() {
    await this.pizzaButton.click();
  }

  /** Wait until the recommendation box has some text, then return it. */
  async recommendationText(timeoutMs = 10000) {
    const started = Date.now();
    let text = '';
    while (Date.now() - started < timeoutMs) {
      text = ((await this.recommendations.textContent()) || '').trim();
      if (text.length > 0) break;
      await this.page.waitForTimeout(250);
    }
    return text;
  }
}
