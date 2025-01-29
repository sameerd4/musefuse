import { Component } from '@angular/core';
import { PhotoService } from '../../services/photo.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule, CommonModule],
  styles: [`
    .upload-container {
      min-height: calc(100vh - 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .upload-zone {
      width: 100%;
      max-width: 600px;
      background: var(--space-gray);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      transition: all 0.3s ease;
      border: 2px dashed var(--space-gray-light);
    }

    .upload-zone.drag-over {
      border-color: var(--accent-blue);
      transform: scale(1.02);
    }

    .upload-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
      color: var(--text-secondary);
    }

    .upload-text {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .file-input {
      display: none;
    }

    .select-button {
      background: var(--accent-blue);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .select-button:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .select-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .preview-container {
      margin-top: 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .preview-item {
      position: relative;
      padding-bottom: 100%;
      background: var(--space-gray-light);
      border-radius: 8px;
      overflow: hidden;
    }

    .preview-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .preview-item:hover .preview-overlay {
      opacity: 1;
    }

    .preview-button {
      background: rgba(255,255,255,0.1);
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .preview-button:hover {
      transform: scale(1.1);
    }

    .preview-button.upload {
      background: rgba(0,113,227,0.9);
    }

    .preview-button.remove {
      background: rgba(255,59,48,0.9);
    }

    .upload-all-button {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-blue);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .upload-all-button:hover {
      transform: translateX(-50%) translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }

    .upload-all-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: translateX(-50%);
      box-shadow: none;
    }

    .individual-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--accent-blue);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }

    .error-message {
      color: #ff3b30;
      margin-top: 1rem;
      font-size: 0.9rem;
    }

    .mt-4 {
      margin-top: 2rem;
    }
  `],
  template: `
    <div class="upload-container">
      <div class="upload-zone" 
           [class.drag-over]="isDragOver"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)">
        
        <i class="bi bi-cloud-upload upload-icon"></i>
        <p class="upload-text">
          Drag and drop your photos here<br>
          or
        </p>
        
        <input type="file" 
               #fileInput
               class="file-input" 
               (change)="onFileSelected($event)"
               accept="image/*"
               multiple>
               
        <button class="select-button" 
                (click)="fileInput.click()"
                [disabled]="uploading">
          Select Photos
        </button>

        <div *ngIf="selectedFiles.length > 0" class="preview-container">
          <div *ngFor="let file of selectedFiles; let i = index" class="preview-item">
            <img [src]="previewUrls[i]" class="preview-image" [alt]="file.name">
            <div class="preview-overlay">
              <button class="preview-button upload" 
                      (click)="uploadSingleFile(i)"
                      [disabled]="uploading">
                <i class="bi bi-upload"></i>
              </button>
              <button class="preview-button remove" 
                      (click)="removeFile(i)"
                      [disabled]="uploading">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <button *ngIf="selectedFiles.length > 0" 
              class="upload-all-button"
              (click)="uploadFiles()"
              [disabled]="uploading">
        {{ uploading ? 'Uploading...' : 'Upload All Photos (' + selectedFiles.length + ')' }}
      </button>
    </div>
  `
})
export class UploadComponent {
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  uploading = false;
  error = '';
  isDragOver = false;

  constructor(
    private photoService: PhotoService,
    private router: Router
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  handleFiles(files: File[]) {
    const validFiles = files.filter(file => this.isValidImageType(file));
    
    validFiles.forEach(file => {
      this.selectedFiles.push(file);
      this.createPreview(file);
    });

    if (files.length !== validFiles.length) {
      this.error = 'Some files were skipped. Only images are allowed.';
    }
  }

  createPreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrls.push(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async uploadSingleFile(index: number) {
    if (this.uploading) return;
    
    this.uploading = true;
    try {
      await this.photoService.uploadPhoto(this.selectedFiles[index]).toPromise();
      this.removeFile(index);
      if (this.selectedFiles.length === 0) {
        this.router.navigate(['/photos']);
      }
    } catch (err: any) {
      this.error = err.error?.message || 'Upload failed';
    }
    this.uploading = false;
  }

  async uploadFiles() {
    if (this.selectedFiles.length === 0 || this.uploading) return;

    this.uploading = true;
    this.error = '';
    const totalFiles = this.selectedFiles.length;

    for (let i = 0; i < totalFiles; i++) {
      try {
        await this.photoService.uploadPhoto(this.selectedFiles[0]).toPromise();
        this.removeFile(0);  // Always remove index 0 since array shifts
      } catch (err: any) {
        this.error = err.error?.message || 'Upload failed';
        break;
      }
    }

    if (this.selectedFiles.length === 0) {
      this.router.navigate(['/photos']);
    }
    this.uploading = false;
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    return validTypes.includes(file.type.toLowerCase());
  }
} 