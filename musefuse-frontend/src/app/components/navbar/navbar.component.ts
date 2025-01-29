import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styles: [`
    .navbar-nav .nav-link {
      padding: 0.5rem 1rem;
      color: rgba(255,255,255,.75);
    }
    .navbar-nav .nav-link:hover {
      color: rgba(255,255,255,1);
    }
  `]
})
export class NavbarComponent {
  constructor(private authService: AuthService) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    window.location.href = '/login';
  }
} 