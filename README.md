# YouTube Backend

Backend API for a YouTube-style application built with Hono, Bun, MongoDB, Better Auth, Cloudinary, and Vercel Blob.

## Run Locally

Install dependencies:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

Base API URL:

```text
http://localhost:8080/api
```

## Stack

- Bun
- Hono
- MongoDB + Mongoose
- Better Auth
- Cloudinary
- Vercel Blob
- Zod

## Auth

This project uses Better Auth.

- Better Auth handler base path: `/api/auth/*`
- Protected routes require a valid authenticated session
- In the current setup, protected routes rely on Better Auth session headers/cookies

If a protected route is called without a valid session:

```json
{
    "error": "Unauthorized"
}
```

## Common Response Shape

Typical success response:

```json
{
    "success": true
}
```

Typical error response:

```json
{
    "error": "Something went wrong"
}
```

Validation errors usually return:

```json
{
    "error": {
        "fieldName": ["message"]
    }
}
```

## Common Query Params

Some list endpoints support:

- `sortBy`
- `sortOrder`
- `page`
- `limit`

Current conventions:

- `sortOrder`: `asc` or `desc`
- `page`: starts from `1`
- `limit`: must be greater than `0`

## Endpoints

### Health

#### `GET /health`

Health check endpoint.

Example response:

```json
{
    "success": true,
    "message": "Server is running",
    "uptime": 123.45,
    "service": {
        "db": "connected"
    }
}
```

### Users

#### `POST /users/register`

Register a new user.

Body:

```json
{
    "name": "Sumit",
    "email": "sumit@example.com",
    "password": "password123",
    "username": "sumit"
}
```

Rules:

- `name`: 3 to 16 chars
- `email`: valid email
- `password`: 8 to 32 chars
- `username`: 3 to 16 chars

#### `POST /users/login`

Login with username or email.

Body:

```json
{
    "identifier": "sumit",
    "password": "password123"
}
```

#### `POST /users/logout`

Protected.

Logout current user.

#### `GET /users/me`

Protected.

Get current authenticated user.

#### `POST /users/image`

Protected.

Upload or update profile image.

Content type:

```text
multipart/form-data
```

Fields:

- `image`: jpeg or png, max 5 MB

#### `POST /users/cover-image`

Protected.

Upload or update cover image.

Content type:

```text
multipart/form-data
```

Fields:

- `coverImage`: image file

#### `GET /users/:username`

Get public profile by username.

### Videos

#### `GET /videos`

Get all public videos.

Query params:

- `query`: optional title search
- `sortBy`: `viewsCount`, `duration`, `createdAt`
- `sortOrder`: `asc`, `desc`
- `page`
- `limit`

Example:

```text
/api/videos?query=music&sortBy=viewsCount&sortOrder=desc&page=1&limit=10
```

Example response:

```json
{
    "success": true,
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "videos": []
}
```

#### `GET /videos/users/:username`

Get public videos uploaded by a user.

Query params:

- `sortBy`: `viewsCount`, `duration`, `createdAt`
- `sortOrder`: `asc`, `desc`
- `page`
- `limit`

Response shape matches `GET /videos`.

#### `POST /videos`

Protected.

Upload a video.

Content type:

```text
multipart/form-data
```

Fields:

- `title`
- `description`
- `video`: `mp4` or `webm`, max 50 MB
- `thumbnail`: `jpeg` or `png`, max 5 MB

#### `GET /videos/:videoId`

Protected.

Get one video by id.

Notes:

- owner can access private videos
- non-owners can only access public videos
- this endpoint increments view count
- if watch history is enabled, this endpoint updates watch history

#### `PATCH /videos/:videoId`

Protected.

Update video title, description, or thumbnail.

Content type:

```text
multipart/form-data
```

Fields:

- `title`: optional
- `description`: optional
- `thumbnail`: optional

#### `PATCH /videos/:videoId/visibility`

Protected.

Toggle video visibility between `public` and `private`.

#### `DELETE /videos/:videoId`

Protected.

Delete a video.

Cleanup currently includes:

- likes on the video
- comments on the video
- likes on those comments
- watch history rows for the video
- removing the video from playlists
- deleting Cloudinary video and thumbnail assets

### Playlists

#### `POST /playlists`

Protected.

Create a playlist.

Body:

```json
{
    "name": "My playlist",
    "description": "Optional"
}
```

#### `GET /playlists/users/:username`

Protected.

Get playlists of a user.

Query params:

- `sortOrder`: `asc` or `desc`

#### `GET /playlists/:playlistId`

Protected.

Get one playlist by id.

#### `PATCH /playlists/:playlistId`

Protected.

Update playlist.

Body:

```json
{
    "name": "Updated name",
    "description": "Updated description"
}
```

