# Community Backgrounds API

This document describes the API endpoints for the community backgrounds feature.

## Base URL

All endpoints are relative to your server URL (e.g., `http://localhost:3000` for development or `https://mathgameapp.onrender.com` for production).

## Endpoints

### Upload Background

Upload a new community background image.

**Endpoint:** `POST /api/community-backgrounds/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `image` (file, required) - The background image file (max 5MB, jpg/jpeg/png/gif/webp)
- `name` (string, required) - Name of the background (max 50 chars)
- `description` (string, optional) - Description (max 200 chars)
- `tags` (JSON string, optional) - Array of tags as JSON string
- `uploadedBy` (string, required) - User ID of uploader
- `uploaderName` (string, required) - Username of uploader

**Response (Success 200):**
```json
{
  "success": true,
  "background": {
    "id": "community_1234567890_abc123",
    "name": "Sunset Gradient",
    "description": "A beautiful sunset gradient",
    "tags": ["gradient", "sunset", "warm"],
    "imageUrl": "/backgrounds/1234567890-abc123.png",
    "uploadedBy": "user123",
    "uploaderName": "JohnDoe",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "status": "pending",
    "likes": 0,
    "downloads": 0
  }
}
```

**Response (Error 400):**
```json
{
  "error": "Missing required fields"
}
```

---

### Get Community Backgrounds

Get a list of approved community backgrounds.

**Endpoint:** `GET /api/community-backgrounds`

**Query Parameters:**
- `limit` (number, optional, default: 50) - Number of results to return
- `skip` (number, optional, default: 0) - Number of results to skip (pagination)
- `sortBy` (string, optional, default: 'uploadedAt') - Sort field ('uploadedAt', 'likes', 'downloads')
- `sortOrder` (number, optional, default: -1) - Sort order (-1 for descending, 1 for ascending)

**Response (Success 200):**
```json
{
  "backgrounds": [
    {
      "id": "community_1234567890_abc123",
      "name": "Sunset Gradient",
      "description": "A beautiful sunset gradient",
      "tags": ["gradient", "sunset", "warm"],
      "imageUrl": "/backgrounds/1234567890-abc123.png",
      "uploadedBy": "user123",
      "uploaderName": "JohnDoe",
      "uploadedAt": "2024-01-01T12:00:00.000Z",
      "status": "approved",
      "likes": 42,
      "downloads": 150
    }
  ]
}
```

---

### Get Specific Background

Get details of a specific community background.

**Endpoint:** `GET /api/community-backgrounds/:backgroundId`

**Response (Success 200):**
```json
{
  "background": {
    "id": "community_1234567890_abc123",
    "name": "Sunset Gradient",
    "description": "A beautiful sunset gradient",
    "tags": ["gradient", "sunset", "warm"],
    "imageUrl": "/backgrounds/1234567890-abc123.png",
    "uploadedBy": "user123",
    "uploaderName": "JohnDoe",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "status": "approved",
    "likes": 42,
    "downloads": 150
  }
}
```

**Response (Error 404):**
```json
{
  "error": "Background not found"
}
```

---

### Like/Unlike Background

Toggle like status for a background.

**Endpoint:** `POST /api/community-backgrounds/:backgroundId/like`

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "liked": true,
  "likes": 43
}
```

---

### Record Download

Record that a user downloaded/used a background.

**Endpoint:** `POST /api/community-backgrounds/:backgroundId/download`

**Request Body:** None required

**Response (Success 200):**
```json
{
  "success": true
}
```

---

### Report Background

Report a background for inappropriate content.

**Endpoint:** `POST /api/community-backgrounds/:backgroundId/report`

**Request Body:**
```json
{
  "userId": "user123",
  "reason": "Inappropriate content"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Report submitted"
}
```

---

## Admin Endpoints

### Approve Background

Approve a pending background for display in the community market.

**Endpoint:** `POST /api/admin/backgrounds/:backgroundId/approve`

**Request Body:**
```json
{
  "adminKey": "your-secure-admin-key"
}
```

**Note:** The `ADMIN_KEY` environment variable must be set on the server for this endpoint to work.

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Background approved"
}
```

---

### Reject Background

Reject a pending background and optionally delete the file.

**Endpoint:** `POST /api/admin/backgrounds/:backgroundId/reject`

**Request Body:**
```json
{
  "adminKey": "your-secure-admin-key",
  "reason": "Does not meet quality standards"
}
```

**Note:** The `ADMIN_KEY` environment variable must be set on the server for this endpoint to work.

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Background rejected"
}
```

---

## Status Codes

- `200` - Success
- `400` - Bad Request (missing fields, invalid data)
- `403` - Forbidden (invalid admin key)
- `404` - Not Found (background doesn't exist)
- `500` - Server Error

## File Storage

Uploaded background images are stored in the `server/public/backgrounds/` directory and are accessible via the path returned in `imageUrl`.

For example, if `imageUrl` is `/backgrounds/1234567890-abc123.png`, the full URL would be:
- Development: `http://localhost:3000/backgrounds/1234567890-abc123.png`
- Production: `https://mathgameapp.onrender.com/backgrounds/1234567890-abc123.png`

## Security Notes

1. **File Size Limit:** 5MB maximum
2. **File Types:** Only image files (jpg, jpeg, png, gif, webp) are accepted
3. **Moderation:** All uploads start with `status: 'pending'` and require admin approval
4. **Admin Key:** Set via environment variable `ADMIN_KEY` or use default `ADMIN_APPROVE_KEY`
5. **Rate Limiting:** Consider implementing rate limiting for uploads in production

## Database Schema

### Community Background Document

```javascript
{
  id: String,              // Unique identifier
  name: String,            // Background name
  description: String,     // Optional description
  tags: [String],          // Search tags
  imageUrl: String,        // Path to image file
  uploadedBy: String,      // User ID
  uploaderName: String,    // Username
  uploadedAt: Date,        // Upload timestamp
  status: String,          // 'pending', 'approved', 'rejected'
  likes: Number,           // Like count
  downloads: Number,       // Download count
  likedBy: [String],       // Array of user IDs who liked
  approvedAt: Date,        // Optional approval timestamp
  rejectedAt: Date,        // Optional rejection timestamp
  rejectionReason: String  // Optional rejection reason
}
```

### Report Document

```javascript
{
  id: String,              // Unique identifier
  backgroundId: String,    // ID of reported background
  userId: String,          // User ID who reported
  reason: String,          // Report reason
  reportedAt: Date,        // Report timestamp
  status: String           // 'pending', 'resolved', 'dismissed'
}
```

## Environment Variables

- `ADMIN_KEY` - Admin authentication key for moderation endpoints
- `MONGODB_URI` - MongoDB connection string (falls back to in-memory storage if not set)

## Testing

You can test the API using curl or any HTTP client:

```bash
# Get community backgrounds
curl http://localhost:3000/api/community-backgrounds

# Check server status
curl http://localhost:3000/health
```

For upload testing, use a tool like Postman or create a multipart form upload.
