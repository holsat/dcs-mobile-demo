# AGENTS.md

This document provides essential information for AI agents and developers working on the DCS-Plus mobile application.

## Project Overview

DCS-Plus is a React Native/Expo mobile application that provides an enhanced viewer for the Digital Chant Stand (DCS) website content, featuring liturgical services with search and annotation capabilities.

## Technology Stack

- **Framework**: React Native with Expo (~54.0.25)
- **Language**: TypeScript (strict mode enabled)
- **Navigation**: Expo Router with file-based routing
- **State Management**: React Context API
- **Package Manager**: npm

## Development Setup

### Prerequisites

- Node.js (v18+ recommended)
- npm
- Expo CLI
- For iOS development: Xcode and CocoaPods
- For Android development: Android Studio

### Initial Setup

```bash
# Clone the repository
git clone git@github.com:holsat/dcs-mobile-demo.git
cd dcs-mobile-demo

# Install dependencies
npm install

# Start the development server
npm start
```

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run prebuild` - Generate native projects (clean)
- `npm run prebuild:ios` - Generate iOS native project only

## Environment Variables

This project does not require any environment variables for local development. All content is loaded from the public DCS website (https://dcs.goarch.org).

## Branching Strategy

**IMPORTANT**: Before making any major changes, new features, or modifications to existing features:

1. **Create a new branch** from `master`:

   ```bash
   git checkout master
   git pull origin master
   git checkout -b feature/your-feature-name
   ```

2. **Branch naming conventions**:
   - Features: `feature/description`
   - Bug fixes: `fix/description`
   - Work-in-progress: `work/YYYY-MM-DD` or `work/description`
   - Hotfixes: `hotfix/description`

3. **Development workflow**:
   - Make your changes in the feature branch
   - Commit regularly with descriptive messages
   - Push your branch to remote
   - Create a pull request when ready for review
   - Merge to `master` after review

## Code Quality

### Linting and Formatting

- **ESLint**: Configured with `eslint-config-expo`
- **Prettier**: Configured for consistent code formatting
- **Pre-commit hooks**: Automatically run linting and formatting on staged files

### TypeScript

- Strict mode is enabled (`strict: true` in tsconfig.json)
- All new code must be properly typed
- Avoid using `any` type unless absolutely necessary

## Project Structure

```
.
├── app/                    # Expo Router pages (file-based routing)
│   ├── (tabs)/            # Tab-based navigation screens
│   ├── _layout.tsx        # Root layout
│   └── *.tsx              # Additional screens
├── components/            # Reusable React components
│   ├── ui/               # UI-specific components
│   ├── AudioPlayer.tsx   # Audio playback component
│   ├── ServicesOverlay.tsx
│   └── ...
├── contexts/             # React Context providers
│   ├── AnnotationsContext.tsx
│   ├── PreferencesContext.tsx
│   └── ServicesContext.tsx
├── lib/                  # Utility functions and helpers
│   ├── cache.ts         # Asset caching utilities
│   ├── dcs.ts           # DCS website integration
│   ├── annotations-*.ts # Annotation system
│   └── ...
├── constants/           # App-wide constants
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── assets/             # Images, fonts, and other static assets
```

## Key Features

### 1. Content Viewing

- Loads liturgical services from DCS website
- Intelligent caching to reduce network requests
- Support for various service types (Liturgy, Matins, etc.)

### 2. Annotations System

- Icons for altar servers (candle lighting, processions, etc.)
- Text notes for any service content
- Annotations persist locally across sessions
- Long-press to add/remove annotations

### 3. Audio Player

- Plays audio content from DCS website
- Seekable progress bar
- Replay functionality
- Audio file caching for better performance
- Proper AirPods/headphone routing

### 4. Search Functionality

- Full-text search within services
- PDF search capabilities

## Testing

Currently, no automated tests are configured. This is a high-priority item for future development.

**TODO**: Set up Jest for unit testing and React Native Testing Library for component tests.

## Common Tasks

### Adding a New Screen

1. Create a new file in `app/` directory following Expo Router conventions
2. Export a default React component
3. Navigation will be automatically configured based on file structure

### Adding a New Component

1. Create component in `components/` directory
2. Use TypeScript for props interface
3. Follow existing component patterns (themed components when applicable)

### Modifying Cached Content

The app uses `expo-file-system` and `@react-native-async-storage/async-storage` for caching:

- See `lib/cache.ts` for caching utilities
- Cache keys are generated from URLs
- Cache can be cleared via Settings > Cache Settings

## Debugging

### Common Issues

1. **"Unable to resolve module"**: Run `npm install` and restart Metro bundler
2. **Native module issues**: Run `npm run prebuild` to regenerate native code
3. **Cached content not updating**: Clear app cache via Settings or use `clear-cache.sh`

### Logging

Currently uses `console.log` for debugging. Consider implementing structured logging for production.

## Contributing Guidelines

1. Follow the branching strategy outlined above
2. Ensure code passes linting (`npm run lint`)
3. Format code before committing (`npm run format` or rely on pre-commit hooks)
4. Write clear, descriptive commit messages
5. Update this AGENTS.md file if you add new setup requirements or change workflows

## Architecture Decisions

### Why Expo?

- Simplified React Native development
- File-based routing with Expo Router
- Built-in modules for common mobile features
- Easier build and deployment process

### Why Local Caching?

- Reduces load on DCS website
- Improves app performance
- Enables offline viewing of previously loaded content
- Audio files need local storage for proper duration detection

### Why Annotations are Local-Only?

- Simplifies implementation (no backend required)
- Privacy-focused (data stays on device)
- Future enhancement could add sync/sharing capabilities

## License

GNU General Public License v2.0 - See LICENSE file for details.

## Contact

Project maintainer: holsat (sheldon.leewen@tanukivision.com)
Repository: https://github.com/holsat/dcs-mobile-demo
