import { Component, Input, OnInit } from '@angular/core';
import { ArticlesEntity } from 'src/app/interfaces/news-response';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-news-card',
  templateUrl: './news-card.component.html',
  styleUrls: ['./news-card.component.scss'],
  standalone: false
})
export class NewsCardComponent  implements OnInit {
  @Input() news!: ArticlesEntity;
  isFavorite: boolean = false;

  constructor(private storageService: StorageService) { }

  async ngOnInit() {
    if (this.news && this.news.url) {
      this.isFavorite = await this.storageService.isFavorite(this.news.url);
    }
  }

  async toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.isFavorite) {
      await this.storageService.removeFavorite(this.news.url);
      this.isFavorite = false;
    } else {
      await this.storageService.saveFavorite(this.news);
      this.isFavorite = true;
    }
  }
}
