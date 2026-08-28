import Link from "next/link";

export const metadata = {
  title: "Terms & Disclaimer — Ground Control",
};

export default function TermsPage() {
  return (
    <div className="legal-screen">
      <div className="legal-card">
        <Link href="/" className="legal-back-link">
          ← Back
        </Link>

        <h1 className="legal-title">Terms &amp; Disclaimer</h1>
        <p className="legal-updated">Last updated: 28 August 2026</p>

        <p className="legal-notice">
          This is a plain-language summary provided for transparency, not a
          substitute for legal advice.
        </p>

        <h2>The service</h2>
        <p>
          Ground Control is a household planning tool — a shared calendar,
          sticky-note board, and optional modules (Sports, School, Life) —
          built and operated by <strong>1ZERO9</strong>. By creating an
          account you agree to these terms.
        </p>

        <h2>Not a substitute for professional advice</h2>
        <p>
          Ground Control is a convenience/organisational tool only. Content
          you or your household enter — including anything logged under the
          &ldquo;Life&rdquo; module (e.g. medicine names, dosages, or
          course lengths) — is for personal reference only. It is{" "}
          <strong>
            not medical, legal, financial, or safety advice
          </strong>{" "}
          and must not be relied upon as such, and must never be used for
          emergencies. Always consult a qualified professional (e.g. your
          GP or pharmacist) for medical decisions.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>
            You are responsible for the accuracy of the information you and
            your household enter.
          </li>
          <li>
            You are responsible for keeping your account password
            confidential.
          </li>
          <li>
            You must not use the service for any unlawful purpose or to
            store data you don&apos;t have the right to store (e.g. about
            someone outside your household without their knowledge).
          </li>
        </ul>

        <h2>No AI-driven decisions (EU AI Act transparency notice)</h2>
        <p>
          Ground Control does not use an AI system, in the sense defined by
          the EU AI Act (Regulation (EU) 2024/1689), to make or materially
          influence decisions about you, your family, or your data. All
          information displayed is entered directly by you or another
          household member; there is no automated profiling, scoring, or
          algorithmic decision-making involved in how the service works
          today. If this ever changes, we will update this notice and, where
          required, provide the transparency information the Act requires
          before any such feature is enabled.
        </p>

        <h2>Availability &amp; &ldquo;as is&rdquo; service</h2>
        <p>
          We do our best to keep Ground Control available and your data
          safe, but the service is provided <strong>&ldquo;as is&rdquo;</strong>,
          without warranties of any kind, express or implied. We do not
          guarantee uninterrupted or error-free operation and are not liable
          for any loss or damage arising from your use of, or inability to
          use, the service, to the fullest extent permitted by law.
        </p>

        <h2>Data &amp; privacy</h2>
        <p>
          See our <Link href="/privacy">Privacy Policy</Link> for full
          details on what data we collect and your rights.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the service and request deletion of your
          account at any time (see the Privacy Policy for how). We may
          suspend or terminate accounts that misuse the service or violate
          these terms.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the
          service after a change means you accept the updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:hello@1zero9.com">hello@1zero9.com</a>.
        </p>
      </div>
    </div>
  );
}
