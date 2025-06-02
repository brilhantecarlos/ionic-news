import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsapiService } from '../services/newsapi.service';
import { StorageService } from '../services/storage.service';
import { ArticlesEntity, NewsResponse } from '../interfaces/news-response';
import { map, catchError, finalize } from 'rxjs/operators';
import { ToastController, RefresherEventDetail } from '@ionic/angular';
import { of } from 'rxjs';
import { Network } from '@capacitor/network';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  public folder!: string;
  newsList?: ArticlesEntity[] | null;
  isLoading: boolean = true;
  isUsingCache: boolean = false;
  favoriteIds: Set<string> = new Set<string>();
  statusMessage: string = '';
  statusIcon: string = '';
  statusColor: string = '';
  public isOnline: boolean = true;

  private activatedRoute = inject(ActivatedRoute);
  constructor(
    private newsApiService: NewsapiService,
    private storageService: StorageService,
    private toastController: ToastController,
    private router: Router
  ) {}

  async ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;

    await this.checkNetworkStatus();

    Network.addListener(
      'networkStatusChange',
      (status: { connected: boolean }) => {
        this.handleNetworkStatusChange(status.connected);
      }
    );

    window.addEventListener('online', () => {
      console.log('Browser detectou online');
      this.handleNetworkStatusChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('Browser detectou offline');
      this.handleNetworkStatusChange(false);
    });

    await this.loadFavoritesList();

    this.loadNews();
  }

  private async checkNetworkStatus(): Promise<boolean> {
    try {
      const [capacitorStatus] = await Promise.all([Network.getStatus()]);

      const browserOnline = navigator.onLine;

      const isCurrentlyOnline = browserOnline && capacitorStatus.connected;

      if (this.isOnline !== isCurrentlyOnline) {
        this.handleNetworkStatusChange(isCurrentlyOnline);
      } else {
        this.isOnline = isCurrentlyOnline;
      }

      return isCurrentlyOnline;
    } catch (error) {
      const fallbackStatus = navigator.onLine;
      this.isOnline = fallbackStatus;
      return fallbackStatus;
    }
  }

  private handleNetworkStatusChange(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (wasOnline && !online) {
      this.isUsingCache = true;
      this.updateStatusMessage('offline');
      console.log('Mudou para offline');
      this.showToast('Você está offline. Mostrando notícias do cache.');
      this.loadCachedNews();
    } else if (!wasOnline && online) {
      this.updateStatusMessage('online');
      console.log('Mudou para online');
      this.showToast('Você está online. Carregando notícias atualizadas.');
      this.loadNews();
    }
  }

  private newsRequestInProgress = false;
  private lastRequestTime = 0;
  private readonly REQUEST_COOLDOWN = 5000;

  loadNews() {
    const now = Date.now();
    if (
      this.newsRequestInProgress ||
      now - this.lastRequestTime < this.REQUEST_COOLDOWN
    ) {
      console.log('Ignorando requisição duplicada ou muito próxima');
      return;
    }

    this.isLoading = true;
    this.newsList = null;
    this.updateStatusMessage('loading');
    this.newsRequestInProgress = true;
    this.lastRequestTime = now;

    if (
      this.folder === undefined ||
      this.folder === null ||
      this.folder === ''
    ) {
      this.folder = 'general';
      console.log('Usando categoria padrão:', this.folder);
    }

    if (!this.isOnline) {
      console.log('Offline: tentando carregar do cache');
      this.updateStatusMessage('offline');
      this.loadCachedNews();
      this.newsRequestInProgress = false;
      return;
    }

    console.log('Online: carregando da API para categoria:', this.folder);

    this.newsApiService
      .getTopCountryHeadlines('us', this.folder)
      .pipe(
        map((res) => {
          this.isUsingCache = false;
          this.updateStatusMessage('online');
          return res.articles;
        }),
        catchError((err) => {
          console.error('Erro ao carregar notícias:', err);
          this.loadCachedNews(); 
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          this.newsRequestInProgress = false;
          console.log('Carregamento finalizado');
        })
      )
      .subscribe({
        next: (news) => {
          if (news && news.length > 0) {
            console.log('Notícias recebidas da API:', news.length);
            this.newsList = news;

            setTimeout(() => {
              this.storageService
                .cacheNews(news, this.folder)
                .then((success) => {
                  console.log('Notícias salvas no cache diretamente:', success);
                })
                .catch((err) => {
                  console.error('Erro ao salvar no cache:', err);
                });
            }, 0);
          } else {
            console.log('Nenhuma notícia recebida da API');
            this.loadCachedNews();
          }
        },
        error: (err) => {
          console.error('Erro na subscrição:', err);
          this.isLoading = false;
          this.updateStatusMessage('error', 'Erro ao carregar notícias');
          this.loadCachedNews(); 
        },
      });
  }

  private cachedResultsMap: Map<string, ArticlesEntity[]> = new Map<
    string,
    ArticlesEntity[]
  >();
  private cacheTimestamps: Map<string, number> = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; 

  private async loadCachedNews() {
    if (!this.folder) return;

    try {
      this.isLoading = true;
      const now = Date.now();
      const cacheKey = `cache_${this.folder}`;
      const cacheTimestamp = this.cacheTimestamps.get(cacheKey) || 0;

      if (
        this.cachedResultsMap.has(cacheKey) &&
        now - cacheTimestamp < this.CACHE_TTL
      ) {
        console.log('Usando cache em memória para', this.folder);
        const memCache = this.cachedResultsMap.get(cacheKey);
        if (memCache && memCache.length > 0) {
          this.newsList = memCache;
          this.isUsingCache = true;
          this.updateStatusMessage('cache');
          this.showToast(`${memCache.length} notícias carregadas do cache`);
          this.isLoading = false;
          return;
        }
      }

      console.log(
        'Buscando notícias do cache de armazenamento para categoria:',
        this.folder
      );

      const cachedNews = await this.storageService.getCachedNews(this.folder);

      if (cachedNews && cachedNews.length > 0) {
        this.cachedResultsMap.set(cacheKey, cachedNews);
        this.cacheTimestamps.set(cacheKey, now);

        console.log(
          'Notícias carregadas do storage com sucesso:',
          cachedNews.length
        );
        this.newsList = cachedNews;
        this.isUsingCache = true;
        this.updateStatusMessage('cache');
        this.showToast(`${cachedNews.length} notícias carregadas do cache`);
      } else {
        console.log('Nenhuma notícia em cache para a categoria:', this.folder);
        this.newsList = [];
        this.updateStatusMessage('error', 'Sem notícias disponíveis em cache');
        this.showToast('Sem notícias disponíveis em cache');
      }
    } catch (error) {
      console.error('Erro ao carregar notícias do cache:', error);
      this.newsList = [];
      this.updateStatusMessage('error', 'Erro ao carregar notícias do cache');
      this.showToast('Erro ao carregar notícias do cache');
    } finally {
      this.isLoading = false;
    }
  }

  doRefresh(event: CustomEvent<RefresherEventDetail>) {
    if (!this.isOnline) {
      this.showToast('Você está offline. Não é possível atualizar.');
      event.detail.complete();
      return;
    }

    this.updateStatusMessage('loading');

    this.newsApiService
      .refreshTopCountryHeadlines('us', this.folder)
      .pipe(
        map((res) => {
          this.isUsingCache = false;
          this.updateStatusMessage('refresh');
          return res.articles;
        }),
        catchError((err) => {
          console.error('Erro ao atualizar notícias:', err);
          this.updateStatusMessage('error', err.message);
          return of(null);
        }),
        finalize(() => {
          event.detail.complete();
        })
      )
      .subscribe((news) => {
        if (news) {
          this.newsList = news;
          this.storageService.cacheNews(news, this.folder).catch((err) => {
            console.error('Erro ao atualizar cache após refresh:', err);
          });
        }
      });
  }

  async clearCache() {
    const result = await this.storageService.clearCache();
    if (result) {
      this.showToast('Cache limpo com sucesso');
      if (this.isOnline) {
        this.loadNews();
      }
    } else {
      this.showToast('Erro ao limpar cache');
    }
  }

  isFavorite(news: ArticlesEntity): boolean {
    return this.favoriteIds.has(news.url);
  }

  async toggleFavorite(news: ArticlesEntity) {
    try {
      const isCurrentlyFavorite = this.isFavorite(news);

      if (isCurrentlyFavorite) {
        const result = await this.storageService.removeFavorite(news.url);
        if (result) {
          this.favoriteIds.delete(news.url);
          this.showToast('Notícia removida dos favoritos');
        }
      } else {
        news.category = this.folder;
        const result = await this.storageService.saveFavorite(news);
        if (result) {
          this.favoriteIds.add(news.url);
          this.showToast('Notícia adicionada aos favoritos');
        }
      }
    } catch (error) {
      console.error('Erro ao gerenciar favorito:', error);
      this.showToast('Erro ao gerenciar favorito');
    }
  }

  private async loadFavoritesList() {
    try {
      const favorites = await this.storageService.getFavorites();
      this.favoriteIds = new Set(favorites.map((item) => item.url));
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  private updateStatusMessage(
    status: 'loading' | 'online' | 'offline' | 'cache' | 'error' | 'refresh',
    errorMessage?: string
  ) {
    switch (status) {
      case 'loading':
        if (this.statusMessage !== undefined)
          this.statusMessage = 'Carregando notícias...';
        if (this.statusIcon !== undefined)
          this.statusIcon = 'hourglass-outline';
        if (this.statusColor !== undefined) this.statusColor = 'primary';
        break;
      case 'online':
        if (this.statusMessage !== undefined)
          this.statusMessage = 'Dados carregados da rede';
        if (this.statusIcon !== undefined)
          this.statusIcon = 'cloud-done-outline';
        if (this.statusColor !== undefined) this.statusColor = 'success';
        break;
      case 'offline':
        if (this.statusMessage !== undefined)
          this.statusMessage = 'Você está offline. Mostrando dados em cache.';
        if (this.statusIcon !== undefined)
          this.statusIcon = 'cloud-offline-outline';
        if (this.statusColor !== undefined) this.statusColor = 'danger';
        break;
      case 'cache':
        if (this.statusMessage !== undefined)
          this.statusMessage = 'Dados carregados do cache local';
        if (this.statusIcon !== undefined) this.statusIcon = 'save-outline';
        if (this.statusColor !== undefined) this.statusColor = 'danger';
        break;
      case 'refresh':
        if (this.statusMessage !== undefined)
          this.statusMessage = 'Notícias atualizadas com sucesso';
        if (this.statusIcon !== undefined)
          this.statusIcon = 'refresh-circle-outline';
        if (this.statusColor !== undefined) this.statusColor = 'success';
        break;
      case 'error':
        if (this.statusMessage !== undefined)
          this.statusMessage = errorMessage || 'Erro ao carregar notícias';
        if (this.statusIcon !== undefined)
          this.statusIcon = 'alert-circle-outline';
        if (this.statusColor !== undefined) this.statusColor = 'danger';
        break;
    }

    if (status !== 'offline' && status !== 'error' && status !== 'cache') {
      setTimeout(() => {
        if (this.statusMessage) {
          this.statusMessage = '';
        }
      }, 5000);
    }
  }

  logout() {
    signOut(auth)
      .then(() => {
        console.log('Logout realizado com sucesso!');
        window.location.href = '/login';
      })
      .catch((error) => {
        console.error('Erro ao realizar logout:', error);
      });
  }
}
