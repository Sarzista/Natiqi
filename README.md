# M2M - Message to Mind

A React Native application built with Expo, TypeScript, and glassmorphism design.

## 🚀 Tech Stack

- **Framework**: Expo + React Native + React Native Web
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context + Hooks

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AppHeader/      # Global header component
│   ├── ScreenContainer/# Layout wrapper component
│   └── PatientCard/    # Patient card component
├── screens/            # Screen components
│   ├── LoginScreen/    # Login screen with glassmorphism
│   └── DashboardScreen/# Dashboard with patient list
├── navigation/         # Navigation configuration
├── services/           # Mock services (auth, patients)
├── context/            # React Context providers
├── theme/              # Theme configuration (colors, spacing, typography)
└── types/              # TypeScript type definitions
```

## 🎨 Design

The app features a **glassmorphism** design with:
- Frosted glass effects
- Gradient backgrounds
- Modern, clean UI
- Responsive layout for web and mobile

## 🏃 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (installed globally or via npx)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your preferred platform:
- **Web**: `npm run web` or press `w` in the Expo CLI
- **Android**: `npm run android` or press `a`
- **iOS**: `npm run ios` or press `i` (macOS only)

## 🔐 Authentication

Currently uses mock authentication:
- **Email**: Any email address
- **Password**: Any password

The `authService` can be easily replaced with real API calls later.

## 📱 Features (Phase 1)

- ✅ Login screen with email/password
- ✅ Dashboard with patient list
- ✅ Glassmorphism theme
- ✅ Reusable layout components
- ✅ Mock data services

## 🔄 Next Steps

- Add Patient Monitor screen
- Add Alerts screen
- Connect to real backend API
- Add more patient details
- Implement real authentication

## 📝 Development Notes

- All styling uses the centralized theme in `src/theme/`
- Components are designed to be reusable
- Services are mock implementations ready to be replaced with API calls
- Navigation automatically handles authentication state changes

## 🤝 Contributing

This project uses a branch-based workflow:
- `main` - Stable, production-ready code
- `dev` - Integration branch for team collaboration
- `feature/*` - Feature branches for individual work


