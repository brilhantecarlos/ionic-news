import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { NewsResponse } from '../interfaces/news-response';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class NewsapiService {
  topHeadlinePath = environment.baseUrl;
  private isOnline: boolean = true;

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    this.initNetworkListener();
  }

  private async initNetworkListener() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    Network.addListener('networkStatusChange', (status: { connected: boolean }) => {
      this.isOnline = status.connected;
      console.log('Estado da rede:', status.connected ? 'Online' : 'Offline');
    });
  }

  getTopCountryHeadlines(country: string, category: string): Observable<NewsResponse> {
    console.log(`Obtendo manchetes para ${category}, status online: ${this.isOnline}`);
    
    if (this.isOnline) {
      return this.fetchFromApi(country, category, category).pipe(
        catchError(err => {
          console.error('Erro ao buscar da API, tentando cache:', err);
          return this.getFromCacheAsObservable(category);
        })
      );
    } else {
      return this.getFromCacheAsObservable(category);
    }
  }
  
  private getFromCacheAsObservable(category: string): Observable<NewsResponse> {
    return from(this.getFromCache(category, category)).pipe(
      map(cachedData => {
        if (cachedData && cachedData.length > 0) {
          console.log(`Usando ${cachedData.length} notícias em cache para ${category}`);
          
          const response: NewsResponse = {
            status: 'ok',
            totalResults: cachedData.length,
            articles: cachedData
          };
          
          return response;
        }
        
        throw new Error('Você está offline e não há dados em cache disponíveis');
      }),
      catchError(err => {
        console.error('Erro ao buscar notícias do cache:', err);
        return throwError(() => err);
      })
    );
  }

  private async getFromCache(cacheKey: string, category: string): Promise<any[]> {
    try {
      return await this.storageService.getCachedNews(category);
    } catch (error) {
      console.error('Erro ao obter do cache:', error);
      return [];
    }
  }

  private fetchFromApi(country: string, category: string, cacheKey: string): Observable<NewsResponse> {
    const url = `${this.topHeadlinePath}?country=${country}&category=${category}&pageSize=10&apiKey=${environment.apiKey}`;
    
    return this.http.get<NewsResponse>(url).pipe(
      tap(response => {
        if (response && response.status === 'ok' && response.articles) {
          console.log('Salvando imediatamente notícias no cache para', category);
          this.storageService.cacheNews(response.articles, category, 30).then(success => {
            console.log('Notícias salvas em cache com sucesso:', success);
          });
        }
      }),
      catchError(error => {
        console.error('Erro ao buscar notícias:', error);
        return throwError(() => new Error('Erro ao buscar notícias. Verifique sua conexão.'));
      })
    );
  }

  refreshTopCountryHeadlines(country: string, category: string): Observable<NewsResponse> {
    const cacheKey = `${country}-${category}`;
    
    if (!this.isOnline) {
      return throwError(() => new Error('Você está offline. Não é possível atualizar.'));
    }
    
    return this.fetchFromApi(country, category, cacheKey);
  }

  async clearCache(): Promise<boolean> {
    return await this.storageService.clearCache();
  }
}
