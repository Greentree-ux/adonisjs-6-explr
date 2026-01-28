import { TestBed } from '@angular/core/testing';

import { Roleskills } from './roleskills';

describe('Roleskills', () => {
  let service: Roleskills;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Roleskills);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
