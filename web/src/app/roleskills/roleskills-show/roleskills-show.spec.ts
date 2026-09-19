import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute, convertToParamMap } from '@angular/router'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { vi } from 'vitest'

import { RoleskillsShowComponent } from './roleskills-show.component'
import { RoleskillsService } from '../roleskills.service'

describe('RoleskillsShowComponent', () => {
  let component: RoleskillsShowComponent
  let fixture: ComponentFixture<RoleskillsShowComponent>
  let service: RoleskillsService
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>

  const mockResponse = {
    data: {
      roleskill: {
        fnid: 1,
        roleno: 1,
        fnName: 'Marketing',
        roleName: 'Manager'
      },
      ksdefinitions: [
        {
          id: 1,
          fnid: 1,
          catid: 1,
          catord: 1,
          roleno: 1,
          knowledgeSkillType: 'Knowledge',
          ksCategory: 'Business Context',
          ksName: 'Strategic Planning',
          ksdefinition: 'Strategic planning and analysis'
          ,tasksetMappingCount: 2,
          mappedSubSubFnNames: ['Business Planning', 'Market Analysis']
        },
        {
          id: 2,
          fnid: 1,
          catid: 1,
          catord: 2,
          roleno: 1,
          knowledgeSkillType: 'Situated Skill',
          ksCategory: 'Market Operations',
          ksName: 'Competitive Research',
          ksdefinition: 'Market research and competitive analysis'
          ,tasksetMappingCount: 1,
          mappedSubSubFnNames: ['Market Analysis']
        }
      ]
    }
  }

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ fnid: '1', roleno: '1' }))

    await TestBed.configureTestingModule({
      imports: [
        RoleskillsShowComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable()
          }
        }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(RoleskillsShowComponent)
    component = fixture.componentInstance
    service = TestBed.inject(RoleskillsService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should load role skills on init', () => {
    vi.spyOn(service, 'show').mockReturnValue(of(mockResponse))

    fixture.detectChanges() // triggers ngOnInit

    expect(service.show).toHaveBeenCalledWith(1, 1)
    expect(component.roleskill).toEqual(mockResponse.data.roleskill)
    expect(component.ksdefinitions.length).toBe(2)
    expect(component.loading).toBe(false)
  })

  it('should expose taskset mapping details for the table tooltip', () => {
    vi.spyOn(service, 'show').mockReturnValue(of(mockResponse))

    fixture.detectChanges()

    expect(component.ksdefinitions[0].tasksetMappingCount).toBe(2)
    expect(component.getTasksetMappingTooltip(component.ksdefinitions[0])).toContain('Business Planning')
  })

  it('should handle errors', () => {
    vi.spyOn(service, 'show').mockReturnValue(throwError(() => new Error('Network error')))

    fixture.detectChanges()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })

  it('should handle invalid parameters', () => {
    paramMap$.next(convertToParamMap({ fnid: 'invalid', roleno: '1' }))
    fixture.detectChanges()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })
})
