import { Component, OnInit } from '@angular/core';
import { PhotoService } from '../../services/photo.service';
import { CommonModule, DatePipe } from '@angular/common';
import { LightboxComponent } from '../lightbox/lightbox.component';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule, LightboxComponent],
  providers: [DatePipe],
  styles: [`
    .gallery-container {
      padding: 0;
      margin: 0;
      width: 100%;
      min-height: 100vh;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1px;
      background-color: var(--space-gray-light);
      padding: 1px;
    }

    .photo-item {
      position: relative;
      padding-bottom: 100%;
      background-color: var(--space-gray);
      overflow: hidden;
    }

    .photo-item img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .photo-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      color: white;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .photo-item:hover img {
      transform: scale(1.05);
    }

    .photo-item:hover .photo-overlay {
      opacity: 1;
    }

    .delete-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease, background-color 0.3s ease;
    }

    .photo-item:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      background: rgba(255,59,48,0.9);
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .photo-item.loading {
      background: linear-gradient(110deg, var(--space-gray) 8%, var(--space-gray-light) 18%, var(--space-gray) 33%);
      background-size: 200% 100%;
      animation: 1.5s shine linear infinite;
    }

    @keyframes shine {
      to {
        background-position-x: -200%;
      }
    }

    .photo-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--space-gray);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .photo-item img {
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .photo-item img.loaded {
      opacity: 1;
    }
  `],
  template: `
    <div class="gallery-container">
      <div class="photo-grid">
        <div class="photo-item" *ngFor="let photo of photos; let i = index" [class.loading]="!photo.loaded">
          <div class="photo-placeholder" *ngIf="!photo.loaded">
            <div class="spinner-border text-secondary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <img [src]="photo.thumbnail_url" 
               [alt]="photo.filename" 
               (click)="openLightbox(i)"
               [class.loaded]="photo.loaded"
               (load)="onImageLoad(photo)">
          <div class="photo-overlay">
            <p class="mb-0">{{photo.owner}}</p>
            <small class="text-secondary">{{photo.upload_time | date:'medium'}}</small>
          </div>
          <button class="delete-btn" (click)="deletePhoto(photo.filename)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
    <app-lightbox
      *ngIf="selectedPhotoIndex !== null"
      [photos]="photos"
      [currentIndex]="selectedPhotoIndex"
      (close)="closeLightbox()"
    ></app-lightbox>
    <div class="loading-overlay" *ngIf="loading">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `
})
export class PhotoGalleryComponent implements OnInit {
  photos: any[] = [];
  loading = false;
  selectedPhotoIndex: number | null = null;

  constructor(private photoService: PhotoService) {}

  ngOnInit(): void {
    this.loadPhotos();
  }

  loadPhotos(): void {
    this.loading = true;
    this.photoService.getPhotos().subscribe({
      next: (photos) => {
        this.photos = photos.map(photo => ({
          ...photo,
          loaded: false
        }));
        this.loading = false;
        this.preloadImages();
      },
      error: (err) => {
        console.error('Error fetching photos:', err);
        this.loading = false;
      }
    });
  }

  preloadImages(): void {
    this.photos.forEach(photo => {
      const img = new Image();
      img.src = photo.url;
      img.onload = () => {
        photo.loaded = true;
      };
    });
  }

  onImageLoad(photo: any): void {
    photo.loaded = true;
  }

  deletePhoto(filename: string): void {
    if (confirm('Are you sure you want to delete this photo?')) {
      this.photoService.deletePhoto(filename).subscribe({
        next: () => {
          this.photos = this.photos.filter(p => p.filename !== filename);
        },
        error: (err) => {
          console.error('Error deleting photo:', err);
        }
      });
    }
  }

  openLightbox(index: number) {
    this.selectedPhotoIndex = index;
  }

  closeLightbox() {
    this.selectedPhotoIndex = null;
  }
} 