Both fields are optional.

#### `PATCH /playlists/:playlistId/videos/:videoId`

Protected.

Toggle a video inside a playlist.

- adds the video if it is not present
- removes the video if it already exists

#### `PATCH /playlists/:playlistId/visibility`

Protected.

Toggle playlist visibility.

#### `DELETE /playlists/:playlistId`

Protected.

Delete a playlist.

Deleting a playlist only removes the playlist document. It does not delete videos.

### Tweets

#### `POST /tweets`

Protected.

Create a tweet.

Body:

```json
{
    "content": "Hello world"
}
```

Rules:

- `content`: 1 to 280 chars

#### `GET /tweets/users/:username`

Get tweets by username.

Query params:

- `sortOrder`: `asc` or `desc`

#### `GET /tweets/:tweetId`

Protected.

Get one tweet by id.

#### `PATCH /tweets/:tweetId`

Protected.

Update tweet content.

Body:

```json
{
    "content": "Updated tweet"
}
```

#### `DELETE /tweets/:tweetId`

Protected.

Delete a tweet.

Cleanup currently includes:

- likes on the tweet
- comments on the tweet
- likes on those comments

### Comments

#### `POST /comments/videos/:videoId`

Protected.

Add a comment on a video.

Body:

```json
{
    "content": "Nice video"
}
```

#### `POST /comments/tweets/:tweetId`

Protected.

Add a comment on a tweet.

Body:

```json
{
    "content": "Nice tweet"
}
```

#### `GET /comments/videos/:videoId`

Protected.

Get comments of a video.

Query params:

- `sortBy`: `createdAt`, `likesCount`
- `sortOrder`: `asc`, `desc`

#### `GET /comments/tweets/:tweetId`

Protected.

Get comments of a tweet.

Query params:

- `sortBy`: `createdAt`, `likesCount`
- `sortOrder`: `asc`, `desc`

#### `PATCH /comments/:commentId`

Protected.

Update a comment.

Body:

```json
{
    "content": "Updated comment"
}
```

#### `DELETE /comments/:commentId`

Protected.

Delete a comment.

Cleanup currently includes:

- likes on the comment

### Likes

#### `POST /likes/videos/:videoId`

Protected.

Toggle like on a video.

#### `POST /likes/tweets/:tweetId`

Protected.

Toggle like on a tweet.

#### `POST /likes/comments/:commentId`

Protected.

Toggle like on a comment.

#### `GET /likes/videos`

Protected.

Get videos liked by the current user.

#### `GET /likes/tweets`

Protected.

Get tweets liked by the current user.

#### `GET /likes/comments`

Protected.

Get comments liked by the current user.

### Watch History

#### `GET /watch-history`

Protected.

Get current user watch history.

Query params:

- `sortOrder`: `asc` or `desc`

#### `PATCH /watch-history`

Protected.

Toggle watch history on or off for the current user.

Example response:

```json
{
    "success": true,
    "watchHistory": true
}
```

#### `DELETE /watch-history/all`

Protected.

Delete all watch history entries for the current user.

#### `DELETE /watch-history/:watchHistoryId`

Protected.

Delete one watch history entry.

### Dashboard

#### `GET /dashboard/stats`

Protected.

Get current channel stats.

Example response:

```json
{
    "success": true,
    "stats": {
        "subscribersCount": 120,
        "subscribedToCount": 45,
        "totalVideos": 18,
        "totalTweets": 9,
        "totalCommentsByMe": 34,
        "videoStats": {
            "_id": null,
            "totalViews": 15420,
            "totalLikes": 980,
            "totalComments": 210
        }
    }
}
```

#### `GET /dashboard/videos`

Protected.

Get current user videos for the dashboard.

Query params:

- `sortBy`: `createdAt`, `viewsCount`, `duration`
- `sortOrder`: `asc`, `desc`

### Subscriptions

#### `POST /subscriptions/users/:username/toggle`

Protected.

Toggle subscription to a channel.

Notes:

- cannot subscribe to yourself

#### `GET /subscriptions/users/:username/count`

Get subscriber and subscribed-to counts for a channel.

#### `GET /subscriptions/users/:username/subscribers`

Protected.

Get subscribers of a channel.

Each subscriber object includes `isSubscribed` relative to the current user.

#### `GET /subscriptions/users/:username/subscribed-channels`

Protected.

Get channels a user is subscribed to.

Each channel object includes `isSubscribed` relative to the current user.

## Notes

- Route paths use kebab-case
- Query params currently use camelCase
- Rate limiting is applied globally
- `GET /videos/:videoId` is protected in the current implementation
- `GET /playlists/users/:username` is protected in the current implementation
- `GET /comments/*` endpoints are protected in the current implementation
