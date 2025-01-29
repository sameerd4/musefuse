import { Component, OnInit } from '@angular/core';
import { PhotoService } from '../../services/photo.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  userPhotos: any[] = [];

  constructor(
    private photoService: PhotoService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserPhotos();
  }

  loadUserPhotos() {
    this.photoService.getUserPhotos().subscribe({
      next: (photos) => {
        this.userPhotos = photos;
      },
      error: (error) => {
        console.error('Error loading photos:', error);
      }
    });
  }

  deletePhoto(filename: string) {
    this.photoService.deletePhoto(filename).subscribe({
      next: () => {
        this.userPhotos = this.userPhotos.filter(photo => photo.filename !== filename);
      },
      error: (error) => {
        console.error('Error deleting photo:', error);
      }
    });
  }
} 