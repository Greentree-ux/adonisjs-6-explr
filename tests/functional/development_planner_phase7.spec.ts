import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import EmpData from '#models/emp_data'
import DevelopmentPlan from '#models/development_plan'
import DpActionPlan from '#models/dp_action_plan'
import DpOtherSkill from '#models/dp_other_skill'
import DpReminder from '#models/dp_reminder'
import ReminderService from '#services/reminder_service'

const baseUrl = `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3333'}`

type SessionClient = {
  request: (path: string, init?: RequestInit) => Promise<Response>
}

test.group('Development planner phase 7', (group) => {
  group.each.setup(async () => {
    return testUtils.db().withGlobalTransaction()
  })

  test('multiple employees and managers keep plans isolated and access remains scoped to direct reports', async ({
    assert,
  }) => {
    const alpha = await createScenario()
    const beta = await createScenario()

    await createSubmittedPlan(alpha, {
      taskDescription: 'Alpha action plan',
      successCriteria: 'Alpha success criteria',
      progressNotes: 'Alpha notes',
      addressedSkillsIds: [String(alpha.ksOneId), String(alpha.ksTwoId)],
    })
    await createSubmittedPlan(beta, {
      taskDescription: 'Beta action plan',
      successCriteria: 'Beta success criteria',
      progressNotes: 'Beta notes',
      addressedSkillsIds: [String(beta.ksOneId), String(beta.ksTwoId)],
    })

    await finalizeAsManager(alpha)
    await finalizeAsManager(beta)

    const alphaManagerStage = await alpha.managerClient.request(
      `/api/development-plan/stage/5?userId=${alpha.employee.id}`
    )
    assert.equal(alphaManagerStage.status, 200)

    const alphaManagerTeam = await assertStatus(
      alpha.managerClient.request('/api/development-plan/team-members'),
      200
    )
    const alphaTeamPayload = (await alphaManagerTeam.json()) as {
      data: Array<{ id: number; firstName: string }>
    }
    assert.isTrue(alphaTeamPayload.data.some((member) => member.id === alpha.employee.id))
    assert.isFalse(alphaTeamPayload.data.some((member) => member.id === beta.employee.id))

    const betaManagerTeam = await assertStatus(
      beta.managerClient.request('/api/development-plan/team-members'),
      200
    )
    const betaTeamPayload = (await betaManagerTeam.json()) as {
      data: Array<{ id: number; firstName: string }>
    }
    assert.isTrue(betaTeamPayload.data.some((member) => member.id === beta.employee.id))
    assert.isFalse(betaTeamPayload.data.some((member) => member.id === alpha.employee.id))

    assert.equal(
      (await alpha.userClient.request(`/api/development-plan/stage/1?userId=${beta.employee.id}`))
        .status,
      403
    )
    assert.equal(
      (
        await alpha.managerClient.request(
          `/api/development-plan/stage/1?userId=${beta.employee.id}`
        )
      ).status,
      403
    )
    assert.equal(
      (
        await beta.managerClient.request(
          `/api/development-plan/stage/1?userId=${alpha.employee.id}`
        )
      ).status,
      403
    )
    assert.equal(
      (await beta.userClient.request(`/api/development-plan/export?userId=${alpha.employee.id}`))
        .status,
      403
    )
    assert.equal(
      (await beta.managerClient.request(`/api/development-plan/export?userId=${alpha.employee.id}`))
        .status,
      403
    )
    assert.equal(
      (
        await beta.managerClient.request(
          '/api/development-plan/finalize',
          postJson({ userId: alpha.employee.id, isManager: true })
        )
      ).status,
      403
    )

    const alphaExport = await assertStatus(
      alpha.managerClient.request(`/api/development-plan/export?userId=${alpha.employee.id}`),
      200
    )
    const alphaCsv = await alphaExport.text()
    assert.include(alphaCsv, 'Alpha action plan')
    assert.notInclude(alphaCsv, 'Beta action plan')

    const betaExport = await assertStatus(
      beta.managerClient.request(`/api/development-plan/export?userId=${beta.employee.id}`),
      200
    )
    const betaCsv = await betaExport.text()
    assert.include(betaCsv, 'Beta action plan')
    assert.notInclude(betaCsv, 'Alpha action plan')
  })

  test('reminder sequences and csv export use readable values and formatted dates', async ({
    assert,
  }) => {
    const scenario = await createScenario()
    const { userClient, managerClient, employee } = scenario

    const manualSkillName = `Manual Skill ${scenario.seed}`
    const manualSkillDefinition = `Manual definition ${scenario.seed}`

    await completeStages1To4(scenario, [
      {
        knowledgeSkillType: 'Knowledge',
        ksCategory: scenario.ksCategory,
        ksName: manualSkillName,
        ksDefinition: manualSkillDefinition,
      },
    ])

    const plan = await latestPlanFor(employee.id)
    const otherSkill = await DpOtherSkill.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .firstOrFail()

    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/5',
        postJson({
          actionPlans: [
            {
              actionCategory: 'Coaching / Mentoring',
              taskDescription: 'Readable export plan',
              successCriteria: 'Readable success',
              startDate: '2026-05-10',
              completionDate: '2026-06-10',
              milestone1Date: '2026-05-20',
              milestone1Text: 'First milestone',
              milestone2Date: '2026-05-30',
              milestone2Text: 'Second milestone',
              progressNotes: 'Reminder sequencing in progress',
              addressedSkillsIds: [String(scenario.ksOneId), `other:${otherSkill.id}`],
              reminders: [
                {
                  remindRef: 'start_date',
                  remindDays: 3,
                  remindBeforeAfter: 'before',
                  remindVia: 'email',
                  repeatPeriod: 'once',
                  repeatEvery: null,
                  repeatUnit: null,
                  recipientList: 'employee',
                  isActive: true,
                },
                {
                  remindRef: 'milestone_1',
                  remindDays: 2,
                  remindBeforeAfter: 'after',
                  remindVia: 'both',
                  repeatPeriod: 'custom',
                  repeatEvery: 2,
                  repeatUnit: 'weeks',
                  recipientList: 'both',
                  isActive: true,
                },
                {
                  remindRef: 'completion_date',
                  remindDays: 0,
                  remindBeforeAfter: 'after',
                  remindVia: 'in_app',
                  repeatPeriod: 'once',
                  repeatEvery: null,
                  repeatUnit: null,
                  recipientList: 'manager',
                  isActive: true,
                },
              ],
            },
          ],
        })
      ),
      200
    )

    const savedActionPlan = await DpActionPlan.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .preload('reminders', (query) => query.orderBy('id', 'asc'))
      .firstOrFail()
    assert.lengthOf(savedActionPlan.reminders, 3)

    const startReminder = savedActionPlan.reminders.find(
      (reminder) => reminder.remindRef === 'start_date'
    )
    const repeatReminder = savedActionPlan.reminders.find(
      (reminder) => reminder.remindRef === 'milestone_1'
    )
    const completionReminder = savedActionPlan.reminders.find(
      (reminder) => reminder.remindRef === 'completion_date'
    )

    assert.exists(startReminder)
    assert.exists(repeatReminder)
    assert.exists(completionReminder)

    assert.equal(startReminder!.nextScheduledAt?.toISODate(), '2026-05-07')
    assert.equal(repeatReminder!.nextScheduledAt?.toISODate(), '2026-05-22')
    assert.equal(completionReminder!.nextScheduledAt?.toISODate(), '2026-06-10')
    assert.equal(repeatReminder!.repeatPeriod, 'custom')
    assert.equal(repeatReminder!.repeatEvery, 2)
    assert.equal(repeatReminder!.repeatUnit, 'weeks')

    await ReminderService['updateReminderAfterSend'](repeatReminder as DpReminder)
    await repeatReminder!.refresh()
    assert.equal(repeatReminder!.repeatCount, 1)
    assert.equal(repeatReminder!.nextScheduledAt?.toISODate(), '2026-06-05')
    assert.equal(repeatReminder!.isActive, true)

    await ReminderService['updateReminderAfterSend'](startReminder as DpReminder)
    await startReminder!.refresh()
    assert.equal(startReminder!.isActive, false)
    assert.isNull(startReminder!.nextScheduledAt)

    await finalizeAsEmployee(scenario)
    await finalizeAsManager(scenario)

    const exportResponse = await assertStatus(
      userClient.request('/api/development-plan/export'),
      200
    )
    const exportCsv = await exportResponse.text()
    const [headerLine, dataLine] = exportCsv.split('\n')

    assert.equal(
      headerLine,
      '"No.","Action Category","Task Description","Success Criteria","Addressed Skills","Start Date","Completion Date","Milestone 1","Milestone 1 Date","Milestone 2","Milestone 2 Date","Progress Notes"'
    )
    assert.include(dataLine, '"Readable export plan"')
    assert.include(dataLine, '"Readable success"')
    assert.include(dataLine, '"2026-05-10"')
    assert.include(dataLine, '"2026-06-10"')
    assert.include(exportCsv, `${scenario.ksOneName}: ${scenario.ksOneDefinition}`)
    assert.include(exportCsv, `${manualSkillName}: ${manualSkillDefinition}`)
    assert.notInclude(exportCsv, `"${scenario.ksOneId}"`)

    const managerExport = await assertStatus(
      managerClient.request(`/api/development-plan/export?userId=${employee.id}`),
      200
    )
    assert.include(await managerExport.text(), 'Readable export plan')
  })
})

