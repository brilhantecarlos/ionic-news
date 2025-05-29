import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsCardComponent } from './news-card.component';
import { IonicModule } from '@ionic/angular';


@NgModule({
  declarations: [NewsCardComponent],
  imports: [
    CommonModule, IonicModule
  ],
  exports: [NewsCardComponent],
})
export class NewsCardModule { }
