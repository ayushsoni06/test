export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: 32, letterSpacing: "-.02em" }}>This proposal isn’t available.</h1>
        <p style={{ marginTop: 12, color: "var(--ink-60)" }}>Check the link, or email <a href="mailto:hey@hex.inc">hey@hex.inc</a>.</p>
      </div>
    </main>
  );
}
