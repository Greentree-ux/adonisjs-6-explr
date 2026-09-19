import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Company {
  id: number;
  coName: string;
}

interface Policy {
  id: number;
  coId: number;
  levelRestriction: number | null;
  functionScope: 'same_function' | 'same_location' | 'same_business' | 'same_company';
}

interface ResetState {
  currentPeriod: {
    id: number;
    sequence: number;
    startedAt: string;
    label: string;
  };
  pendingReset: {
    id: number;
    requestedAt: string;
    firstApproverName: string;
    firstApproverUserId: number;
  } | null;
  lastCompletedResetAt: string | null;
  nextEligibleAt: string | null;
  canClick: boolean;
  currentUserCanConfirm: boolean;
  currentUserAlreadyApproved: boolean;
  statusMessage: string;
}

@Component({
  selector: 'app-access-policy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Access Policy</h2>

      <div class="alert error" *ngIf="error">{{ error }}</div>
      <div class="alert success" *ngIf="success">{{ success }}</div>

      <div class="card" *ngIf="loading">
        <p>Loading...</p>
      </div>

      <div class="card" *ngIf="!loading && companies.length === 0">
        <p class="empty-text">No companies found. Please set up company data first.</p>
      </div>

      <div class="card" *ngIf="!loading && companies.length > 0">
        <h3>Set Access Restrictions</h3>
        <p class="help-text">Control what Function Roles and Role Skills employees can see.</p>

        <div class="form-group" *ngIf="companies.length > 1">
          <label>Company</label>
          <select [(ngModel)]="selectedCoId" name="company" (ngModelChange)="onCompanyChange()">
            <option *ngFor="let co of companies" [ngValue]="co.id">{{ co.coName }}</option>
          </select>
        </div>
        <div class="company-label" *ngIf="companies.length === 1">
          <strong>Company:</strong> {{ companies[0].coName }}
        </div>

        <hr />

        <div class="policy-section">
          <h4>Level Restriction</h4>
          <p class="help-text">
            How many work levels above the employee's own level can they see? For example, 0 = same
            level only, 1 = up to one level above, etc. "No restriction" allows access to all
            levels.
          </p>
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                name="levelRestriction"
                [value]="null"
                [(ngModel)]="form.levelRestriction"
              />
              No restriction (all levels visible)
            </label>
            <label class="radio-label" *ngFor="let n of levelOptions">
              <input
                type="radio"
                name="levelRestriction"
                [value]="n"
                [(ngModel)]="form.levelRestriction"
              />
              {{
                n === 0
                  ? 'Same level only (0 levels above)'
                  : n + ' level' + (n > 1 ? 's' : '') + ' above'
              }}
            </label>
          </div>
        </div>

        <hr />

        <div class="policy-section">
          <h4>Function Scope</h4>
          <p class="help-text">
            Which functions can employees see? This restricts visibility based on the organisational
            hierarchy.
          </p>
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                name="functionScope"
                value="same_function"
                [(ngModel)]="form.functionScope"
              />
              Same function only
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="functionScope"
                value="same_location"
                [(ngModel)]="form.functionScope"
              />
              All functions at the same location
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="functionScope"
                value="same_business"
                [(ngModel)]="form.functionScope"
              />
              All functions in the same business unit
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="functionScope"
                value="same_company"
                [(ngModel)]="form.functionScope"
              />
              All functions in the company (no restriction)
            </label>
          </div>
        </div>

        <hr />

        <div class="button-row">
          <button (click)="onSave()" [disabled]="saving" class="btn-primary">
            {{ saving ? 'Saving...' : 'Save Access Policy' }}
          </button>
        </div>
      </div>

      <div class="card reset-card" *ngIf="!loading && resetState">
        <h3>Assessment - Development Planning Reset</h3>
        <p class="help-text">
          Current active period: <strong>{{ resetState.currentPeriod.label }}</strong>
        </p>
        <p class="help-text" *ngIf="resetState.lastCompletedResetAt">
          Last reset confirmed on {{ resetState.lastCompletedResetAt | date: 'dd-MM-yyyy' }}
        </p>
        <button
          class="btn-primary reset-button"
          [class.awaiting-second]="!!resetState.pendingReset"
          [disabled]="resetLoading || !resetState.canClick"
          (click)="onStartFreshPeriod()"
        >
          {{ resetLoading ? 'Processing...' : 'Start Fresh Assessment - Development Planning' }}
        </button>
        <p class="status-note">{{ resetState.statusMessage }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-container {
        padding: 2rem;
        max-width: 700px;
        margin: 0 auto;
      }
      h2 {
        margin-bottom: 1.5rem;
      }
      .card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
      }
      h3 {
        margin: 0 0 0.5rem;
      }
      h4 {
        margin: 0 0 0.25rem;
      }
      .help-text {
        color: #666;
        font-size: 0.9rem;
        margin: 0 0 1rem;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      .form-group label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 500;
      }
      .form-group select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }
      .company-label {
        margin-bottom: 1rem;
        font-size: 1rem;
      }
      hr {
        border: none;
        border-top: 1px solid #eee;
        margin: 1.25rem 0;
      }
      .policy-section {
        margin-bottom: 0.5rem;
      }
      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .radio-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        padding: 0.4rem 0;
      }
      .radio-label input[type='radio'] {
        margin: 0;
      }
      .button-row {
        display: flex;
        gap: 0.5rem;
      }
      .btn-primary {
        padding: 0.5rem 1.5rem;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      }
      .btn-primary:disabled {
        opacity: 0.6;
      }
      .reset-card {
        border: 1px solid #f1e2b8;
        background: linear-gradient(180deg, #fffdf6 0%, #fff8e8 100%);
      }
      .reset-button.awaiting-second {
        background: linear-gradient(135deg, #d97706, #f59e0b);
      }
      .status-note {
        margin: 0.85rem 0 0;
        color: #7c2d12;
        font-size: 0.92rem;
      }
      .alert {
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 1rem;
      }
      .error {
        background: #fee;
        color: #c00;
      }
      .success {
        background: #efe;
        color: #060;
      }
      .empty-text {
        color: #888;
      }
    `,
  ],
})
export class AccessPolicyComponent {
  companies: Company[] = [];
  selectedCoId: number | null = null;
  form: { levelRestriction: number | null; functionScope: string } = {
    levelRestriction: null,
    functionScope: 'same_company',
  };
  levelOptions = [0, 1, 2, 3, 4, 5];
  policies: Policy[] = [];
  resetState: ResetState | null = null;

  loading = true;
  saving = false;
  resetLoading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http
      .get<{ data: { companies: Company[]; policies: Policy[]; resetState: ResetState } }>(
        '/api/admin/access-policy'
      )
      .subscribe({
        next: (res) => {
          this.companies = res.data.companies;
          this.policies = res.data.policies;
          this.resetState = res.data.resetState;
          if (this.companies.length > 0) {
            this.selectedCoId = this.companies[0].id;
            this.onCompanyChange();
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load access policy data';
          this.loading = false;
        },
      });
  }

  onStartFreshPeriod(): void {
    if (!this.resetState?.canClick) {
      return;
    }

    this.resetLoading = true;
    this.error = null;
    this.success = null;

    this.http
      .post<{ message: string; data: { resetState: ResetState } }>(
        '/api/admin/performance-period-reset',
        {}
      )
      .subscribe({
        next: (res) => {
          this.success = res.message;
          this.resetState = res.data.resetState;
          this.resetLoading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to start a fresh assessment-development period';
          this.resetLoading = false;
        },
      });
  }

  onCompanyChange(): void {
    const existing = this.policies.find((p) => p.coId === this.selectedCoId);
    if (existing) {
      this.form.levelRestriction = existing.levelRestriction;
      this.form.functionScope = existing.functionScope;
    } else {
      this.form.levelRestriction = null;
      this.form.functionScope = 'same_company';
    }
    this.error = null;
    this.success = null;
  }

  onSave(): void {
    if (!this.selectedCoId) return;
    this.saving = true;
    this.error = null;
    this.success = null;

    this.http
      .put<{ message: string; data: { policy: Policy } }>('/api/admin/access-policy', {
        coId: this.selectedCoId,
        levelRestriction: this.form.levelRestriction,
        functionScope: this.form.functionScope,
      })
      .subscribe({
        next: (res) => {
          this.success = res.message;
          // Update local policies cache
          const idx = this.policies.findIndex((p) => p.coId === this.selectedCoId);
          if (idx >= 0) {
            this.policies[idx] = res.data.policy;
          } else {
            this.policies.push(res.data.policy);
          }
          this.saving = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to save access policy';
          this.saving = false;
        },
      });
  }
}
