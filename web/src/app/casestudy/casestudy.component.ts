import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-casestudy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './casestudy.html',
  styleUrls: ['./casestudy.scss'],
})
export class CasestudyComponent {}
