# Contributing to AI Workspace

Thank you for your interest in contributing to AI Workspace! We are building an Arabic-first AI productivity platform, and we welcome contributions that align with our mission.

## Code of Conduct

Please be respectful and considerate in all interactions. We are committed to providing a welcoming environment for everyone.

## Getting Started

1.  **Read the README**: Please verify the [Project Knowledge & Guidelines](README.md) to understand the project's identity, architecture, and specific requirements (especially regarding RTL and Arabic support).
2.  **Fork and Clone**: Fork the repository to your own GitHub account and clone it locally.
3.  **Install Dependencies**: Run `npm install` to install the required packages.
4.  **Set up Environment**: Copy `.env.example` to `.env` and fill in the required `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Development Guidelines

### 1. Arabic-First & RTL (Critical)

This project prioritizes native Arabic support. All UI contributions **must** support RTL (Right-to-Left) layouts seamlessly.

*   **Logical Properties**: Use Tailwind logical properties (e.g., `ms-4`, `ps-4`, `text-start`) instead of physical ones (`ml-4`, `pl-4`, `text-left`).
*   **Translations**: All user-facing text must be externalized in `src/locales/{lang}/translation.json`. Add keys for both `en` and `ar`.
*   **Testing**: Always test your changes in both English and Arabic modes.

### 2. Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, React Query.
*   **Backend**: Supabase (PostgreSQL, Edge Functions).

### 3. Code Style

*   We use TypeScript for type safety. Please ensure no `any` types are used unless absolutely necessary.
*   Follow the existing file structure and naming conventions (e.g., `src/components/`, `src/hooks/`).

## Pull Request Process

1.  Create a new branch for your feature or bugfix (`git checkout -b feature/my-feature`).
2.  Commit your changes with clear, descriptive commit messages.
3.  Push your branch to your fork.
4.  Open a Pull Request against the `main` branch.
5.  In your PR description, explain *what* you changed and *why*.
6.  Ensure all checks pass.

## Reporting Bugs

If you find a bug, please open an issue describing:
*   Steps to reproduce.
*   Expected behavior.
*   Actual behavior.
*   Screenshots (if applicable).

## Questions?

Refer to the "Support & FAQ" section in the `README.md` or contact the maintainers.
