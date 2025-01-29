import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { UploadComponent } from './components/upload/upload.component';
import { PhotoGalleryComponent } from './components/photo-gallery/photo-gallery.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { JwtInterceptor } from './interceptors/jwt.interceptor';
import { ApiDocsComponent } from './components/api-docs/api-docs.component';
import { routes } from './app.routes';  // Import routes directly

@NgModule({
  declarations: [
    AppComponent,
    RegisterComponent,
    LoginComponent,
    UploadComponent,
    PhotoGalleryComponent,
    NavbarComponent,
    ApiDocsComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),  // Use RouterModule.forRoot with routes
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { } 