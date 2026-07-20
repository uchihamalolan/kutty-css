# `@kutty/css`

Zero-runtime colocated CSS for Vite via tagged template literals.

## Installation

```bash
# Bun
bunx jsr add @kutty/css

# Deno / npm / pnpm
npx jsr add @kutty/css
```

## Setup

Add the `@kutty/css` Vite plugin to your `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import kuttyCss from "@kutty/css/vite";

export default defineConfig({
  plugins: [kuttyCss()],
});
```

## Usage

Write colocated CSS using the `css` tagged template literal:

```tsx
import { css } from "@kutty/css";

const cardStyle = css`
  padding: 1.5rem;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 8px;
`;

export function Card() {
  return (
    <div class={cardStyle}>
      <h2>Zero-Runtime CSS</h2>
    </div>
  );
}
```

At build and dev time, the Vite plugin extracts your CSS into a standalone `.css` asset and replaces `css\`...\`` template calls with static generated class names.

## License

MIT
