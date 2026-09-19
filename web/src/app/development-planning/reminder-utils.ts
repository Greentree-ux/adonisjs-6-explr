import { ReminderDraft, Stage5ActionPlan } from './development-planning.service';

export function applyRepeatPeriodDefaults(reminder: ReminderDraft): void {
  if (reminder.repeatPeriod === 'once') {
    reminder.repeatEvery = null;
    reminder.repeatUnit = null;
    return;
  }

  reminder.repeatEvery = reminder.repeatEvery && reminder.repeatEvery > 0 ? reminder.repeatEvery : 1;
  reminder.repeatUnit = reminder.repeatUnit ?? 'weeks';
}

export function getReminderPreviewLabel(
  plan: Stage5ActionPlan,
  reminder: ReminderDraft,
): string {
  const scheduledDate = reminder.nextScheduledAt
    ? parseReminderDate(reminder.nextScheduledAt)
    : getReminderPreviewDate(plan, reminder);

  if (!scheduledDate) {
    return 'Set the corresponding plan date to preview the next run';
  }

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(scheduledDate);

  const cadence =
    reminder.repeatPeriod === 'custom' && reminder.repeatEvery && reminder.repeatUnit
      ? `, then every ${reminder.repeatEvery} ${getRepeatUnitLabel(reminder.repeatEvery, reminder.repeatUnit)}`
      : '';
  const paused = reminder.isActive ? '' : ' (paused)';

  return `${formattedDate}${cadence}${paused}`;
}

export function validateReminderConfiguration(
  plan: Stage5ActionPlan,
  displayIndex: number,
): string | null {
  if ((plan.reminders?.length ?? 0) > 8) {
    return `Action Plan ${displayIndex}: no more than 8 reminders are allowed.`;
  }

  for (const [reminderIndex, reminder] of (plan.reminders ?? []).entries()) {
    if (!Number.isInteger(Number(reminder.remindDays)) || Number(reminder.remindDays) < 0) {
      return `Action Plan ${displayIndex}, Reminder ${reminderIndex + 1}: Remind Days must be 0 or greater.`;
    }

    if (reminder.repeatPeriod === 'custom') {
      if (!Number.isInteger(Number(reminder.repeatEvery)) || Number(reminder.repeatEvery) < 1) {
        return `Action Plan ${displayIndex}, Reminder ${reminderIndex + 1}: custom repeat interval must be at least 1.`;
      }

      if (!reminder.repeatUnit) {
        return `Action Plan ${displayIndex}, Reminder ${reminderIndex + 1}: select a repeat unit.`;
      }
    }
  }

  return null;
}

function getReminderPreviewDate(plan: Stage5ActionPlan, reminder: ReminderDraft): Date | null {
  const baseDate = getActionPlanReferenceDate(plan, reminder.remindRef);

  if (!baseDate) {
    return null;
  }

  const preview = new Date(baseDate);
  preview.setDate(
    preview.getDate() + (reminder.remindBeforeAfter === 'before' ? -reminder.remindDays : reminder.remindDays),
  );
  return preview;
}

function getActionPlanReferenceDate(
  plan: Stage5ActionPlan,
  remindRef: ReminderDraft['remindRef'],
): Date | null {
  const value =
    remindRef === 'start_date'
      ? plan.startDate
      : remindRef === 'milestone_1'
        ? plan.milestone1Date
        : remindRef === 'milestone_2'
          ? plan.milestone2Date
          : plan.completionDate;

  return parseReminderDate(value ?? null);
}

function parseReminderDate(value: string | null | undefined): Date | null {
  const normalized = normalizeDate(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  return text.includes('T') ? text.split('T')[0] : text;
}

function getRepeatUnitLabel(count: number, unit: NonNullable<ReminderDraft['repeatUnit']>): string {
  return count === 1 ? unit.slice(0, -1) : unit;
}