import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  public appPages = [
    { title: 'Geral', url: '/general', icon: 'newspaper' },
    { title: 'Negócios', url: '/business', icon: 'business' },
    { title: 'Esportes', url: '/sports', icon: 'football' },
    { title: 'Entretenimento', url: '/entertainment', icon: 'videocam' },
    { title: 'Tecnologia', url: '/technology', icon: 'laptop' },
    { title: 'Saúde', url: '/health', icon: 'medkit' },
    { title: 'Ciência', url: '/science', icon: 'rocket' },
  ];
  
  constructor() {}
}
