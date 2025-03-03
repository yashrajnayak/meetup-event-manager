# Meetup Event Manager

A React application for managing Meetup event waitlists and RSVPs efficiently. Built with TypeScript, React, and the Meetup GraphQL API.

## Features

### Authentication
- OAuth 2.0 Implicit Grant Flow integration with Meetup
- Secure token management
- Only requires Client ID (no Client Secret needed)

### Event Management
- View all events you've organized
- Real-time event data using GraphQL
- Support for in-person, online, and hybrid events

### Waitlist Management
- Bulk operations for waitlist management
- Progress tracking for bulk operations
- Rate limit handling with automatic backoff

### Error Handling
- Comprehensive GraphQL error handling
- Network error recovery
- Rate limit monitoring and compliance

## Technical Details

### API Integration
```typescript
// Example: Fetching user profile
const GET_USER_PROFILE = gql`
  query GetUserProfile {
    self {
      id
      name
      email
      bio
      isOrganizer
    }
  }
`;
```

### Rate Limiting
- Points-based system (500 points per 60 seconds)
- Automatic backoff when limits are approached
- Batch processing with configurable sizes

### CORS and Proxy
- Cloudflare Worker-based proxy
- Proper CORS headers configuration
- Request/Response transformation

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yashrajnayak/meetup-event-manager.git
cd meetup-event-manager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Meetup Client ID:
```env
VITE_MEETUP_CLIENT_ID=your_client_id_here
```

Note: Only the Client ID is required for authentication. No Client Secret is needed as we use the OAuth 2.0 Implicit Grant Flow.

4. Start the development server:
```bash
npm run dev
```

## Development

### Environment Variables
- `VITE_MEETUP_CLIENT_ID`: Your Meetup OAuth Client ID

### Available Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint
- `npm run test`: Run tests

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Meetup API Documentation](https://www.meetup.com/api/guide/)
- [React Documentation](https://react.dev/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)