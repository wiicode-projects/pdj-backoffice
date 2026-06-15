import { Dish } from '../../core/services/dish.service';
import { Menu } from '../../core/services/menu.service';

export interface BuildDraftMenuParams {
  name: string;
  price: number;
  availableAt: string;
  mainCourse: Dish | null;
  appetizer: Dish | null;
  dessert: Dish | null;
  restaurant?: { id: string; name: string } | null;
  isModele?: boolean;
  isFullMenuMandatory?: boolean;
}

export function calculateMenuPriceFromDishes(
  appetizer: Dish | null,
  mainCourse: Dish | null,
  dessert: Dish | null,
): number {
  let total = 0;
  if (appetizer?.price) total += appetizer.price;
  if (mainCourse?.price) total += mainCourse.price;
  if (dessert?.price) total += dessert.price;
  return Math.round(total * 100) / 100;
}

export function resolveMenuDisplayName(name: string, mainCourse: Dish | null): string {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  return mainCourse?.name ?? '';
}

export function buildCourseSummary(menu: Pick<Menu, 'appetizer' | 'mainCourse' | 'dessert'>): string {
  return [menu.appetizer?.name, menu.mainCourse?.name, menu.dessert?.name]
    .filter(Boolean)
    .join(' · ');
}

export function buildDraftMenu(params: BuildDraftMenuParams): Menu {
  const { appetizer, mainCourse, dessert } = params;
  const image =
    mainCourse?.image ??
    appetizer?.image ??
    dessert?.image ??
    null;

  return {
    id: 'preview',
    name: resolveMenuDisplayName(params.name, mainCourse),
    price: Number(params.price) || 0,
    description: null,
    image,
    type: null,
    isDeleted: false,
    isModele: params.isModele ?? false,
    isFullMenuMandatory: params.isFullMenuMandatory ?? false,
    availableAt: params.availableAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appetizer,
    mainCourse,
    dessert,
    restaurant: params.restaurant ?? null,
  };
}

export function getMenuPreviewImage(menu: Menu): string | null {
  return (
    menu.image ??
    menu.mainCourse?.image ??
    menu.appetizer?.image ??
    menu.dessert?.image ??
    null
  );
}
