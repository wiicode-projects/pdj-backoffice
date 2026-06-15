import { Menu } from '../../core/services/menu.service';

export interface MenuSubscriptionLimits {
  isDefault: boolean;
  maxMenusPerDay: number;
}

export function countMenusForDate(menus: Menu[], date: string): number {
  return menus.filter((m) => {
    if (m.isDeleted) return false;
    const menuDate = new Date(m.availableAt).toISOString().split('T')[0];
    return menuDate === date;
  }).length;
}

export function canPublishMenu(
  limits: MenuSubscriptionLimits | null,
  menus: Menu[],
  availableAt: string,
  isNewMenu: boolean,
  editingMenuId?: string,
): { allowed: boolean; reason: 'default' | 'limit' | null } {
  if (!limits) {
    return { allowed: false, reason: 'default' };
  }
  if (limits.isDefault) {
    return { allowed: false, reason: 'default' };
  }

  const date = availableAt || new Date().toISOString().split('T')[0];
  let count = countMenusForDate(menus, date);

  if (!isNewMenu && editingMenuId) {
    const editing = menus.find((m) => m.id === editingMenuId);
    if (editing) {
      const editDate = new Date(editing.availableAt).toISOString().split('T')[0];
      if (editDate === date) {
        count = Math.max(0, count - 1);
      }
    }
  }

  const max = limits.maxMenusPerDay ?? 1;
  if (count >= max) {
    return { allowed: false, reason: 'limit' };
  }

  return { allowed: true, reason: null };
}
