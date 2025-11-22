# Community Backgrounds Feature

## Overview

The Community Backgrounds feature allows users to upload their own custom backgrounds and share them with the entire community through a marketplace. Other users can browse, like, and download these community-created backgrounds.

## Features

### For Users
- **Upload Custom Backgrounds**: Upload your own background images (up to 5MB)
- **Add Metadata**: Name, description, and tags for better discoverability
- **Browse Community Market**: Discover backgrounds shared by other users
- **Like Backgrounds**: Show appreciation for backgrounds you love
- **Download & Use**: Download and use any approved community background
- **Sort & Filter**: Sort by Latest, Most Liked, or Most Popular

### For Administrators
- **Moderation System**: Review and approve/reject uploaded backgrounds
- **Report System**: Users can report inappropriate content
- **Admin Dashboard**: Simple approval workflow via API

## How It Works

### User Flow

1. **Access the Shop**
   - Open the Shop from the main menu
   - Navigate to the "🌍 Community" tab

2. **Upload a Background**
   - Tap "📤 Upload Background"
   - Select an image from your device
   - Enter a name (required)
   - Add a description (optional)
   - Add tags (optional, comma-separated)
   - Submit for review

3. **Browse Backgrounds**
   - View all approved community backgrounds
   - Sort by Latest, Most Liked, or Popular
   - See upload date, author, likes, and downloads

4. **Like & Download**
   - Tap the heart icon to like a background
   - Tap "Use Background" to download and use it

### Upload Guidelines

**File Requirements:**
- Format: JPG, JPEG, PNG, GIF, or WebP
- Maximum size: 5MB
- Recommended dimensions: 800x600 or higher

**Content Guidelines:**
- Must be appropriate for all ages
- No offensive, discriminatory, or copyrighted content
- Original creations or properly licensed images only

## Technical Details

### Architecture

**Client Side:**
- `services/CommunityBackgroundService.ts` - API communication
- `components/ShopScreen.tsx` - UI with Community tab
- `types/Shop.ts` - TypeScript types for community backgrounds

**Server Side:**
- `server/index.js` - REST API endpoints
- `server/database.js` - Database operations
- `server/public/backgrounds/` - Uploaded image storage

### API Endpoints

See [COMMUNITY_BACKGROUNDS_API.md](../server/COMMUNITY_BACKGROUNDS_API.md) for complete API documentation.

Key endpoints:
- `POST /api/community-backgrounds/upload` - Upload new background
- `GET /api/community-backgrounds` - List approved backgrounds
- `POST /api/community-backgrounds/:id/like` - Like/unlike
- `POST /api/community-backgrounds/:id/download` - Track download

### Database Schema

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
  likedBy: [String]        // Array of user IDs
}
```

## Moderation Workflow

1. **User Uploads**: Background starts with `status: 'pending'`
2. **Admin Review**: Admin reviews via API or future admin panel
3. **Approval**: Background becomes visible with `status: 'approved'`
4. **Rejection**: Background is rejected with reason

### Admin Approval Example

**Important:** Set the `ADMIN_KEY` environment variable before using admin endpoints.

```bash
# Set admin key (do this once)
export ADMIN_KEY="your-secure-admin-key"

# Approve a background
curl -X POST http://localhost:3000/api/admin/backgrounds/BACKGROUND_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secure-admin-key"}'

# Reject a background
curl -X POST http://localhost:3000/api/admin/backgrounds/BACKGROUND_ID/reject \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-secure-admin-key", "reason": "Does not meet guidelines"}'
```

## Security & Privacy

### File Upload Security
- File size limited to 5MB
- Only image file types accepted
- Files validated by multer middleware
- Unique filenames prevent collisions
- Cryptographically secure ID generation (UUID v4)

### Content Moderation
- All uploads require approval before display
- Report system for inappropriate content
- Admin authentication for moderation actions
- Timing-safe credential comparison prevents attacks

### User Privacy
- User IDs and usernames are public for attribution
- Like actions are tracked but not publicly displayed individually

### Rate Limiting (Production Recommendation)
For production deployments, implement rate limiting:
- **Upload endpoint:** 5 uploads per hour per user/IP
- **Like/download endpoints:** 1000 requests per hour per user/IP
- **Admin endpoints:** 100 requests per hour per IP
- Consider using middleware like `express-rate-limit`

## Future Enhancements

Potential improvements for future versions:

1. **Enhanced Search**: Full-text search across names, descriptions, and tags
2. **Categories**: Organize backgrounds by themes (Nature, Abstract, Gradient, etc.)
3. **Collections**: Users can create collections of favorite backgrounds
4. **Animated Backgrounds**: Support for animated/video backgrounds
5. **AI Moderation**: Automated content screening before manual review
6. **User Profiles**: View all backgrounds from a specific creator
7. **Download Statistics**: Detailed analytics for uploaded backgrounds
8. **Featured Backgrounds**: Curated selection of top backgrounds
9. **Remix/Edit**: Allow users to edit/remix existing backgrounds
10. **Web Dashboard**: Admin panel for easier moderation

## Troubleshooting

### Upload Fails
- Check file size (must be under 5MB)
- Verify file type (JPG, PNG, GIF, WebP only)
- Ensure stable internet connection
- Try reducing image quality/size

### Background Not Appearing
- Uploads require admin approval
- Check back in 24-48 hours for approval
- Ensure upload was successful

### Like/Download Not Working
- Verify internet connection
- Check server status at `/health` endpoint
- Ensure user is logged in

## Testing

### Manual Testing Checklist

- [ ] Upload background with image picker
- [ ] View uploaded background in pending state
- [ ] Admin approve background
- [ ] View approved background in community list
- [ ] Like background
- [ ] Unlike background
- [ ] Download/use background
- [ ] Sort by different options (Latest, Likes, Downloads)
- [ ] Report inappropriate background
- [ ] Test with various image formats
- [ ] Test file size limits

### API Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Get community backgrounds
curl http://localhost:3000/api/community-backgrounds

# Test with pagination
curl "http://localhost:3000/api/community-backgrounds?limit=10&skip=0&sortBy=likes"
```

## Contributing

When working on this feature:

1. Test all upload/download flows
2. Verify database operations (both MongoDB and in-memory)
3. Check error handling for edge cases
4. Update API documentation for any changes
5. Test moderation workflow
6. Ensure UI is responsive and accessible

## Support

For issues or questions:
- Check server logs for error details
- Verify database connection
- Ensure all environment variables are set
- Review API documentation

## License & Attribution

All user-uploaded content remains the property of the uploader. By uploading, users grant the platform a license to display and distribute their backgrounds. Users are responsible for ensuring they have the rights to upload content.
