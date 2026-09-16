import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="splash" *ngIf="showSplash" [class.fade-out]="fadeOut">
      <span
        class="floating-heart"
        *ngFor="let h of hearts; let i = index"
        [style.left.%]="h"
        [style.animationDelay.s]="i * 1.1"
      >❤️</span>

      <div class="splash-icon">
        <img src="assets/icons/icon-512.png" alt="StudyHub" />
      </div>

      <div class="splash-message" [class.show]="showMessage">
        Hi Aaishra <span class="heart">💗</span><br />
        Devit loves you so so much <span class="heart">❤️</span>
      </div>
    </div>

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

    /* ===================== Splash screen ===================== */
    .splash {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: linear-gradient(135deg, #0f1420, #2b3350 60%, #4f6bff);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      overflow: hidden;
      transition: opacity .6s ease;
    }
    .splash.fade-out { opacity: 0; pointer-events: none; }

    .splash-icon img {
      width: 110px;
      height: 110px;
      border-radius: 26px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
      animation: iconPop 0.8s cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes iconPop {
      0% { transform: scale(0.4); opacity: 0; }
      60% { transform: scale(1.08); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }

    .splash-message {
      font-family: 'Pacifico', cursive;
      color: #fff;
      text-align: center;
      font-size: 24px;
      line-height: 1.6;
      padding: 0 24px;
      max-width: 90vw;
      opacity: 0;
      transform: translateY(14px);
      transition: opacity .6s ease, transform .6s ease;
    }
    .splash-message.show { opacity: 1; transform: translateY(0); }

    .heart {
      display: inline-block;
      animation: heartbeat 1.1s ease-in-out infinite;
    }
    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.3); }
      40% { transform: scale(1); }
      60% { transform: scale(1.22); }
    }

    .floating-heart {
      position: absolute;
      bottom: -10%;
      font-size: 20px;
      opacity: 0;
      animation: floatUp 6s linear infinite;
    }
    @keyframes floatUp {
      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
      10% { opacity: .6; }
      90% { opacity: .5; }
      100% { transform: translateY(-115vh) rotate(25deg); opacity: 0; }
    }
  `],
})
export class AppComponent implements OnInit {
  showSplash = true;
  showMessage = false;
  fadeOut = false;
  hearts = [8, 24, 40, 58, 74, 90];

  ngOnInit(): void {
    // Let the icon pop in first, then reveal the message shortly after.
    setTimeout(() => (this.showMessage = true), 700);
    // Hold on screen, then fade out into the app.
    setTimeout(() => (this.fadeOut = true), 3400);
    setTimeout(() => (this.showSplash = false), 4000);
  }
}
