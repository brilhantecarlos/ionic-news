import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { NewsResponse } from '../interfaces/news-response';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NewsapiService {
  topHeadlinePath = environment.baseUrl;

  constructor(private http:HttpClient) { }

  getTopCountryHeadlines(country: string, category: string):Observable<NewsResponse> {
    return this.http.get<NewsResponse>(this.topHeadlinePath+'?country='+country+'&category='+category+'&pageSize=10&apiKey='+environment.apiKey);
  }
}
