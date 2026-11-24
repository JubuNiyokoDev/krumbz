import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { isToComplete } from "@/lib/content";
import { loadStorefrontContent } from "@/templates/boutique/content";
import { pageMetadata } from "@/lib/seo/site";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, ShareIcon, SocialIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Magnetic } from "@/components/ui/Magnetic";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { Crumbs } from "@/components/ui/Crumbs";
import { PageHero } from "@/components/sections/common/PageHero";

export async function generateMetadata({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale as Locale, "contact", "/contact");
}

function Card({ icon, title, children, index, className = "" }: { icon: ReactNode; title: string; children: ReactNode; index: number; className?: string }) {
  return (
    <li
      data-reveal
      style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
      className={`group flex flex-col gap-4 rounded-[2rem] bg-cream p-6 shadow-biscuit ring-1 ring-navy/5 transition-transform duration-500 ease-out-back hover:-translate-y-1.5 sm:p-8 ${className}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold text-navy transition-transform duration-500 ease-out-back group-hover:-rotate-6 group-hover:scale-110">
        {icon}
      </span>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="text-lg text-navy/85">{children}</div>
    </li>
  );
}

export default async function ContactPage({ params }: PageProps<"/tpl/boutique/[tenant]/[locale]/contact">) {
  const { locale } = await params;
  const c = await loadStorefrontContent(locale);
  const cp = c.contactPage;
  const t = await getTranslations("common");
  const tc = { label: c.common.toComplete, hint: c.common.toCompleteHint };
  const socials = c.contact.socials.filter((s) => s.url);
  const emailKnown = !isToComplete(c.contact.email) && Boolean(c.contact.email);

  return (
    <>
      <PageHero id="contact-title" eyebrow={cp.eyebrow} title={cp.title} lead={cp.intro} />
      <div className="bg-cream pb-24">
        <ul className="mx-auto grid max-w-[88rem] gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-10">
          <li data-reveal className="grain relative overflow-hidden rounded-[2rem] bg-navy p-6 text-cream shadow-lift sm:p-10 md:col-span-2 lg:row-span-2">
            <Crumbs className="opacity-70" />
            <div className="relative flex h-full flex-col items-start gap-5">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0e7a40] text-white">
                <WhatsAppIcon size={34} />
              </span>
              <h2 className="font-display text-[clamp(2.2rem,5vw,3.75rem)] font-bold leading-none">{cp.whatsappTitle}</h2>
              <p className="max-w-md text-lg text-cream/85 sm:text-xl">{cp.whatsappText}</p>
              <p className="font-display text-2xl font-semibold text-gold-light sm:text-3xl">{c.contact.whatsapp.display}</p>
              <div className="mt-auto pt-4">
                <Magnetic>
                  <a href={whatsappUrl(c.contact.whatsapp.number, cp.whatsappPrefill)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp px-7 py-4 text-lg">
                    <WhatsAppIcon size={22} />
                    {cp.whatsappCta}
                  </a>
                </Magnetic>
              </div>
            </div>
          </li>

          <Card index={1} icon={<PhoneIcon size={26} />} title={cp.phoneTitle}>
            <ul className="space-y-3">
              {c.contact.phones.map((p) => (
                <li key={p.e164}>
                  <a href={`tel:${p.e164}`} aria-label={t("callNumber", { number: p.display })} className="inline-flex items-center gap-3 rounded-full bg-cream-deep px-5 py-3 font-display text-lg font-semibold transition-colors hover:bg-gold/40">
                    {p.display}
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          <Card index={2} icon={<MailIcon size={26} />} title={cp.emailTitle}>
            {emailKnown ? (
              <a href={`mailto:${c.contact.email}`} className="font-semibold text-rust underline-offset-4 hover:underline">
                {c.contact.email}
              </a>
            ) : (
              <TextWithToComplete value={c.contact.email} {...tc} />
            )}
          </Card>

          <Card index={3} icon={<PinIcon size={26} />} title={cp.locationTitle}>
            <p>
              <span className="block text-sm font-semibold text-navy/75">{cp.addressTitle}</span>
              <TextWithToComplete value={c.contact.address} {...tc} />
            </p>
            <p className="mt-2">
              <TextWithToComplete value={c.contact.city} {...tc} />
              {", "}
              {c.contact.country}
            </p>
            {c.contact.mapUrl ? (
              <a href={c.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm mt-4 text-navy">
                <PinIcon size={18} />
                {cp.mapCta}
              </a>
            ) : null}
          </Card>

          <Card index={4} icon={<ClockIcon size={26} />} title={cp.hoursTitle}>
            <TextWithToComplete value={c.contact.hours} {...tc} />
          </Card>

          <Card index={5} icon={<ShareIcon size={26} />} title={cp.socialTitle}>
            {socials.length ? (
              <ul className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <li key={s.network}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-cream-deep px-4 py-2.5 font-semibold transition-colors hover:bg-gold/40">
                      <SocialIcon network={s.network} />
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <TextWithToComplete value={cp.socialEmpty} {...tc} />
            )}
          </Card>
        </ul>
      </div>
    </>
  );
}
