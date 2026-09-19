import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface DevelopmentTeamMember {
  id: number;
  firstName: string;
  lastName: string | null;
}

export interface Stage1SkillRow {
  ksId: number;
  knowledgeSkillType: string | null;
  ksCategory: string | null;
  ksName: string | null;
  ksDefinition: string | null;
  tasksetMappingCount: number;
  mappedSubSubFnNames: string[];
  isMappedToDevelop: boolean;
}

export interface Stage1Data {
  plan: {
    id: number;
    userId: number;
    cycleYear: number;
    userStatus: string;
    managerStatus: string;
  };
  availableSkills: Stage1SkillRow[];
  selectedSkillIds: number[];
  maxSelectableSkills: number;
}

export interface Stage2RoleRow {
  roleKey: string;
  relationType: 'manager' | 'lateral';
  fnid: number;
  roleno: number;
  functionName: string;
  roleName: string;
}

export interface Stage2Data {
  plan: {
    id: number;
    userId: number;
    cycleYear: number;
    userStatus: string;
    managerStatus: string;
  };
  availableRoles: Stage2RoleRow[];
  selectedRoleIds: string[];
  maxSelectableRoles: number;
}

export interface Stage3SkillRow {
  roleKey: string;
  roleLabel: string;
  selectionKey: string;
  ksId: number;
  knowledgeSkillType: string;
  ksCategory: string;
  ksName: string;
  ksDefinition: string;
}

export interface Stage3Data {
  plan: {
    id: number;
    userId: number;
    cycleYear: number;
    userStatus: string;
    managerStatus: string;
  };
  selectedTargetRoles: Array<{
    roleKey: string;
    fnid: number;
    roleno: number;
  }>;
  availableSkills: Stage3SkillRow[];
  selectedSkills: Array<{
    ksId: number;
    roleKey: string | null;
    selectionKey: string;
  }>;
  maxSelectableSkills: number;
}

export interface Stage4SkillRow {
  ksId: number;
  knowledgeSkillType: string;
  ksCategory: string;
  ksName: string;
  ksDefinition: string;
}

export interface Stage4OtherSkillDraft {
  id?: number;
  sequence: number;
  knowledgeSkillType: string;
  ksCategory: string;
  ksName: string;
  ksDefinition: string;
}

export interface Stage4OtherSkillCategoryOption {
  knowledgeSkillType: string;
  ksCategory: string;
}

export interface Stage4Data {
  plan: {
    id: number;
    userId: number;
    cycleYear: number;
    userStatus: string;
    managerStatus: string;
  };
  roleProficiencyLabel: string;
  roleProficiencySkills: Stage4SkillRow[];
  selectedTargetRoles: Array<{
    roleKey: string;
    fnid: number;
    roleno: number;
    hasSelectedSkills: boolean;
  }>;
  futureRolePrepGroups: Array<{
    roleKey: string;
    roleLabel: string;
    skills: Stage4SkillRow[];
  }>;
  otherSkills: Stage4OtherSkillDraft[];
  otherSkillCategoryOptions: Stage4OtherSkillCategoryOption[];
}

export interface ReminderDraft {
  id?: number;
  isActive: boolean;
  remindRef: 'start_date' | 'milestone_1' | 'milestone_2' | 'completion_date';
  remindDays: number;
  remindBeforeAfter: 'before' | 'after';
  remindVia: 'email' | 'in_app' | 'both';
  repeatPeriod: 'once' | 'custom';
  repeatEvery: number | null;
  repeatUnit: 'days' | 'weeks' | 'months' | null;
  recipientList: 'employee' | 'manager' | 'both';
  nextScheduledAt?: string | null;
}

export interface Stage5ActionPlan {
  id?: number;
  sequence?: number;
  actionCategory: string;
  taskDescription: string | null;
  successCriteria: string | null;
  startDate: string | null;
  completionDate: string | null;
  milestone1Date: string | null;
  milestone1Text: string | null;
  milestone2Date: string | null;
  milestone2Text: string | null;
  progressNotes: string | null;
  addressedSkillsIds: string[];
  reminders: ReminderDraft[];
}

