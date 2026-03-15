import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  pageTitle = signal('Panel de Control');
  userName = signal('Admin');
  
  constructor() {}
}