function postJson(payload: unknown): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  }
}

async function login(email: string, password: string): Promise<SessionClient> {
  const cookieJar = new Map<string, string>()

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password, rememberMe: false }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Unable to log in test user ${email}: ${loginResponse.status}`)
  }

  captureCookies(loginResponse, cookieJar)

  return {
    request: async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers ?? {})
      const cookieHeader = Array.from(cookieJar.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')

      if (cookieHeader) {
        headers.set('cookie', cookieHeader)
      }

      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      })

      captureCookies(response, cookieJar)
      return response
    },
  }
}

function captureCookies(response: Response, cookieJar: Map<string, string>) {
  for (const entry of response.headers.getSetCookie()) {
    const [cookiePart] = entry.split(';')
    const separatorIndex = cookiePart.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = cookiePart.slice(0, separatorIndex)
    const value = cookiePart.slice(separatorIndex + 1)
    cookieJar.set(key, value)
  }
}

async function assertStatus(responsePromise: Promise<Response>, expectedStatus: number) {
  const response = await responsePromise

  if (response.status !== expectedStatus) {
    const body = await response.text()
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}: ${body}`)
  }

  return response
}

async function latestPlanFor(userId: number) {
  return DevelopmentPlan.query().where('user_id', userId).orderBy('id', 'desc').firstOrFail()
}

