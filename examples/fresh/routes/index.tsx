import { css } from "@kutty/css";

const cardStyle = css`
  padding: 2rem;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 12px;
  font-family: system-ui, sans-serif;
  max-width: 400px;
  margin: 4rem auto;
`;

const headingStyle = css`
  color: #89b4fa;
  margin-top: 0;
`;

export default function Home() {
  return (
    <div class={cardStyle}>
      <h1 class={headingStyle}>Fresh + @kutty/css</h1>
      <p>Zero-runtime colocated CSS via @kutty/css.</p>
    </div>
  );
}
