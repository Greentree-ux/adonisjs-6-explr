import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { RoleskillsService } from '../roleskills.service'

interface Roleskill {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

@Component({
  selector: 'app-roleskills-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roleskills-list.html',
  styleUrls: ['./roleskills-list.scss']
})
export class RoleskillsListComponent implements OnInit {
  roleskills: Roleskill[] = []
  loading = true
  error: string | null = null

  constructor(private roleskillsService: RoleskillsService) {}

  ngOnInit(): void {
    this.loadRoleskills()
  }

  loadRoleskills(): void {
    this.loading = true
    this.error = null
    
    this.roleskillsService.list().subscribe({
      next: (response) => {
        this.roleskills = response.data
        this.loading = false
      },
      error: (err) => {
        this.error = 'Failed to load role skills. Please try again.'
        this.loading = false
        console.error('Error loading role skills:', err)
      }
    })
  }
}
