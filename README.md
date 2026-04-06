# YouTube Backend

A YouTube-style backend built with Bun, Hono, MongoDB, Better Auth, Cloudinary, and Vercel Blob.

## Run

```sh
bun install
bun run dev
```

Base URL:

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

- Better Auth handler: `/api/auth/*`
- Protected routes require a valid session

Unauthorized response:

```json
{
  "error": "Unauthorized"
}
```

## Query Params

List endpoints may use:

- `sortBy`
- `sortOrder`
- `page`
- `limit`

Pagination response shape:

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

## API

### Users

- `POST /users/register`
- `POST /users/login`
- `POST /users/logout`
- `GET /users/me`
- `POST /users/image`
- `POST /users/cover-image`
- `GET /users/:username`

### Videos

- `GET /videos`
- `GET /videos/users/:username`
- `POST /videos`
- `GET /videos/:videoId`
- `PATCH /videos/:videoId`
- `PATCH /videos/:videoId/visibility`
- `DELETE /videos/:videoId`

Notes:

- `GET /videos` supports `query`, `sortBy`, `sortOrder`, `page`, `limit`
- `GET /videos/users/:username` supports `sortBy`, `sortOrder`, `page`, `limit`
- write routes use `multipart/form-data` for video upload/update

### Playlists

- `POST /playlists`
- `GET /playlists/users/:username`
- `GET /playlists/:playlistId`
- `PATCH /playlists/:playlistId`
- `PATCH /playlists/:playlistId/videos/:videoId`
- `PATCH /playlists/:playlistId/visibility`
- `DELETE /playlists/:playlistId`

### Tweets

- `POST /tweets`
- `GET /tweets/users/:username`
- `GET /tweets/:tweetId`
- `PATCH /tweets/:tweetId`
- `DELETE /tweets/:tweetId`

### Comments

- `POST /comments/videos/:videoId`
- `POST /comments/tweets/:tweetId`
- `GET /comments/videos/:videoId`
- `GET /comments/tweets/:tweetId`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`

### Likes

- `POST /likes/videos/:videoId`
- `POST /likes/tweets/:tweetId`
- `POST /likes/comments/:commentId`
- `GET /likes/videos`
- `GET /likes/tweets`
- `GET /likes/comments`

### Watch History

- `GET /watch-history`
- `PATCH /watch-history`
- `DELETE /watch-history/all`
- `DELETE /watch-history/:watchHistoryId`

### Dashboard

- `GET /dashboard/stats`
- `GET /dashboard/videos`

### Subscriptions

- `POST /subscriptions/users/:username/toggle`
- `GET /subscriptions/users/:username/count`
- `GET /subscriptions/users/:username/subscribers`
- `GET /subscriptions/users/:username/subscribed-channels`

### Health

- `GET /health`

## Notes

- Route paths use kebab-case
- Query params use camelCase
- Rate limiting is applied globally
- Some read endpoints are intentionally protected:
  - `GET /videos/:videoId`
  - `GET /playlists/users/:username`
  - `GET /comments/*`
