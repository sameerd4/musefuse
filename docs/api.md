# Musefuse API Documentation

**Version:** `v1`  
**Base URL:** `http://localhost:5001/api/v1`

## Table of Contents

1. [Authentication](#authentication)  
2. [Endpoints](#endpoints)  
   - [Register (`POST /register`)](#post-apiv1register)  
   - [Login (`POST /login`)](#post-apiv1login)  
   - [Upload Photo (`POST /upload`)](#post-apiv1upload)  
   - [List Photos (`GET /photos`)](#get-apiv1photos)  
   - [Serve Photo (`GET /photos/<filename>`)](#get-apiv1photosfilename)  
3. [Error Handling](#error-handling)  
4. [Rate Limits & File Size](#rate-limits--file-size)  
5. [Environment Variables](#environment-variables)  
6. [How to Run the Flask Server](#how-to-run-the-flask-server)  
7. [Swagger/OpenAPI Docs](#swaggeropenapi-docs)  
8. [iOS/Android Integration Notes](#iosandroid-integration-notes)  
9. [Example `curl` Calls](#example-curl-calls)  

## Authentication

Musefuse uses JWT (JSON Web Token) for protected endpoints. To authenticate:

1. Get a token by calling the login endpoint
2. Include the token in subsequent requests:
```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 15 minutes. When expired, you'll need to login again.

## Endpoints

### POST /api/v1/register

Create a new user account.

**Request:**
```json
{
    "username": "user123",
    "password": "securepass123"
}
```

**Response (201):**
```json
{
    "error": false,
    "message": "User created successfully"
}
```

### POST /api/v1/login

Authenticate and receive a JWT token.

**Request:**
```json
{
    "username": "user123",
    "password": "securepass123"
}
```

**Response (200):**
```json
{
    "error": false,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
}
```

### POST /api/v1/upload

Upload a new photo. Requires authentication.

**Headers:**
- Authorization: Bearer <token>
- Content-Type: multipart/form-data

**Form Data:**
- file: (binary photo data)

**Response (201):**
```json
{
    "error": false,
    "message": "File uploaded successfully",
    "filename": "photo.jpg",
    "s3_url": "https://<bucket>.s3.<region>.amazonaws.com/originals/photo.jpg",
    "thumbnail_url": "https://<bucket>.s3.<region>.amazonaws.com/thumbnails/photo.jpg"
}
```

### GET /api/v1/photos

Retrieve all photos. Requires authentication.

**Headers:**
- Authorization: Bearer <token>

**Response (200):**
```json
{
    "error": false,
    "data": [
        {
            "filename": "photo.jpg",
            "url": "https://<bucket>.s3.<region>.amazonaws.com/originals/photo.jpg",
            "thumbnail_url": "https://<bucket>.s3.<region>.amazonaws.com/thumbnails/photo.jpg",
            "upload_time": "2024-03-15T14:30:00Z",
            "owner": "user123"
        }
    ]
}
```

### GET /api/v1/photos/<filename>

Serve a specific photo. Redirects to S3 URL.

**Response:** Redirects to the photo's S3 URL

## Error Handling

All API errors return a consistent JSON structure:

```json
{
    "error": true,
    "message": "Description of what went wrong"
}
```

Common status codes:
- **400** - Bad Request (invalid input)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Server Error

## Rate Limits & File Size

- Maximum file size: 10MB per photo
- Supported formats: JPG, PNG, HEIC
- Token expiration: 15 minutes
- Upload limit: 50 photos per day per user
- API rate limit: 100 requests per minute per user

## Environment Variables

Required environment variables:
```bash
JWT_SECRET=your_secret_key
JWT_EXPIRATION_MINUTES=15
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
```

## How to Run the Flask Server

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (see above)

4. Run the server:
```bash
python app.py
```

Server runs at http://localhost:5001

## Swagger/OpenAPI Docs

Interactive API documentation is available at:
- `/api/docs` - This documentation
- `/api/swagger` - Swagger UI (coming soon)

## iOS/Android Integration Notes

### iOS (Swift)
```swift
// Example authentication request
let url = URL(string: "http://localhost:5001/api/v1/login")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body = ["username": "user123", "password": "pass123"]
request.httpBody = try? JSONSerialization.data(withJSONObject: body)

URLSession.shared.dataTask(with: request) { data, response, error in
    // Handle response
}.resume()
```

### Android (Kotlin)
```kotlin
// Example authentication request using OkHttp
val client = OkHttpClient()
val json = """
    {
        "username": "user123",
        "password": "pass123"
    }
""".trimIndent()

val body = json.toRequestBody("application/json".toMediaType())
val request = Request.Builder()
    .url("http://localhost:5001/api/v1/login")
    .post(body)
    .build()

client.newCall(request).execute().use { response ->
    // Handle response
}
```

## Example `curl` Calls

### Register
```bash
curl -X POST http://localhost:5001/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user123","password":"pass123"}'
```

### Login
```bash
curl -X POST http://localhost:5001/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user123","password":"pass123"}'
```

### Upload Photo
```bash
curl -X POST http://localhost:5001/api/v1/upload \
  -H "Authorization: Bearer your_token_here" \
  -F "file=@photo.jpg"
```

### Get Photos
```bash
curl http://localhost:5001/api/v1/photos \
  -H "Authorization: Bearer your_token_here"
``` 