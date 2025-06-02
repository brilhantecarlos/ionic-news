import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

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
    { title: 'Favoritos', url: '/favoritos', icon: 'star' },
  ];

  public isLoggedIn: boolean = false;
  public isAuthPage: boolean = false;

  constructor(public router: Router) {

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        this.isAuthPage = url.startsWith('/login') || url.startsWith('/cadastro');
      }
    });

    onAuthStateChanged(auth, (user: User | null) => {
      this.isLoggedIn = !!user;
    });
  }

}
