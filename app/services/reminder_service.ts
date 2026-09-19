import { DateTime } from 'luxon'
import { PgBoss } from 'pg-boss'
import DpReminder from '#models/dp_reminder'
import DpActionPlan from '#models/dp_action_plan'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

type ReminderRef = 'start_date' | 'milestone_1' | 'milestone_2' | 'completion_date'
type ReminderOffsetDirection = 'before' | 'after'
type ReminderDeliveryChannel = 'email' | 'in_app' | 'both'
type ReminderRepeatPeriod = 'once' | 'custom'
type ReminderRepeatUnit = 'days' | 'weeks' | 'months'
type ReminderRecipientType = 'employee' | 'manager' | 'both'

type ReminderJobData = {
  reminderId: number
}

export interface ReminderScheduleInput {
  remindRef: ReminderRef
  remindDays: number
  remindBeforeAfter: ReminderOffsetDirection
  remindVia: ReminderDeliveryChannel
  repeatPeriod: ReminderRepeatPeriod
  repeatEvery: number | null
  repeatUnit: ReminderRepeatUnit | null
  recipientList: ReminderRecipientType
  isActive: boolean
}

export interface ReminderPayload {
  actionPlanId: number
  remindRef: ReminderRef
  recipientEmails: string[]
  recipientNames: string[]
  actionTitle: string
  daysUntil: number
}

export default class ReminderService {
  private static readonly queueName = 'development-plan-reminder'
  private static readonly schemaName = 'pgboss'
  private static readonly applicationName = 'adonisjs-6-explr-reminder-worker'
  private static boss: PgBoss | null = null
  private static starting: Promise<void> | null = null
  private static disabledReason: string | null = null

  private static log(level: 'info' | 'warn', message: string): void {
    const logMethod = logger?.[level]

    if (typeof logMethod === 'function') {
      logMethod.call(logger, message)
      return
    }

    if (level === 'warn') {
      console.warn(message)
      return
    }

    console.info(message)
  }

  static get isAvailable(): boolean {
    return this.disabledReason === null
  }

  static async start(): Promise<void> {
    if (this.disabledReason) {
      return
    }

    if (this.boss) {
      return
    }

    if (this.starting) {
      await this.starting
      return
    }

    this.starting = (async () => {
      const boss = new PgBoss({
        connectionString: this.getConnectionString(),
        application_name: this.applicationName,
        schema: this.schemaName,
        supervise: true,
        migrate: true,
        createSchema: true,
        schedule: false,
      })

      try {
        await boss.start()
        await this.ensureQueue(boss)
        await boss.work(this.queueName, async (jobs: Array<{ data?: ReminderJobData }>) => {
          for (const job of jobs) {
            if (!job?.data?.reminderId) {
              continue
            }

            await this.handleReminderJob(job.data)
          }
        })

        this.boss = boss
        this.log('info', '[ReminderService] pg-boss worker started')
      } catch (error) {
        this.disabledReason = this.describeStartupError(error)
        this.log('warn', `[ReminderService] pg-boss disabled: ${this.disabledReason}`)

        try {
          await boss.stop()
        } catch {
          // Ignore shutdown errors when start failed.
        }
      }
    })()

    try {
      await this.starting
    } finally {
      this.starting = null
    }
  }

  static async stop(): Promise<void> {
    if (!this.boss) {
      return
    }

    const boss = this.boss
    this.boss = null
    await boss.stop()
    this.log('info', '[ReminderService] pg-boss worker stopped')
  }

  /**
   * Calculate next scheduled time for a reminder
   * Called when saving action plan with reminder data
   */
  static calculateNextScheduledAt(
    actionPlan: DpActionPlan,
    remindRef: ReminderRef,
    remindDays: number,
    remindBeforeAfter: ReminderOffsetDirection
  ): DateTime | null {
    let referenceDate: DateTime | null = null

    switch (remindRef) {
      case 'start_date':
        referenceDate = actionPlan.startDate
        break
      case 'milestone_1':
        referenceDate = actionPlan.milestone1Date
        break
      case 'milestone_2':
        referenceDate = actionPlan.milestone2Date
        break
      case 'completion_date':
        referenceDate = actionPlan.completionDate
        break
    }

    if (!referenceDate) {
      return null
    }

    if (remindBeforeAfter === 'before') {
      return referenceDate.minus({ days: remindDays })
    } else {
      return referenceDate.plus({ days: remindDays })
    }
  }

