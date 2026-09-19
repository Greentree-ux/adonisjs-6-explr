import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DevelopmentPlanningService,
  DevelopmentTeamMember,
  ReminderDraft,
  Stage1Data,
  Stage2Data,
  Stage3Data,
  Stage4Data,
  Stage4OtherSkillDraft,
  Stage5ActionPlan,
  Stage5Data,
  Stage5FocusSkill,
} from './development-planning.service';
import {
  applyRepeatPeriodDefaults,
  getReminderPreviewLabel as buildReminderPreviewLabel,
  validateReminderConfiguration as validateReminderPlanConfiguration,
} from './reminder-utils';

@Component({
  selector: 'app-development-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="devplan-wrapper">
      <div class="top-bar">
        <label for="subjectSelect">Development Plan For:</label>
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
        <span *ngIf="selectedUserId !== null" class="manager-view-note">Manager review mode</span>
      </div>

      <div class="flow-strip">
        <button
          *ngFor="let stage of stages"
          class="flow-step"
          [class.active]="activeStage === stage.id"
          (click)="goToStage(stage.id)"
          type="button"
        >
          {{ stage.label }}
        </button>
      </div>

      <div *ngIf="loading" class="state-msg">Loading form...</div>
      <div *ngIf="error" class="state-msg error">{{ error }}</div>
      <div *ngIf="success" class="state-msg success">{{ success }}</div>

      <div *ngIf="!loading && !error && activeStage > 5" class="placeholder-card">
        <h3>{{ currentStageLabel }}</h3>
        <p>This stage will be implemented in the next phase.</p>
      </div>

      <div *ngIf="!loading && !error && activeStage === 1 && stage1Data" class="stage-card">
        <div class="stage-title-row">
          <h2>Focus Skills for Role Proficiency</h2>
          <span class="counter"
            >{{ selectedSkillIds.length }}/{{ stage1Data.maxSelectableSkills }}</span
          >
        </div>

        <div *ngIf="stage1Data.availableSkills.length === 0" class="state-msg">
          No Knowledge / Skills found for the assigned role.
        </div>

        <div *ngIf="stage1Data.availableSkills.length > 0" class="table-scroll">
          <table class="stage-table">
            <thead>
              <tr>
                <th>Knowledge / Skill (K/S)</th>
                <th>K/S Category</th>
                <th>K/S Name</th>
                <th>K/S Definition</th>
                <th>Taskset Mappings</th>
                <th>Focus Skill</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let skill of stage1Data.availableSkills"
                [class.stage1-highlight-row]="skill.isMappedToDevelop"
              >
                <td>{{ skill.knowledgeSkillType }}</td>
                <td>{{ skill.ksCategory }}</td>
                <td>{{ skill.ksName }}</td>
                <td>{{ skill.ksDefinition }}</td>
                <td>
                  <span
                    class="mapping-count"
                    [class.mapping-count-highlight]="skill.isMappedToDevelop"
                    [attr.title]="getStage1MappingTooltip(skill)"
                  >
                    {{ skill.tasksetMappingCount }}
                  </span>
                </td>
                <td class="tick-cell">
                  <input
                    type="checkbox"
                    [checked]="isSelected(skill.ksId)"
                    (change)="toggleSkill(skill.ksId, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="validationError" class="validation-msg">{{ validationError }}</div>

        <div class="submit-row">
          <button type="button" class="btn-submit" [disabled]="submitting" (click)="submitStage1()">
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>

      <div *ngIf="!loading && !error && activeStage === 2 && stage2Data" class="stage-card">
        <div class="stage-title-row">
          <h2>Target Role Selection</h2>
          <span class="counter"
            >{{ selectedRoleIds.length }}/{{ stage2Data.maxSelectableRoles }}</span
          >
        </div>

        <div *ngIf="stage2Data.availableRoles.length === 0" class="state-msg">
          No eligible manager/lateral roles found.
        </div>

        <div *ngIf="stage2Data.availableRoles.length > 0" class="table-scroll">
          <table class="stage-table">
            <thead>
              <tr>
                <th>Relative Role</th>
                <th>Function</th>
                <th>Role Name</th>
                <th>Target Role</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of stage2Data.availableRoles">
                <td>
                  <span class="badge" [class.badge-manager]="role.relationType === 'manager'">
                    {{ role.relationType === 'manager' ? 'Manager' : 'Lateral' }}
                  </span>
                </td>
                <td>{{ role.functionName }}</td>
                <td>{{ role.roleName }}</td>
                <td class="tick-cell">
                  <input
                    type="checkbox"
                    [checked]="isRoleSelected(role.roleKey)"
                    (change)="toggleRole(role.roleKey, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="validationError" class="validation-msg">{{ validationError }}</div>

        <div class="submit-row split">
          <button
            type="button"
            class="btn-secondary"
            [disabled]="submitting"
            (click)="goToStage(1)"
          >
            Back
          </button>
          <button type="button" class="btn-submit" [disabled]="submitting" (click)="submitStage2()">
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>

      <div *ngIf="!loading && !error && activeStage === 3 && stage3Data" class="stage-card">
        <div class="stage-title-row">
          <h2>Focus Skills for Target Roles</h2>
          <span class="counter"
            >{{ selectedTargetSkills.length }}/{{ stage3Data.maxSelectableSkills }}</span
          >
        </div>

        <div *ngIf="stage3Data.availableSkills.length === 0" class="state-msg">
          No skills available. Select target roles in Stage 2 first.
        </div>

        <div *ngIf="stage3Data.availableSkills.length > 0" class="table-scroll">
          <table class="stage-table">
            <thead>
              <tr>
                <th>Target Role</th>
                <th>Knowledge / Skill (K/S)</th>
                <th>K/S Category</th>
                <th>K/S Name</th>
                <th>K/S Definition</th>
                <th>Focus Skill</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let skill of stage3Data.availableSkills">
                <td>{{ skill.roleLabel }}</td>
                <td>{{ skill.knowledgeSkillType }}</td>
                <td>{{ skill.ksCategory }}</td>
                <td>{{ skill.ksName }}</td>
                <td>{{ skill.ksDefinition }}</td>
                <td class="tick-cell">
                  <input
                    type="checkbox"
                    [checked]="isTargetSkillSelected(skill.selectionKey)"
                    (change)="
                      toggleTargetSkill(skill.selectionKey, skill.ksId, skill.roleKey, $event)
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="validationError" class="validation-msg">{{ validationError }}</div>

        <div class="submit-row split">
          <button
            type="button"
            class="btn-secondary"
            [disabled]="submitting"
            (click)="goToStage(2)"
          >
            Back
          </button>
          <button type="button" class="btn-submit" [disabled]="submitting" (click)="submitStage3()">
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>

      <div *ngIf="!loading && !error && activeStage === 4 && stage4Data" class="stage-card">
        <div class="stage-title-row">
          <h2>Focus Skills - Consolidated</h2>
          <span class="counter">Review selections and add up to 2 other K/S entries</span>
        </div>

        <div class="consolidated-section">
          <div class="section-header-row">
            <h3>Role Proficiency</h3>
            <button type="button" class="link-button" (click)="goToStage(1)">Edit Stage 1</button>
          </div>

          <div *ngIf="stage4Data.roleProficiencySkills.length === 0" class="state-msg">
            No focus skills selected for role proficiency yet.
          </div>

          <div *ngIf="stage4Data.roleProficiencySkills.length > 0" class="table-scroll">
            <table class="stage-table">
              <thead>
                <tr>
                  <th>For</th>
                  <th>Knowledge / Skill (K/S)</th>
                  <th>K/S Category</th>
                  <th>K/S Name</th>
                  <th>K/S Definition</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let skill of stage4Data.roleProficiencySkills">
                  <td>Role Proficiency</td>
                  <td>{{ skill.knowledgeSkillType }}</td>
                  <td>{{ skill.ksCategory }}</td>
                  <td>{{ skill.ksName }}</td>
                  <td>{{ skill.ksDefinition }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="consolidated-section">
          <div class="section-header-row">
            <h3>Future Role Prep</h3>
            <div class="section-actions">
              <button type="button" class="link-button" (click)="goToStage(2)">Edit Stage 2</button>
              <button type="button" class="link-button" (click)="goToStage(3)">Edit Stage 3</button>
            </div>
          </div>

          <div *ngIf="stage4Data.futureRolePrepGroups.length === 0" class="state-msg">
            No focus skills selected for target roles yet.
          </div>

          <div *ngFor="let group of stage4Data.futureRolePrepGroups" class="future-role-group">
            <div class="group-title">{{ group.roleLabel }}</div>
            <div class="table-scroll">
              <table class="stage-table">
                <thead>
                  <tr>
                    <th>For</th>
                    <th>Knowledge / Skill (K/S)</th>
                    <th>K/S Category</th>
                    <th>K/S Name</th>
                    <th>K/S Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let skill of group.skills">
                    <td>Future Role Prep</td>
                    <td>{{ skill.knowledgeSkillType }}</td>
                    <td>{{ skill.ksCategory }}</td>
                    <td>{{ skill.ksName }}</td>
                    <td>{{ skill.ksDefinition }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="consolidated-section">
          <div class="section-header-row">
            <h3>Other Knowledge/Skills</h3>
            <span class="counter">Up to 2 manual entries</span>
          </div>

          <div class="section-note">
            Add manually if an important focus area is not already covered by the role-based lists
            above.
          </div>

          <div class="other-skill-list">
            <div *ngFor="let skill of stage4Data.otherSkills; let i = index" class="planner-card">
              <div class="group-title">Other Knowledge/Skill {{ i + 1 }}</div>

              <div class="planner-grid planner-grid-top">
                <label>
                  Knowledge / Skill Type
                  <select
                    [(ngModel)]="skill.knowledgeSkillType"
                    (ngModelChange)="onOtherSkillTypeChange(skill)"
                  >
                    <option value="">Select type</option>
                    <option *ngFor="let option of otherSkillTypeOptions" [value]="option">
                      {{ option }}
                    </option>
                  </select>
                </label>

                <label>
                  K/S Category
                  <select [(ngModel)]="skill.ksCategory" [disabled]="!skill.knowledgeSkillType">
                    <option value="">Select category</option>
                    <option
                      *ngFor="let option of getOtherSkillCategoryOptions(skill.knowledgeSkillType)"
                      [value]="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="planner-grid planner-grid-summary">
                <label>
                  K/S Name
                  <input type="text" [(ngModel)]="skill.ksName" placeholder="Enter K/S name" />
                </label>

                <label>
                  K/S Definition
                  <textarea
                    rows="3"
                    [(ngModel)]="skill.ksDefinition"
                    placeholder="Describe the Knowledge / Skill"
                  ></textarea>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="validationError" class="validation-msg">{{ validationError }}</div>

        <div class="submit-row split">
          <button type="button" class="btn-secondary" (click)="goToStage(3)">Back</button>
          <button type="button" class="btn-submit" [disabled]="submitting" (click)="submitStage4()">
            {{ submitting ? 'Saving...' : 'Save and Continue' }}
          </button>
        </div>
      </div>

      <div *ngIf="!loading && !error && activeStage === 5 && stage5Data" class="stage-card">
        <div class="stage-title-row">
          <h2>Development Planner</h2>
          <div class="stage5-title-meta">
            <span class="counter">{{ actionPlans.length }}/5 Action Plans</span>
            <span class="workflow-badge" [ngClass]="workflowBadgeClass">
              {{ workflowBadgeLabel }}
            </span>
          </div>
        </div>

        <div *ngIf="stage5WorkflowMessage" class="state-msg">
          {{ stage5WorkflowMessage }}
        </div>

        <div *ngIf="actionPlans.length === 0" class="state-msg">
          No action plans yet. Add one to begin planning development actions.
        </div>

        <div *ngFor="let plan of actionPlans; let i = index" class="planner-card">
          <div class="section-header-row">
            <h3>Action Plan {{ i + 1 }}</h3>
            <button
              *ngIf="actionPlans.length > 1"
              type="button"
              class="link-button danger"
              (click)="removeActionPlan(i)"
            >
              Remove
            </button>
          </div>

          <div class="planner-grid planner-grid-top">
            <label>
              Action Category
              <select [(ngModel)]="plan.actionCategory">
                <option value="">Select category</option>
                <option *ngFor="let category of actionCategoryOptions" [value]="category">
                  {{ category }}
                </option>
              </select>
            </label>
          </div>

          <div class="planner-grid planner-grid-summary">
            <label>
              Task Description
              <textarea
                rows="3"
                [(ngModel)]="plan.taskDescription"
                placeholder="Describe the development activity"
              ></textarea>
            </label>

            <label>
              Success Criteria
              <textarea
                rows="3"
                [(ngModel)]="plan.successCriteria"
                placeholder="How will success be measured?"
              ></textarea>
            </label>
          </div>

          <div class="planner-grid planner-grid-dates">
            <label>
              Start Date
              <input type="date" [(ngModel)]="plan.startDate" />
            </label>

            <label>
              Completion Date
              <input type="date" [(ngModel)]="plan.completionDate" />
            </label>

            <label>
              Milestone 1
              <input
                type="text"
                [(ngModel)]="plan.milestone1Text"
                placeholder="Enter milestone 1"
              />
            </label>

            <label>
              Milestone 1 Date
              <input type="date" [(ngModel)]="plan.milestone1Date" />
            </label>

            <label>
              Milestone 2
              <input
                type="text"
                [(ngModel)]="plan.milestone2Text"
                placeholder="Enter milestone 2"
              />
            </label>

            <label>
              Milestone 2 Date
              <input type="date" [(ngModel)]="plan.milestone2Date" />
            </label>
          </div>

          <div class="planner-grid wide">
            <label>
              Progress Notes
              <textarea
                rows="3"
                [(ngModel)]="plan.progressNotes"
                placeholder="Track interim progress"
              ></textarea>
            </label>
          </div>

          <div class="skill-chip-wrap" *ngIf="focusSkillGroups.length > 0">
            <div class="skill-label">Knowledge/Skill List</div>
            <div class="skill-role-group" *ngFor="let group of focusSkillGroups">
              <div class="skill-role-title">{{ group.roleLabel }}</div>
              <label class="skill-chip" *ngFor="let skill of group.skills">
                <input
                  type="checkbox"
                  [checked]="isAddressedSkillSelected(plan, skill.id)"
                  (change)="toggleAddressedSkill(plan, skill.id, $event)"
                />
                <span>
                  {{ getSkillTypeLabel(skill) }}{{ getStage5SkillName(skill) ? ': ' : ''
                  }}{{ getStage5SkillName(skill) }}{{ getStage5SkillDefinition(skill) ? ': ' : ''
                  }}{{ getStage5SkillDefinition(skill) }}
                </span>
              </label>
            </div>
          </div>

          <div class="reminder-box">
            <div class="reminder-header-row">
              <label class="inline-checkbox">
                <input
                  type="checkbox"
                  [checked]="plan.reminders.length > 0"
                  (change)="toggleReminder(plan, $event)"
                />
                Enable reminders
              </label>

              <div *ngIf="plan.reminders.length > 0" class="reminder-actions-row">
                <button
                  type="button"
                  class="btn-secondary mini"
                  (click)="addReminder(plan, 'employee')"
                >
                  + Employee Reminder
                </button>
                <button
                  type="button"
                  class="btn-secondary mini"
                  (click)="addReminder(plan, 'manager')"
                >
                  + Manager Reminder
                </button>
                <button
                  type="button"
                  class="btn-secondary mini"
                  (click)="addReminder(plan, 'both')"
                >
                  + Shared Reminder
                </button>
              </div>
            </div>

            <div *ngIf="plan.reminders.length > 0" class="reminder-list">
              <div
                *ngFor="let reminder of plan.reminders; let reminderIndex = index"
                class="reminder-card"
              >
                <div class="reminder-card-header">
                  <div>
                    <div class="reminder-card-title">Reminder {{ reminderIndex + 1 }}</div>
                    <div class="reminder-preview">
                      Next run: {{ getReminderPreviewLabel(plan, reminder) }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="link-button danger-link"
                    (click)="removeReminder(plan, reminderIndex)"
                  >
                    Remove
                  </button>
                </div>

                <div class="planner-grid">
                  <label>
                    Recipient
                    <select [(ngModel)]="reminder.recipientList">
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="both">Both</option>
                    </select>
                  </label>

                  <label>
                    Status
                    <select [(ngModel)]="reminder.isActive">
                      <option [ngValue]="true">Active</option>
                      <option [ngValue]="false">Paused</option>
                    </select>
                  </label>

                  <label>
                    Reference Point
                    <select [(ngModel)]="reminder.remindRef">
                      <option value="start_date">Start Date</option>
                      <option value="milestone_1">Milestone 1</option>
                      <option value="milestone_2">Milestone 2</option>
                      <option value="completion_date">Completion Date</option>
                    </select>
                  </label>

                  <label>
                    Remind Days
                    <input type="number" min="0" max="365" [(ngModel)]="reminder.remindDays" />
                  </label>

                  <label>
                    Before / After
                    <select [(ngModel)]="reminder.remindBeforeAfter">
                      <option value="before">Before</option>
                      <option value="after">After</option>
                    </select>
                  </label>

                  <label>
                    Remind Via
                    <select [(ngModel)]="reminder.remindVia">
                      <option value="email">Email</option>
                      <option value="in_app">In-App</option>
                      <option value="both">Both</option>
                    </select>
                  </label>

                  <label>
                    Repeat
                    <select
                      [(ngModel)]="reminder.repeatPeriod"
                      (ngModelChange)="onRepeatPeriodChange(reminder)"
                    >
                      <option value="once">Once</option>
                      <option value="custom">Custom cadence</option>
                    </select>
                  </label>

                  <label *ngIf="reminder.repeatPeriod === 'custom'">
                    Every
                    <input type="number" min="1" max="52" [(ngModel)]="reminder.repeatEvery" />
                  </label>

                  <label *ngIf="reminder.repeatPeriod === 'custom'">
                    Repeat Unit
                    <select [(ngModel)]="reminder.repeatUnit">
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="validationError" class="validation-msg">{{ validationError }}</div>

        <div class="submit-row split planner-actions">
          <div class="left-actions">
            <button
              type="button"
              class="btn-secondary"
              [disabled]="submitting"
              (click)="goToStage(4)"
            >
              Back
            </button>
            <button
              type="button"
              class="btn-secondary"
              [disabled]="submitting || actionPlans.length >= 5"
              (click)="addActionPlan()"
            >
              Add Action Plan
            </button>
          </div>

          <div class="right-actions">
            <button
              type="button"
              class="btn-submit"
              [disabled]="submitting"
              (click)="submitStage5()"
            >
              {{ submitting ? 'Saving...' : 'Save Planner' }}
            </button>
            <button
              type="button"
              class="btn-submit"
              [disabled]="submitting || !canFinalizeStage5"
              (click)="finalizePlan()"
            >
              {{ submitting ? finalizeButtonBusyLabel : finalizeButtonLabel }}
            </button>
            <button
              *ngIf="canExportPlan"
              type="button"
              class="btn-secondary"
              [disabled]="submitting"
              (click)="downloadCsv()"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .devplan-wrapper {
        padding: 1.25rem;
      }

      .top-bar {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        margin-bottom: 1rem;
      }

      .subject-select {
        min-width: 230px;
        padding: 0.4rem 0.6rem;
      }

      .manager-view-note {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: #fff4d6;
        color: #7a5200;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .flow-strip {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 0.6rem;
        margin-bottom: 1rem;
      }

      .flow-step {
        border: 1px solid #9ab3d7;
        background: #e9f1ff;
        color: #1b3b6f;
        border-radius: 6px;
        padding: 0.8rem 0.6rem;
        font-weight: 600;
        cursor: pointer;
        min-height: 62px;
      }

      .flow-step.active {
        background: #cfe2ff;
        border-color: #628dca;
      }

      .state-msg {
        padding: 0.7rem 0;
        color: #444;
      }

      .state-msg.error {
        color: #b42318;
      }

      .state-msg.success {
        color: #0f7a2f;
      }

      .placeholder-card,
      .stage-card {
        background: #fff;
        border: 1px solid #d6dbe6;
        border-radius: 8px;
        padding: 1rem;
      }

      .stage-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.8rem;
        gap: 0.8rem;
        flex-wrap: wrap;
      }

      .stage-title-row h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .counter {
        font-size: 0.9rem;
        color: #445;
        font-weight: 600;
      }

      .stage5-title-meta {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .workflow-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.28rem 0.72rem;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 700;
        border: 1px solid #c8d3e6;
        background: #eef3fb;
        color: #1f3355;
      }

      .workflow-badge.badge-awaiting-user {
        background: #eef3fb;
        border-color: #c8d3e6;
        color: #355077;
      }

      .workflow-badge.badge-awaiting-manager {
        background: #fff4d6;
        border-color: #f0d591;
        color: #7a5200;
      }

      .workflow-badge.badge-approved {
        background: #dff7e6;
        border-color: #99d2a9;
        color: #196c2e;
      }

      .table-scroll {
        overflow-x: auto;
      }

      .stage-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }

      .stage-table th,
      .stage-table td {
        border: 1px solid #d0d7e2;
        padding: 0.45rem 0.5rem;
        vertical-align: top;
      }

      .stage-table th {
        background: #ebf2fb;
        text-align: left;
      }

      .tick-cell {
        text-align: center;
        vertical-align: middle;
      }

      .stage1-highlight-row td {
        background: #f6f9ff;
      }

      .mapping-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.8rem;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        background: #edf2fa;
        color: #2f4a73;
        font-weight: 700;
        cursor: help;
      }

      .mapping-count-highlight {
        background: #e3ebfb;
        color: #173b78;
      }

      .validation-msg {
        color: #b42318;
        margin-top: 0.65rem;
        font-size: 0.86rem;
      }

      .submit-row {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.8rem;
      }

      .submit-row.split {
        justify-content: space-between;
      }

      .btn-submit {
        border: none;
        border-radius: 6px;
        padding: 0.62rem 1.2rem;
        color: #fff;
        font-weight: 700;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        cursor: pointer;
      }

      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-secondary {
        border: 1px solid #a5b4ce;
        border-radius: 6px;
        padding: 0.62rem 1.2rem;
        color: #1f3355;
        font-weight: 600;
        background: #eef3fb;
        cursor: pointer;
      }

      .btn-secondary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        background: #eaf0fb;
        color: #2a4f87;
      }

      .badge-manager {
        background: #dff7e6;
        color: #196c2e;
      }

      .consolidated-section {
        margin-bottom: 1rem;
      }

      .section-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.6rem;
      }

      .section-header-row h3 {
        margin: 0;
        font-size: 1rem;
      }

      .section-actions {
        display: flex;
        gap: 0.5rem;
      }

      .section-note {
        margin-bottom: 0.75rem;
        color: #4f5f7a;
        font-size: 0.85rem;
      }

      .link-button {
        border: none;
        background: transparent;
        color: #1d4ed8;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }

      .link-button.danger {
        color: #b42318;
      }

      .future-role-group {
        margin-bottom: 0.9rem;
      }

      .group-title {
        padding: 0.45rem 0.6rem;
        background: #fce7ea;
        color: #8a1c2d;
        border-radius: 6px 6px 0 0;
        font-weight: 700;
      }

      .planner-card {
        border: 1px solid #d6dbe6;
        border-radius: 8px;
        padding: 0.8rem;
        margin-bottom: 0.8rem;
        background: #fafcff;
      }

      .other-skill-list {
        display: grid;
        gap: 0.8rem;
      }

      .planner-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.7rem;
        margin-bottom: 0.7rem;
      }

      .planner-grid-top {
        grid-template-columns: 1fr;
      }

      .planner-grid-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .planner-grid-dates {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .planner-grid.wide {
        grid-template-columns: 1fr;
      }

      .planner-grid label,
      .skill-label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.83rem;
        font-weight: 600;
        color: #1f3355;
      }

      .planner-grid input,
      .planner-grid select,
      .planner-grid textarea {
        border: 1px solid #c8d3e6;
        border-radius: 6px;
        padding: 0.45rem 0.5rem;
        font-size: 0.84rem;
        font-family: inherit;
      }

      .skill-chip-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin-bottom: 0.7rem;
      }

      .skill-role-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: center;
      }

      .skill-role-title {
        width: 100%;
        font-size: 0.8rem;
        font-weight: 700;
        color: #36527d;
      }

      .skill-label {
        width: 100%;
      }

      .skill-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.45rem;
        border: 1px solid #ced9ec;
        border-radius: 999px;
        background: #f4f8ff;
        font-size: 0.78rem;
      }

      .reminder-box {
        border: 1px dashed #c8d3e6;
        border-radius: 6px;
        padding: 0.65rem;
      }

      .reminder-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .reminder-actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .reminder-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }

      .reminder-card {
        border: 1px solid #d7e1f0;
        border-radius: 8px;
        background: #f8fbff;
        padding: 0.75rem;
      }

      .reminder-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .reminder-card-title {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1f3355;
      }

      .reminder-preview {
        margin-top: 0.2rem;
        font-size: 0.78rem;
        color: #4b648f;
      }

      .mini {
        padding: 0.3rem 0.55rem;
        font-size: 0.78rem;
      }

      .danger-link {
        color: #a93030;
      }

      .inline-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.84rem;
        font-weight: 600;
        color: #1f3355;
        margin-bottom: 0.55rem;
      }

      .planner-actions {
        gap: 0.8rem;
      }

      .left-actions,
      .right-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      @media (max-width: 1000px) {
        .flow-strip {
          grid-template-columns: 1fr;
        }

        .section-header-row {
          flex-direction: column;
          align-items: flex-start;
        }

        .section-actions {
          flex-wrap: wrap;
        }

        .planner-grid {
          grid-template-columns: 1fr;
        }

        .planner-actions,
        .left-actions,
        .right-actions {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class DevelopmentPlanningComponent implements OnInit {
  loading = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  validationError: string | null = null;

  activeStage = 1;
  selectedUserId: number | null = null;
  teamMembers: DevelopmentTeamMember[] = [];
  stage1Data: Stage1Data | null = null;
  stage2Data: Stage2Data | null = null;
  stage3Data: Stage3Data | null = null;
  stage4Data: Stage4Data | null = null;
  stage5Data: Stage5Data | null = null;

  selectedSkillIds: number[] = [];
  selectedRoleIds: string[] = [];
  selectedTargetSkills: Array<{ selectionKey: string; ksId: number; roleKey: string }> = [];
  actionPlans: Stage5ActionPlan[] = [];

  private stageLoadVersion = 0;
  private stageLoadWatchdog: ReturnType<typeof setTimeout> | null = null;

  readonly stages = [
    { id: 1, label: 'Focus Skills for Role Proficiency' },
    { id: 2, label: 'Target Role Selection' },
    { id: 3, label: 'Focus Skills for Target Roles' },
    { id: 4, label: 'Focus Skills Consolidated' },
    { id: 5, label: 'Development Planner' },
  ];

  readonly actionCategoryOptions: string[] = [
    'Additional Assignment / On-the-Job Training',
    'Case Study analysis and presentation',
    'Case Study writing / Simulation Design',
    'Coaching / Mentoring',
    'Classroom training',
    'Computer-based play on simulators',
    'Cross-Functional Team participation',
    'Deputation - Short Term (e.g., Outage participation, etc.)',
    'External Seminar / Trade Fair participation',
    'Online courses',
    'Self-study and presentation',
    'Shadowing a practitioner, preparing report',
  ];

  readonly otherSkillTypeOptions: string[] = ['Knowledge', 'Situated Skill', 'General Skill'];

  constructor(
    private devPlanService: DevelopmentPlanningService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();
    this.loadStage1();
  }

  get currentStageLabel(): string {
    return this.stages.find((stage) => stage.id === this.activeStage)?.label ?? 'Stage';
  }

  get isManagerView(): boolean {
    return this.selectedUserId !== null;
  }

  get currentPlanStatus(): Stage5Data['plan'] | null {
    return this.stage5Data?.plan ?? null;
  }

  get canExportPlan(): boolean {
    return this.currentPlanStatus?.managerStatus === 'approved';
  }

  get canFinalizeStage5(): boolean {
    const plan = this.currentPlanStatus;

    if (!plan) {
      return false;
    }

    if (this.isManagerView) {
      return plan.userStatus === 'completed' && plan.managerStatus !== 'approved';
    }

    return plan.userStatus === 'stage_5' || plan.userStatus === 'completed';
  }

  get finalizeButtonLabel(): string {
    return this.isManagerView ? 'Decide' : 'Submit Plan';
  }

  get finalizeButtonBusyLabel(): string {
    return this.isManagerView ? 'Deciding...' : 'Submitting...';
  }

  get stage5WorkflowMessage(): string | null {
    const plan = this.currentPlanStatus;

    if (!plan) {
      return null;
    }

    if (plan.managerStatus === 'approved') {
      return this.isManagerView
        ? 'Plan approved. Export is now available to both manager and employee.'
        : 'Plan approved by your manager. Export is now available.';
    }

    if (this.isManagerView) {
      if (plan.userStatus !== 'completed') {
        return 'Employee draft in progress. Decision is available after the employee submits the plan.';
      }

      return 'Manager review pending. Save edits in any stage as needed, then use Decide to approve from Stage 5.';
    }

    if (plan.userStatus === 'completed') {
      return 'Plan submitted. Manager re-review is pending until approval is restored.';
    }

    return 'Complete all stages and submit the plan for manager review.';
  }

  get workflowBadgeLabel(): string {
    const plan = this.currentPlanStatus;

    if (!plan) {
      return 'Draft';
    }

    if (plan.managerStatus === 'approved') {
      return 'Approved';
    }

    if (plan.userStatus === 'completed') {
      return 'Pending Manager Review';
    }

    return 'Draft In Progress';
  }

  get workflowBadgeClass(): string {
    const plan = this.currentPlanStatus;

    if (!plan) {
      return 'badge-awaiting-user';
    }

    if (plan.managerStatus === 'approved') {
      return 'badge-approved';
    }

    if (plan.userStatus === 'completed') {
      return 'badge-awaiting-manager';
    }

    return 'badge-awaiting-user';
  }

  get focusSkillOptions(): Stage5FocusSkill[] {
    const unique = new Map<string, Stage5FocusSkill>();
    for (const item of this.stage5Data?.availableFocusSkills ?? []) {
      const key = `${item.id}::${item.roleLabel ?? ''}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }
    return Array.from(unique.values());
  }

  get focusSkillGroups(): Array<{ roleLabel: string; skills: Stage5FocusSkill[] }> {
    const grouped = new Map<
      string,
      { roleLabel: string; rolePriority: number; order: number; skills: Stage5FocusSkill[] }
    >();

    this.focusSkillOptions.forEach((skill, index) => {
      const roleLabel = skill.roleLabel?.trim() || 'Other Roles';
      const rolePriority = Number.isFinite(skill.rolePriority)
        ? (skill.rolePriority as number)
        : 99;
      const existing = grouped.get(roleLabel);

      if (existing) {
        existing.skills.push(skill);
        existing.rolePriority = Math.min(existing.rolePriority, rolePriority);
        return;
      }

      grouped.set(roleLabel, {
        roleLabel,
        rolePriority,
        order: index,
        skills: [skill],
      });
    });

    return Array.from(grouped.values())
      .sort((left, right) => {
        if (left.rolePriority !== right.rolePriority) {
          return left.rolePriority - right.rolePriority;
        }
        return left.order - right.order;
      })
      .map((group) => ({
        roleLabel: group.roleLabel,
        skills: group.skills,
      }));
  }

  goToStage(stageId: number): void {
    this.activeStage = stageId;
    this.validationError = null;
    this.success = null;
    this.error = null;
    this.loadActiveStage();
  }

  onSubjectChange(userId: number | null): void {
    this.selectedUserId = userId;
    this.activeStage = 1;
    this.stage1Data = null;
    this.stage2Data = null;
    this.stage3Data = null;
    this.stage4Data = null;
    this.stage5Data = null;
    this.selectedSkillIds = [];
    this.selectedRoleIds = [];
    this.selectedTargetSkills = [];
    this.actionPlans = [];
    this.loadStage1();
  }

  isSelected(ksId: number): boolean {
    return this.selectedSkillIds.includes(ksId);
  }

  getStage1MappingTooltip(skill: Stage1Data['availableSkills'][number]): string {
    if (skill.mappedSubSubFnNames.length === 0) {
      return 'No mapped sub-sub-functions';
    }

    return skill.mappedSubSubFnNames.join('\n');
  }

  toggleSkill(ksId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.validationError = null;

    if (checked) {
      const max = this.stage1Data?.maxSelectableSkills ?? 3;
      if (this.selectedSkillIds.length >= max) {
        (event.target as HTMLInputElement).checked = false;
        this.validationError = `You can select a maximum of ${max} focus skills.`;
        return;
      }
      if (!this.selectedSkillIds.includes(ksId)) {
        this.selectedSkillIds = [...this.selectedSkillIds, ksId];
      }
      return;
    }

    this.selectedSkillIds = this.selectedSkillIds.filter((id) => id !== ksId);
  }

  submitStage1(): void {
    if (!this.stage1Data) {
      return;
    }

    const max = this.stage1Data.maxSelectableSkills ?? 3;
    if (this.selectedSkillIds.length < 1 || this.selectedSkillIds.length > max) {
      this.validationError = `Select between 1 and ${max} focus skills before submitting.`;
      return;
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    this.devPlanService.saveStage1(this.selectedSkillIds, this.selectedUserId).subscribe({
      next: (res) => {
        this.success = res.message;
        this.submitting = false;
        this.goToStage(2);
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to save Stage 1.';
        this.submitting = false;
      },
    });
  }

  isRoleSelected(roleKey: string): boolean {
    return this.selectedRoleIds.includes(roleKey);
  }

  toggleRole(roleKey: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.validationError = null;

    if (checked) {
      const max = this.stage2Data?.maxSelectableRoles ?? 2;
      if (this.selectedRoleIds.length >= max) {
        (event.target as HTMLInputElement).checked = false;
        this.validationError = `You can select a maximum of ${max} target roles.`;
        return;
      }
      if (!this.selectedRoleIds.includes(roleKey)) {
        this.selectedRoleIds = [...this.selectedRoleIds, roleKey];
      }
      return;
    }

    this.selectedRoleIds = this.selectedRoleIds.filter((id) => id !== roleKey);
  }

  submitStage2(): void {
    if (!this.stage2Data) {
      return;
    }

    const max = this.stage2Data.maxSelectableRoles ?? 2;
    if (this.selectedRoleIds.length < 1 || this.selectedRoleIds.length > max) {
      this.validationError = `Select between 1 and ${max} target roles before submitting.`;
      return;
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    this.devPlanService.saveStage2(this.selectedRoleIds, this.selectedUserId).subscribe({
      next: (res) => {
        this.success = res.message;
        this.submitting = false;
        this.goToStage(3);
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to save Stage 2.';
        this.submitting = false;
      },
    });
  }

  isTargetSkillSelected(selectionKey: string): boolean {
    return this.selectedTargetSkills.some((item) => item.selectionKey === selectionKey);
  }

  toggleTargetSkill(selectionKey: string, ksId: number, roleKey: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.validationError = null;

    if (checked) {
      const max = this.stage3Data?.maxSelectableSkills ?? 3;
      if (this.selectedTargetSkills.length >= max) {
        (event.target as HTMLInputElement).checked = false;
        this.validationError = `You can select a maximum of ${max} focus skills.`;
        return;
      }
      if (!this.selectedTargetSkills.some((item) => item.selectionKey === selectionKey)) {
        this.selectedTargetSkills = [...this.selectedTargetSkills, { selectionKey, ksId, roleKey }];
      }
      return;
    }

    this.selectedTargetSkills = this.selectedTargetSkills.filter(
      (item) => item.selectionKey !== selectionKey,
    );
  }

  submitStage3(): void {
    if (!this.stage3Data) {
      return;
    }

    const max = this.stage3Data.maxSelectableSkills ?? 3;
    if (this.selectedTargetSkills.length < 1 || this.selectedTargetSkills.length > max) {
      this.validationError = `Select between 1 and ${max} focus skills before submitting.`;
      return;
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    this.devPlanService
      .saveStage3(
        this.selectedTargetSkills.map((item) => ({ ksId: item.ksId, roleKey: item.roleKey })),
        this.selectedUserId,
      )
      .subscribe({
        next: (res) => {
          this.success = res.message;
          this.submitting = false;
          this.goToStage(4);
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Failed to save Stage 3.';
          this.submitting = false;
        },
      });
  }

  addActionPlan(): void {
    if (this.actionPlans.length >= 5) {
      return;
    }
    this.actionPlans = [
      ...this.actionPlans,
      this.createEmptyActionPlan(this.actionPlans.length + 1),
    ];
  }

  removeActionPlan(index: number): void {
    this.actionPlans = this.actionPlans.filter((_, i) => i !== index);
  }

  toggleAddressedSkill(plan: Stage5ActionPlan, ksId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ids = Array.isArray(plan.addressedSkillsIds) ? [...plan.addressedSkillsIds] : [];

    if (checked) {
      if (!ids.includes(ksId)) {
        ids.push(ksId);
      }
    } else {
      const idx = ids.indexOf(ksId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      }
    }

    plan.addressedSkillsIds = ids;
  }

  isAddressedSkillSelected(plan: Stage5ActionPlan, ksId: string): boolean {
    return (plan.addressedSkillsIds ?? []).includes(ksId);
  }

  getSkillTypeLabel(skill: Stage5FocusSkill): string {
    const skillTypeById = new Map<string, string>();

    for (const item of this.stage4Data?.roleProficiencySkills ?? []) {
      skillTypeById.set(String(item.ksId), item.knowledgeSkillType);
    }
    for (const group of this.stage4Data?.futureRolePrepGroups ?? []) {
      for (const item of group.skills) {
        skillTypeById.set(String(item.ksId), item.knowledgeSkillType);
      }
    }
    for (const item of this.stage4Data?.otherSkills ?? []) {
      if (item.id) {
        skillTypeById.set(`other:${item.id}`, item.knowledgeSkillType);
      }
    }

    const raw = (skill.knowledgeSkillType ?? skillTypeById.get(skill.id) ?? '')
      .trim()
      .toLowerCase();

    if (raw === 'k' || raw.startsWith('knowledge')) {
      return 'Knowledge';
    }
    if (
      raw === 'ss' ||
      raw === 's' ||
      raw.includes('situated') ||
      raw.includes('skill - situated') ||
      raw.includes('situated skill')
    ) {
      return 'Situated Skill';
    }
    if (
      raw === 'gs' ||
      raw === 'g' ||
      raw.includes('general') ||
      raw.includes('skill - general') ||
      raw.includes('general skill')
    ) {
      return 'General Skill';
    }

    return 'Knowledge / Skill';
  }

  getStage5SkillDisplayLabel(skill: Stage5FocusSkill): string {
    const ksName = this.getStage5SkillName(skill);
    const definition = this.getStage5SkillDefinition(skill);

    if (ksName && definition) {
      return `${ksName}: ${definition}`;
    }

    if (ksName) {
      return ksName;
    }

    return skill.displayLabel?.trim() || definition;
  }

  getStage5SkillName(skill: Stage5FocusSkill): string {
    const directName = skill.ksName?.trim() || '';
    if (directName) {
      return directName;
    }

    const parsedLabel = this.parseStage5DisplayLabel(skill.displayLabel);
    if (parsedLabel.ksName) {
      return parsedLabel.ksName;
    }

    return this.getStage4SkillDetails(skill.id).ksName;
  }

  getStage5SkillDefinition(skill: Stage5FocusSkill): string {
    const directDefinition = skill.ksdefinition?.trim() || '';
    if (directDefinition) {
      return directDefinition;
    }

    const parsedLabel = this.parseStage5DisplayLabel(skill.displayLabel);
    if (parsedLabel.ksDefinition) {
      return parsedLabel.ksDefinition;
    }

    return this.getStage4SkillDetails(skill.id).ksDefinition;
  }

  private parseStage5DisplayLabel(
    displayLabel: string | null | undefined,
  ): { ksName: string; ksDefinition: string } {
    const normalized = displayLabel?.trim() || '';
    if (!normalized) {
      return { ksName: '', ksDefinition: '' };
    }

    const separatorIndex = normalized.indexOf(': ');
    if (separatorIndex === -1) {
      return { ksName: '', ksDefinition: normalized };
    }

    return {
      ksName: normalized.slice(0, separatorIndex).trim(),
      ksDefinition: normalized.slice(separatorIndex + 2).trim(),
    };
  }

  private getStage4SkillDetails(skillId: string): { ksName: string; ksDefinition: string } {
    for (const item of this.stage4Data?.roleProficiencySkills ?? []) {
      if (String(item.ksId) === skillId) {
        return {
          ksName: item.ksName?.trim() || '',
          ksDefinition: item.ksDefinition?.trim() || '',
        };
      }
    }

    for (const group of this.stage4Data?.futureRolePrepGroups ?? []) {
      for (const item of group.skills) {
        if (String(item.ksId) === skillId) {
          return {
            ksName: item.ksName?.trim() || '',
            ksDefinition: item.ksDefinition?.trim() || '',
          };
        }
      }
    }

    for (const item of this.stage4Data?.otherSkills ?? []) {
      if (`other:${item.id}` === skillId) {
        return {
          ksName: item.ksName?.trim() || '',
          ksDefinition: item.ksDefinition?.trim() || '',
        };
      }
    }

    return { ksName: '', ksDefinition: '' };
  }

  getOtherSkillCategoryOptions(knowledgeSkillType: string): string[] {
    return (this.stage4Data?.otherSkillCategoryOptions ?? [])
      .filter((option) => option.knowledgeSkillType === knowledgeSkillType)
      .map((option) => option.ksCategory);
  }

  onOtherSkillTypeChange(skill: Stage4OtherSkillDraft): void {
    const options = this.getOtherSkillCategoryOptions(skill.knowledgeSkillType);
    if (!options.includes(skill.ksCategory)) {
      skill.ksCategory = '';
    }
  }

  submitStage4(): void {
    if (!this.stage4Data) {
      return;
    }

    const otherSkills = (this.stage4Data.otherSkills ?? []).slice(0, 2).map((skill, index) => ({
      id: skill.id,
      sequence: skill.sequence ?? index + 1,
      knowledgeSkillType: skill.knowledgeSkillType?.trim() || '',
      ksCategory: skill.ksCategory?.trim() || '',
      ksName: skill.ksName?.trim() || '',
      ksDefinition: skill.ksDefinition?.trim() || '',
    }));

    const incompleteSkill = otherSkills.find((skill) => {
      const values = [skill.knowledgeSkillType, skill.ksCategory, skill.ksName, skill.ksDefinition];
      const filledCount = values.filter(Boolean).length;
      return filledCount > 0 && filledCount < values.length;
    });

    if (incompleteSkill) {
      this.validationError =
        'Each Other Knowledge/Skill entry must include type, category, name, and definition.';
      return;
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    this.devPlanService.saveStage4(otherSkills, this.selectedUserId).subscribe({
      next: (res) => {
        this.success = res.message;
        this.submitting = false;
        this.goToStage(5);
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to save Stage 4.';
        this.submitting = false;
      },
    });
  }

  toggleReminder(plan: Stage5ActionPlan, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    plan.reminders = checked ? [this.createDefaultReminder('employee')] : [];
  }

  addReminder(
    plan: Stage5ActionPlan,
    recipientList: ReminderDraft['recipientList'] = 'employee',
  ): void {
    if ((plan.reminders?.length ?? 0) >= 8) {
      this.validationError = 'Each action plan can have at most 8 reminders.';
      return;
    }

    this.validationError = null;
    plan.reminders = [...(plan.reminders ?? []), this.createDefaultReminder(recipientList)];
  }

  removeReminder(plan: Stage5ActionPlan, reminderIndex: number): void {
    plan.reminders = (plan.reminders ?? []).filter((_, index) => index !== reminderIndex);
  }

  onRepeatPeriodChange(reminder: ReminderDraft): void {
    applyRepeatPeriodDefaults(reminder);
  }

  getReminderPreviewLabel(plan: Stage5ActionPlan, reminder: ReminderDraft): string {
    return buildReminderPreviewLabel(plan, reminder);
  }

  submitStage5(): void {
    if (this.actionPlans.length < 1) {
      this.validationError = 'Add at least one action plan before saving.';
      return;
    }

    if (this.actionPlans.some((plan) => !plan.actionCategory?.trim())) {
      this.validationError = 'Action Category is required for each action plan.';
      return;
    }

    for (let index = 0; index < this.actionPlans.length; index++) {
      const dateValidationError = this.validateActionPlanDates(this.actionPlans[index], index + 1);
      if (dateValidationError) {
        this.validationError = dateValidationError;
        return;
      }

      const reminderValidationError = validateReminderPlanConfiguration(
        this.actionPlans[index],
        index + 1,
      );
      if (reminderValidationError) {
        this.validationError = reminderValidationError;
        return;
      }
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    const payload = this.actionPlans.slice(0, 5).map((plan, index) => ({
      ...plan,
      sequence: index + 1,
      actionCategory: plan.actionCategory.trim(),
      startDate: this.normalizeDate(plan.startDate),
      completionDate: this.normalizeDate(plan.completionDate),
      milestone1Date: this.normalizeDate(plan.milestone1Date),
      milestone1Text: plan.milestone1Text?.trim() || null,
      milestone2Date: this.normalizeDate(plan.milestone2Date),
      milestone2Text: plan.milestone2Text?.trim() || null,
      reminders: (plan.reminders ?? []).map((reminder) => ({
        id: reminder.id,
        isActive: reminder.isActive !== false,
        remindRef: reminder.remindRef,
        remindDays: Number(reminder.remindDays) || 0,
        remindBeforeAfter: reminder.remindBeforeAfter,
        remindVia: reminder.remindVia,
        repeatPeriod: reminder.repeatPeriod,
        repeatEvery: reminder.repeatPeriod === 'custom' ? Number(reminder.repeatEvery) || 1 : null,
        repeatUnit: reminder.repeatPeriod === 'custom' ? (reminder.repeatUnit ?? 'weeks') : null,
        recipientList: reminder.recipientList,
      })),
    }));

    this.devPlanService.saveStage5(payload, this.selectedUserId).subscribe({
      next: (res) => {
        this.success = res.message;
        this.submitting = false;
        this.loadStage5();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to save Stage 5.';
        this.submitting = false;
      },
    });
  }

  finalizePlan(): void {
    if (!this.canFinalizeStage5) {
      return;
    }

    this.submitting = true;
    this.validationError = null;
    this.error = null;
    this.success = null;

    const isManager = this.selectedUserId !== null;
    this.devPlanService.finalizePlan(this.selectedUserId, isManager).subscribe({
      next: (res) => {
        this.success = res.message;
        this.submitting = false;
        this.loadStage5();
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Failed to finalize plan.';
        this.submitting = false;
      },
    });
  }

  downloadCsv(): void {
    this.error = null;
    this.success = null;

    this.devPlanService.exportCsv(this.selectedUserId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `development-plan-${this.selectedUserId ?? 'self'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.error =
          err?.error?.error ?? 'Failed to export CSV. Ensure manager approval is complete.';
      },
    });
  }

  private loadTeamMembers(): void {
    this.devPlanService.getTeamMembers().subscribe({
      next: (res) => {
        this.teamMembers = res.data;
      },
      error: () => {
        this.teamMembers = [];
      },
    });
  }

  private loadStage1(): void {
    const loadVersion = this.beginStageLoad();

    this.devPlanService.getStage1(this.selectedUserId).subscribe({
      next: (res) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage1Data = res.data;
        this.selectedSkillIds = [...(res.data?.selectedSkillIds ?? [])];
        this.finishStageLoad(loadVersion);
      },
      error: (err) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        const isTimeout = err?.name === 'TimeoutError';
        this.error = isTimeout
          ? 'Loading Stage 1 timed out. Please retry.'
          : (err?.error?.error ?? 'Failed to load Stage 1.');
        this.stage1Data = null;
        this.selectedSkillIds = [];
        this.finishStageLoad(loadVersion);
      },
    });
  }

  private loadStage2(): void {
    const loadVersion = this.beginStageLoad();

    this.devPlanService.getStage2(this.selectedUserId).subscribe({
      next: (res) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage2Data = res.data;
        this.selectedRoleIds = [...(res.data?.selectedRoleIds ?? [])];
        this.finishStageLoad(loadVersion);
      },
      error: (err) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        const isTimeout = err?.name === 'TimeoutError';
        this.error = isTimeout
          ? 'Loading Stage 2 timed out. Please retry.'
          : (err?.error?.error ?? 'Failed to load Stage 2.');
        this.stage2Data = null;
        this.selectedRoleIds = [];
        this.finishStageLoad(loadVersion);
      },
    });
  }

  private loadStage3(): void {
    const loadVersion = this.beginStageLoad();

    this.devPlanService.getStage3(this.selectedUserId).subscribe({
      next: (res) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage3Data = res.data;
        this.selectedTargetSkills =
          res.data?.selectedSkills
            ?.filter(
              (item): item is { selectionKey: string; ksId: number; roleKey: string } =>
                typeof item.roleKey === 'string',
            )
            .map((item) => ({
              selectionKey: item.selectionKey,
              ksId: item.ksId,
              roleKey: item.roleKey,
            })) ?? [];
        this.finishStageLoad(loadVersion);
      },
      error: (err) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        const isTimeout = err?.name === 'TimeoutError';
        this.error = isTimeout
          ? 'Loading Stage 3 timed out. Please retry.'
          : (err?.error?.error ?? 'Failed to load Stage 3.');
        this.stage3Data = null;
        this.selectedTargetSkills = [];
        this.finishStageLoad(loadVersion);
      },
    });
  }

  private loadStage4(): void {
    const loadVersion = this.beginStageLoad();

    this.devPlanService.getStage4(this.selectedUserId).subscribe({
      next: (res) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage4Data = res.data ? this.normalizeStage4Data(res.data) : null;
        this.finishStageLoad(loadVersion);
      },
      error: (err) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        const isTimeout = err?.name === 'TimeoutError';
        this.error = isTimeout
          ? 'Loading Stage 4 timed out. Please retry.'
          : (err?.error?.error ?? 'Failed to load Stage 4.');
        this.stage4Data = null;
        this.finishStageLoad(loadVersion);
      },
    });
  }

  private loadStage5(): void {
    const loadVersion = this.beginStageLoad();

    const loadStage5Data = () => {
      this.devPlanService.getStage5(this.selectedUserId).subscribe({
        next: (res) => {
          if (!this.isCurrentLoad(loadVersion)) {
            return;
          }

          this.stage5Data = res.data ? this.normalizeStage5Data(res.data) : null;
          const loadedPlans = (this.stage5Data?.actionPlans ?? []).map((plan, index) =>
            this.normalizeActionPlan(plan, index + 1),
          );
          this.actionPlans = loadedPlans.length > 0 ? loadedPlans : [this.createEmptyActionPlan(1)];
          this.finishStageLoad(loadVersion);
        },
        error: (err) => {
          if (!this.isCurrentLoad(loadVersion)) {
            return;
          }
          const isTimeout = err?.name === 'TimeoutError';
          this.error = isTimeout
            ? 'Loading Stage 5 timed out. Please retry.'
            : (err?.error?.error ?? 'Failed to load Stage 5.');
          this.stage5Data = null;
          this.actionPlans = [];
          this.finishStageLoad(loadVersion);
        },
      });
    };

    if (this.stage4Data !== null) {
      loadStage5Data();
      return;
    }

    this.devPlanService.getStage4(this.selectedUserId).subscribe({
      next: (res) => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage4Data = res.data ? this.normalizeStage4Data(res.data) : null;
        loadStage5Data();
      },
      error: () => {
        if (!this.isCurrentLoad(loadVersion)) {
          return;
        }
        this.stage4Data = null;
        loadStage5Data();
      },
    });
  }

  private normalizeStage4Data(data: Stage4Data): Stage4Data {
    const otherSkills = Array.from({ length: 2 }, (_, index) => {
      const existing = data.otherSkills?.[index];

      return {
        id: existing?.id,
        sequence: existing?.sequence ?? index + 1,
        knowledgeSkillType: existing?.knowledgeSkillType ?? '',
        ksCategory: existing?.ksCategory ?? '',
        ksName: existing?.ksName ?? '',
        ksDefinition: existing?.ksDefinition ?? '',
      };
    });

    return {
      ...data,
      otherSkills,
    };
  }

  private normalizeStage5Data(data: Stage5Data): Stage5Data {
    return {
      ...data,
      availableFocusSkills: (data.availableFocusSkills ?? []).map((skill) => ({
        ...skill,
        id: String(skill.id ?? ''),
        ksName: skill.ksName ?? null,
        ksdefinition: skill.ksdefinition ?? null,
        displayLabel: skill.displayLabel ?? null,
        knowledgeSkillType: skill.knowledgeSkillType ?? null,
        roleLabel: skill.roleLabel ?? null,
      })),
    };
  }

  private normalizeActionPlan(raw: Stage5ActionPlan, sequence: number): Stage5ActionPlan {
    const reminders = Array.isArray(raw.reminders)
      ? raw.reminders
          .map((reminder) => this.normalizeReminder(reminder))
          .filter((item): item is ReminderDraft => item !== null)
      : [];

    return {
      id: raw.id,
      sequence: raw.sequence ?? sequence,
      actionCategory: raw.actionCategory ?? '',
      taskDescription: raw.taskDescription ?? null,
      successCriteria: raw.successCriteria ?? null,
      startDate: this.normalizeDate(raw.startDate),
      completionDate: this.normalizeDate(raw.completionDate),
      milestone1Date: this.normalizeDate(raw.milestone1Date),
      milestone1Text: raw.milestone1Text ?? null,
      milestone2Date: this.normalizeDate(raw.milestone2Date),
      milestone2Text: raw.milestone2Text ?? null,
      progressNotes: raw.progressNotes ?? null,
      addressedSkillsIds: Array.isArray(raw.addressedSkillsIds)
        ? raw.addressedSkillsIds
            .map((id) => this.normalizeAddressedSkillKey(id))
            .filter((id): id is string => id !== null)
        : [],
      reminders,
    };
  }

  private normalizeAddressedSkillKey(value: unknown): string | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value > 0 ? String(value) : null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed) || /^other:\d+$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  private normalizeReminder(reminder: any): ReminderDraft | null {
    if (!reminder || typeof reminder !== 'object') {
      return null;
    }

    const recipient =
      typeof reminder.recipientList === 'string'
        ? reminder.recipientList
        : (reminder.recipientList?.type ?? 'employee');

    return {
      id: reminder.id,
      isActive: reminder.isActive !== false,
      remindRef: reminder.remindRef ?? 'completion_date',
      remindDays: Number(reminder.remindDays) || 0,
      remindBeforeAfter: reminder.remindBeforeAfter ?? 'before',
      remindVia: reminder.remindVia ?? 'email',
      repeatPeriod: reminder.repeatPeriod === 'custom' ? 'custom' : 'once',
      repeatEvery:
        reminder.repeatPeriod === 'custom' || reminder.repeatPeriod === 'weekly'
          ? Math.max(1, Number(reminder.repeatEvery) || 1)
          : null,
      repeatUnit:
        reminder.repeatPeriod === 'custom'
          ? (reminder.repeatUnit ?? 'weeks')
          : reminder.repeatPeriod === 'weekly'
            ? 'weeks'
            : null,
      recipientList: recipient,
      nextScheduledAt: this.normalizeDate(reminder.nextScheduledAt),
    };
  }

  private createEmptyActionPlan(sequence: number): Stage5ActionPlan {
    return {
      sequence,
      actionCategory: '',
      taskDescription: null,
      successCriteria: null,
      startDate: null,
      completionDate: null,
      milestone1Date: null,
      milestone1Text: null,
      milestone2Date: null,
      milestone2Text: null,
      progressNotes: null,
      addressedSkillsIds: [],
      reminders: [],
    };
  }

  private createDefaultReminder(
    recipientList: ReminderDraft['recipientList'] = 'employee',
  ): ReminderDraft {
    return {
      isActive: true,
      remindRef: 'completion_date',
      remindDays: 3,
      remindBeforeAfter: 'before',
      remindVia: 'email',
      repeatPeriod: 'once',
      repeatEvery: null,
      repeatUnit: null,
      recipientList,
      nextScheduledAt: null,
    };
  }

  private normalizeDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    return text.includes('T') ? text.split('T')[0] : text;
  }

  private validateActionPlanDates(plan: Stage5ActionPlan, displayIndex: number): string | null {
    const dates = [
      { label: 'Start Date', value: this.normalizeDate(plan.startDate) },
      { label: 'Milestone 1 Date', value: this.normalizeDate(plan.milestone1Date) },
      { label: 'Milestone 2 Date', value: this.normalizeDate(plan.milestone2Date) },
      { label: 'Completion Date', value: this.normalizeDate(plan.completionDate) },
    ];

    const present = dates.filter((item) => !!item.value);
    for (let i = 0; i < present.length - 1; i++) {
      const current = present[i];
      const next = present[i + 1];

      if ((current.value as string) >= (next.value as string)) {
        return `Action Plan ${displayIndex}: ${current.label} must be earlier than ${next.label}.`;
      }
    }

    return null;
  }

  private beginStageLoad(): number {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.validationError = null;

    const loadVersion = ++this.stageLoadVersion;
    this.clearStageLoadWatchdog();
    this.stageLoadWatchdog = setTimeout(() => {
      this.ngZone.run(() => {
        if (!this.isCurrentLoad(loadVersion) || !this.loading) {
          return;
        }
        this.loading = false;
        this.error = `Loading ${this.currentStageLabel} timed out. Please retry.`;
      });
    }, 16000);

    return loadVersion;
  }

  private finishStageLoad(loadVersion: number): void {
    if (!this.isCurrentLoad(loadVersion)) {
      return;
    }
    this.clearStageLoadWatchdog();
    this.loading = false;
  }

  private isCurrentLoad(loadVersion: number): boolean {
    return loadVersion === this.stageLoadVersion;
  }

  private clearStageLoadWatchdog(): void {
    if (this.stageLoadWatchdog !== null) {
      clearTimeout(this.stageLoadWatchdog);
      this.stageLoadWatchdog = null;
    }
  }

  private loadActiveStage(): void {
    if (this.activeStage === 1) {
      this.loadStage1();
      return;
    }
    if (this.activeStage === 2) {
      this.loadStage2();
      return;
    }
    if (this.activeStage === 3) {
      this.loadStage3();
      return;
    }
    if (this.activeStage === 4) {
      this.loadStage4();
      return;
    }
    if (this.activeStage === 5) {
      this.loadStage5();
    }
  }
}
