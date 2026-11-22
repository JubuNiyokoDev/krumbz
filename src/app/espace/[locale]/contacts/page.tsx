import type { Metadata } from "next";
import { contactsAction } from "@/espace/actions";
import { ActionForm } from "@/espace/components/ActionForm";
import { Shell } from "@/espace/components/Shell";
import { espaceMessages, format } from "@/espace/i18n";
import { vendorContext } from "@/espace/server";
import { loadContacts } from "@/lib/espace/contacts";
import { loadTenant } from "@/lib/espace/products";
import { LIMITS, SOCIAL_NETWORKS } from "@/lib/espace/validation";

export async function generateMetadata({ params }: PageProps<"/espace/[locale]/contacts">): Promise<Metadata> {
  return { title: espaceMessages((await params).locale).contacts.title };
}

/** Contact details shown in the storefront; WhatsApp is where orders are sent. */
export default async function ContactsPage({ params }: PageProps<"/espace/[locale]/contacts">) {
  const { locale: rawLocale } = await params;
  const { locale, m, deps } = await vendorContext(rawLocale);
  const [tenant, contact] = await Promise.all([loadTenant(deps), loadContacts(deps)]);
  const phoneSlots = Math.max(LIMITS.phones, contact?.phones.length ?? 0);
  const socialSlots = Math.max(3, contact?.socials.length ?? 0);

  return (
    <Shell locale={locale} m={m} path="/contacts" shopName={tenant.name}>
      <h1>{m.contacts.title}</h1>
      <p className="muted">{m.contacts.intro}</p>
      <ActionForm
        action={contactsAction.bind(null, locale)}
        submitLabel={m.common.save}
        pendingLabel={m.common.saving}
        errorTitle={m.common.errorTitle}
        testId="contacts-form"
      >
        <section className="card">
          <label className="field">
            <span>
              {m.contacts.whatsapp} <span className="muted">({m.common.required})</span>
            </span>
            <input name="whatsapp" type="tel" inputMode="tel" required defaultValue={contact?.whatsapp ?? ""} aria-describedby="whatsapp-hint" />
            <small id="whatsapp-hint">{m.contacts.whatsappHint}</small>
          </label>
          <div className="grid">
            {Array.from({ length: phoneSlots }, (_, index) => (
              <label key={index} className="field">
                <span>{format(m.contacts.phone, { n: index + 1 })}</span>
                <input name={`phones.${index}`} type="tel" inputMode="tel" defaultValue={contact?.phones[index] ?? ""} />
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>{m.contacts.title}</h2>
          <label className="field">
            <span>{m.contacts.email}</span>
            <input name="email" type="email" autoComplete="email" defaultValue={contact?.email ?? ""} />
          </label>
          <label className="field">
            <span>{m.contacts.address}</span>
            <input name="address" type="text" maxLength={LIMITS.address} defaultValue={contact?.address ?? ""} />
          </label>
          <div className="grid">
            <label className="field">
              <span>{m.contacts.city}</span>
              <input name="city" type="text" maxLength={LIMITS.city} defaultValue={contact?.city ?? ""} />
            </label>
            <label className="field">
              <span>{m.contacts.hours}</span>
              <input name="hours" type="text" maxLength={LIMITS.hours} defaultValue={contact?.hours ?? ""} aria-describedby="hours-hint" />
              <small id="hours-hint">{m.contacts.hoursHint}</small>
            </label>
          </div>
          <label className="field">
            <span>{m.contacts.mapUrl}</span>
            <input name="mapUrl" type="url" maxLength={LIMITS.url} defaultValue={contact?.mapUrl ?? ""} aria-describedby="map-hint" />
            <small id="map-hint">{m.contacts.mapUrlHint}</small>
          </label>
        </section>

        <section className="card">
          <h2>{m.contacts.socials}</h2>
          {Array.from({ length: socialSlots }, (_, index) => {
            const current = contact?.socials[index];
            return (
              <div key={index} className="grid">
                <label className="field">
                  <span>{format(m.contacts.network, { n: index + 1 })}</span>
                  <select name={`socials.${index}.network`} defaultValue={current?.network ?? ""}>
                    <option value="">{m.contacts.networkNone}</option>
                    {SOCIAL_NETWORKS.map((network) => (
                      <option key={network} value={network}>
                        {network[0].toUpperCase() + network.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{format(m.contacts.socialUrl, { n: index + 1 })}</span>
                  <input name={`socials.${index}.url`} type="url" maxLength={LIMITS.url} defaultValue={current?.url ?? ""} />
                </label>
              </div>
            );
          })}
        </section>
      </ActionForm>
    </Shell>
  );
}
