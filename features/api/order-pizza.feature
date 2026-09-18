@api
Feature: Order a pizza via API
  As a hungry user
  I want to request a pizza recommendation through the API
  So that I can get a pizza that fits my constraints

  Background:
    Given the QuickPizza homepage is reachable

  @smoke
  Scenario Outline: Order pizza with topping limits
    When I order a pizza with min <min> and max <max> toppings
    Then the pizza response is successful
    And the pizza has at least <min> ingredients

    Examples:
      | min | max |
      | 2   | 5   |
      | 3   | 6   |

  Scenario: Order a vegetarian pizza
    When I order a vegetarian pizza
    Then the pizza response is successful
    And the pizza is vegetarian
