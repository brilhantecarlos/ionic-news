import { Component, OnInit } from '@angular/core';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.page.html',
  styleUrls: ['./favoritos.page.scss'],
  standalone: false,
})
export class FavoritosPage implements OnInit {
  favoritos: any[] = [];

  constructor(private storageService: StorageService) { }

  async ngOnInit() {
    this.favoritos = await this.storageService.getFavorites();
  }

}
