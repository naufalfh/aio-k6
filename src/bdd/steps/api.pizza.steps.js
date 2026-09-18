import { Given, When, Then } from '../registry.js';
import {
  openHomepage,
  orderPizza,
  verifyIngredientCount,
  verifyVegetarian,
} from '../../api/steps/pizza.steps.js';

// Gherkin bindings for the pizza API. These only translate sentences into
// framework steps; no HTTP logic lives here.

Given('the QuickPizza homepage is reachable', function () {
  this.homepage = openHomepage();
});

When('I order a pizza with min {int} and max {int} toppings', function (min, max) {
  this.order = orderPizza({ minNumberOfToppings: min, maxNumberOfToppings: max });
});

When('I order a vegetarian pizza', function () {
  this.order = orderPizza({ mustBeVegetarian: true });
});

Then('the pizza response is successful', function () {
  // orderPizza() already recorded the status/body checks; this step exists so the
  // feature reads naturally and can be extended (e.g. with a schema check) later.
});

Then('the pizza has at least {int} ingredients', function (min) {
  verifyIngredientCount(this.order, min);
});

Then('the pizza has between {int} and {int} ingredients', function (min, max) {
  verifyIngredientCount(this.order, min, max);
});

Then('the pizza is vegetarian', function () {
  verifyVegetarian(this.order);
});
