import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="shell">
      <app-sidebar></app-sidebar>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      min-height: 100vh;
      align-items: stretch;
    }
    .content {
      flex: 1;
      min-width: 0;
      padding: 24px 28px 40px;
    }
    @media (max-width: 900px) {
      .shell { flex-direction: column; }
      .content { padding: 16px; }
    }
  `],
})
export class AppComponent {}
