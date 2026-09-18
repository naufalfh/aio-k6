@web
Feature: QuickPizza homepage
  As a visitor
  I want to ask for a pizza on the homepage
  So that I get a recommendation in the browser

  @smoke
  Scenario: Request a pizza from the homepage
    Given I open the QuickPizza homepage
    When I click "Pizza, Please!"
    Then a pizza recommendation is shown
