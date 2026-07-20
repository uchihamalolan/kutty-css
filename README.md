# [`@kutty/css`](https://github.com/uchihamalolan/kutty-css)

Zero-runtime colocated CSS for Vite via tagged template literals.

## Workspace Structure

- [`packages/css`](./packages/css): Core `@kutty/css` library & Vite plugin published to [JSR](https://jsr.io).
- [`examples/preact`](./examples/preact): Preact example app using `@kutty/css`.
- [`examples/solid`](./examples/solid): SolidJS example app using `@kutty/css`.

## Development Commands

Install all workspace dependencies:

```bash
bun install
```

Build example applications:

```bash
bun run --filter '*' build
```

Verify JSR package publish readiness:

```bash
cd packages/css
bunx jsr publish --dry-run
```

## Repository

[github.com/uchihamalolan/kutty-css](https://github.com/uchihamalolan/kutty-css)

## License

MIT