  /**
   * Create a reminder row and enqueue it in pg-boss.
   */
  static async scheduleReminder(
    actionPlan: DpActionPlan,
    reminderData: ReminderScheduleInput
  ): Promise<void> {
    const {
      remindRef,
      remindDays,
      remindBeforeAfter,
      remindVia,
      repeatPeriod,
      repeatEvery,
      repeatUnit,
      recipientList,
      isActive,
    } = reminderData

    const nextScheduledAt = this.calculateNextScheduledAt(
      actionPlan,
      remindRef,
      Number(remindDays) || 0,
      remindBeforeAfter
    )

    if (!nextScheduledAt) {
      return
    }

    const reminder = await DpReminder.create({
      actionPlanId: actionPlan.id,
      remindRef,
      remindDays: Number(remindDays) || 0,
      remindBeforeAfter,
      remindVia,
      repeatPeriod,
      repeatEvery,
      repeatUnit,
      recipientList: { type: recipientList || 'employee' },
      nextScheduledAt,
      isActive,
    })

    if (reminder.isActive) {
      await this.enqueueReminder(reminder)
    }
  }

  /**
   * Deactivate all reminders for an action plan.
   */
  static async deactivateActionPlanReminders(actionPlanId: number): Promise<void> {
    await DpReminder.query().where('action_plan_id', actionPlanId).update({ isActive: false })
  }

  /**
   * Reschedule a reminder after action plan dates change.
   */
  static async rescheduleReminder(reminder: DpReminder, actionPlan: DpActionPlan): Promise<void> {
    const nextScheduledAt = this.calculateNextScheduledAt(
      actionPlan,
      reminder.remindRef,
      reminder.remindDays,
      reminder.remindBeforeAfter
    )

    if (!nextScheduledAt) {
      reminder.isActive = false
      reminder.nextScheduledAt = null
      await reminder.save()
      return
    }

    reminder.nextScheduledAt = nextScheduledAt
    reminder.lastSentAt = null
    reminder.repeatCount = 0
    reminder.isActive = true
    await reminder.save()
    await this.enqueueReminder(reminder)
  }

  private static async handleReminderJob(data: ReminderJobData): Promise<void> {
    const reminder = await DpReminder.query()
      .where('id', data.reminderId)
      .preload('actionPlan', (actionPlanQuery) => {
        actionPlanQuery.preload('plan', (planQuery) => {
          planQuery.preload('user' as any)
        })
      })
      .first()

    if (!reminder || !reminder.isActive || !reminder.nextScheduledAt) {
      return
    }

    const now = DateTime.now()

    if (reminder.nextScheduledAt > now.plus({ minutes: 1 })) {
      await this.enqueueReminder(reminder)
      return
    }

    await this.sendReminder(reminder)
    await this.updateReminderAfterSend(reminder)

    if (reminder.isActive && reminder.nextScheduledAt) {
      await this.enqueueReminder(reminder)
    }
  }

  private static async enqueueReminder(reminder: DpReminder): Promise<void> {
    if (!reminder.isActive || !reminder.nextScheduledAt) {
      return
    }

    await this.start()

    if (!this.boss) {
      if (this.disabledReason) {
        this.log(
          'warn',
          `[ReminderService] reminder ${reminder.id} was saved but not queued because pg-boss is disabled: ${this.disabledReason}`
        )
        return
      }

      this.log(
        'warn',
        `[ReminderService] reminder ${reminder.id} was saved but pg-boss is not available`
      )
      return
    }

    const startAfter =
      reminder.nextScheduledAt > DateTime.now() ? reminder.nextScheduledAt.toJSDate() : new Date()

    await this.boss.send(
      this.queueName,
      { reminderId: reminder.id },
      {
        singletonKey: this.getReminderJobKey(reminder),
        startAfter,
      }
    )
  }

