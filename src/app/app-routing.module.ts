import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BaseComponent } from './3D-model/base/base.component';

const routes: Routes = [
  { path: "", redirectTo: "", pathMatch: "full" },
  // welcome page route
  {
    path: "base",
    component: BaseComponent,
    // pathMatch: "full",
    data: { title: "TrustWMS::Dashboard", permissions: false },
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
