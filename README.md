# MuseFuse 📸

MuseFuse is a modern photo storage and sharing platform with web and mobile clients. Built with security and performance in mind, it features high-quality photo storage with automatic thumbnail generation.

## Features 🌟

- **Secure Authentication**: JWT-based authentication system
- **High Quality Storage**: Original photos preserved with optimized thumbnails
- **Multi-Platform**:
  - Web interface built with Angular
  - iOS native app
  - RESTful API for extensibility
- **Cloud Storage**: AWS S3 integration for reliable storage
- **Responsive Design**: Works seamlessly on desktop and mobile

## Tech Stack 🛠

### Backend
- Flask (Python)
- SQLite
- JWT Authentication
- AWS S3
- PIL for image processing

### Web Frontend
- Angular 17
- TypeScript
- Bootstrap
- RxJS

### iOS App
- Swift
- SwiftUI
- URLSession for networking

## Getting Started 🚀

### Prerequisites
- Python 3.8+
- Node.js 16+
- AWS Account
- Xcode 14+ (for iOS development)

### Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS credentials and JWT secret

# Run the server
python app.py
```

### Web Frontend Setup
```bash
cd musefuse-frontend

# Install dependencies
npm install

# Run development server
ng serve
```

### iOS Setup
```bash
cd MuseFuseApp
pod install  # if using CocoaPods
# Open MuseFuseApp.xcodeproj in Xcode
```

## Environment Variables 🔐

Create a `.env` file with:
```
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET_NAME=your_bucket_name
```

## API Documentation 📚

API documentation is available at `/api/swagger` when running the backend server.

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- [Flask-RESTX](https://flask-restx.readthedocs.io/) for API documentation
- [Angular](https://angular.io/) for the web framework
- [SwiftUI](https://developer.apple.com/xcode/swiftui/) for the iOS interface 