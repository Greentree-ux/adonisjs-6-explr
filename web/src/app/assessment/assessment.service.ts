import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

export interface TeamMember {
  id: number
  firstName: string
  lastName: string | null
  empId: number
  fnroleId: number | null
  selfSubmittedAt: string | null
  managerSubmittedAt: string | null
}

export interface AssessmentTask {
  taskKey: string
  taskset: string
  ei: string
  lmh: string
  toDevelop: boolean
}

export interface AssessmentGroup {
  sub2fnord: number
  subSubFnName: string
  tasks: AssessmentTask[]
}

export interface AssessmentSubfunction {
  subfnId: number
  subfnName: string
  rating: number | null
  strengths: string
  improvementOpportunity: string
  groups: AssessmentGroup[]
}

export interface AssessmentFormData {
  year: string
  date: string
  additionalAssignmentsAndComments: string
  user: {
    id: number
    empId: number
    firstName: string
    lastName: string
    joinedAt: string | null
    inRoleSince: string | null
    mgrName: string | null
  }
  role: {
    roleName: string
    fnName: string
    locationName: string
    businessName: string
  }
  workflow: {
    isSelf: boolean
    canEdit: boolean
    submitLabel: string
    selfSubmittedAt: string | null
    managerSubmittedAt: string | null
  }
  subfunctions: AssessmentSubfunction[]
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private http: HttpClient) {}

  getFormData(userId?: number): Observable<{ data: AssessmentFormData | null; message?: string }> {
    const url = userId ? `/api/assessment?userId=${userId}` : '/api/assessment'
    return this.http.get<{ data: AssessmentFormData | null; message?: string }>(url)
  }

  getTeamMembers(): Observable<{ data: TeamMember[] }> {
    return this.http.get<{ data: TeamMember[] }>('/api/assessment/team')
  }

  submitAssessment(
    userId: number | null,
    subfunctions: AssessmentSubfunction[],
    additionalAssignmentsAndComments: string
  ) {
    return this.http.post<{ message: string }>('/api/assessment/submit', {
      userId,
      subfunctions,
      additionalAssignmentsAndComments,
    })
  }
}
