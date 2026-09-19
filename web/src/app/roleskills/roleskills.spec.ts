import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'

import { RoleskillsService } from './roleskills.service'

describe('RoleskillsService', () => {
  let service: RoleskillsService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    })
    service = TestBed.inject(RoleskillsService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
