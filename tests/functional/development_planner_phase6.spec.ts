import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import EmpData from '#models/emp_data'
import DevelopmentPlan from '#models/development_plan'

const baseUrl = `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? '3333'}`

type SessionClient = {
  request: (path: string, init?: RequestInit) => Promise<Response>
}

test.group('Development planner phase 6', (group) => {
  group.each.setup(async () => {
    return testUtils.db().withGlobalTransaction()
  })

  test('manager can overwrite entries, approve on stage 5, and employee re-edit triggers re-review', async ({
    assert,
  }) => {
    const scenario = await createScenario()
    const { userClient, managerClient, employee, fnId, ksOneId, ksTwoId, ksThreeId } = scenario

    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/1',
        postJson({ selectedSkillIds: [ksOneId] })
      ),
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
      userClient.request('/api/development-plan/stage/4', postJson({ otherSkills: [] })),
      200
    )
    const stage5Response = await assertStatus(
      userClient.request('/api/development-plan/stage/5'),
      200
    )
    const stage5Payload = (await stage5Response.json()) as {
      data: {
        availableFocusSkills: Array<{
          id: string
          ksName: string | null
          displayLabel: string | null
        }>
      }
    }
    const stage5TargetSkill = stage5Payload.data.availableFocusSkills.find(
      (skill: { id: string }) => skill.id === String(ksTwoId)
    )
    if (!stage5TargetSkill) {
      throw new Error(`Expected Stage 5 skill ${ksTwoId} to be present in availableFocusSkills`)
    }
    assert.equal(stage5TargetSkill.ksName, scenario.ksTwoName)
    assert.equal(
      stage5TargetSkill.displayLabel,
      `${scenario.ksTwoName}: ${scenario.ksTwoDefinition}`
    )

    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/5',
        postJson({
          actionPlans: [
            {
              actionCategory: 'Coaching / Mentoring',
              taskDescription: 'Employee draft plan',
              successCriteria: 'Draft complete',
              startDate: '2026-05-10',
              completionDate: '2026-06-10',
              milestone1Date: '2026-05-20',
              milestone1Text: 'Checkpoint 1',
              milestone2Date: '2026-05-30',
              milestone2Text: 'Checkpoint 2',
              progressNotes: 'Initial draft',
              addressedSkillsIds: [String(ksOneId), String(ksTwoId)],
              reminders: [],
            },
          ],
        })
      ),
      200
    )

    await assertStatus(userClient.request('/api/development-plan/finalize', postJson({})), 200)

    const afterUserSubmit = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(afterUserSubmit.userStatus, 'completed')
    assert.equal(afterUserSubmit.managerStatus, 'stage_5')

    await assertStatus(
      managerClient.request(
        '/api/development-plan/stage/1',
        postJson({ userId: employee.id, selectedSkillIds: [ksThreeId] })
      ),
      200
    )
    await assertStatus(
      managerClient.request(
        '/api/development-plan/stage/5',
        postJson({
          userId: employee.id,
          actionPlans: [
            {
              actionCategory: 'Coaching / Mentoring',
              taskDescription: 'Manager revised plan',
              successCriteria: 'Manager-approved scope',
              startDate: '2026-05-11',
              completionDate: '2026-06-11',
              milestone1Date: '2026-05-21',
              milestone1Text: 'Manager Checkpoint 1',
              milestone2Date: '2026-05-31',
              milestone2Text: 'Manager Checkpoint 2',
              progressNotes: 'Manager revised',
              addressedSkillsIds: [String(ksThreeId)],
              reminders: [],
            },
          ],
        })
      ),
      200
    )

    const afterManagerEdit = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(afterManagerEdit.userStatus, 'completed')
    assert.equal(afterManagerEdit.managerStatus, 'stage_5')

    await assertStatus(
      managerClient.request(
        '/api/development-plan/finalize',
        postJson({ userId: employee.id, isManager: true })
      ),
      200
    )

    const afterApproval = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(afterApproval.managerStatus, 'approved')

    const managerExportResponse = await managerClient.request(
      `/api/development-plan/export?userId=${employee.id}`
    )
    assert.equal(managerExportResponse.status, 200)
    const managerExportCsv = await managerExportResponse.text()
    assert.include(managerExportCsv, 'Manager revised plan')

    const userExportResponse = await userClient.request('/api/development-plan/export')
    assert.equal(userExportResponse.status, 200)
    const userExportCsv = await userExportResponse.text()
    assert.include(userExportCsv, 'Manager revised plan')

    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/5',
        postJson({
          actionPlans: [
            {
              actionCategory: 'Coaching / Mentoring',
              taskDescription: 'Employee revised after approval',
              successCriteria: 'Awaiting re-review',
              startDate: '2026-05-12',
              completionDate: '2026-06-12',
              milestone1Date: '2026-05-22',
              milestone1Text: 'Checkpoint 1',
              milestone2Date: '2026-06-01',
              milestone2Text: 'Checkpoint 2',
              progressNotes: 'Employee updated again',
              addressedSkillsIds: [String(ksThreeId)],
              reminders: [],
            },
          ],
        })
      ),
      200
    )

    const afterUserReEdit = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(afterUserReEdit.userStatus, 'completed')
    assert.equal(afterUserReEdit.managerStatus, 'stage_5')

    const blockedUserExport = await userClient.request('/api/development-plan/export')
    assert.equal(blockedUserExport.status, 403)

    const blockedManagerExport = await managerClient.request(
      `/api/development-plan/export?userId=${employee.id}`
    )
    assert.equal(blockedManagerExport.status, 403)

    const overwrittenStageOneRows = await db
      .from('dp_focus_skills_proficiency')
      .where('plan_id', afterUserReEdit.id)
      .orderBy('sequence', 'asc')
    assert.lengthOf(overwrittenStageOneRows, 1)
    assert.equal(overwrittenStageOneRows[0].ks_id, ksThreeId)
  })

  test('manager can overwrite stage 2 before approval and approval/export still follow the same workflow', async ({
    assert,
  }) => {
    const scenario = await createScenario()
    const { userClient, managerClient, employee, fnId, ksOneId, ksTwoId, lateralRoleKey } = scenario

    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/1',
        postJson({ selectedSkillIds: [ksOneId] })
      ),
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
      userClient.request('/api/development-plan/stage/4', postJson({ otherSkills: [] })),
      200
    )
    await assertStatus(
      userClient.request(
        '/api/development-plan/stage/5',
        postJson({
          actionPlans: [
            {
              actionCategory: 'Coaching / Mentoring',
              taskDescription: 'Employee initial target role plan',
              successCriteria: 'Ready for manager review',
              startDate: '2026-05-10',
              completionDate: '2026-06-10',
              milestone1Date: '2026-05-20',
              milestone1Text: 'Checkpoint 1',
              milestone2Date: '2026-05-30',
              milestone2Text: 'Checkpoint 2',
              progressNotes: 'Initial stage 2 selection',
              addressedSkillsIds: [String(ksOneId), String(ksTwoId)],
              reminders: [],
            },
          ],
        })
      ),
      200
    )
    await assertStatus(userClient.request('/api/development-plan/finalize', postJson({})), 200)

    await assertStatus(
      managerClient.request(
        '/api/development-plan/stage/2',
        postJson({ userId: employee.id, selectedRoleIds: [lateralRoleKey] })
      ),
      200
    )

    const afterManagerStage2Edit = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(afterManagerStage2Edit.userStatus, 'completed')
    assert.equal(afterManagerStage2Edit.managerStatus, 'stage_2')

    const targetRoles = await db
      .from('dp_target_roles')
      .where('plan_id', afterManagerStage2Edit.id)
      .orderBy('sequence', 'asc')
    assert.lengthOf(targetRoles, 1)
    assert.equal(`${targetRoles[0].fnid}_${targetRoles[0].roleno}`, lateralRoleKey)

    const blockedExportBeforeApproval = await userClient.request('/api/development-plan/export')
    assert.equal(blockedExportBeforeApproval.status, 403)

    await assertStatus(
      managerClient.request(
        '/api/development-plan/finalize',
        postJson({ userId: employee.id, isManager: true })
      ),
      200
    )

    const approvedPlan = await DevelopmentPlan.query()
      .where('user_id', employee.id)
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(approvedPlan.managerStatus, 'approved')

    const userExport = await userClient.request('/api/development-plan/export')
    assert.equal(userExport.status, 200)
    const managerExport = await managerClient.request(
      `/api/development-plan/export?userId=${employee.id}`
    )
    assert.equal(managerExport.status, 200)
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
