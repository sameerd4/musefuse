import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lightbox-overlay" (click)="close.emit()">
      <div class="lightbox-content" (click)="$event.stopPropagation()">
        <button class="close-button" (click)="close.emit()">×</button>
        <button class="nav-button prev" (click)="navigate(-1)" *ngIf="currentIndex > 0">‹</button>
        <button class="nav-button next" (click)="navigate(1)" *ngIf="currentIndex < photos.length - 1">›</button>
        <img [src]="currentPhoto?.url" alt="Full size photo" class="main-image">
        
        <div class="thumbnail-container">
          <div class="thumbnail-strip">
            <div class="thumbnail-wrapper" *ngFor="let photo of photos; let i = index"
                 [class.active]="i === currentIndex"
                 (click)="setCurrentIndex(i)">
              <img [src]="photo.thumbnail_url" [alt]="'Thumbnail ' + i">
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .lightbox-content {
      position: relative;
      width: 90%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .main-image {
      max-height: calc(90vh - 120px);
      max-width: 100%;
      object-fit: contain;
    }

    .close-button {
      position: absolute;
      top: -40px;
      right: -40px;
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
    }

    .nav-button {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: white;
      font-size: 3rem;
      cursor: pointer;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .nav-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .prev { left: -80px; }
    .next { right: -80px; }

    .thumbnail-container {
      width: 100%;
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }

    .thumbnail-strip {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: nowrap;
      max-width: 100%;
    }

    .thumbnail-wrapper {
      flex: 0 0 60px;
      height: 60px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .thumbnail-wrapper.active {
      border-color: var(--accent-blue);
    }

    .thumbnail-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media (max-width: 1200px) {
      .thumbnail-wrapper {
        flex: 0 0 50px;
        height: 50px;
      }
    }
  `]
})
export class LightboxComponent {
  @Input() photos: any[] = [];
  @Input() currentIndex: number = 0;
  @Output() close = new EventEmitter<void>();
  @Output() indexChange = new EventEmitter<number>();

  get currentPhoto() {
    return this.photos[this.currentIndex];
  }

  navigate(direction: number) {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.photos.length) {
      this.setCurrentIndex(newIndex);
    }
  }

  setCurrentIndex(index: number) {
    this.currentIndex = index;
    this.indexChange.emit(index);
  }
} 