import { css } from "@kutty/css";

const cardStyle = css`
  padding: 1.5rem;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
`;

const headingStyle = css`
  color: #89b4fa;
  margin-top: 0;
`;

export function App() {
  return (
    <div class={cardStyle}>
      <h1 class={headingStyle}>Preact + @kutty/css</h1>
      <p>Zero-runtime colocated CSS powered by @kutty/css Vite plugin.</p>
    </div>
  );
}
