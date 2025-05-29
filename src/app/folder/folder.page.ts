import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsapiService } from '../services/newsapi.service';
import { ArticlesEntity } from '../interfaces/news-response';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  public folder!: string;
  newsList?: ArticlesEntity[] | null;

  private activatedRoute = inject(ActivatedRoute);
  constructor(
    private newsApiService: NewsapiService
  ) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
    this.getTopHeadlines();
  }

  getTopHeadlines() {
    this.newsApiService
      .getTopCountryHeadlines('us', this.folder)
      .pipe(map((res) => res.articles))
      .subscribe((news) => (this.newsList = news));
  }
}
