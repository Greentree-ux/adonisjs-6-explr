import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'

import { AuthService } from '../auth.service'
import { LoginComponent } from './login.component'

describe('LoginComponent', () => {
  let component: LoginComponent
  let fixture: ComponentFixture<LoginComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({}),
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
            params: of({}),
            queryParams: of({}),
            fragment: of(null),
            data: of({}),
            outlet: 'primary',
            component: null,
            routeConfig: null,
            root: null,
            parent: null,
            firstChild: null,
            children: [],
            pathFromRoot: [],
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: () => of({}),
            getCurrentUser: () => null,
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(LoginComponent)
    component = fixture.componentInstance
    await fixture.whenStable()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
