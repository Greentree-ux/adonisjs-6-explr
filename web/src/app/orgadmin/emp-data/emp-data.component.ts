import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface EmpDataRecord {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  empId: number | null
  createdAt: string
}

@Component({
  selector: 'app-emp-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Employee Data</h2>

      <!-- Add / Edit form -->
      <div class="card">
        <h3>{{ editingId ? 'Edit Employee' : 'Add Employee' }}</h3>
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="form.email" name="email" required />
            </div>
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [(ngModel)]="form.firstName" name="firstName" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [(ngModel)]="form.lastName" name="lastName" />
            </div>
            <div class="form-group">
              <label>Emp ID</label>
              <input type="number" [(ngModel)]="form.empId" name="empId" />
            </div>
          </div>
          <div class="button-row">
            <button type="submit" [disabled]="loading" class="btn-primary">
              {{ loading ? 'Saving...' : (editingId ? 'Update' : 'Add Employee') }}
            </button>
            <button type="button" *ngIf="editingId" (click)="cancelEdit()" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>

      <!-- List -->
      <div class="card">
        <h3>Employees ({{ employees.length }})</h3>
        <table class="data-table" *ngIf="employees.length > 0">
          <thead>
            <tr>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Emp ID</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of employees">
              <td>{{ e.email }}</td>
              <td>{{ e.firstName }}</td>
              <td>{{ e.lastName }}</td>
              <td>{{ e.empId }}</td>
              <td>{{ e.createdAt | date:'short' }}</td>
              <td class="action-cell">
                <button class="btn-edit" (click)="onEdit(e)">Edit</button>
                <button class="btn-danger" (click)="onRemove(e)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="employees.length === 0" class="empty-text">No employee data yet.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    h3 { margin: 0 0 1rem; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .form-group { flex: 1; min-width: 150px; }
    .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
    .form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    .button-row { display: flex; gap: 0.5rem; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-secondary { padding: 0.5rem 1.5rem; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn-edit { padding: 0.25rem 0.75rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.25rem; }
    .btn-danger { padding: 0.25rem 0.75rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .action-cell { white-space: nowrap; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
  `]
})
export class EmpDataComponent {
  employees: EmpDataRecord[] = []
  form = { email: '', firstName: '', lastName: '', empId: null as number | null }
  editingId: number | null = null
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {
    this.loadEmployees()
  }

  loadEmployees(): void {
    this.http.get<{ data: { empData: EmpDataRecord[] } }>('/api/admin/emp-data').subscribe({
      next: (res) => { this.employees = res.data.empData },
      error: () => {}
    })
  }

  onSubmit(): void {
    this.error = null
    this.success = null
    this.loading = true

    if (this.editingId) {
      this.http.put<{ message: string }>(`/api/admin/emp-data/${this.editingId}`, this.form).subscribe({
        next: (res) => {
          this.success = res.message
          this.resetForm()
          this.loadEmployees()
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update employee'
          this.loading = false
        }
      })
    } else {
      this.http.post<{ message: string }>('/api/admin/emp-data', this.form).subscribe({
        next: (res) => {
          this.success = res.message
          this.resetForm()
          this.loadEmployees()
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to add employee'
          this.loading = false
        }
      })
    }
  }

  onEdit(emp: EmpDataRecord): void {
    this.editingId = emp.id
    this.form = {
      email: emp.email,
      firstName: emp.firstName ?? '',
      lastName: emp.lastName ?? '',
      empId: emp.empId,
    }
    this.error = null
    this.success = null
  }

  cancelEdit(): void {
    this.resetForm()
  }

  onRemove(emp: EmpDataRecord): void {
    if (!confirm(`Remove ${emp.email} from employee data?`)) return

    this.http.delete<{ message: string }>(`/api/admin/emp-data/${emp.id}`).subscribe({
      next: () => { this.loadEmployees() },
      error: (err) => { this.error = err.error?.message || 'Failed to remove employee' }
    })
  }

  private resetForm(): void {
    this.form = { email: '', firstName: '', lastName: '', empId: null }
    this.editingId = null
    this.loading = false
  }
}
