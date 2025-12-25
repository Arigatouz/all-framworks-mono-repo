# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an Nx-managed monorepo designed for building and publishing multiple JavaScript/TypeScript libraries and Angular applications. The workspace uses npm workspaces, TypeScript 5.9.3, and Nx 22.3.1 for task orchestration, with integrated support for Angular and JavaScript/TypeScript packages.

**Current Projects**:
- `angular-project`: Angular 21 application using standalone components, Tailwind CSS v4, and the Angular CLI build system
- `angular-project-e2e`: Playwright end-to-end tests for the Angular application

**Note**: The `packages/` directory is ready for generating publishable libraries.

## Common Commands

### Package Generation
```bash
# Generate a new publishable library
npx nx g @nx/js:lib packages/<pkg-name> --publishable --importPath=@org/<pkg-name>

# Generate an Angular library
npx nx g @nx/angular:lib packages/<pkg-name>

# Generate an Angular application (with Playwright e2e)
npx nx g @nx/angular:application apps/<app-name>
```

### Build & Development
```bash
# Build a specific package
npx nx build <pkg-name>

# Build all packages
npx nx run-many -t build

# Serve an Angular application (development mode)
npx nx serve angular-project

# Serve with production configuration
npx nx serve angular-project --configuration=production

# Watch mode for development
npx nx watch --all -- nx build
```

### Testing
```bash
# Run unit tests for a specific package (Vitest)
npx nx test <pkg-name>

# Run all unit tests
npx nx run-many -t test

# Run e2e tests for a specific app (Playwright)
npx nx e2e <app-name>-e2e

# Run e2e tests in CI mode
npx nx run-many -t e2e-ci

# Run e2e tests in headed mode (with browser UI)
npx nx e2e <app-name>-e2e --headed
```

### Code Quality
```bash
# Format check (CI validation)
npx nx format:check --base=main

# Format all files
npx nx format:write

# Lint all packages
npx nx run-many -t lint

# Type check all packages
npx nx run-many -t typecheck
```

### TypeScript Project References
```bash
# Sync TypeScript project references
npx nx sync

# Validate project references (CI)
npx nx sync:check
```

### Visualization & Analysis
```bash
# View project dependency graph
npx nx graph

# Show affected projects
npx nx affected --target=build --base=main
```

### Versioning & Publishing
```bash
# Release packages (with dry-run preview)
npx nx release --dry-run

# Release packages
npx nx release
```

## Architecture

