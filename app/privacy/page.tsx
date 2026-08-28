import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Ground Control",
};

export default function PrivacyPage() {
  return (
    <div className="legal-screen">
      <div className="legal-card">
        <Link href="/" className="legal-back-link">
          ← Back
        </Link>

        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: 28 August 2026</p>

        <p className="legal-notice">
          This page explains, in plain language, what personal data Ground
          Control collects and why. It is provided for transparency and is
          not a substitute for legal advice.
        </p>

        <h2>Who we are</h2>
        <p>
          Ground Control is built and operated by <strong>1ZERO9</strong>{" "}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For any privacy question or
          request, contact us at{" "}
          <a href="mailto:privacy@1zero9.com">privacy@1zero9.com</a>.
        </p>

        <h2>What data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> the email address and password
            (stored as a salted hash, never in plain text) used to sign in.
          </li>
          <li>
            <strong>Household data:</strong> family/household name, and
            profiles you create for family members (name, short name,
            colour, avatar, role).
          </li>
          <li>
            <strong>Content you add:</strong> calendar events, sticky notes,
            tasks and reminders, and any details you enter against them
            (e.g. location, category).
          </li>
          <li>
            <strong>Technical data:</strong> a single session cookie used to
            keep you signed in (see &ldquo;Cookies&rdquo; below).
          </li>
        </ul>
        <p>
          We do not collect payment information, precise location, or
          biometric data. We do not use advertising trackers or sell any
          data to third parties.
        </p>

        <h2>Why we process it</h2>
        <p>
          All data is processed solely to provide the Ground Control service
          to your household — i.e. on the basis of{" "}
          <strong>performance of a contract</strong> with you (GDPR Art.
          6(1)(b)). Where we have a legitimate interest in keeping the
          service secure and working reliably (GDPR Art. 6(1)(f)), we rely
          on that instead.
        </p>

        <h2>Children&apos;s data</h2>
        <p>
          Ground Control is designed to be used by a household, and account
          holders may add profiles and calendar/task information relating to
          their own children. The account holder (an adult) is responsible
          for creating and managing any child profiles and for obtaining any
          consent required under local law. We do not knowingly allow
          children to create their own account.
        </p>

        <h2>Where data is stored</h2>
        <p>
          Data is stored in a managed PostgreSQL database and the
          application is hosted on Vercel. Depending on your region, data
          may be processed outside your home country; where that involves a
          transfer outside the EU/EEA, appropriate safeguards (such as
          Standard Contractual Clauses) are used by our infrastructure
          providers.
        </p>

        <h2>Cookies</h2>
        <p>
          We use exactly one cookie — <code>gc_session</code> — which is
          strictly necessary to keep you signed in. It is httpOnly,
          secure, and cannot be read by JavaScript or third parties. We do
          not use analytics or advertising cookies.
        </p>

        <h2>How long we keep data</h2>
        <p>
          We keep your household&apos;s data for as long as your account is
          active. If you&apos;d like your account and all associated data
          permanently deleted, email us at{" "}
          <a href="mailto:privacy@1zero9.com">privacy@1zero9.com</a> and
          we&apos;ll action it within 30 days.
        </p>

        <h2>Your rights (GDPR)</h2>
        <p>If you are in the UK/EU, you have the right to:</p>
        <ul>
          <li>access the personal data we hold about you;</li>
          <li>have inaccurate data corrected;</li>
          <li>have your data erased (&ldquo;right to be forgotten&rdquo;);</li>
          <li>receive a copy of your data in a portable format;</li>
          <li>object to or restrict certain processing; and</li>
          <li>
            lodge a complaint with your local data protection authority.
          </li>
        </ul>

        <h2>Automated decision-making &amp; AI</h2>
        <p>
          Ground Control does <strong>not</strong> use artificial
          intelligence, machine learning, or automated profiling to make
          decisions about you or your family. Everything shown in the app is
          data you or another household member entered directly. See our{" "}
          <Link href="/terms">Terms &amp; Disclaimer</Link> for more detail.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this page from time to time. Material changes will
          be reflected in the &ldquo;Last updated&rdquo; date above.
        </p>
      </div>
    </div>
  );
}
