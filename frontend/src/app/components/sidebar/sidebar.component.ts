import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-badge">🎓</div>
        <div>
          <div class="brand-name">StudyHub</div>
          <div class="brand-tag">Plan &middot; Learn &middot; Grow</div>
        </div>
      </div>

      <nav class="nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item">
          <span class="icon">🏠</span> Dashboard
        </a>
        <a routerLink="/notices" routerLinkActive="active" class="nav-item">
          <span class="icon">🔔</span> Notices
        </a>
        <a routerLink="/routine" routerLinkActive="active" class="nav-item">
          <span class="icon">📅</span> My Routine
        </a>
        <a href="#semesters" class="nav-item" (click)="scrollToSemesters($event)">
          <span class="icon">🗂️</span> Notes
        </a>
        <a href="https://roadmap.sh" target="_blank" rel="noopener" class="nav-item">
          <span class="icon">📈</span> Roadmap.sh
        </a>
      </nav>

      <div class="quote">
        <p>&ldquo;Discipline today builds the future you want tomorrow.&rdquo;</p>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      flex-shrink: 0;
      min-height: 100vh;
      background: linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-2));
      color: #cfd3e6;
      padding: 22px 18px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-badge {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .brand-name { color: #fff; font-weight: 800; font-size: 17px; line-height: 1.1; }
    .brand-tag { font-size: 11px; color: #8890ab; margin-top: 2px; }

    .nav { display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: 10px;
      color: #b7bcd6; text-decoration: none; font-size: 14px; font-weight: 500;
      transition: background .15s ease, color .15s ease;
    }
    .nav-item .icon { font-size: 16px; width: 18px; text-align: center; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      box-shadow: 0 6px 16px rgba(79,107,255,0.35);
    }

    .quote {
      margin-top: auto;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 16px;
      font-size: 12.5px;
      color: #7d84a0;
      font-style: italic;
      line-height: 1.5;
    }
  `],
})
export class SidebarComponent {
  scrollToSemesters(e: Event) {
    if (window.location.pathname !== '/') return; // let router handle nav elsewhere
    e.preventDefault();
    document.getElementById('semesters')?.scrollIntoView({ behavior: 'smooth' });
  }
}