### Monorepo Structure
- **Root**: Nx workspace configuration, shared TypeScript config, and CI/CD workflows
- **apps/**: Angular applications and their corresponding e2e test projects
- **packages/**: Individual publishable libraries (npm workspaces enabled)
- **node_modules/**: Shared dependencies across all packages
- **.nx/**: Nx cache and computation metadata

### TypeScript Configuration
The `tsconfig.base.json` enforces strict TypeScript compilation:
- **Target**: ES2022 with `nodenext` module resolution
- **Strict mode**: All strict checks enabled (noImplicitOverride, noUnusedLocals, noImplicitReturns, etc.)
- **Declaration-only output**: Libraries emit `.d.ts` files via `emitDeclarationOnly: true`
- **Composite projects**: TypeScript project references managed automatically by Nx
- **Custom conditions**: Uses `@org/source` for conditional exports

### Angular Application Architecture
Angular applications in this workspace use modern Angular best practices:

- **Angular version**: 21.0.x with standalone components (no NgModules)
- **Build system**: `@angular/build:application` executor (esbuild-based)
- **Unit testing**: Vitest with `@angular/build:unit-test` executor
- **E2E testing**: Playwright with `@nx/playwright` plugin
- **Styling**: Tailwind CSS v4 with PostCSS integration
- **Output**: Production builds output to `dist/apps/<app-name>/browser`
- **Bundle budgets**: Initial chunk max 1MB, component styles max 8KB

### Nx Plugin System
The workspace uses Nx's inferred task system via the `@nx/js/typescript` plugin. Tasks are automatically discovered from TypeScript configurations without requiring explicit `project.json` files:

- **typecheck**: TypeScript type checking
- **build**: Library compilation (uses `tsconfig.lib.json` per package)
- **build-deps**: Build all dependencies before building the target package
- **watch-deps**: Watch mode for dependencies

Additional inferred targets from Angular and Playwright plugins:
- **serve**: Angular dev server (`@angular/build:dev-server`)
- **e2e**: Playwright end-to-end tests (`@nx/playwright/plugin`)

### CI/CD Pipeline
The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes to `main` and all PRs:

1. **Distribution**: Tasks are distributed across 3 Linux agents via Nx Cloud
2. **Node version**: 20
3. **Pipeline stages**:
   - Format validation (`format:check`)
   - Linting (`lint`)
   - Testing (`test`)
   - Building (`build`)
   - Type checking (`typecheck`)
   - E2E tests (`e2e-ci`)
4. **Self-healing**: Runs `npx nx fix-ci` to apply suggested fixes for CI failures

### Package Import Strategy
When packages are created, use scoped imports with path aliases:
- Import from other packages: `import { foo } from '@org/pkg-name'`
- Path mappings are automatically synced by Nx to `tsconfig.base.json`

### Development Workflow

**For Libraries**:
1. Generate a new package using Nx generators
2. Implement package code in `packages/<pkg-name>/src`
3. Build locally: `npx nx build <pkg-name>`
4. Run tests: `npx nx test <pkg-name>`
5. Type check: `npx nx typecheck <pkg-name>`
6. Ensure `npx nx sync` keeps TypeScript references up to date
7. Create PR - CI will validate formatting, linting, tests, builds, and type checking
8. After merge, use `npx nx release` for versioning and publishing

**For Angular Applications**:
1. Generate components, services, etc. using Angular CLI generators: `npx nx g @nx/angular:component my-component --project=angular-project`
2. Develop with live reload: `npx nx serve angular-project`
3. Write unit tests alongside components (Vitest with `@angular/build:unit-test`)
4. Write e2e tests in `apps/<app-name>-e2e/src` using Playwright
5. Run tests: `npx nx test angular-project` and `npx nx e2e angular-project-e2e`
6. Build for production: `npx nx build angular-project --configuration=production`

### Code Quality Standards
- **Prettier**: Configured for consistent code formatting (`.prettierrc`)
- **ESLint**: Nx ESLint plugin with module boundary enforcement (`@nx/enforce-module-boundaries`)
- **Angular ESLint**: Angular-specific linting rules via `angular-eslint` package
- **TypeScript strict mode**: No implicit any, unused locals/parameters not allowed
- **Isolated modules**: Each file must be independently compilable
- **Declaration maps**: Enabled for better debugging experience in consuming projects

## Key Points for Development

1. **Always run `npx nx sync`** after adding new inter-package dependencies to update TypeScript project references
2. **Use Nx task runners** (`npx nx <target> <project>`) rather than direct npm scripts
3. **Leverage affected commands** for large monorepos: `npx nx affected -t test --base=main`
4. **Build order is automatic**: Nx computes dependency graphs and builds packages in the correct order
5. **Nx Cloud integration**: Remote caching is configured (Nx Cloud ID: `694d44bd6ca6f96e85c39fe2`) for faster CI/CD
6. **Package naming convention**: Use `@org/<package-name>` format for scoped packages
7. **Module format**: Packages output ES modules with CommonJS fallback via `nodenext` resolution
8. **Angular generators**: Use `npx nx g @nx/angular:<schematic>` with the `--project` flag to ensure generated code goes into the correct application
9. **Testing frameworks**: Unit tests use Vitest (configured globally via `@angular/build:unit-test`), e2e tests use Playwright
10. **Tailwind CSS v4**: Angular apps use the latest Tailwind with PostCSS integration (`.postcssrc.json` in each app)
