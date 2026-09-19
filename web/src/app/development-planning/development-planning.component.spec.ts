import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { DevelopmentPlanningComponent } from './development-planning.component'
import { DevelopmentPlanningService } from './development-planning.service'

class DevelopmentPlanningServiceStub {
  getTeamMembersCalls = 0
  getStage1Calls = 0
  getStage3Calls = 0
  getStage4Calls = 0

  getTeamMembers() {
    this.getTeamMembersCalls += 1
    return of({ data: [] })
  }

  getStage1() {
    this.getStage1Calls += 1
    return of({
      data: {
        plan: { id: 1, userId: 1, cycleYear: 2026, userStatus: 'stage_1', managerStatus: 'notSubmitted' },
        availableSkills: [],
        selectedSkillIds: [],
        maxSelectableSkills: 3,
      },
    })
  }

  getStage3() {
    this.getStage3Calls += 1
    return of({
      data: {
        plan: { id: 1, userId: 1, cycleYear: 2026, userStatus: 'stage_3', managerStatus: 'stage_3' },
        selectedTargetRoles: [],
        availableSkills: [],
        selectedSkills: [],
        maxSelectableSkills: 3,
      },
    })
  }

  getStage4() {
    this.getStage4Calls += 1
    return of({
      data: {
        plan: { id: 1, userId: 1, cycleYear: 2026, userStatus: 'stage_4', managerStatus: 'stage_4' },
        roleProficiencyLabel: 'Role Proficiency',
        roleProficiencySkills: [],
        selectedTargetRoles: [],
        futureRolePrepGroups: [],
        otherSkills: [],
        otherSkillCategoryOptions: [],
      },
    })
  }

  getStage5() {
    return of({
      data: {
        plan: {
          id: 1,
          userId: 1,
          cycleYear: 2026,
          userStatus: 'stage_5',
          managerStatus: 'stage_5',
          userSubmittedAt: null,
          managerSubmittedAt: null,
        },
        actionPlans: [],
        availableFocusSkills: [],
      },
    })
  }
}

describe('DevelopmentPlanningComponent', () => {
  let fixture: ComponentFixture<DevelopmentPlanningComponent>
  let component: DevelopmentPlanningComponent
  let service: DevelopmentPlanningServiceStub

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevelopmentPlanningComponent],
      providers: [
        {
          provide: DevelopmentPlanningService,
          useClass: DevelopmentPlanningServiceStub,
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(DevelopmentPlanningComponent)
    component = fixture.componentInstance
    service = TestBed.inject(DevelopmentPlanningService) as unknown as DevelopmentPlanningServiceStub
    fixture.detectChanges()
    await fixture.whenStable()
  })

  it('navigates back from stage 5 to stage 4 and from stage 4 to stage 3', async () => {
    component.loading = false
    component.activeStage = 5
    component.stage4Data = {
      plan: { id: 1, userId: 1, cycleYear: 2026, userStatus: 'stage_4', managerStatus: 'stage_4' },
      roleProficiencyLabel: 'Role Proficiency',
      roleProficiencySkills: [],
      selectedTargetRoles: [],
      futureRolePrepGroups: [],
      otherSkills: [],
      otherSkillCategoryOptions: [],
    }
    component.stage5Data = {
      plan: {
        id: 1,
        userId: 1,
        cycleYear: 2026,
        userStatus: 'stage_5',
        managerStatus: 'stage_5',
        userSubmittedAt: null,
        managerSubmittedAt: null,
      },
      actionPlans: [],
      availableFocusSkills: [],
    }
    component.actionPlans = [
      {
        sequence: 1,
        actionCategory: 'Coaching / Mentoring',
        taskDescription: 'Draft task',
        successCriteria: 'Draft success',
        startDate: '2026-05-10',
        completionDate: '2026-06-10',
        milestone1Date: '2026-05-20',
        milestone1Text: 'Checkpoint 1',
        milestone2Date: '2026-05-30',
        milestone2Text: 'Checkpoint 2',
        progressNotes: 'Draft note',
        addressedSkillsIds: [],
        reminders: [],
      },
    ]
    fixture.detectChanges()

    const stage5Buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    const stage5BackButton = stage5Buttons.find((button) => button.textContent?.trim() === 'Back')

    expect(stage5BackButton).toBeTruthy()
    component.error = 'Previous error'
    component.success = 'Previous success'
    component.validationError = 'Previous validation error'
    stage5BackButton!.click()
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.activeStage).toBe(4)
    expect(service.getStage4Calls).toBe(1)
    expect(component.error).toBeNull()
    expect(component.success).toBeNull()
    expect(component.validationError).toBeNull()

    fixture.detectChanges()
    const stage4Buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    const stage4BackButton = stage4Buttons.find((button) => button.textContent?.trim() === 'Back')

    expect(stage4BackButton).toBeTruthy()
    stage4BackButton!.click()
    fixture.detectChanges()
    await fixture.whenStable()

    expect(component.activeStage).toBe(3)
    expect(service.getStage3Calls).toBe(1)
  })
})