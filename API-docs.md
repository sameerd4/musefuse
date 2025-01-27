# Musefuse API Documentation

**Version:** `v1`  
**Base URL:** `http://localhost:5000/api/v1`

This document explains how to interact with the Musefuse API, including authentication, endpoints, error handling, and more.

---

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

---

## Authentication

Musefuse uses **JWT** (JSON Web Token) authentication for protected endpoints such as uploading and listing photos.

1. **Obtain a JWT** by calling the **Login** endpoint with valid user credentials.
2. **Include the JWT in the `Authorization` header** for protected requests, like so:

Authorization: Bearer <your_jwt_here>

If the JWT is **missing**, **expired**, or **invalid**, the API returns a **401 Unauthorized** response with a JSON error message.

---

## Endpoints

### POST `/api/v1/register`

**Description:** Create a new user account.  

**Request Body (JSON):**  
```json
{
  "username": "john_doe",
  "password": "p@ssw0rd"
}

Response (Success, 201):

{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
