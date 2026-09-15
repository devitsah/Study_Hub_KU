import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RoutineComponent } from './components/routine/routine.component';
import { NoticesPageComponent } from './components/notices-page/notices-page.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'notices', component: NoticesPageComponent },
  { path: 'routine', component: RoutineComponent },
  { path: '**', redirectTo: '' },
];
