import { Given, When, Then } from '../registry.js';
import { openHome, requestPizza } from '../../web/steps/home.steps.js';

// Gherkin bindings for the QuickPizza homepage (browser). The world must
// provide `this.page` (created by the test file before runFeature()).

Given('I open the QuickPizza homepage', async function () {
  this.home = await openHome(this.page);
});

When('I click {string}', async function (buttonName) {
  if (buttonName !== 'Pizza, Please!') {
    throw new Error(`No web step knows how to click "${buttonName}"`);
  }
  this.recommendation = await requestPizza(this.page);
});

Then('a pizza recommendation is shown', function () {
  // requestPizza() already asserted the recommendation text; expose it for further steps.
  return this.recommendation;
});
