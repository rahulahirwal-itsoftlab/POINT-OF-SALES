import { InventoryRepository } from "./inventory.repository.js";

export class InventoryService {
  private readonly repository = new InventoryRepository();

  overview = this.repository.overview.bind(this.repository);
  listCategories = this.repository.listCategories.bind(this.repository);
  createCategory = this.repository.createCategory.bind(this.repository);
  updateCategory = this.repository.updateCategory.bind(this.repository);
  deleteCategory = this.repository.deleteCategory.bind(this.repository);
  listItems = this.repository.listItems.bind(this.repository);
  createItem = this.repository.createItem.bind(this.repository);
  updateItem = this.repository.updateItem.bind(this.repository);
  deleteItem = this.repository.deleteItem.bind(this.repository);
  adjustStock = this.repository.adjustStock.bind(this.repository);
  listMovements = this.repository.listMovements.bind(this.repository);
  listRecipes = this.repository.listRecipes.bind(this.repository);
  getRecipe = this.repository.getRecipe.bind(this.repository);
  createRecipe = this.repository.createRecipe.bind(this.repository);
  updateRecipe = this.repository.updateRecipe.bind(this.repository);
  menuCategories = this.repository.menuCategories.bind(this.repository);
  menuItems = this.repository.menuItems.bind(this.repository);
}
