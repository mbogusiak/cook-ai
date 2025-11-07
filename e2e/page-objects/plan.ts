import { Locator, expect } from "@playwright/test";
import { BasePage } from "./base";

export class PlanOverviewPage extends BasePage {
  async open(planId: number): Promise<void> {
    await this.goto(`/plans/${planId}`);
    await this.expectVisible(this.getByTestId("plan-overview"));
  }

  get calendar(): Locator {
    return this.getByTestId("calendar-strip");
  }

  dayCard(date: string): Locator {
    return this.getByTestId(`day-card-${date}`);
  }

  async openDay(planId: number, date: string): Promise<void> {
    await this.goto(`/plans/${planId}/days/${date}`);
  }
}

export class PlanDayPage extends BasePage {
  async open(planId: number, date: string): Promise<void> {
    await this.goto(`/plans/${planId}/days/${date}`);
    await this.expectVisible(this.getByTestId("plan-day-view"));
  }

  get prevButton(): Locator {
    return this.getByTestId("day-prev");
  }
  get nextButton(): Locator {
    return this.getByTestId("day-next");
  }

  mealCard(slot: "breakfast" | "lunch" | "dinner" | "snack"): Locator {
    return this.getByTestId(`meal-card-${slot}`);
  }

  mealComplete(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("meal-complete");
  }
  mealSkip(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("meal-skip");
  }
  mealSwap(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("meal-swap");
  }

  multiPortionBadge(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("multiportion-badge");
  }
  leftoversBadge(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("leftovers-badge");
  }

  mealCalories(slot: string): Locator {
    return this.mealCard(slot as any).getByTestId("meal-calories");
  }
}

export class SwapModalPO extends BasePage {
  get root(): Locator {
    return this.getByTestId("swap-modal");
  }
  get options(): Locator {
    return this.getByTestId("swap-options");
  }
  option(index: number): Locator {
    return this.getByTestId(`swap-option-${index}`);
  }
  get confirm(): Locator {
    return this.getByTestId("swap-confirm");
  }
  get cancel(): Locator {
    return this.getByTestId("swap-cancel");
  }
}

export class RecipeModalPO extends BasePage {
  get root(): Locator {
    return this.getByTestId("recipe-modal");
  }
  get recipeLink(): Locator {
    return this.getByTestId("meal-recipe-link");
  }
}
