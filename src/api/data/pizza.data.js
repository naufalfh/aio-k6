// Default request payloads for the pizza API. Steps accept overrides so
// tests and BDD step definitions never need to build the whole object.

export const DEFAULT_PIZZA_ORDER = {
  customName: '',
  excludedIngredients: [],
  excludedTools: [],
  maxCaloriesPerSlice: 1000,
  maxNumberOfToppings: 5,
  minNumberOfToppings: 2,
  mustBeVegetarian: false,
};

export function pizzaOrder(overrides = {}) {
  return { ...DEFAULT_PIZZA_ORDER, ...overrides };
}
