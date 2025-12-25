# TypeScript Configuration Fix for Angular Applications

## Problem Summary

The Angular application was experiencing TypeScript errors when using `console.log()`:

```
TS2584: Cannot find name 'console'. Do you need to change your target library?
Try changing the 'lib' compiler option to include 'dom'.
```

Additionally, build and typecheck commands were failing with:

```
TS5069: Option 'emitDeclarationOnly' cannot be specified without specifying
option 'declaration' or option 'composite'.
```

## Root Cause

The issue occurred because **Angular applications inherited TypeScript settings from `tsconfig.base.json` that were designed for publishable libraries, not browser applications**.

### The Problematic Base Configuration

```json
// tsconfig.base.json (designed for libraries)
{
  "compilerOptions": {
    "composite": false,
    "declarationMap": true,
    "emitDeclarationOnly": true,    // ❌ Libraries only!
    "lib": ["es2022"],              // ❌ Missing "dom"!
    "module": "nodenext",
    "moduleResolution": "nodenext",
    // ... other options
  }
}
```

### Why This Configuration Fails for Angular Apps

1. **Missing DOM Types**: Libraries often run in Node.js environments and don't need browser APIs. Applications run in browsers and need `console`, `window`, `document`, etc.

2. **Declaration-Only Mode**: Libraries need to emit `.d.ts` type definition files for consumers. Applications don't need type definitions - they need executable JavaScript.

3. **Module System Mismatch**: The base config uses `nodenext` module resolution, which is appropriate for libraries but may conflict with Angular's bundler-based build system.

## The Solution

Override the incompatible settings in the Angular application's TypeScript configurations:

### 1. Updated `apps/angular-project/tsconfig.app.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": [],
    "lib": ["es2022", "dom"],         // ✅ Added "dom"
    "declaration": false,              // ✅ No type definitions needed
    "declarationMap": false,           // ✅ No declaration maps needed
    "emitDeclarationOnly": false       // ✅ Emit JavaScript, not just types
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

### 2. Updated `apps/angular-project/tsconfig.spec.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": ["vitest/globals"],
    "lib": ["es2022", "dom"],         // ✅ Added "dom"
    "declaration": false,              // ✅ No type definitions needed
    "declarationMap": false,           // ✅ No declaration maps needed
    "emitDeclarationOnly": false       // ✅ Emit JavaScript, not just types
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
```

### 3. Custom Typecheck Target in `apps/angular-project/project.json`

The Nx inferred typecheck target was running `tsc --build --emitDeclarationOnly`, which conflicts with application builds. We override it:

```json
{
  "targets": {
    "typecheck": {
      "command": "tsc --build --pretty",
      "options": {
        "cwd": "apps/angular-project"
      }
    },
    // ... other targets
  }
}
```

## TypeScript Compiler Options Explained

### `lib` (Compiler Library Files)

**What it does**: Specifies which built-in type definition libraries TypeScript should include.

**Options**:
- `"es2022"`: Modern JavaScript features (Promise, async/await, etc.)
- `"dom"`: Browser APIs (console, window, document, HTMLElement, etc.)
- `"dom.iterable"`: Iteration support for DOM collections
- `"webworker"`: Web Worker APIs
- `"scripthost"`: Windows Script Host APIs

**For Angular apps**: Always include `["es2022", "dom"]` or similar browser libs.

**For Node.js libraries**: Use `["es2022"]` without `"dom"`.

```json
// ❌ BAD for Angular apps
"lib": ["es2022"]

// ✅ GOOD for Angular apps
"lib": ["es2022", "dom"]

// ✅ GOOD for Node.js libraries
"lib": ["es2022"]
```

---

### `emitDeclarationOnly` (Generate Only Type Definitions)

**What it does**: When `true`, TypeScript only emits `.d.ts` declaration files and skips JavaScript generation.

**Use cases**:
- ✅ Publishable libraries that consumers will import
- ❌ Applications that need to run in browsers

**Why applications don't need this**:
- Applications are bundled and deployed, not imported by other projects
- Applications need executable JavaScript, not type definitions
- The Angular CLI handles compilation differently than `tsc`

```json
// ✅ GOOD for libraries
{
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true
  }
}

// ✅ GOOD for applications
{
  "compilerOptions": {
    "declaration": false,
    "emitDeclarationOnly": false
  }
}
```

---

### `declaration` (Generate Type Definitions)

**What it does**: Generates `.d.ts` files alongside JavaScript output.

**Use cases**:
- ✅ Libraries that other TypeScript projects will consume
- ❌ Applications (adds unnecessary build overhead)

**Why libraries need this**:
- Provides type information to consumers
- Enables IntelliSense in IDEs for library users
- Required for TypeScript's project references feature

```typescript
// Library code: my-lib.ts
export function add(a: number, b: number): number {
  return a + b;
}

