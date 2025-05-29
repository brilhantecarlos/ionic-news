import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private sqlite!: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private isDbReady: boolean = false;
  private isWeb: boolean = false;
  
  private memoryCache: {
    news: Map<string, any[]>;
    favorites: Map<string, any>;
    settings: Map<string, any>;
  } = {
    news: new Map<string, any[]>(),
    favorites: new Map<string, any>(),
    settings: new Map<string, any>()
  };

  constructor(private platform: Platform) {
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      await this.platform.ready();
      
      this.isWeb = this.platform.is('mobileweb') || this.platform.is('desktop');
      
      if (this.isWeb) {
        console.log('Executando no navegador, usando armazenamento alternativo');
        this.isDbReady = true;
        return;
      }
      
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      
      const isValid = await this.sqlite.checkConnectionsConsistency();
      const isConn = await this.sqlite.isConnection('ionic-news-db', false);
      
      if (isValid && !isConn) {
        this.db = await this.sqlite.createConnection(
          'ionic-news-db',
          false,
          'no-encryption',
          1,
          false
        );
      } else if (isValid && isConn) {
        this.db = await this.sqlite.retrieveConnection('ionic-news-db', false);
      }

      await this.db.open();
      
      await this.createTables();
      
      this.isDbReady = true;
      console.log('Banco de dados SQLite inicializado');
    } catch (error) {
      console.error('Erro ao inicializar o banco de dados:', error);
      this.isDbReady = true;
    }
  }

  private async createTables() {
    const newsTableQuery = `
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      urlToImage TEXT,
      publishedAt TEXT,
      content TEXT,
      author TEXT,
      category TEXT,
      source TEXT,
      timestamp INTEGER,
      expiration INTEGER
    );`;

    const favoritesTableQuery = `
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      urlToImage TEXT,
      publishedAt TEXT,
      content TEXT,
      author TEXT,
      category TEXT,
      source TEXT,
      timestamp INTEGER
    );`;

    const settingsTableQuery = `
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      value TEXT
    );`;

    try {
      await this.db.execute(newsTableQuery);
      await this.db.execute(favoritesTableQuery);
      await this.db.execute(settingsTableQuery);
    } catch (error) {
      console.error('Erro ao criar tabelas:', error);
    }
  }

  async cacheNews(news: any[], category: string, expirationMinutes: number = 30): Promise<boolean> {
    if (!this.isDbReady) {
      console.log('Aguardando banco de dados ficar pronto...');
      await this.waitForDbReady();
    }
    
    if (!news || news.length === 0) {
      console.warn('Tentativa de cache com lista vazia de notícias');
      return false;
    }
    
    try {
      const now = new Date().getTime();
      const expirationTime = now + (expirationMinutes * 60 * 1000);
      
      if (this.isWeb) {
        const newsWithMeta = news.map(item => ({
          ...item,
          category,
          timestamp: now,
          expiration: expirationTime
        }));
        
        this.memoryCache.news.set(category, newsWithMeta);
        console.log(`${news.length} notícias cacheadas em memória para ${category}`);
        
        try {
          localStorage.setItem(`news_${category}`, JSON.stringify({
            timestamp: now,
            expiration: expirationTime,
            data: newsWithMeta
          }));
          console.log('Notícias salvas no localStorage para', category);
        } catch (e) {
          console.warn('Erro ao salvar no localStorage:', e);
        }
        
        return true;
      }
      
      console.log('Removendo notícias expiradas antes de salvar novo cache');
      await this.removeExpiredNews(category);
      
      const insertStmt = `
      INSERT OR REPLACE INTO news (
        id, title, description, url, urlToImage, publishedAt, 
        content, author, category, source, timestamp, expiration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      
      console.log(`Iniciando inserção de ${news.length} notícias no SQLite para ${category}`);
      
      for (const item of news) {
        if (!item.url) {
          console.warn('Item sem URL, pulando:', item.title);
          continue;
        }
        
        const values = [
          item.url, // Usando URL como ID único
          item.title || '',
          item.description || '',
          item.url,
          item.urlToImage || '',
          item.publishedAt || '',
          item.content || '',
          item.author || '',
          category,
          JSON.stringify(item.source || {}),
          now,
          expirationTime
        ];
        
        await this.db.run(insertStmt, values);
      }
      
      console.log(`${news.length} notícias cacheadas no SQLite para ${category}`);
      return true;
    } catch (error) {
      console.error('Erro ao salvar notícias no cache:', error);
      return false;
    }
  }

  async getCachedNews(category: string): Promise<any[]> {
    if (!this.isDbReady) {
      console.log('Aguardando banco de dados ficar pronto para obter notícias...');
      await this.waitForDbReady();
    }
    
    try {
      const now = new Date().getTime();
      console.log(`Buscando notícias em cache para categoria: ${category}`);
      
      if (this.isWeb) {
        let cachedNews = this.memoryCache.news.get(category) || [];
        
        if (cachedNews.length === 0) {
          try {
            const storedData = localStorage.getItem(`news_${category}`);
            if (storedData) {
              const parsed = JSON.parse(storedData);
              if (parsed && parsed.data && parsed.expiration > now) {
                cachedNews = parsed.data;
                this.memoryCache.news.set(category, cachedNews);
                console.log(`Recuperado ${cachedNews.length} notícias do localStorage para ${category}`);
              } else {
                console.log('Dados em localStorage estão expirados ou inválidos');
              }
            }
          } catch (e) {
            console.warn('Erro ao recuperar do localStorage:', e);
          }
        }
        
        const validNews = cachedNews.filter(item => item.expiration > now);
        
        console.log(`${validNews.length} notícias válidas em cache para ${category}`);
        return validNews;
      }
      
      console.log('Buscando notícias no SQLite para categoria:', category);
      await this.removeExpiredNews(category);
      
      const query = `
      SELECT * FROM news 
      WHERE category = ? 
      AND expiration > ? 
      ORDER BY publishedAt DESC;`;
      
      const result = await this.db.query(query, [category, now]);
      
      if (result.values && result.values.length > 0) {
        console.log(`Encontradas ${result.values.length} notícias no SQLite para ${category}`);
        return result.values.map(item => ({
          ...item,
          source: JSON.parse(item.source || '{}')
        }));
      }
      
      console.log('Nenhuma notícia encontrada no SQLite para', category);
      return [];
    } catch (error) {
      console.error('Erro ao obter notícias do cache:', error);
      return [];
    }
  }

  private async removeExpiredNews(category?: string): Promise<void> {
    try {
      if (this.isWeb) {
        if (category) {
          const cachedNews = this.memoryCache.news.get(category) || [];
          const now = new Date().getTime();
          const validNews = cachedNews.filter(item => item.expiration > now);
          this.memoryCache.news.set(category, validNews);
        } else {
          const now = new Date().getTime();
          for (const [key, value] of this.memoryCache.news.entries()) {
            const validNews = value.filter(item => item.expiration > now);
            this.memoryCache.news.set(key, validNews);
          }
        }
        return;
      }
      
      const now = new Date().getTime();
      let query = 'DELETE FROM news WHERE expiration < ?';
      let params: any[] = [now];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      await this.db.run(query, params);
    } catch (error) {
      console.error('Erro ao remover notícias expiradas:', error);
    }
  }

  async saveFavorite(news: any): Promise<boolean> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      const now = new Date().getTime();
      const id = news.url; // Usando URL como ID único
      
      if (this.isWeb) {
        const newsWithTimestamp = {
          ...news,
          timestamp: now,
          source: typeof news.source === 'string' ? JSON.parse(news.source) : news.source
        };
        
        this.memoryCache.favorites.set(id, newsWithTimestamp);
        console.log('Notícia salva como favorita em memória');
        return true;
      }
      
      const insertStmt = `
      INSERT OR REPLACE INTO favorites (
        id, title, description, url, urlToImage, publishedAt, 
        content, author, category, source, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      
      const values = [
        id,
        news.title,
        news.description,
        news.url,
        news.urlToImage,
        news.publishedAt,
        news.content,
        news.author,
        news.category,
        typeof news.source === 'string' ? news.source : JSON.stringify(news.source),
        now
      ];
      
      await this.db.run(insertStmt, values);
      console.log('Notícia salva como favorita no SQLite');
      return true;
    } catch (error) {
      console.error('Erro ao salvar favorito:', error);
      return false;
    }
  }

  async removeFavorite(id: string): Promise<boolean> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        const wasDeleted = this.memoryCache.favorites.delete(id);
        console.log(wasDeleted ? 'Favorito removido da memória' : 'Favorito não encontrado');
        return wasDeleted;
      }
      
      await this.db.run('DELETE FROM favorites WHERE id = ?', [id]);
      console.log('Favorito removido do SQLite');
      return true;
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      return false;
    }
  }

  async isFavorite(id: string): Promise<boolean> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        return this.memoryCache.favorites.has(id);
      }
      
      const result = await this.db.query('SELECT id FROM favorites WHERE id = ?', [id]);
      return !!(result.values && result.values.length > 0);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      return false;
    }
  }

  async getFavorites(): Promise<any[]> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        const favorites = Array.from(this.memoryCache.favorites.values());
        return favorites.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      const result = await this.db.query('SELECT * FROM favorites ORDER BY timestamp DESC');
      
      if (result.values && result.values.length > 0) {
        return result.values.map(item => ({
          ...item,
          source: typeof item.source === 'string' ? JSON.parse(item.source) : item.source
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao obter favoritos:', error);
      return [];
    }
  }

  async saveSettings(id: string, value: any): Promise<boolean> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        this.memoryCache.settings.set(id, value);
        return true;
      }
      
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await this.db.run('INSERT OR REPLACE INTO settings (id, value) VALUES (?, ?)', [id, stringValue]);
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      return false;
    }
  }

  async getSettings(id: string): Promise<any> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        return this.memoryCache.settings.get(id) || null;
      }
      
      const result = await this.db.query('SELECT value FROM settings WHERE id = ?', [id]);
      
      if (result.values && result.values.length > 0) {
        const value = result.values[0].value;
        
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      return null;
    }
  }

   private waitForDbReady(): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.isDbReady) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  async clearCache(): Promise<boolean> {
    if (!this.isDbReady) {
      await this.waitForDbReady();
    }
    
    try {
      if (this.isWeb) {
        this.memoryCache.news.clear();
        console.log('Cache em memória limpo com sucesso');
        return true;
      }
      
      await this.db.execute('DELETE FROM news');
      console.log('Cache SQLite limpo com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }
}
