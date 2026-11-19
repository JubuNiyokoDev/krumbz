import { TextWithToComplete } from "@/components/ui/ToComplete";

interface Row {
  label: string;
  value: string;
  indent?: boolean;
}

/** Semantic nutrition table (caption, header cells, indented « dont … » sub-rows). */
export function NutritionTable({
  title,
  per,
  nutrientHeader,
  valueHeader,
  rows,
  disclaimer,
  toComplete,
  toCompleteHint,
}: {
  title: string;
  per: string;
  nutrientHeader: string;
  valueHeader: string;
  rows: Row[];
  disclaimer: string;
  toComplete: string;
  toCompleteHint: string;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-cream shadow-biscuit ring-1 ring-navy/10">
      <table className="w-full border-collapse text-left">
        <caption className="bg-navy px-6 py-5 text-left text-cream">
          <span className="block font-display text-2xl font-bold">{title}</span>
          <span className="mt-1 block text-sm font-semibold text-gold-light">{per}</span>
        </caption>
        <thead>
          <tr className="border-b-2 border-navy/15 bg-cream-deep/60 text-sm uppercase tracking-[0.08em]">
            <th scope="col" className="px-6 py-3 font-bold">
              {nutrientHeader}
            </th>
            <th scope="col" className="px-6 py-3 text-right font-bold">
              {valueHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-navy/10 last:border-b-0">
              <th scope="row" className={`py-3.5 pr-4 align-middle ${row.indent ? "pl-11 font-normal italic text-navy/80" : "pl-6 font-semibold"}`}>
                {row.indent ? (
                  <span aria-hidden className="mr-2 inline-block h-px w-3 bg-navy/40 align-middle" />
                ) : null}
                {row.label}
              </th>
              <td className="px-6 py-3.5 text-right align-middle">
                <TextWithToComplete value={row.value} label={toComplete} hint={toCompleteHint} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-navy/10 bg-cream-deep/40 px-6 py-4 text-sm text-navy/80">{disclaimer}</p>
    </div>
  );
}