  /**
   * Send a single reminder notification.
   */
  private static async sendReminder(reminder: DpReminder): Promise<void> {
    const actionPlan = reminder.actionPlan
    const plan = actionPlan.plan
    const user = plan.user

    const recipients: { email: string; name: string }[] = []
    const recipientType = (reminder.recipientList as any)?.type || 'employee'

    if (recipientType === 'employee' || recipientType === 'both') {
      recipients.push({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      })
    }

    if (recipientType === 'manager' || recipientType === 'both') {
      const manager = user.mgrId
        ? ((await User.query().where('empId', user.mgrId).first()) ?? (await User.find(user.mgrId)))
        : null

      if (manager) {
        recipients.push({
          email: manager.email,
          name: `${manager.firstName} ${manager.lastName}`,
        })
      }
    }

    if (recipients.length === 0) {
      this.log('warn', `[ReminderService] reminder ${reminder.id} has no recipients`)
      return
    }

    const payload: ReminderPayload = {
      actionPlanId: actionPlan.id,
      remindRef: reminder.remindRef,
      recipientEmails: recipients.map((r) => r.email),
      recipientNames: recipients.map((r) => r.name),
      actionTitle: actionPlan.taskDescription || `Action Plan #${actionPlan.sequence}`,
      daysUntil: reminder.remindDays,
    }
    const escapedActionTitle = this.escapeHtml(payload.actionTitle)
    const escapedReferenceLabel = this.escapeHtml(
      this.getReminderReferenceLabel(reminder.remindRef)
    )

    if (reminder.remindVia === 'email' || reminder.remindVia === 'both') {
      await mail.send((message) => {
        recipients.forEach((recipient) => {
          message.to(recipient.email)
        })

        message.subject(`Development Plan Reminder: ${payload.actionTitle}`).html(
          `
            <h1>Development Plan Reminder</h1>
            <p>This is a reminder for development action plan <strong>${escapedActionTitle}</strong>.</p>
            <p>Reference point: <strong>${escapedReferenceLabel}</strong></p>
            <p>Scheduled offset: <strong>${reminder.remindDays}</strong> day(s) ${reminder.remindBeforeAfter} the reference date.</p>
          `.trim()
        )
      })
    }

    if (reminder.remindVia === 'in_app' || reminder.remindVia === 'both') {
      this.log(
        'info',
        `[IN-APP NOTIFICATION] ${payload.actionTitle} - Recipients: ${payload.recipientNames.join(', ')}`
      )
    }

    this.log(
      'info',
      `Sending reminder to {${recipients.map((r) => r.email).join(', ')}} for action plan ${actionPlan.id}`
    )
  }

  /**
   * Update reminder state after sending
   */
  private static async updateReminderAfterSend(reminder: DpReminder): Promise<void> {
    reminder.lastSentAt = DateTime.now()

    if (reminder.repeatPeriod === 'once') {
      reminder.isActive = false
      reminder.nextScheduledAt = null
    } else {
      reminder.repeatCount = (reminder.repeatCount || 0) + 1
      reminder.nextScheduledAt = this.calculateNextRepeatAt(reminder)
    }

    await reminder.save()
  }

  private static getReminderReferenceLabel(remindRef: ReminderPayload['remindRef']): string {
    switch (remindRef) {
      case 'start_date':
        return 'Start Date'
      case 'milestone_1':
        return 'Milestone 1'
      case 'milestone_2':
        return 'Milestone 2'
      case 'completion_date':
        return 'Completion Date'
    }
  }

  private static getConnectionString(): string {
    const user = encodeURIComponent(env.get('DB_USER'))
    const password = env.get('DB_PASSWORD') ? `:${encodeURIComponent(env.get('DB_PASSWORD')!)}` : ''
    const host = env.get('DB_HOST')
    const port = env.get('DB_PORT')
    const database = env.get('DB_DATABASE')

    return `postgres://${user}${password}@${host}:${port}/${database}`
  }

  private static async ensureQueue(boss: PgBoss): Promise<void> {
    const existingQueue = await boss.getQueue(this.queueName)

    if (existingQueue) {
      return
    }

    await boss.createQueue(this.queueName)
  }

  private static getReminderJobKey(reminder: DpReminder): string {
    return `reminder-${reminder.id}-${reminder.nextScheduledAt!.toMillis()}`
  }

  private static calculateNextRepeatAt(reminder: DpReminder): DateTime | null {
    const base = reminder.nextScheduledAt ?? DateTime.now()
    const repeatEvery = reminder.repeatEvery && reminder.repeatEvery > 0 ? reminder.repeatEvery : 1
    const repeatUnit = reminder.repeatUnit ?? 'weeks'

    switch (repeatUnit) {
      case 'days':
        return base.plus({ days: repeatEvery })
      case 'weeks':
        return base.plus({ weeks: repeatEvery })
      case 'months':
        return base.plus({ months: repeatEvery })
      default:
        return null
    }
  }

  private static escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  private static describeStartupError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message
    }

    return 'unknown pg-boss startup error'
  }
}
