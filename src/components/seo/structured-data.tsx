/**
 * JSON-LD for agents and crawlers that read structured data before they read
 * prose. Rendered server-side so it is present in the initial HTML.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own literals, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function landingSchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: "Dissent",
        description:
          "Give it a decision. Invite opposing perspectives. Attack the assumptions. Commit when the argument survives.",
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Dissent",
        url: origin,
        logo: `${origin}/icon`,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#app`,
        name: "Dissent",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: origin,
        description:
          "Five dissenters argue one founder decision on a shared table. ChatGPT reads the company's real context and writes claims, contradictions and evidence requests as structured objects through WebMCP. The founder confirms the commit.",
        featureList: [
          "WebMCP tool surface exposed at document.modelContext",
          "Company Brain built from a repository and site, split into facts and assumptions",
          "Five-dissenter stress test of a single decision",
          "Contradictions and open evidence that block commit",
          "Prediction scoring and per-domain founder calibration",
          "Read-only shareable decision records",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };
}
