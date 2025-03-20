import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiConfigComponent } from './api-config/api-config.component';
import { ApiDetailsComponent } from './api-details/api-details.component';

@NgModule({
  declarations: [
    AppComponent,
    ApiConfigComponent,
    ApiDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
