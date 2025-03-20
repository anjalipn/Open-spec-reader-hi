import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ApiConfigComponent } from './api-config/api-config.component';
import { ApiDetailsComponent } from './api-details/api-details.component';

const routes: Routes = [
  { path: '', redirectTo: '/api-config', pathMatch: 'full' },
  { path: 'api-config', component: ApiConfigComponent },
  { path: 'api-details', component: ApiDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
