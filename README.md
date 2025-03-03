# Meetup Event Manager

A powerful tool designed to help Meetup event organizers efficiently manage their event waitlists. This application allows organizers to move members from waitlist to "going" status in bulk while respecting Meetup's API rate limits.

## Features

### Waitlist Management
- Bulk move members from waitlist to "going" status
- Efficient pagination through waitlist members
- Real-time progress tracking
- Batch processing to optimize API usage
- Automatic handling of rate limits

### Rate Limiting
- Respects Meetup API's limit of 500 points per 60 seconds
- Smart point tracking for different operations:
  - Queries: 5 points
  - Mutations: 10 points
- Automatic rate limit window management
- Minimum delay between requests to prevent API overload
- Intelligent retry mechanism for rate-limited requests

### Error Handling
- Comprehensive error handling for API responses
- Detailed error logging and reporting
- Graceful recovery from rate limit errors
- Batch-level error isolation (errors in one batch don't affect others)
- Progress preservation on failure

### Progress Tracking
- Real-time progress updates
- Detailed success/failure tracking
- Per-member status updates
- Batch progress reporting
- Overall operation progress monitoring

## Technical Details

### API Integration
- GraphQL-based communication with Meetup API
- OAuth2 authentication support
- Proxy support for API requests
- Efficient data fetching with pagination
- Type-safe API responses

### Rate Limit Implementation
```typescript
const POINTS_PER_WINDOW = 500;
const RATE_LIMIT_WINDOW = 60000; // 60 seconds
const OPERATION_COSTS = {
  QUERY: 5,
  MUTATION: 10
};
```

### Batch Processing
- Default batch size: 10 members
- Configurable progress callbacks
- Automatic retry on recoverable errors
- Efficient memory usage

## Usage

1. **Authentication**
   ```typescript
   // Initialize with your access token
   const accessToken = "your-meetup-access-token";
   ```

2. **Fetch Waitlist**
   ```typescript
   const waitlistMembers = await fetchWaitlistMembers(
     accessToken,
     eventId,
     (progress) => {
       console.log(`Fetched ${progress.current} of ${progress.total} members`);
     }
   );
   ```

3. **Bulk Update Status**
   ```typescript
   const results = await bulkChangeRsvpStatus(
     accessToken,
     eventId,
     waitlistMembers,
     (progress) => {
       console.log(`Processed ${progress.current} of ${progress.total} members`);
       console.log(`Success: ${progress.success.length}, Failed: ${progress.failed.length}`);
     }
   );
   ```

## Error Handling

The application handles various types of errors:
- Rate limiting errors
- Network errors
- API errors
- Authentication errors
- Invalid response errors

Example error handling:
```typescript
try {
  const results = await bulkChangeRsvpStatus(accessToken, eventId, members);
  console.log(`Successfully updated ${results.success.length} members`);
} catch (error) {
  console.error('Failed to update members:', error);
}
```

## Rate Limit Considerations

The application automatically manages rate limits, but consider these best practices:
- Process large waitlists in multiple sessions
- Monitor the progress callbacks for real-time status
- Handle partial success scenarios appropriately
- Consider implementing cool-down periods between large operations

## Dependencies

- @apollo/client: GraphQL client
- typescript: Type safety
- react: UI framework
- Other dependencies as specified in package.json

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   MEETUP_CLIENT_ID=your_client_id
   MEETUP_CLIENT_SECRET=your_client_secret
   ```
4. Start development server: `npm run dev`

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## License

MIT License - see LICENSE file for details

## Live Demo

Visit [https://yashrajnayak.github.io/meetup](https://yashrajnayak.github.io/meetup) to see the application in action.

## Tech Stack

- React 18
- TypeScript
- Apollo Client for GraphQL
- Tailwind CSS
- Vite
- GitHub Pages for hosting

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Meetup account with organizer privileges
- Meetup API OAuth credentials

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yashrajnayak/meetup.git
cd meetup
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Meetup OAuth credentials:
```env
VITE_MEETUP_CLIENT_ID=your_client_id_here
```

4. Start the development server:
```bash
npm run dev
```

## Building for Production

1. Build the application:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment process:

1. Builds the application with the correct base URL
2. Handles environment variables securely
3. Deploys to GitHub Pages

## CORS and Proxy Configuration

The application uses a multi-proxy setup to handle CORS and API access:

### Cloudflare Worker Proxy

The primary proxy is a Cloudflare Worker that handles:
- GraphQL requests to Meetup's API
- Authentication token forwarding
- CORS headers and preflight requests
- Error handling and response validation

Configuration in `meetup-proxy-worker.js`:
```js
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yashrajnayak.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Fallback Proxy

A fallback proxy (AllOrigins) is configured for redundancy:
- Automatic failover if primary proxy is unavailable
- Health checks to monitor proxy status
- Transparent request forwarding

### Error Handling

The proxy system includes:
- Detailed error logging
- Invalid JSON response detection
- GraphQL-specific error handling
- Status code propagation
- Automatic retry with fallback proxies

## Acknowledgments

- [Meetup API Documentation](https://www.meetup.com/api/guide/)
- [React Documentation](https://react.dev/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)