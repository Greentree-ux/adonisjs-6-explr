import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { RoleskillsService } from '../roleskills.service'

interface Roleskill {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

interface KsDefinition {
  id: number
  fnid: number
  catid: number
  catord: number
  roleno: number
  knowledgeSkillType: string | null
  ksCategory: string | null
  ksName: string | null
  ksdefinition: string | null
  tasksetMappingCount: number
  mappedSubSubFnNames: string[]
}

@Component({
  selector: 'app-roleskills-show',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './roleskills-show.html',
  styleUrls: ['./roleskills-show.scss']
})
export class RoleskillsShowComponent implements OnInit {
  roleskill: Roleskill | null = null
  ksdefinitions: KsDefinition[] = []
  loading = true
  error: string | null = null
  fnid: number = 0
  roleno: number = 0

  constructor(
    private route: ActivatedRoute,
    private roleskillsService: RoleskillsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.fnid = Number(params.get('fnid'))
      this.roleno = Number(params.get('roleno'))
      
      if (this.fnid && this.roleno) {
        this.loadRoleskillDetails()
      } else {
        this.error = 'Invalid role parameters'
        this.loading = false
      }
    })
  }

  loadRoleskillDetails(): void {
    this.loading = true
    this.error = null

    this.roleskillsService.show(this.fnid, this.roleno).subscribe({
      next: (response) => {
        this.roleskill = response.data.roleskill
        this.ksdefinitions = response.data.ksdefinitions
        this.loading = false
      },
      error: (err) => {
        this.error = 'Failed to load role skills. Please try again.'
        this.loading = false
        console.error('Error loading role skills:', err)
      }
    })
  }

  getTasksetMappingTooltip(skill: KsDefinition): string {
    if (!skill.mappedSubSubFnNames.length) {
      return 'No taskset mappings'
    }

    return skill.mappedSubSubFnNames.join('\n')
  }
}