async function completeStages1To4(
  scenario: Awaited<ReturnType<typeof createScenario>>,
  otherSkills: Array<{
    knowledgeSkillType: string
    ksCategory: string
    ksName: string
    ksDefinition: string
  }> = []
) {
  const { userClient, fnId, ksOneId, ksTwoId } = scenario

  await assertStatus(
    userClient.request('/api/development-plan/stage/1', postJson({ selectedSkillIds: [ksOneId] })),
    200
  )
  await assertStatus(
    userClient.request(
      '/api/development-plan/stage/2',
      postJson({ selectedRoleIds: [`${fnId}_1`] })
    ),
    200
  )
  await assertStatus(
    userClient.request(
      '/api/development-plan/stage/3',
      postJson({ selectedSkills: [{ ksId: ksTwoId, roleKey: `${fnId}_1` }] })
    ),
    200
  )
  await assertStatus(
    userClient.request('/api/development-plan/stage/4', postJson({ otherSkills })),
    200
  )
}

async function saveSingleActionPlan(
  scenario: Awaited<ReturnType<typeof createScenario>>,
  overrides: Partial<{
    actionCategory: string
    taskDescription: string
    successCriteria: string
    startDate: string
    completionDate: string
    milestone1Date: string
    milestone1Text: string
    milestone2Date: string
    milestone2Text: string
    progressNotes: string
    addressedSkillsIds: string[]
    reminders: unknown[]
  }> = {}
) {
  const { userClient, ksOneId, ksTwoId } = scenario

  await assertStatus(
    userClient.request(
      '/api/development-plan/stage/5',
      postJson({
        actionPlans: [
          {
            actionCategory: overrides.actionCategory ?? 'Coaching / Mentoring',
            taskDescription: overrides.taskDescription ?? 'Default task description',
            successCriteria: overrides.successCriteria ?? 'Default success criteria',
            startDate: overrides.startDate ?? '2026-05-10',
            completionDate: overrides.completionDate ?? '2026-06-10',
            milestone1Date: overrides.milestone1Date ?? '2026-05-20',
            milestone1Text: overrides.milestone1Text ?? 'Checkpoint 1',
            milestone2Date: overrides.milestone2Date ?? '2026-05-30',
            milestone2Text: overrides.milestone2Text ?? 'Checkpoint 2',
            progressNotes: overrides.progressNotes ?? 'Default progress notes',
            addressedSkillsIds: overrides.addressedSkillsIds ?? [String(ksOneId), String(ksTwoId)],
            reminders: overrides.reminders ?? [],
          },
        ],
      })
    ),
    200
  )
}

