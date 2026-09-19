import LearningPeriod from '#models/learning_period'
import LearningPeriodResetRequest from '#models/learning_period_reset_request'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type LearningPeriodResetState = {
  currentPeriod: {
    id: number
    sequence: number
    startedAt: string
    label: string
  }
  pendingReset: {
    id: number
    requestedAt: string
    firstApproverName: string
    firstApproverUserId: number
  } | null
  lastCompletedResetAt: string | null
  nextEligibleAt: string | null
  canClick: boolean
  currentUserCanConfirm: boolean
  currentUserAlreadyApproved: boolean
  statusMessage: string
}

export default class LearningPeriodService {
  async getCurrentPeriodForUser(user: User | null | undefined) {
    if (!user?.coId) {
      return null
    }

    return this.getOrCreateCurrentPeriodForCompany(user.coId, user.id)
  }

  async getOrCreateCurrentPeriodForCompany(coId: number, userId?: number | null) {
    let currentPeriod = await LearningPeriod.query().where('coId', coId).orderBy('sequence', 'desc').first()

    if (!currentPeriod) {
      currentPeriod = await LearningPeriod.create({
        coId,
        sequence: 1,
        startedAt: DateTime.now(),
        endedAt: null,
        createdByUserId: userId ?? null,
        activatedByUserId: userId ?? null,
      })
    }

    return currentPeriod
  }

  async getResetStateForCompany(coId: number, currentUserId: number): Promise<LearningPeriodResetState> {
    const currentPeriod = await this.getOrCreateCurrentPeriodForCompany(coId, currentUserId)
    const pendingReset = await LearningPeriodResetRequest.query()
      .where('coId', coId)
      .where('status', 'pending')
      .orderBy('requestedAt', 'desc')
      .first()

    const lastCompletedReset = await LearningPeriodResetRequest.query()
      .where('coId', coId)
      .where('status', 'completed')
      .whereNotNull('completedAt')
      .orderBy('completedAt', 'desc')
      .first()

    const nextEligibleAt = lastCompletedReset?.completedAt?.plus({ months: 1 }) ?? null
    const cooldownActive = nextEligibleAt ? DateTime.now() < nextEligibleAt : false
    const currentUserAlreadyApproved = pendingReset?.firstApproverUserId === currentUserId
    const currentUserCanConfirm = Boolean(pendingReset) && !currentUserAlreadyApproved

    let statusMessage = `Active performance-learning period: ${this.formatPeriodLabel(currentPeriod.startedAt)}.`
    if (pendingReset) {
      const firstApproverName = await this.getUserDisplayName(pendingReset.firstApproverUserId)
      statusMessage = `${firstApproverName} has requested a fresh start. Awaiting another org admin's input.`
    } else if (cooldownActive && nextEligibleAt) {
      statusMessage = `You can start a fresh assessment-development period after ${nextEligibleAt.toFormat('dd LLL yyyy')}.`
    }

    return {
      currentPeriod: {
        id: currentPeriod.id,
        sequence: currentPeriod.sequence,
        startedAt: currentPeriod.startedAt.toISO() ?? '',
        label: this.formatPeriodLabel(currentPeriod.startedAt),
      },
      pendingReset: pendingReset
        ? {
            id: pendingReset.id,
            requestedAt: pendingReset.requestedAt.toISO() ?? '',
            firstApproverName: await this.getUserDisplayName(pendingReset.firstApproverUserId),
            firstApproverUserId: pendingReset.firstApproverUserId,
          }
        : null,
      lastCompletedResetAt: lastCompletedReset?.completedAt?.toISO() ?? null,
      nextEligibleAt: nextEligibleAt?.toISO() ?? null,
      canClick: pendingReset ? currentUserCanConfirm : !cooldownActive,
      currentUserCanConfirm,
      currentUserAlreadyApproved,
      statusMessage,
    }
  }

  async startFreshPeriod(user: User) {
    if (!user.coId) {
      throw new Error('Org Admin is not assigned to a company')
    }

    const trx = await db.transaction()

    try {
      const currentPeriod = await this.getCurrentPeriodForCompanyInTransaction(user.coId, user.id, trx)
      const pendingReset = await LearningPeriodResetRequest.query()
        .useTransaction(trx)
        .where('coId', user.coId)
        .where('status', 'pending')
        .orderBy('requestedAt', 'desc')
        .first()

      if (pendingReset) {
        if (pendingReset.firstApproverUserId === user.id) {
          throw new Error('A different org admin must confirm this fresh start request')
        }

        const now = DateTime.now()
        currentPeriod.endedAt = now
        currentPeriod.useTransaction(trx)
        await currentPeriod.save()

        const newPeriod = new LearningPeriod()
        newPeriod.useTransaction(trx)
        newPeriod.coId = user.coId
        newPeriod.sequence = currentPeriod.sequence + 1
        newPeriod.startedAt = now
        newPeriod.endedAt = null
        newPeriod.createdByUserId = pendingReset.firstApproverUserId
        newPeriod.activatedByUserId = user.id
        await newPeriod.save()

        pendingReset.secondApproverUserId = user.id
        pendingReset.completedAt = now
        pendingReset.status = 'completed'
        pendingReset.createdPeriodId = newPeriod.id
        pendingReset.useTransaction(trx)
        await pendingReset.save()

        await trx.commit()

        return {
          message: 'A fresh assessment-development period has been started for your company',
          state: await this.getResetStateForCompany(user.coId, user.id),
        }
      }

      const lastCompletedReset = await LearningPeriodResetRequest.query()
        .useTransaction(trx)
        .where('coId', user.coId)
        .where('status', 'completed')
        .whereNotNull('completedAt')
        .orderBy('completedAt', 'desc')
        .first()

      if (lastCompletedReset?.completedAt && DateTime.now() < lastCompletedReset.completedAt.plus({ months: 1 })) {
        throw new Error(
          `Fresh start is available after ${lastCompletedReset.completedAt.plus({ months: 1 }).toFormat('dd LLL yyyy')}`
        )
      }

      const request = new LearningPeriodResetRequest()
      request.useTransaction(trx)
      request.coId = user.coId
      request.firstApproverUserId = user.id
      request.secondApproverUserId = null
      request.status = 'pending'
      request.requestedAt = DateTime.now()
      request.completedAt = null
      request.createdPeriodId = null
      await request.save()

      await trx.commit()

      return {
        message: 'First approval recorded. Awaiting another org admin to confirm the fresh start.',
        state: await this.getResetStateForCompany(user.coId, user.id),
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async getCurrentPeriodForCompanyInTransaction(coId: number, userId: number, trx: Awaited<ReturnType<typeof db.transaction>>) {
    let currentPeriod = await LearningPeriod.query()
      .useTransaction(trx)
      .where('coId', coId)
      .orderBy('sequence', 'desc')
      .first()

    if (!currentPeriod) {
      currentPeriod = new LearningPeriod()
      currentPeriod.useTransaction(trx)
      currentPeriod.coId = coId
      currentPeriod.sequence = 1
      currentPeriod.startedAt = DateTime.now()
      currentPeriod.endedAt = null
      currentPeriod.createdByUserId = userId
      currentPeriod.activatedByUserId = userId
      await currentPeriod.save()
    }

    return currentPeriod
  }

  private async getUserDisplayName(userId: number) {
    const user = await User.find(userId)
    if (!user) {
      return 'Another org admin'
    }

    return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`.trim()
  }

  private formatPeriodLabel(startedAt: DateTime) {
    return `Period ${startedAt.toFormat('dd LLL yyyy')} onwards`
  }
}