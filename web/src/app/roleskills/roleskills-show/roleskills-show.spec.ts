import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'

import { RoleskillsShowComponent } from './roleskills-show.component'
import { RoleskillsService } from '../roleskills.service'

describe('RoleskillsShowComponent', () => {
  let component: RoleskillsShowComponent
  let fixture: ComponentFixture<RoleskillsShowComponent>
  let service: RoleskillsService

  const mockResponse = {
    data: {
      roleskill: {
        fnid: 1,
        roleno: 1,
        fn_name: 'Marketing',
        role_name: 'Manager'
      },
      ksdefinitions: [
        {
          id: 1,
          fnid: 1,
          catid: 1,
          catord: 1,
          roleno: 1,
          ksdefinition: 'Strategic planning and analysis',
          cat_name: 'Strategic Skills',
          ks_color: '#667eea'
        },
        {
          id: 2,
          fnid: 1,
          catid: 1,
          catord: 2,
          roleno: 1,
          ksdefinition: 'Market research and competitive analysis',
          cat_name: 'Strategic Skills',
          ks_color: '#667eea'
        }
      ]
    }
  }

  beforeEach(async () => {
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
            paramMap: of(new Map([['fnid', '1'], ['roleno', '1']]))
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
    spyOn(service, 'show').and.returnValue(of(mockResponse))

    fixture.detectChanges() // triggers ngOnInit

    expect(service.show).toHaveBeenCalledWith(1, 1)
    expect(component.roleskill).toEqual(mockResponse.data.roleskill)
    expect(component.ksdefinitions.length).toBe(2)
    expect(component.loading).toBe(false)
  })

  it('should group skills by category', () => {
    spyOn(service, 'show').and.returnValue(of(mockResponse))

    fixture.detectChanges()

    expect(component.groupedSkills.size).toBe(1)
    expect(component.groupedSkills.get(1)?.skills.length).toBe(2)
    expect(component.groupedSkills.get(1)?.catName).toBe('Strategic Skills')
  })

  it('should handle errors', () => {
    spyOn(service, 'show').and.returnValue(
      throwError(() => new Error('Network error'))
    )

    fixture.detectChanges()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })

  it('should handle invalid parameters', () => {
    const route = TestBed.inject(ActivatedRoute)
    route.paramMap = of(new Map([['fnid', 'invalid'], ['roleno', '1']]))

    component.ngOnInit()

    expect(component.error).toBeTruthy()
    expect(component.loading).toBe(false)
  })
})
