import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ActivatedRoute, convertToParamMap } from '@angular/router'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { vi } from 'vitest'

import { FnfnrolesShowComponent } from './fnfnroles-show.component'
import { FnfnrolesService } from '../fnfnroles.service'

describe('FnfnrolesShowComponent', () => {
  let component: FnfnrolesShowComponent
  let fixture: ComponentFixture<FnfnrolesShowComponent>
  let service: FnfnrolesService
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>

  const mockResponse = {
    data: {
      fnfnrole: {
        fnid: 1,
        roleno: 1,
        fnName: 'Marketing',
        roleName: 'Manager'
      },
      roletasksets: [
        {
          fnid: 1,
          fnName: 'Marketing',
          subfnid: 101,
          subfnName: 'Digital Marketing',
          sub2fnord: 1,
          subSubFnName: 'Social Media',
          roleno: 1,
          roleName: 'Manager',
          taskset: 'Manage social media campaigns',
          ei: 'E',
          lmh: 'H'
        }
      ]
    }
  }

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ fnid: '1', roleno: '1' }))

    await TestBed.configureTestingModule({
      imports: [
        FnfnrolesShowComponent,
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

    fixture = TestBed.createComponent(FnfnrolesShowComponent)
    component = fixture.componentInstance
    service = TestBed.inject(FnfnrolesService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should load role details on init', () => {
    vi.spyOn(service, 'show').mockReturnValue(of(mockResponse))

    fixture.detectChanges() // triggers ngOnInit

    expect(service.show).toHaveBeenCalledWith(1, 1)
    expect(component.fnfnrole).toEqual(mockResponse.data.fnfnrole)
    expect(component.roletasksets.length).toBe(1)
    expect(component.loading).toBe(false)
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
