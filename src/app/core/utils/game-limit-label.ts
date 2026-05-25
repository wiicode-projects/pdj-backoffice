import { GameSetting } from '../services/game-setting.service';

const UNIT_BY_SLUG: Record<string, { one: string; many: string }> = {
  spin_win: { one: 'lancer', many: 'lancers' },
  mystery_box: { one: 'ouverture', many: 'ouvertures' },
  quiz_flash: { one: 'question', many: 'questions' },
};

const DEFAULT_UNIT = { one: 'partie', many: 'parties' };

/** Human-readable limit line for list cards and detail hero. */
export function formatGameLimitDescription(game: GameSetting): string {
  if (!game.limitEnabled || game.maxPlaysPerPeriod == null) {
    return game.description ?? 'Illimité';
  }

  const max = game.maxPlaysPerPeriod;
  const periodLabel = game.limitPeriod === 'week' ? 'semaine' : 'jour';
  const units = UNIT_BY_SLUG[game.slug] ?? DEFAULT_UNIT;
  const unit = max > 1 ? units.many : units.one;

  return `${max} ${unit} par ${periodLabel}`;
}

/** Compact badge: "2 / jour" */
export function formatGameLimitBadge(game: GameSetting): string {
  if (!game.limitEnabled) return 'Illimité';
  const max = game.maxPlaysPerPeriod ?? 1;
  const period = game.limitPeriod === 'week' ? 'sem.' : 'jour';
  return `${max} / ${period}`;
}
