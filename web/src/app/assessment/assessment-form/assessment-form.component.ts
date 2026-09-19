import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssessmentFormData, AssessmentService, TeamMember } from '../assessment.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-assessment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="assessment-wrapper">
      <div class="subject-bar">
        <label for="subjectSelect" class="subject-label">Assessing:</label>
        <select
          id="subjectSelect"
          [(ngModel)]="selectedUserId"
          (ngModelChange)="onSubjectChange($event)"
          class="subject-select"
        >
          <option [ngValue]="null">Self</option>
          <option *ngFor="let member of teamMembers" [ngValue]="member.id">
            {{ member.firstName }} {{ member.lastName || '' }}
          </option>
        </select>
      </div>

      <div *ngIf="success" class="state-msg success">{{ success }}</div>
      <div *ngIf="loading" class="state-msg">Loading form…</div>
      <div *ngIf="error" class="state-msg error">{{ error }}</div>
      <div *ngIf="!loading && !error && !formData" class="state-msg">
        No role has been assigned to this user yet.
      </div>

      <div *ngIf="!loading && formData" class="form-container">
        <div class="form-title-row">
          <div class="form-title">Functional Competence Assessment</div>
          <div class="scale-box">
            <span class="scale-title">Functional Competency Rating Scale</span>
            <div class="scale-items">
              <span class="scale-item"><strong>1</strong> Novice</span>
              <span class="scale-item"><strong>2</strong> Practitioner</span>
              <span class="scale-item"><strong>3</strong> Advanced</span>
              <span class="scale-item"><strong>4</strong> Expert</span>
            </div>
          </div>
          <div class="form-meta-right">
            <div>
              <label>Period:</label> <span>{{ formData.year }}</span>
            </div>
            <div>
              <label>Date:</label> <span>{{ formData.date }}</span>
            </div>
          </div>
        </div>

        <div class="form-header">
          <div class="header-grid">
            <div class="header-item">
              <label>Business:</label> <span>{{ formData.role.businessName }}</span>
            </div>
            <div class="header-item">
              <label>Location:</label> <span>{{ formData.role.locationName }}</span>
            </div>
            <div class="header-item">
              <label>Function:</label> <span>{{ formData.role.fnName }}</span>
            </div>
            <div class="header-item">
              <label>Role:</label> <span>{{ formData.role.roleName }}</span>
            </div>
          </div>
          <div class="header-grid header-grid-2">
            <div class="header-item">
              <label>ID:</label> <span>{{ formData.user.empId }}</span>
            </div>
            <div class="header-item">
              <label>Name:</label>
              <span>{{ formData.user.firstName }} {{ formData.user.lastName }}</span>
            </div>
            <div class="header-item">
              <label>Date of Joining:</label> <span>{{ formData.user.joinedAt || '—' }}</span>
            </div>
            <div class="header-item">
              <label>In Role Since:</label> <span>{{ formData.user.inRoleSince || '—' }}</span>
            </div>
            <div class="header-item">
              <label>Manager:</label> <span>{{ formData.user.mgrName || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="workflow-note">
          <span *ngIf="formData.workflow.selfSubmittedAt"
            >Self submitted: {{ formData.workflow.selfSubmittedAt | date: 'medium' }}</span
          >
          <span *ngIf="formData.workflow.managerSubmittedAt"
            >Manager submitted: {{ formData.workflow.managerSubmittedAt | date: 'medium' }}</span
          >
        </div>

        <div class="submission-criteria" *ngIf="formData.workflow.canEdit">
          <div class="criteria-title">Submission criteria</div>
          <div>Enter a rating for every sub function before submitting.</div>
          <div>Select between 2 and 7 boxes in the To Develop column.</div>
        </div>

        <div class="table-scroll">
          <table class="assessment-table">
            <thead>
              <tr>
                <th class="col-subfn">Sub Function</th>
                <th class="col-subsubfn">Sub Sub Function</th>
                <th class="col-taskset">Taskset</th>
                <th class="col-ei">EI</th>
                <th class="col-develop">To Develop</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let subfn of formData.subfunctions; let subfnIndex = index">
                <ng-container *ngFor="let group of subfn.groups; let groupIndex = index">
                  <ng-container *ngFor="let task of group.tasks; let taskIndex = index">
                    <tr [class]="getRowClass(subfnIndex)">
                      <td
                        *ngIf="groupIndex === 0 && taskIndex === 0"
                        [attr.rowspan]="countRows(subfn)"
                        class="subfn-cell"
                      >
                        <div class="subfn-panel">
                          <div class="subfn-title">{{ subfn.subfnName }}</div>

                          <label class="field-label">Rating</label>
                          <select
                            [(ngModel)]="subfn.rating"
                            class="score-select"
                            [disabled]="!formData.workflow.canEdit"
                          >
                            <option [ngValue]="null">—</option>
                            <option [ngValue]="1">1</option>
                            <option [ngValue]="2">2</option>
                            <option [ngValue]="3">3</option>
                            <option [ngValue]="4">4</option>
                          </select>

                          <label class="field-label">Strengths</label>
                          <textarea
                            [(ngModel)]="subfn.strengths"
                            rows="4"
                            class="text-input"
                            [disabled]="!formData.workflow.canEdit"
                          ></textarea>

                          <label class="field-label">Improvement Opportunities</label>
                          <textarea
                            [(ngModel)]="subfn.improvementOpportunity"
                            rows="4"
                            class="text-input"
                            [disabled]="!formData.workflow.canEdit"
                          ></textarea>
                        </div>
                      </td>
                      <td
                        *ngIf="taskIndex === 0"
                        [attr.rowspan]="group.tasks.length"
                        class="subsubfn-cell"
                      >
                        {{ group.subSubFnName }}
                      </td>
                      <td class="taskset-cell">{{ task.taskset }}</td>
                      <td class="ei-cell">{{ task.ei }}</td>
                      <td class="develop-cell">
                        <input
                          type="checkbox"
                          [(ngModel)]="task.toDevelop"
                          class="develop-check"
                          [disabled]="!formData.workflow.canEdit"
                        />
                      </td>
                    </tr>
                  </ng-container>
                </ng-container>
              </ng-container>
            </tbody>
          </table>
        </div>

        <div class="submit-bar">
          <div class="additional-comments-block">
            <label class="field-label" for="additionalAssignmentsAndComments"
              >Additional Assignments and Comments</label
            >
            <textarea
              id="additionalAssignmentsAndComments"
              [(ngModel)]="formData.additionalAssignmentsAndComments"
              rows="3"
              maxlength="255"
              class="text-input"
              [disabled]="!formData.workflow.canEdit"
            ></textarea>
            <div class="char-counter">
              {{ formData.additionalAssignmentsAndComments.length }}/255
            </div>
          </div>

          <div *ngIf="submitValidationMessage" class="submit-validation-msg">
            {{ submitValidationMessage }}
          </div>

          <button
            class="btn-submit"
            (click)="submitAssessment()"
            [disabled]="submitting || !formData.workflow.canEdit"
          >
            {{ submitting ? 'Submitting...' : formData.workflow.submitLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .assessment-wrapper {
        padding: 1.5rem;
        background: #f5f5f5;
        min-height: 100vh;
      }

      .subject-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .subject-label {
        font-weight: 600;
        font-size: 0.95rem;
      }

      .subject-select {
        padding: 0.45rem 0.8rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        min-width: 220px;
        font-size: 0.95rem;
      }

      .state-msg {
        padding: 1rem 0;
        text-align: center;
        color: #555;
      }

      .state-msg.error {
        color: #c0392b;
      }

      .state-msg.success {
        color: #1f7a1f;
      }

      .form-container {
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .form-title-row {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #1a5276;
        color: white;
        flex-wrap: wrap;
      }

      .form-title {
        font-size: 1.15rem;
        font-weight: 700;
        flex: 1 1 200px;
      }

      .scale-box {
        flex: 2 1 300px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 4px;
        padding: 0.4rem 0.75rem;
      }

      .scale-title {
        font-size: 0.8rem;
        font-weight: 600;
        display: block;
        margin-bottom: 0.3rem;
      }

      .scale-items {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .scale-item {
        font-size: 0.8rem;
        white-space: nowrap;
      }

      .scale-item strong {
        margin-right: 3px;
      }

      .form-meta-right {
        flex: 0 0 160px;
        font-size: 0.85rem;
        line-height: 1.6;
      }

      .form-meta-right label {
        font-weight: 600;
        margin-right: 4px;
      }

      .form-header {
        padding: 0.75rem 1rem;
        background: #eaf0fb;
        border-bottom: 1px solid #ccc;
      }

      .header-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.5rem;
        margin-bottom: 0.4rem;
      }

      .header-grid-2 {
        margin-bottom: 0;
      }

      .header-item {
        font-size: 0.85rem;
      }

      .header-item label {
        font-weight: 600;
        margin-right: 4px;
        color: #444;
      }

      .workflow-note {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-bottom: 1px solid #dbe4ee;
        color: #4a5568;
        font-size: 0.82rem;
      }

      .submission-criteria {
        padding: 0.85rem 1rem;
        background: #fff7e6;
        border-bottom: 1px solid #ecd7a1;
        color: #6b4f00;
        font-size: 0.84rem;
        line-height: 1.5;
      }

      .criteria-title {
        font-weight: 700;
        margin-bottom: 0.2rem;
      }

      .table-scroll {
        overflow-x: auto;
      }

      .assessment-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }

      .assessment-table th {
        background: #2c3e50;
        color: white;
        padding: 0.5rem 0.6rem;
        text-align: left;
        white-space: nowrap;
        border: 1px solid #4a5568;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      .assessment-table td {
        padding: 0.4rem 0.6rem;
        border: 1px solid #d0d0d0;
        vertical-align: top;
      }

      .col-subfn {
        min-width: 320px;
        width: 320px;
      }

      .col-subsubfn {
        min-width: 130px;
        width: 130px;
      }

      .col-taskset {
        min-width: 260px;
      }

      .col-ei {
        min-width: 40px;
        width: 40px;
        text-align: center;
      }

      .col-develop {
        min-width: 72px;
        width: 72px;
        text-align: center;
      }

      .subfn-cell {
        padding: 0 !important;
      }

      .subfn-panel {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 0.75rem;
        height: 100%;
        box-sizing: border-box;
      }

      .subfn-title {
        font-weight: 700;
        font-size: 0.92rem;
      }

      .field-label {
        font-size: 0.74rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .subsubfn-cell {
        font-weight: 600;
        vertical-align: middle;
      }

      .ei-cell {
        text-align: center;
        font-weight: 600;
      }

      .score-select {
        width: 100%;
        max-width: 90px;
        padding: 0.2rem;
        border: 1px solid #aaa;
        border-radius: 3px;
        font-size: 0.82rem;
      }

      .text-input {
        width: 100%;
        border: 1px solid #aaa;
        border-radius: 3px;
        padding: 0.25rem;
        font-size: 0.8rem;
        resize: vertical;
        font-family: inherit;
      }

      .develop-check {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .submit-bar {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        background: #f8fafc;
        border-top: 1px solid #dbe4ee;
      }

      .additional-comments-block {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .char-counter {
        align-self: flex-end;
        font-size: 0.78rem;
        color: #64748b;
      }

      .submit-validation-msg {
        color: #c0392b;
        font-size: 0.86rem;
      }

      .btn-submit {
        align-self: flex-end;
        padding: 0.7rem 1.4rem;
        border: none;
        border-radius: 6px;
        font-weight: 700;
        color: white;
        cursor: pointer;
        background: linear-gradient(135deg, #0f766e, #1d4ed8);
      }

      .btn-submit:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .row-0 td {
        background-color: #fff9e6;
      }

      .row-1 td {
        background-color: #e8f5e9;
      }

      .row-2 td {
        background-color: #e3f2fd;
      }

      .row-3 td {
        background-color: #fce4ec;
      }

      .row-4 td {
        background-color: #f3e5f5;
      }

      .row-5 td {
        background-color: #fff3e0;
      }

      .row-6 td {
        background-color: #e0f7fa;
      }

      .row-7 td {
        background-color: #f1f8e9;
      }

      @media (max-width: 900px) {
        .header-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class AssessmentFormComponent implements OnInit {
  loading = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  submitValidationMessage: string | null = null;
  formData: AssessmentFormData | null = null;
  teamMembers: TeamMember[] = [];
  selectedUserId: number | null = null;

  constructor(
    private assessmentService: AssessmentService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();
    this.loadForm(null);
  }

  private loadTeamMembers(): void {
    this.assessmentService.getTeamMembers().subscribe({
      next: (res) => {
        this.teamMembers = res.data;
      },
      error: () => {
        this.teamMembers = [];
      },
    });
  }

  loadForm(userId: number | null): void {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.submitValidationMessage = null;
    this.formData = null;

    this.assessmentService.getFormData(userId ?? undefined).subscribe({
      next: (res) => {
        this.formData = res.data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to load assessment form.';
        this.loading = false;
      },
    });
  }

  onSubjectChange(userId: number | null): void {
    this.loadForm(userId);
  }

  getRowClass(subfnIndex: number): string {
    return `row-${subfnIndex % 8}`;
  }

  countRows(subfn: AssessmentFormData['subfunctions'][number]): number {
    return subfn.groups.reduce((sum, group) => sum + group.tasks.length, 0);
  }

  private getSubmissionValidationError(): string | null {
    if (!this.formData) {
      return null;
    }

    if (this.formData.additionalAssignmentsAndComments.length > 255) {
      return 'Additional Assignments and Comments cannot exceed 255 characters.';
    }

    const hasMissingRatings = this.formData.subfunctions.some((subfn) => {
      const rating = Number(subfn.rating);
      return !Number.isInteger(rating) || rating < 1 || rating > 4;
    });
    const toDevelopCount = this.formData.subfunctions.reduce(
      (count, subfn) =>
        count +
        subfn.groups.reduce(
          (groupCount, group) =>
            groupCount +
            group.tasks.filter((task) => {
              const value = task.toDevelop as unknown;
              return value === true || value === 1 || value === '1' || value === 'true';
            }).length,
          0,
        ),
      0,
    );
    const errors: string[] = [];

    if (hasMissingRatings) {
      errors.push('Enter a score for every sub function.');
    }

    if (toDevelopCount < 2 || toDevelopCount > 7) {
      errors.push('Select between 2 and 7 boxes in the To Develop column.');
    }

    return errors.length > 0 ? errors.join(' ') : null;
  }

  submitAssessment(): void {
    if (!this.formData || !this.formData.workflow.canEdit) {
      return;
    }

    const validationError = this.getSubmissionValidationError();

    if (validationError) {
      this.submitValidationMessage = validationError;
      this.success = null;
      return;
    }

    this.submitting = true;
    this.submitValidationMessage = null;
    this.error = null;
    this.success = null;

    this.assessmentService
      .submitAssessment(
        this.selectedUserId,
        this.formData.subfunctions,
        this.formData.additionalAssignmentsAndComments,
      )
      .subscribe({
        next: () => {
          this.submitting = false;
          const user = this.authService.getCurrentUser();
          if (user?.role === 'org_admin') {
            this.router.navigate(['/orgadmin/emp-data']);
          } else if (user?.role === 'sys_admin') {
            this.router.navigate(['/sysadmin']);
          } else {
            this.router.navigate(['/fnfnroles']);
          }
        },
        error: (err) => {
          const errorMessage =
            err?.error?.error ?? err?.error?.message ?? 'Failed to submit assessment.';

          if (
            errorMessage.includes('Enter a score for every sub function') ||
            errorMessage.includes('Select between 2 and 7 boxes in the To Develop') ||
            errorMessage.includes('Additional Assignments and Comments cannot exceed 255')
          ) {
            this.submitValidationMessage = errorMessage;
            this.error = null;
          } else {
            this.error = errorMessage;
          }
          this.submitting = false;
        },
      });
  }
}
