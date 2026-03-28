import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SETTINGS_ROUTES } from './settings-routing.module';

@NgModule({
  imports: [
    RouterModule.forChild(SETTINGS_ROUTES)
  ]
})
export class SettingsModule { }