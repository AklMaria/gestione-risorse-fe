import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Availabilities } from './availabilities';

describe('Availabilities', () => {
  let component: Availabilities;
  let fixture: ComponentFixture<Availabilities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Availabilities],
    }).compileComponents();

    fixture = TestBed.createComponent(Availabilities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
