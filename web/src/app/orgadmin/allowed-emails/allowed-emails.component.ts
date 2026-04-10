import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http'

interface AllowedEmail {
  id: number
  email: string
  createdAt: string
}

@Component({
  selector: 'app-allowed-emails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <h2>Org Admin — Allowed Emails</h2>

      <!-- Add email -->
      <div class="card">
        <h3>Add Email to Allow List</h3>
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="onAdd()" class="inline-form">
          <input type="email" [(ngModel)]="newEmail" name="email" placeholder="user@example.com" required />
          <button type="submit" [disabled]="loading" class="btn-primary">Add</button>
        </form>
      </div>

      <!-- List -->
      <div class="card">
        <h3>Allowed Emails ({{ emails.length }})</h3>
        <table class="data-table" *ngIf="emails.length > 0">
          <thead>
            <tr>
              <th>Email</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of emails">
              <td>{{ e.email }}</td>
              <td>{{ e.createdAt | date:'short' }}</td>
              <td>
                <button class="btn-danger" (click)="onRemove(e)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="emails.length === 0" class="empty-text">No allowed emails yet.</p>
      </div>
    </div>
  `,
  styles: [`
    .admin-container { padding: 2rem; max-width: 800px; margin: 0 auto; }
    h2 { margin-bottom: 1.5rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
    h3 { margin: 0 0 1rem; }
    .inline-form { display: flex; gap: 0.5rem; }
    .inline-form input { flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    .btn-primary { padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; }
    .btn-danger { padding: 0.25rem 0.75rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .data-table th { font-weight: 600; background: #f9f9f9; }
    .alert { padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
    .error { background: #fee; color: #c00; }
    .success { background: #efe; color: #060; }
    .empty-text { color: #888; }
  `]
})
export class AllowedEmailsComponent {
  emails: AllowedEmail[] = []
  newEmail = ''
  loading = false
  error: string | null = null
  success: string | null = null

  constructor(private http: HttpClient) {
    this.loadEmails()
  }

  loadEmails(): void {
    this.http.get<{ data: { allowedEmails: AllowedEmail[] } }>('/api/admin/allowed-emails').subscribe({
      next: (res) => { this.emails = res.data.allowedEmails },
      error: () => {}
    })
  }

  onAdd(): void {
    this.error = null
    this.success = null
    this.loading = true

    this.http.post<{ message: string }>('/api/admin/allowed-emails', { email: this.newEmail }).subscribe({
      next: (res) => {
        this.success = res.message
        this.newEmail = ''
        this.loading = false
        this.loadEmails()
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to add email'
        this.loading = false
      }
    })
  }

  onRemove(email: AllowedEmail): void {
    if (!confirm(`Remove ${email.email} from the allowed list?`)) return

    this.http.delete<{ message: string }>(`/api/admin/allowed-emails/${email.id}`).subscribe({
      next: () => { this.loadEmails() },
      error: (err) => { this.error = err.error?.message || 'Failed to remove email' }
    })
  }
}
