# Meetup Event Manager

A React application that helps Meetup event organizers manage their waitlists efficiently by allowing them to move members from waitlist to "going" status in bulk, while respecting Meetup's API rate limits.

## Features

- 🔐 OAuth2 authentication with Meetup
- 📋 View all events you're organizing
- 👥 Manage event waitlists
- ⚡ Bulk update member statuses with progress tracking
- 🚦 Rate limit handling with sequential processing
- 📊 Real-time progress indicators
- 🎯 Error handling and retry mechanisms

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

## Rate Limiting

The application implements careful rate limit handling:

- Sequential processing of member status updates
- 1-second delay between requests
- Automatic retry on rate limit errors
- Progress tracking for bulk operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Meetup API Documentation](https://www.meetup.com/api/guide/)
- [React Documentation](https://react.dev/)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)