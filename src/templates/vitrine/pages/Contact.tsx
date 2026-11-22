import type { ReactNode } from "react";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { resolveBlock } from "../lib/content";
import { prettyPhone } from "../lib/format";
import type { View } from "../lib/view";
import { Heading, PageTop } from "../components/Heading";
import { Icon, WhatsAppIcon, type IconName } from "../components/primitives";

function Card({ icon, title, children, index }: { icon: IconName; title: string; children: ReactNode; index: number }) {
  return (
    <div className="vt-panel grid content-start gap-3 p-6" data-reveal style={{ ["--d" as string]: `${index * 70}ms` }}>
      <span className="vt-promise__icon" aria-hidden>
        <Icon name={icon} className="size-5" />
      </span>
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] vt-muted">{title}</h2>
      <div className="grid gap-1.5 text-[1.05rem] font-semibold">{children}</div>
    </div>
  );
}

export function ContactPage({ view }: { view: View }) {
  const { tenant, content, locale, ui } = view;
  const { contact } = tenant;
  const intro = resolveBlock(content.contactIntro, locale);
  const address = [contact.address, contact.city].filter(Boolean).join(", ");
  let i = 0;

  return (
    <PageTop labelledBy="vt-page-title">
      <div className="grid gap-12">
        <Heading id="vt-page-title" level={1} eyebrow={intro.eyebrow || tenant.name} title={intro.title || ui.contact} text={intro.text} />

        <div className="vt-cta" data-reveal>
          <div className="grid gap-2">
            <p className="vt-eyebrow !text-current opacity-80">{ui.whatsapp}</p>
            <p className="vt-h2 !text-[clamp(1.8rem,4.4vw,3.2rem)]">{ui.writeUs}</p>
          </div>
          <a href={whatsappUrl(contact.whatsapp)} className="vt-btn vt-btn--wa" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> {ui.orderWhatsApp}
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contact.phones.length > 0 && (
            <Card icon="phone" title={ui.phone} index={i++}>
              {contact.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="vt-link-underline w-fit">
                  {prettyPhone(p)}
                </a>
              ))}
            </Card>
          )}
          {contact.email && (
            <Card icon="mail" title={ui.email} index={i++}>
              <a href={`mailto:${contact.email}`} className="vt-link-underline w-fit break-all">
                {contact.email}
              </a>
            </Card>
          )}
          {address && (
            <Card icon="pin" title={ui.address} index={i++}>
              <p>{address}</p>
              {contact.mapUrl && (
                <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="vt-accent-text mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-bold">
                  {ui.map} <Icon name="arrow" className="size-4" />
                </a>
              )}
            </Card>
          )}
          {contact.hours && (
            <Card icon="clock" title={ui.hours} index={i++}>
              {contact.hours.split(/\n|;/).map((line) => (
                <p key={line}>{line.trim()}</p>
              ))}
            </Card>
          )}
          {contact.socials.length > 0 && (
            <Card icon="sparkle" title={ui.follow} index={i++}>
              <ul className="flex flex-wrap gap-2">
                {contact.socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="vt-chip">
                      {s.network}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </PageTop>
  );
}
