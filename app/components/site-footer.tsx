import Link from "next/link";

function OneZeroNineMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="#6C4DFF" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fontFamily="Poppins, sans-serif"
        fill="#FFFFFF"
      >
        1Z9
      </text>
    </svg>
  );
}

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-footer ${className}`}>
      <nav className="site-footer-links" aria-label="Legal">
        <Link href="/privacy">Privacy Policy</Link>
        <span className="site-footer-dot">·</span>
        <Link href="/terms">Terms &amp; Disclaimer</Link>
      </nav>
      <a
        href="https://1zero9.com"
        target="_blank"
        rel="noopener noreferrer"
        className="site-footer-brand"
      >
        <OneZeroNineMark />
        <span>
          Built by <strong>1ZERO9</strong>
        </span>
      </a>
    </footer>
  );
}