// Generated: my-lib.d.ts
export declare function add(a: number, b: number): number;
```

---

### `declarationMap` (Source Maps for Type Definitions)

**What it does**: Generates `.d.ts.map` files that map type definitions back to original TypeScript source.

**Use cases**:
- ✅ Published libraries for "Go to Definition" in IDEs
- ❌ Applications (no benefit)

**How it helps**:
- When users import your library and click "Go to Definition", they see your original TypeScript source instead of generated `.d.ts` files
- Improves debugging experience for library consumers

```json
// ✅ GOOD for published libraries
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}

// ✅ GOOD for applications
{
  "compilerOptions": {
    "declaration": false,
    "declarationMap": false
  }
}
```

---

### `composite` (TypeScript Project References)

**What it does**: Enables TypeScript's project references feature for incremental builds.

**Benefits**:
- Faster rebuilds (only changed projects recompile)
- Enforces dependency boundaries
- Enables `tsc --build` mode

**In Nx monorepos**:
- Nx manages this automatically via `nx sync`
- Usually set to `false` in base config
- Individual projects may enable it

```json
{
  "compilerOptions": {
    "composite": false  // Let Nx manage project references
  }
}
```

---

### `module` and `moduleResolution`

**What they do**: Control how TypeScript handles import/export statements.

**Common values**:

| Value | Use Case |
|-------|----------|
| `"nodenext"` | Node.js libraries with native ESM |
| `"esnext"` | Modern bundlers (Webpack, Vite, esbuild) |
| `"preserve"` | Keep module syntax as-is (Angular 21+) |
| `"commonjs"` | Legacy Node.js (require/module.exports) |

**For Angular apps**:
```json
{
  "compilerOptions": {
    "module": "preserve",        // Angular CLI handles bundling
    "moduleResolution": "bundler" // Use bundler resolution
  }
}
```

**For Node.js libraries**:
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

---

## Best Practices for Nx Monorepos

### Structure Your TypeScript Configs Hierarchically

```
monorepo/
├── tsconfig.base.json           # Shared strict settings
├── tsconfig.libs.json           # Library-specific overrides
├── packages/
│   └── my-lib/
│       ├── tsconfig.json        # Extends tsconfig.libs.json
│       └── tsconfig.lib.json    # Build config
└── apps/
    └── my-app/
        ├── tsconfig.json        # Extends base + adds DOM
        └── tsconfig.app.json    # Build config with overrides
```

### Example: Create a Separate Library Config

**tsconfig.libs.json** (at root):
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "lib": ["es2022"],
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

**tsconfig.apps.json** (at root):
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "declaration": false,
    "declarationMap": false,
    "emitDeclarationOnly": false,
    "lib": ["es2022", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

Then update your projects:
```json
// packages/my-lib/tsconfig.json
{
  "extends": "../../tsconfig.libs.json",
  // lib-specific overrides
}

// apps/my-app/tsconfig.json
{
  "extends": "../../tsconfig.apps.json",
  // app-specific overrides
}
```

---

## Verification Commands

After applying the fix, verify everything works:

```bash
# Type checking should pass
npx nx typecheck angular-project

# Build should succeed
npx nx build angular-project

# Tests should run
npx nx test angular-project

# Linting should pass
npx nx lint angular-project
```

---

## Key Takeaways

1. **Libraries and applications have different TypeScript needs**:
   - Libraries: Need type definitions, no DOM, Node.js module system
   - Applications: Need DOM APIs, executable JS, bundler-optimized

2. **The `lib` option is critical for browser apps**:
   - Always include `"dom"` for Angular/React/Vue applications
   - Omit `"dom"` for Node.js libraries and CLI tools

3. **Declaration generation is for consumers, not end users**:
   - Enable for libraries (`declaration: true`)
   - Disable for applications (`declaration: false`)

4. **Override inheritance when needed**:
   - Don't be afraid to override base config settings
   - Application configs should explicitly set browser-specific options
   - Use multiple base configs if libraries and apps diverge significantly

5. **Nx inferred targets may need customization**:
   - The default typecheck target works for libraries
   - Applications may need custom typecheck commands

---

## Related Issues

If you see similar errors in the future:

```
TS2584: Cannot find name 'window'
TS2584: Cannot find name 'document'
TS2584: Cannot find name 'fetch'
```

→ Add `"dom"` to the `lib` array in your `tsconfig.app.json`

```
TS5069: Option 'X' cannot be specified without 'declaration'
```

→ Either enable `"declaration": true` or remove/disable the conflicting option

```
NG4006: TS compiler option "emitDeclarationOnly" is not supported
```

→ Set `"emitDeclarationOnly": false` in your Angular app's tsconfig

---

## References

- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Angular Build System](https://angular.dev/tools/cli/build-system)
- [Nx TypeScript Configuration](https://nx.dev/recipes/tips-n-tricks/typescript-project-references)
