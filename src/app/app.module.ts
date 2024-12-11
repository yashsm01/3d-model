import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BaseComponent } from './3D-model/base/base.component';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

@NgModule({
  declarations: [AppComponent, BaseComponent],
  imports: [BrowserModule, AppRoutingModule, RouterModule, FormsModule],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideClientHydration(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
