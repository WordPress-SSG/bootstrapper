# **Site Management API**

**Base URL:** `/api`

## **Endpoints**

### **1. Welcome**
- **GET /** → Returns a welcome message.

### **2. API Status**
- **GET /status** → Returns API status.
  ```json
  { "status": "OK", "timestamp": "2025-03-04T12:34:56Z" }
  ```

### **3. Create Site**
- **POST /sites/create** → Creates a new site.  
  **Request:** `{ "domain": "example.com" }`  
  **Responses:**  
  - `201 Created` → `{ "id": "123", "domain": "example.com", "status": "created" }`
  - `400 Bad Request` → `{ "errors": [{ "msg": "Domain is required" }] }`
  - `500 Internal Server Error` → `{ "error": "Failed to create site" }`

### **4. Build & Publish Site**
- **POST /sites/build-publish** → Builds & deploys a site.  
  **Request:** `{ "domain": "example.com" }`  
  **Responses:**  
  - `201 Created` → `{ "id": "123", "domain": "example.com", "status": "deployed" }`
  - `400 Bad Request` → `{ "errors": [{ "msg": "Domain is required" }] }`
  - `500 Internal Server Error` → `{ "error": "Failed to deploy site" }`

### **Errors**
- `400` → Invalid input.
- `500` → Server error.

**Note:** Requests require `Content-Type: application/json`.