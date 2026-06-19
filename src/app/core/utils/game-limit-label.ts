import { GameSetting } from '../services/game-setting.service';

const UNIT_BY_SLUG: Record<string, { one: string; many: string }> = {
  spin_win: { one: 'lancer', many: 'lancers' },
  mystery_box: { one: 'ouverture', many: 'ouvertures' },
  quiz_flash: { one: 'partie', many: 'parties' },
};

const DEFAULT_UNIT = { one: 'partie', many: 'parties' };

function formatStandardLimit(game: GameSetting): string | null {
  if (!game.limitEnabled || game.maxPlaysPerPeriod == null) {
    return null;
  }

  const max = game.maxPlaysPerPeriod;
  const periodLabel = game.limitPeriod === 'week' ? 'semaine' : 'jour';
  const units = UNIT_BY_SLUG[game.slug] ?? DEFAULT_UNIT;
  const unit = max > 1 ? units.many : units.one;

  return `${max} ${unit} par ${periodLabel}`;
}

function formatQuizQuestionsPerSession(count: number | null | undefined): string | null {
  if (count == null || count < 1) return null;
  const unit = count > 1 ? 'questions' : 'question';
  return `${count} ${unit} par partie`;
}

/** Human-readable limit line for list cards and detail hero. */
export function formatGameLimitDescription(game: GameSetting): string {
  if (game.description?.trim()) {
    return game.description.trim();
  }

  if (game.slug === 'quiz_flash') {
    const parts = [
      formatStandardLimit(game),
      formatQuizQuestionsPerSession(game.quizQuestionsPerSession),
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) return parts.join(' · ');
    return 'Illimité';
  }

  if (!game.limitEnabled || game.maxPlaysPerPeriod == null) {
    return 'Illimité';
  }

  const standard = formatStandardLimit(game);
  return standard ?? 'Illimité';
}

/** Compact badge: "2 / jour" */
export function formatGameLimitBadge(game: GameSetting): string {
  if (!game.limitEnabled) return 'Illimité';
  const max = game.maxPlaysPerPeriod ?? 1;
  const period = game.limitPeriod === 'week' ? 'sem.' : 'jour';
  return `${max} / ${period}`;
}
