import { Component, signal } from '@angular/core';

interface DashboardCard {
  title: string;
  content: string;
  icon?: string;
  value?: string;
  trend?: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  welcomeMessage = signal('Bienvenido');
  sidebarHint = signal('Haz clic en el botón del sidebar para colapsarlo.');
  
  cards: DashboardCard[] = [
    {
      title: 'Tarjeta 1',
      content: 'Contenido de ejemplo.',
      icon: 'Home',
      value: '125',
      trend: 'up'
    },
    {
      title: 'Tarjeta 2',
      content: 'Más información aquí.',
      icon: 'BarChart3',
      value: '89',
      trend: 'neutral'
    },
    {
      title: 'Tarjeta 3',
      content: 'Estadísticas rápidas.',
      icon: 'Users',
      value: '1.2K',
      trend: 'up'
    }
  ];
}
