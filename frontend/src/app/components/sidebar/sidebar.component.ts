import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="brand">
          <div class="brand-badge">🎓</div>
          <div>
            <div class="brand-name">StudyHub</div>
            <div class="brand-tag">Plan &middot; Learn &middot; Grow</div>
          </div>
        </div>
        <button
          class="hamburger"
          type="button"
          (click)="toggleMenu()"
          [attr.aria-expanded]="mobileOpen"
          aria-label="Toggle navigation menu"
        >
          <span *ngIf="!mobileOpen">☰</span>
          <span *ngIf="mobileOpen">✕</span>
        </button>
      </div>

      <nav class="nav" [class.open]="mobileOpen">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item" (click)="closeMenu()">
          <span class="icon">🏠</span> Dashboard
        </a>
        <a routerLink="/notices" routerLinkActive="active" class="nav-item" (click)="closeMenu()">
          <span class="icon">🔔</span> Notices
        </a>
        <a routerLink="/routine" routerLinkActive="active" class="nav-item" (click)="closeMenu()">
          <span class="icon">📅</span> My Routine
        </a>
        <a href="#semesters" class="nav-item" (click)="scrollToSemesters($event)">
          <span class="icon">📁</span> Notes
        </a>
        <a routerLink="/tutorials" routerLinkActive="active" class="nav-item" (click)="closeMenu()">
          <span class="icon">▶️</span> Tutorials
        </a>
        <a href="https://roadmap.sh" target="_blank" rel="noopener" class="nav-item" (click)="closeMenu()">
          <span class="icon">📈</span> Roadmap.sh
        </a>
      </nav>

      <div class="quote">
        <p>&ldquo;Discipline today builds the future you want tomorrow.&rdquo;</p>
      </div>
    </aside>

    <!-- Dims the page behind the open mobile menu; tapping it closes the menu -->
    <div class="backdrop" *ngIf="mobileOpen" (click)="closeMenu()"></div>
  `,
  styles: [`
    :host {
      display: contents;
    }
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
      position: relative;
      z-index: 30;
    }

    .sidebar-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .brand-badge {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .brand-name { color: #fff; font-weight: 800; font-size: 17px; line-height: 1.1; white-space: nowrap; }
    .brand-tag { font-size: 11px; color: #8890ab; margin-top: 2px; white-space: nowrap; }

    .hamburger {
      display: none;
      background: rgba(255,255,255,0.08);
      border: none;
      color: #fff;
      font-size: 18px;
      width: 36px;
      height: 36px;
      border-radius: 9px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
    }

    .nav { display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: 10px;
      color: #b7bcd6; text-decoration: none; font-size: 14px; font-weight: 500;
      transition: background .15s ease, color .15s ease;
    }
    .nav-item .icon { font-size: 16px; width: 18px; text-align: center; flex-shrink: 0; }
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

    .backdrop { display: none; }

    /* ---------- Mobile: collapse to a top bar with a dropdown menu ---------- */
    @media (max-width: 900px) {
      .sidebar {
        width: 100%;
        min-height: auto;
        flex-direction: column;
        padding: 14px 18px;
        gap: 0;
      }
      .hamburger { display: flex; }
      .quote { display: none; }

      .nav {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--sidebar-bg-2);
        padding: 10px 18px 18px;
        margin: 0 -18px;
        width: auto;
        display: none;
        box-shadow: 0 16px 30px rgba(0,0,0,0.35);
        border-radius: 0 0 16px 16px;
      }
      .nav.open { display: flex; }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 20;
      }
    }
  `],
})
export class SidebarComponent {
  mobileOpen = false;

  toggleMenu(): void {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMenu(): void {
    this.mobileOpen = false;
  }

  scrollToSemesters(e: Event): void {
    this.closeMenu();
    if (window.location.pathname !== '/') return; // let router handle nav elsewhere
    e.preventDefault();
    document.getElementById('semesters')?.scrollIntoView({ behavior: 'smooth' });
  }
}