async function finalizeAsEmployee(scenario: Awaited<ReturnType<typeof createScenario>>) {
  await assertStatus(
    scenario.userClient.request('/api/development-plan/finalize', postJson({})),
    200
  )
}

async function finalizeAsManager(scenario: Awaited<ReturnType<typeof createScenario>>) {
  await assertStatus(
    scenario.managerClient.request(
      '/api/development-plan/finalize',
      postJson({ userId: scenario.employee.id, isManager: true })
    ),
    200
  )
}

async function createSubmittedPlan(
  scenario: Awaited<ReturnType<typeof createScenario>>,
  overrides: Partial<{
    taskDescription: string
    successCriteria: string
    progressNotes: string
    addressedSkillsIds: string[]
  }> = {}
) {
  await completeStages1To4(scenario)
  await saveSingleActionPlan(scenario, overrides)
  await finalizeAsEmployee(scenario)
}

async function nextId(table: string): Promise<number> {
  const row = await db.from(table).max('id as max').first()
  const currentMax = Number(row?.max ?? 0)
  return currentMax + 1
}

async function createScenario() {
  const seed = Date.now() + Math.floor(Math.random() * 1000)
  const timestamps = {
    created_at: new Date(),
    updated_at: new Date(),
  }
  const appRoleId = await nextId('app_roles')
  const companyId = await nextId('cos')
  const businessId = await nextId('businesses')
  const locationId = await nextId('locs')
  const wlevelId = await nextId('wlevels')
  const fnId = await nextId('fns')
  const managerFnRoleId = await nextId('fn_roles')
  const lateralFnRoleId = managerFnRoleId + 1
  const ksCatId = await nextId('ks_cats')
  const ksFrameworkId = await nextId('ks_frameworks')
  const ksOneId = await nextId('ks_definitions')
  const ksTwoId = ksOneId + 1
  const ksThreeId = ksOneId + 2
  const managerEmpDataId = await nextId('emp_data')
  const employeeEmpDataId = managerEmpDataId + 1
  const managerUserId = await nextId('users')
  const employeeUserId = managerUserId + 1

  await db.table('app_roles').insert({ id: appRoleId, r_name: `test_user_${seed}`, ...timestamps })
  await db.table('cos').insert({ id: companyId, co_name: `Test Co ${seed}`, ...timestamps })
  await db.table('businesses').insert({
    id: businessId,
    co_id: companyId,
    business_name: `Test Business ${seed}`,
    businessname_full: null,
    ...timestamps,
  })
  await db
    .table('locs')
    .insert({ id: locationId, business_id: businessId, loc_name: `HQ ${seed}`, ...timestamps })
  await db.table('wlevels').insert({
    id: wlevelId,
    ord: 900000 + (seed % 100000),
    wlevel_no: 'A',
    hml: 'H',
    descr: `Level ${seed}`,
    ...timestamps,
  })
  await db.table('fns').insert({
    id: fnId,
    loc_id: locationId,
    fn_name: `FN${seed}`.slice(0, 30),
    fnname_full: `Function ${seed}`,
    ...timestamps,
  })
  await db.table('fn_roles').insert([
    {
      id: managerFnRoleId,
      fnid: fnId,
      wlevelid: wlevelId,
      roleno: 1,
      role_name: `Manager Role ${seed}`,
      ...timestamps,
    },
    {
      id: lateralFnRoleId,
      fnid: fnId,
      wlevelid: wlevelId,
      roleno: 2,
      role_name: `Lateral Role ${seed}`,
      ...timestamps,
    },
  ])
  await db.table('ks_cats').insert({
    id: ksCatId,
    ks: 'KS',
    k_ss_gs: 'Knowledge',
    catseq: 1,
    kscategory: `Category ${seed}`,
    ...timestamps,
  })
  await db.table('ks_frameworks').insert([
    {
      id: ksFrameworkId,
      fnid: fnId,
      catid: ksCatId,
      catord: 1,
      ksname: `Skill Name A ${seed}`,
      ...timestamps,
    },
    {
      id: ksFrameworkId + 1,
      fnid: fnId,
      catid: ksCatId,
      catord: 2,
      ksname: `Skill Name B ${seed}`,
      ...timestamps,
    },
    {
      id: ksFrameworkId + 2,
      fnid: fnId,
      catid: ksCatId,
      catord: 3,
      ksname: `Skill Name C ${seed}`,
      ...timestamps,
    },
  ])
  await db.table('ks_definitions').insert([
    {
      id: ksOneId,
      fnid: fnId,
      catid: ksCatId,
      catord: 1,
      roleno: 1,
      ksdefinition: `Skill A ${seed}`,
      ...timestamps,
    },
    {
      id: ksTwoId,
      fnid: fnId,
      catid: ksCatId,
      catord: 2,
      roleno: 1,
      ksdefinition: `Skill B ${seed}`,
      ...timestamps,
    },
    {
      id: ksThreeId,
      fnid: fnId,
      catid: ksCatId,
      catord: 3,
      roleno: 1,
      ksdefinition: `Skill C ${seed}`,
      ...timestamps,
    },
  ])

  const managerEmail = `manager.${seed}@example.com`
  const employeeEmail = `employee.${seed}@example.com`
  const managerEmpId = 700000 + (seed % 100000)
  const employeeEmpId = managerEmpId + 1
  const password = 'Passw0rd!'

  await EmpData.create({
    id: managerEmpDataId,
    email: managerEmail,
    firstName: 'Manager',
    lastName: 'User',
    empId: managerEmpId,
    mgrId: 0,
    fnroleId: managerFnRoleId,
  })
  await EmpData.create({
    id: employeeEmpDataId,
    email: employeeEmail,
    firstName: 'Employee',
    lastName: 'User',
    empId: employeeEmpId,
    mgrId: managerEmpId,
    fnroleId: null,
  })

  const manager = await User.create({
    id: managerUserId,
    approleId: appRoleId,
    fnroleId: managerFnRoleId,
    firstName: 'Manager',
    lastName: 'User',
    email: managerEmail,
    password,
    empId: managerEmpId,
    mgrId: 0,
    mustChangePassword: false,
  })
  const employee = await User.create({
    id: employeeUserId,
    approleId: appRoleId,
    fnroleId: null,
    firstName: 'Employee',
    lastName: 'User',
    email: employeeEmail,
    password,
    empId: employeeEmpId,
    mgrId: managerEmpId,
    mustChangePassword: false,
  })

  const userClient = await login(employeeEmail, password)
  const managerClient = await login(managerEmail, password)

  return {
    seed,
    manager,
    employee,
    userClient,
    managerClient,
    fnId,
    ksCategory: `Category ${seed}`,
    ksOneId,
    ksOneName: `Skill Name A ${seed}`,
    ksOneDefinition: `Skill A ${seed}`,
    ksTwoId,
    ksTwoName: `Skill Name B ${seed}`,
    ksTwoDefinition: `Skill B ${seed}`,
    ksThreeId,
    ksThreeName: `Skill Name C ${seed}`,
    ksThreeDefinition: `Skill C ${seed}`,
    lateralRoleKey: `${fnId}_2`,
  }
}