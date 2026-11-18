/** Renders schema.org data as a JSON-LD <script>; "<" is escaped to prevent HTML injection. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Stable identifiers shared by the Organization, Brand and Product nodes. */
export const SCHEMA_IDS = {
  organization: "#organization",
  brand: "#brand",
} as const;