export interface Stage5FocusSkill {
  id: string;
  ksName?: string | null;
  ksdefinition: string | null;
  displayLabel?: string | null;
  knowledgeSkillType?: string | null;
  roleLabel?: string | null;
  rolePriority?: number;
}

export interface Stage5Data {
  plan: {
    id: number;
    userId: number;
    cycleYear: number;
    userStatus: string;
    managerStatus: string;
    userSubmittedAt?: string | null;
    managerSubmittedAt?: string | null;
  };
  actionPlans: Stage5ActionPlan[];
  availableFocusSkills: Stage5FocusSkill[];
}

@Injectable({ providedIn: 'root' })
export class DevelopmentPlanningService {
  private readonly apiTimeoutMs = 15000;

  constructor(private http: HttpClient) {}

  private withApiTimeout<T>(source$: Observable<T>): Observable<T> {
    return source$.pipe(timeout({ first: this.apiTimeoutMs }));
  }

  getTeamMembers(): Observable<{ data: DevelopmentTeamMember[] }> {
    return this.withApiTimeout(
      this.http.get<{ data: DevelopmentTeamMember[] }>('/api/development-plan/team-members'),
    );
  }

  getStage1(userId?: number | null): Observable<{ data: Stage1Data | null; message?: string }> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get<{ data: Stage1Data | null; message?: string }>(
        `/api/development-plan/stage/1${suffix}`,
      ),
    );
  }

  saveStage1(selectedSkillIds: number[], userId?: number | null): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/stage/1', {
        selectedSkillIds,
        userId,
      }),
    );
  }

  getStage2(userId?: number | null): Observable<{ data: Stage2Data | null; message?: string }> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get<{ data: Stage2Data | null; message?: string }>(
        `/api/development-plan/stage/2${suffix}`,
      ),
    );
  }

  saveStage2(selectedRoleIds: string[], userId?: number | null): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/stage/2', {
        selectedRoleIds,
        userId,
      }),
    );
  }

  getStage3(userId?: number | null): Observable<{ data: Stage3Data | null; message?: string }> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get<{ data: Stage3Data | null; message?: string }>(
        `/api/development-plan/stage/3${suffix}`,
      ),
    );
  }

  saveStage3(
    selectedSkills: Array<{ ksId: number; roleKey: string }>,
    userId?: number | null,
  ): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/stage/3', {
        selectedSkills,
        userId,
      }),
    );
  }

  getStage4(userId?: number | null): Observable<{ data: Stage4Data | null; message?: string }> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get<{ data: Stage4Data | null; message?: string }>(
        `/api/development-plan/stage/4${suffix}`,
      ),
    );
  }

  saveStage4(
    otherSkills: Stage4OtherSkillDraft[],
    userId?: number | null,
  ): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/stage/4', {
        otherSkills,
        userId,
      }),
    );
  }

  getStage5(userId?: number | null): Observable<{ data: Stage5Data | null; message?: string }> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get<{ data: Stage5Data | null; message?: string }>(
        `/api/development-plan/stage/5${suffix}`,
      ),
    );
  }

  saveStage5(
    actionPlans: Stage5ActionPlan[],
    userId?: number | null,
  ): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/stage/5', {
        actionPlans,
        userId,
      }),
    );
  }

  finalizePlan(userId?: number | null, isManager = false): Observable<{ message: string }> {
    return this.withApiTimeout(
      this.http.post<{ message: string }>('/api/development-plan/finalize', {
        userId,
        isManager,
      }),
    );
  }

  exportCsv(userId?: number | null): Observable<Blob> {
    const suffix = userId ? `?userId=${userId}` : '';
    return this.withApiTimeout(
      this.http.get(`/api/development-plan/export${suffix}`, {
        responseType: 'blob',
      }),
    );
  }
}
