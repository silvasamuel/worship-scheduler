# Worship Scheduler

A React + TypeScript + Vite application for managing worship team schedules and member assignments. Built with Tailwind CSS for a modern, responsive UI.

## Features

- **Member Management**: Add, edit, and remove band members with their instruments and availability
- **Schedule Creation**: Create schedules for specific dates with required instruments
- **Assignment Management**: Assign members to instrument slots, with support for multiple backing vocalists
- **Auto-Fill**: Automatically assign members to schedules based on availability and target counts
- **Statistics**: Visual bar chart showing how many schedules each member has been assigned to
- **Multi-language Support**: English and Portuguese (pt-BR) with localized date formats
- **Import/Export**: Save and load your data as JSON files
- **Flexible Assignments**: Allow members to sing and play instruments on the same date

## Setup

### Prerequisites

- Node.js 20.19.0+ or 22.12.0+
- npm 10.2.4+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open the dev server URL from the terminal output (typically `http://localhost:5173`).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (strict mode, no warnings)
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without changing files
- `npm run type-check` - Run TypeScript type checking

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to ensure code quality before commits.

### What happens on commit:

1. **ESLint** runs on staged TypeScript/TSX files:
   - Fixes auto-fixable issues
   - Detects unused imports and variables
   - Enforces code quality rules

2. **Prettier** formats staged files:
   - TypeScript/TSX files
   - JSON, Markdown, CSS, HTML files

Only staged files are checked, making commits fast and efficient.

### Manual checks:

Before committing, you can manually run:

```bash
npm run lint:fix    # Fix linting issues
npm run format      # Format all files
npm run type-check  # Check TypeScript types
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (buttons, cards, etc.)
│   ├── MembersPanel.tsx
│   ├── SchedulesPanel.tsx
│   └── StatisticsPanel.tsx
├── lib/                 # Utility libraries
│   ├── cn.ts           # Class name utility
│   ├── date.ts         # Date formatting utilities
│   ├── i18n.tsx        # Internationalization
│   └── instruments.ts  # Instrument definitions
├── state/               # State management
│   └── useSchedulerState.ts
├── types.ts             # TypeScript type definitions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files
