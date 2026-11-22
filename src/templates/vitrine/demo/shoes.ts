/**
 * Demo shop « Ikirenge Shoes » for the « vitrine » template.
 *
 * Typed exactly against the shared contract (src/lib/tenant/types.ts) so a
 * seed script can insert `demoTenant` and `demoProducts` as they are.
 *
 * PROVISIONAL — to replace before any public use:
 * - WhatsApp / phone "25700000000" is a placeholder (owner decision D4 pending);
 * - e-mail, address and socials are fictitious;
 * - product / scene images are SVG illustrations, and the Runner photos are
 *   renders of the CC BY 3D model: all stand in for real photos
 *   (list of photos to supply: public/demo/README.md).
 *
 * Kirundi (rn) texts are deliberately short and simple and MUST be reviewed by
 * a native speaker; Swahili (sw) should be proofread as well.
 */
import type { Localized, PlatformLocale, Product, StorefrontData, Tenant } from "@/lib/tenant/types";

const L = (fr: string, rn: string, en: string, sw: string): Localized => ({ fr, rn, en, sw });

export const DEMO_TENANT_ID = "demo-ikirenge";
/** Placeholder number — owner decision D4 pending. */
export const DEMO_WHATSAPP_PLACEHOLDER = "25700000000";

const IMG = "/demo/images";

export const demoTenant: Tenant = {
  id: DEMO_TENANT_ID,
  slug: "ikirenge",
  name: "Ikirenge Shoes",
  status: "active",
  template: "vitrine",
  locales: ["fr", "rn", "en", "sw"],
  theme: {
    colors: {
      background: "#f4eee6",
      surface: "#fffaf3",
      primary: "#1d2a24",
      accent: "#e4572e",
      text: "#1b1d1c",
      muted: "#5f5d58",
    },
    fonts: { display: "Bricolage Grotesque", body: "DM Sans" },
    radius: "soft",
    logoUrl: null,
  },
  contact: {
    whatsapp: DEMO_WHATSAPP_PLACEHOLDER, // PROVISIONAL (D4)
    phones: ["+25700000000"], // PROVISIONAL (D4)
    email: "ikirenge@example.com", // fictitious
    address: "Avenue de l’Amitié (adresse d’exemple)",
    city: "Bujumbura",
    hours: "Lundi – samedi : 8 h 30 – 18 h 30; Dimanche : 10 h – 14 h",
    mapUrl: "https://www.openstreetmap.org/search?query=Bujumbura",
    socials: [
      { network: "Instagram", url: "https://www.instagram.com/" }, // placeholder
      { network: "Facebook", url: "https://www.facebook.com/" }, // placeholder
    ],
  },
  features: { threeD: true, advancedAnimations: true, languages: true, stats: false },
  content: {
    tagline: L(
      "Des chaussures pour chaque pas, choisies pour Bujumbura.",
      "Inkweto z’intambwe zose.",
      "Shoes for every step, chosen for Bujumbura.",
      "Viatu kwa kila hatua, vilivyochaguliwa kwa Bujumbura.",
    ),
    hero: {
      eyebrow: L("Nouvelle collection 2026", "Ibishasha 2026", "New collection 2026", "Mkusanyiko mpya 2026"),
      title: L("Marchez léger, marchez fier.", "Genda neza, genda wishimye.", "Walk light, walk proud.", "Tembea kwa wepesi, tembea kwa fahari."),
      subtitle: L(
        "Baskets, mocassins et sandales choisis pour le climat, les routes et le style de Bujumbura. Commande en deux minutes sur WhatsApp, livraison en ville.",
        "Inkweto nziza z’i Bujumbura. Tumiza kuri WhatsApp, turazikuzanira.",
        "Sneakers, loafers and sandals chosen for Bujumbura’s climate, roads and style. Order in two minutes on WhatsApp, delivered in town.",
        "Raba, mokasini na sandali zilizochaguliwa kwa hali ya hewa, barabara na mtindo wa Bujumbura. Agiza kwa dakika mbili kwenye WhatsApp, tunaleta mjini.",
      ),
      cta: L("Voir la collection", "Raba inkweto", "See the collection", "Ona mkusanyiko"),
      ctaSecondary: L("Écrire sur WhatsApp", "Twandikire kuri WhatsApp", "Message us on WhatsApp", "Tuandikie WhatsApp"),
    },
    marquee: [
      L("Pointures 26 à 46", "Inomero 26 gushika 46", "Sizes 26 to 46", "Saizi 26 hadi 46"),
      L("Livraison à Bujumbura", "Turazana i Bujumbura", "Delivery in Bujumbura", "Tunaleta Bujumbura"),
      L("Paiement à la livraison", "Wishura uronse", "Pay on delivery", "Lipa unapopokea"),
      L("Échange sous 7 jours", "Guhindura mu minsi 7", "7-day exchange", "Kubadilisha ndani ya siku 7"),
    ],
    scenesIntro: {
      eyebrow: L("Une journée en Ikirenge", "Umusi wose mu Ikirenge", "A day in Ikirenge", "Siku nzima na Ikirenge"),
      title: L("Du premier bus au dernier pas de danse.", "Kuva mu gitondo gushika ku mugoroba.", "From the first bus to the last dance step.", "Kutoka basi la kwanza hadi hatua ya mwisho ya densi."),
      text: L("Chaque paire est pensée pour un moment de votre journée.", "Inkweto zose zifise umwanya wazo.", "Each pair is designed for a moment of your day.", "Kila jozi imeundwa kwa wakati fulani wa siku yako."),
    },
    featured: {
      eyebrow: L("La paire phare", "Inkweto nyamukuru", "Our signature pair", "Jozi kuu"),
      title: L("Ikirenge Runner, à 360°", "Ikirenge Runner, impande zose", "Ikirenge Runner, in 360°", "Ikirenge Runner, kwa 360°"),
      text: L("Faites-la tourner, changez son coloris, regardez chaque couture.", "Yizungurutse, hindura ibara.", "Spin it, change its colour, look at every stitch.", "Izungushe, badilisha rangi, tazama kila mshono."),
      chapters: [
        {
          title: L("Un amorti qui dure", "Yoroshe", "Cushioning that lasts", "Ulaini unaodumu"),
          text: L("Semelle en mousse double densité : la journée entière debout, sans fatigue.", "Ntiruhisha amaguru umusi wose.", "Dual-density foam sole: on your feet all day, without fatigue.", "Soli ya povu ya tabaka mbili: simama siku nzima bila uchovu."),
        },
        {
          title: L("Respirante", "Irahumeka", "Breathable", "Inapitisha hewa"),
          text: L("Tige en mesh aérée, pensée pour la chaleur de Bujumbura.", "Ibereye ubushuhe bw’i Bujumbura.", "Airy mesh upper, made for Bujumbura’s heat.", "Sehemu ya juu ya matundu, kwa joto la Bujumbura."),
        },
        {
          title: L("Accroche sur toutes les routes", "Ntinyerera", "Grip on every road", "Inashika kila barabara"),
          text: L("Semelle caoutchouc crantée : pavés, pistes et trottoirs mouillés.", "Ibereye amabarabara yose.", "Lugged rubber sole: cobbles, dirt tracks and wet pavements.", "Soli ya mpira yenye meno: mawe, njia za vumbi na njia zenye maji."),
        },
        {
          title: L("Trois coloris", "Amabara atatu", "Three colourways", "Rangi tatu"),
          text: L("Midnight, Beach ou Street : choisissez directement sur le modèle 3D.", "Hitamwo ibara ryawe.", "Midnight, Beach or Street: pick directly on the 3D model.", "Midnight, Beach au Street: chagua moja kwa moja kwenye modeli ya 3D."),
        },
      ],
    },
    collection: {
      eyebrow: L("La collection", "Inkweto zacu", "The collection", "Mkusanyiko"),
      title: L("Six paires, zéro compromis.", "Inkweto zitandatu nziza.", "Six pairs, zero compromise.", "Jozi sita, bila maelewano."),
      text: L("Sélectionnées une à une, testées dans les rues de Bujumbura.", "Twazihisemwo neza.", "Picked one by one, tested in the streets of Bujumbura.", "Zimechaguliwa moja moja, zimejaribiwa mitaani Bujumbura."),
    },
    promises: [
      {
        title: L("Livraison en ville", "Turazikuzanira", "Delivery in town", "Tunaleta mjini"),
        text: L("À Bujumbura sous 24 à 48 h. Ailleurs : parlons-en sur WhatsApp.", "I Bujumbura mu masaha 24–48.", "In Bujumbura within 24–48 h. Elsewhere: let’s talk on WhatsApp.", "Bujumbura ndani ya saa 24–48. Kwingineko: tuzungumze WhatsApp."),
      },
      {
        title: L("Paiement à la livraison", "Wishura uronse", "Pay on delivery", "Lipa unapopokea"),
        text: L("Vous payez quand vous avez les chaussures en main.", "Wishura inkweto zikugezeko.", "You pay once the shoes are in your hands.", "Unalipa viatu vikiwa mikononi mwako."),
      },
      {
        title: L("Échange de pointure", "Guhindura inomero", "Size exchange", "Kubadilisha saizi"),
        text: L("Pas la bonne taille ? Échange gratuit sous 7 jours.", "Turazihindura mu minsi 7.", "Wrong size? Free exchange within 7 days.", "Saizi si sahihi? Kubadilisha bure ndani ya siku 7."),
      },
      {
        title: L("Conseil personnalisé", "Inama", "Personal advice", "Ushauri binafsi"),
        text: L("Une question sur une pointure ou un coloris ? Écrivez-nous.", "Ufise ikibazo? Twandikire.", "A question about a size or colour? Message us.", "Una swali kuhusu saizi au rangi? Tuandikie."),
      },
    ],
    productsIntro: {
      eyebrow: L("Boutique", "Iduka", "Shop", "Duka"),
      title: L("Toute la collection", "Inkweto zose", "The whole collection", "Mkusanyiko wote"),
      text: L("Prix en francs burundais, paiement à la livraison.", "Ibiciro mu mafaranga y’Uburundi.", "Prices in Burundian francs, pay on delivery.", "Bei kwa faranga za Burundi, lipa unapopokea."),
    },
    orderIntro: {
      eyebrow: L("Commande guidée", "Gutumiza", "Guided order", "Oda kwa hatua"),
      title: L("Votre commande, en trois étapes.", "Tumiza mu ntambwe zitatu.", "Your order, in three steps.", "Oda yako, kwa hatua tatu."),
      text: L(
        "Pas de compte, pas de paiement en ligne : votre commande arrive directement chez Ikirenge Shoes, sur WhatsApp.",
        "Nta konti. Igitumizo kija kuri WhatsApp.",
        "No account, no online payment: your order goes straight to Ikirenge Shoes, on WhatsApp.",
        "Hakuna akaunti, hakuna malipo mtandaoni: oda yako inafika moja kwa moja kwa Ikirenge Shoes, kwenye WhatsApp.",
      ),
    },
    contactIntro: {
      eyebrow: L("Nous trouver", "Aho turi", "Find us", "Tupate"),
      title: L("Passez nous voir ou écrivez-nous.", "Ngwino uturabe canke utwandikire.", "Visit us or message us.", "Tutembelee au tuandikie."),
      text: L("Essayage en boutique, conseils sur WhatsApp 7 jours sur 7.", "Ushobora kuzigerageza mu iduka.", "Try on in store, advice on WhatsApp 7 days a week.", "Jaribu dukani, ushauri kwenye WhatsApp siku 7 kwa wiki."),
    },
    footerNote: L(
      "Boutique de démonstration Rundinova Studio : produits, prix, photos et coordonnées sont fictifs.",
      "Iri ni iduka ry’akarorero.",
      "Rundinova Studio demo shop: products, prices, photos and contact details are fictitious.",
      "Duka la maonyesho la Rundinova Studio: bidhaa, bei, picha na mawasiliano si halisi.",
    ),
    credits: [
      L(
        "Modèle 3D « Materials Variants Shoe » © 2021 Shopify, licence CC BY 4.0 (Khronos glTF Sample Assets), optimisé pour le web",
        "Igishushanyo 3D « Materials Variants Shoe » © 2021 Shopify, CC BY 4.0 (Khronos glTF Sample Assets)",
        "3D model “Materials Variants Shoe” © 2021 Shopify, CC BY 4.0 licence (Khronos glTF Sample Assets), optimised for the web",
        "Modeli ya 3D “Materials Variants Shoe” © 2021 Shopify, leseni CC BY 4.0 (Khronos glTF Sample Assets), imeboreshwa kwa wavuti",
      ),
    ],
    seo: {
      title: L("Ikirenge Shoes — chaussures à Bujumbura", "Ikirenge Shoes — inkweto i Bujumbura", "Ikirenge Shoes — shoes in Bujumbura", "Ikirenge Shoes — viatu Bujumbura"),
      description: L(
        "Baskets, mocassins, sandales et bottines à Bujumbura. Commande sur WhatsApp, paiement à la livraison.",
        "Inkweto i Bujumbura. Tumiza kuri WhatsApp, wishure uronse.",
        "Sneakers, loafers, sandals and boots in Bujumbura. Order on WhatsApp, pay on delivery.",
        "Raba, mokasini, sandali na buti Bujumbura. Agiza kwenye WhatsApp, lipa unapopokea.",
      ),
    },
  },
  scenes: [
    {
      id: "matin",
      imageUrl: `${IMG}/scene-matin.svg`,
      label: L("7 h · En route", "Mu gitondo · Mu nzira", "7 am · On the way", "Saa moja asubuhi · Njiani"),
      title: L("Le premier bus, la tête haute.", "Mu gitondo, genda neza.", "The first bus, head held high.", "Basi la kwanza, kichwa juu."),
      text: L("La Runner amortit chaque pas, du quartier jusqu’au centre-ville.", "Runner ituma ugenda neza.", "The Runner cushions every step, from your neighbourhood to downtown.", "Runner inalainisha kila hatua, kutoka mtaani hadi katikati ya mji."),
      alt: L("Illustration : une rue de Bujumbura au lever du jour, un bus orange", "Ishusho : umuhanda w’i Bujumbura mu gitondo", "Illustration: a Bujumbura street at sunrise, an orange bus", "Mchoro: mtaa wa Bujumbura alfajiri, basi la rangi ya chungwa"),
    },
    {
      id: "lac",
      imageUrl: `${IMG}/scene-lac.svg`,
      label: L("13 h · Pause au lac", "Ku mutaga · Ku kiyaga", "1 pm · Lake break", "Saa saba mchana · Ziwani"),
      title: L("Sandales aux pieds, Tanganyika en vue.", "Sandali ku kiyaga Tanganyika.", "Sandals on, Tanganyika in sight.", "Sandali miguuni, Tanganyika mbele."),
      text: L("Légères et faciles à rincer, nos sandales aiment le sable.", "Ziroroshe kwoza.", "Light and easy to rinse, our sandals love sand.", "Nyepesi na rahisi kusuuza, sandali zetu zinapenda mchanga."),
      alt: L("Illustration : plage du lac Tanganyika, palmier et montagnes", "Ishusho : ikiyaga Tanganyika", "Illustration: Lake Tanganyika beach, palm tree and mountains", "Mchoro: ufukwe wa Ziwa Tanganyika, mnazi na milima"),
    },
    {
      id: "soiree",
      imageUrl: `${IMG}/scene-soiree.svg`,
      label: L("19 h · Soirée", "Ku mugoroba · Ibirori", "7 pm · Evening", "Saa moja usiku · Jioni"),
      title: L("Mocassins cirés pour les grandes occasions.", "Inkweto nziza z’ibirori.", "Polished loafers for big occasions.", "Mokasini zilizong’arishwa kwa sherehe kubwa."),
      text: L("Cuir pleine fleur, semelle cousue : élégant du dîner jusqu’à la piste.", "Uruhu rwiza, zibereye ibirori.", "Full-grain leather, stitched sole: elegant from dinner to dance floor.", "Ngozi halisi, soli iliyoshonwa: maridadi kutoka chakula cha jioni hadi ukumbi wa densi."),
      alt: L("Illustration : soirée dansante sous des guirlandes lumineuses", "Ishusho : ibirori ku mugoroba", "Illustration: an evening dance under string lights", "Mchoro: densi ya jioni chini ya taa za mapambo"),
    },
    {
      id: "collines",
      imageUrl: `${IMG}/scene-collines.svg`,
      label: L("Week-end · Collines", "Impera y’indwi · Imisozi", "Weekend · Hills", "Wikendi · Milima"),
      title: L("Les sentiers de la Kibira, sans glisser.", "Mu misozi ya Kibira.", "Kibira trails, without slipping.", "Njia za Kibira, bila kuteleza."),
      text: L("La Bottine Kibira tient la cheville et accroche sur la terre rouge.", "Bottine Kibira ntinyerera.", "The Kibira Boot holds your ankle and grips on red earth.", "Buti ya Kibira inashika kifundo na inashika ardhi nyekundu."),
      alt: L("Illustration : sentier de terre rouge dans des collines vertes", "Ishusho : inzira mu misozi", "Illustration: a red-earth trail through green hills", "Mchoro: njia ya udongo mwekundu katikati ya milima ya kijani"),
    },
  ],
};

type DemoImage = Product["images"][number];
const img = (file: string, alt: Localized): DemoImage => ({ url: `${IMG}/${file}`, alt, width: 1000, height: 1000 });
const fact = (label: Localized, value: Localized) => ({ label, value });

const SIZES = L("Pointures", "Inomero", "Sizes", "Saizi");
const MATERIAL = L("Matière", "Ivyo zikozwemwo", "Material", "Malighafi");
const SOLE = L("Semelle", "Isoli", "Sole", "Soli");
const COLOURS = L("Coloris", "Amabara", "Colours", "Rangi");

export const demoProducts: Product[] = [
  {
    id: "demo-ikirenge-runner",
    tenantId: DEMO_TENANT_ID,
    slug: "ikirenge-runner",
    name: L("Ikirenge Runner", "Ikirenge Runner", "Ikirenge Runner", "Ikirenge Runner"),
    short: L(
      "La basket du quotidien, amortie et respirante, en trois coloris.",
      "Inkweto za buri musi, zoroshe.",
      "The everyday sneaker, cushioned and breathable, in three colourways.",
      "Raba ya kila siku, laini na inayopitisha hewa, kwa rangi tatu.",
    ),
    description: L(
      "Notre best-seller. Tige en mesh et suédine, semelle en mousse double densité et caoutchouc cranté : elle suit vos journées du bureau au marché.\n\nTrois coloris — Midnight, Beach et Street — à découvrir et à choisir directement sur le modèle 3D.",
      "Inkweto zacu zigurwa cane. Zoroshe kandi ntizinyerera.\n\nAmabara atatu : Midnight, Beach na Street.",
      "Our best-seller. Mesh and suede upper, dual-density foam and lugged rubber sole: it follows your days from the office to the market.\n\nThree colourways — Midnight, Beach and Street — to explore and pick right on the 3D model.",
      "Inayouzwa zaidi. Sehemu ya juu ya matundu na suede, soli ya povu ya tabaka mbili na mpira wenye meno: inakufuata kutoka ofisini hadi sokoni.\n\nRangi tatu — Midnight, Beach na Street — chagua moja kwa moja kwenye modeli ya 3D.",
    ),
    price: 89000,
    compareAtPrice: null,
    promoLabel: null,
    visible: true,
    featured: true,
    sortOrder: 1,
    images: [
      img("runner-midnight.webp", L("Ikirenge Runner, coloris Midnight (rendu du modèle 3D)", "Ikirenge Runner, ibara Midnight", "Ikirenge Runner, Midnight colourway (3D model render)", "Ikirenge Runner, rangi Midnight (picha ya modeli ya 3D)")),
      img("runner-beach.webp", L("Ikirenge Runner, coloris Beach", "Ikirenge Runner, ibara Beach", "Ikirenge Runner, Beach colourway", "Ikirenge Runner, rangi Beach")),
      img("runner-street.webp", L("Ikirenge Runner, coloris Street", "Ikirenge Runner, ibara Street", "Ikirenge Runner, Street colourway", "Ikirenge Runner, rangi Street")),
    ],
    modelUrl: "/demo/models/ikirenge-sneaker.glb",
    facts: [
      fact(SIZES, L("38 à 46", "38 gushika 46", "38 to 46", "38 hadi 46")),
      fact(MATERIAL, L("Mesh et suédine", "Mesh na suede", "Mesh and suede", "Matundu na suede")),
      fact(SOLE, L("Mousse + caoutchouc cranté", "Yoroshe, ntinyerera", "Foam + lugged rubber", "Povu + mpira wenye meno")),
      fact(COLOURS, L("Midnight, Beach, Street", "Midnight, Beach, Street", "Midnight, Beach, Street", "Midnight, Beach, Street")),
    ],
  },
  {
    id: "demo-mocassin-rohero",
    tenantId: DEMO_TENANT_ID,
    slug: "mocassin-rohero",
    name: L("Mocassin Rohero", "Mocassin Rohero", "Rohero Loafer", "Mokasini Rohero"),
    short: L(
      "Cuir pleine fleur cousu main, pour le bureau comme pour les cérémonies.",
      "Uruhu rwiza, zibereye akazi n’ibirori.",
      "Hand-stitched full-grain leather, for the office and for ceremonies.",
      "Ngozi halisi iliyoshonwa kwa mkono, kwa ofisi na kwa sherehe.",
    ),
    description: L(
      "Un mocassin souple qui se fait à votre pied dès la première semaine. Cuir pleine fleur, doublure en cuir, semelle cuir et gomme pour ne pas glisser sur le carrelage.\n\nDisponible en cognac et en noir.",
      "Inkweto z’uruhu rworoshe.\n\nAmabara : cognac n’umukara.",
      "A supple loafer that moulds to your foot within the first week. Full-grain leather, leather lining, leather-and-rubber sole so you do not slip on tiles.\n\nAvailable in cognac and black.",
      "Mokasini laini inayozoea mguu wako ndani ya wiki ya kwanza. Ngozi halisi, bitana ya ngozi, soli ya ngozi na mpira ili usiteleze kwenye vigae.\n\nInapatikana kwa rangi ya konyaki na nyeusi.",
    ),
    price: 125000,
    compareAtPrice: null,
    promoLabel: null,
    visible: true,
    featured: false,
    sortOrder: 2,
    images: [
      img("mocassin-rohero-cognac.svg", L("Mocassin Rohero en cuir cognac, profil", "Mocassin Rohero, ibara cognac", "Rohero Loafer in cognac leather, side view", "Mokasini Rohero ya ngozi ya konyaki, pembeni")),
      img("mocassin-rohero-noir.svg", L("Mocassin Rohero en cuir noir", "Mocassin Rohero, umukara", "Rohero Loafer in black leather", "Mokasini Rohero ya ngozi nyeusi")),
    ],
    modelUrl: null,
    facts: [
      fact(SIZES, L("39 à 46", "39 gushika 46", "39 to 46", "39 hadi 46")),
      fact(MATERIAL, L("Cuir pleine fleur", "Uruhu", "Full-grain leather", "Ngozi halisi")),
      fact(SOLE, L("Cuir et gomme", "Uruhu na kawucu", "Leather and rubber", "Ngozi na mpira")),
      fact(COLOURS, L("Cognac, noir", "Cognac, umukara", "Cognac, black", "Konyaki, nyeusi")),
    ],
  },
  {
    id: "demo-sandale-tanganyika",
    tenantId: DEMO_TENANT_ID,
    slug: "sandale-tanganyika",
    name: L("Sandale Tanganyika", "Sandali Tanganyika", "Tanganyika Sandal", "Sandali Tanganyika"),
    short: L(
      "Légère, réglable et facile à rincer : la sandale des week-ends au lac.",
      "Yoroshe, ibereye ikiyaga.",
      "Light, adjustable and easy to rinse: the sandal for lake weekends.",
      "Nyepesi, inarekebishwa na rahisi kusuuza: sandali ya wikendi ziwani.",
    ),
    description: L(
      "Brides en cuir tanné végétal, boucle de réglage à la cheville et semelle en liège moulé qui garde sa forme même mouillée.\n\nPrix promo pendant la saison sèche, dans la limite des stocks.",
      "Sandali z’uruhu, zoroshe.\n\nIgabanuka ry’igihe c’izuba.",
      "Vegetable-tanned leather straps, adjustable ankle buckle and moulded cork sole that keeps its shape even when wet.\n\nSale price during the dry season, while stocks last.",
      "Mikanda ya ngozi, bizimu ya kurekebisha kwenye kifundo na soli ya kizibo inayobaki na umbo hata ikiwa na maji.\n\nBei ya ofa wakati wa kiangazi, hadi bidhaa ziishe.",
    ),
    price: 38000,
    compareAtPrice: 48000,
    promoLabel: L("Promo saison sèche", "Igabanuka", "Dry-season sale", "Ofa ya kiangazi"),
    visible: true,
    featured: false,
    sortOrder: 3,
    images: [
      img("sandale-tanganyika-profil.svg", L("Sandale Tanganyika, brides en cuir, profil", "Sandali Tanganyika", "Tanganyika Sandal, leather straps, side view", "Sandali Tanganyika, mikanda ya ngozi, pembeni")),
      img("sandale-tanganyika-dessus.svg", L("Sandale Tanganyika, coloris brun foncé", "Sandali Tanganyika, ibara ry’ikigina", "Tanganyika Sandal, dark brown", "Sandali Tanganyika, kahawia iliyokolea")),
    ],
    modelUrl: null,
    facts: [
      fact(SIZES, L("36 à 45", "36 gushika 45", "36 to 45", "36 hadi 45")),
      fact(MATERIAL, L("Cuir tanné végétal", "Uruhu", "Vegetable-tanned leather", "Ngozi")),
      fact(SOLE, L("Liège moulé", "Isoli yoroshe", "Moulded cork", "Kizibo")),
      fact(L("Eau", "Amazi", "Water", "Maji"), L("Supporte l’eau", "Ntitinya amazi", "Water-friendly", "Inastahimili maji")),
    ],
  },
  {
    id: "demo-bottine-kibira",
    tenantId: DEMO_TENANT_ID,
    slug: "bottine-kibira",
    name: L("Bottine Kibira", "Bottine Kibira", "Kibira Boot", "Buti Kibira"),
    short: L(
      "Nubuck robuste et semelle crantée pour les sentiers et la saison des pluies.",
      "Ikomeye, ibereye imisozi n’imvura.",
      "Sturdy nubuck and lugged sole for trails and the rainy season.",
      "Nubuck imara na soli yenye meno kwa njia za milimani na msimu wa mvua.",
    ),
    description: L(
      "Une bottine qui tient la cheville sans serrer. Tige en nubuck traité contre l’humidité, doublure respirante et semelle crantée qui accroche sur la terre rouge.\n\nAussi à l’aise en ville qu’en balade dans la Kibira.",
      "Ibereye imisozi n’imvura.\n\nNtinyerera ku butaka.",
      "A boot that holds your ankle without squeezing. Moisture-treated nubuck upper, breathable lining and a lugged sole that grips on red earth.\n\nAs comfortable in town as on a Kibira hike.",
      "Buti inayoshika kifundo bila kubana. Nubuck iliyotibiwa dhidi ya unyevu, bitana inayopitisha hewa na soli yenye meno inayoshika ardhi nyekundu.\n\nInafaa mjini na matembezini Kibira.",
    ),
    price: 149000,
    compareAtPrice: null,
    promoLabel: null,
    visible: true,
    featured: false,
    sortOrder: 4,
    images: [
      img("bottine-kibira-profil.svg", L("Bottine Kibira en nubuck, profil", "Bottine Kibira", "Kibira Boot in nubuck, side view", "Buti Kibira ya nubuck, pembeni")),
      img("bottine-kibira-arriere.svg", L("Bottine Kibira, autre angle", "Bottine Kibira, uruhande", "Kibira Boot, another angle", "Buti Kibira, pembe nyingine")),
    ],
    modelUrl: null,
    facts: [
      fact(SIZES, L("38 à 46", "38 gushika 46", "38 to 46", "38 hadi 46")),
      fact(MATERIAL, L("Nubuck traité", "Uruhu rukomeye", "Treated nubuck", "Nubuck iliyotibiwa")),
      fact(SOLE, L("Caoutchouc cranté", "Ntinyerera", "Lugged rubber", "Mpira wenye meno")),
      fact(L("Doublure", "Imbere", "Lining", "Bitana"), L("Respirante", "Irahumeka", "Breathable", "Inapitisha hewa")),
    ],
  },
  {
    id: "demo-ballerine-imena",
    tenantId: DEMO_TENANT_ID,
    slug: "ballerine-imena",
    name: L("Ballerine Imena", "Ballerine Imena", "Imena Ballet Flat", "Ballerina Imena"),
    short: L(
      "Cuir souple et semelle antidérapante, élégante de 8 h à minuit.",
      "Yoroshe kandi nziza.",
      "Soft leather and non-slip sole, elegant from 8 am to midnight.",
      "Ngozi laini na soli isiyoteleza, maridadi kuanzia asubuhi hadi usiku.",
    ),
    description: L(
      "Une ballerine qui ne blesse pas : cuir agneau souple, talon de 1 cm, première de propreté rembourrée et semelle antidérapante.\n\nRose poudré ou noir, avec un petit nœud.",
      "Yoroshe, ntibabaza.\n\nIbara ry’iroza canke umukara.",
      "A ballet flat that does not hurt: soft lambskin, 1 cm heel, padded insole and non-slip sole.\n\nPowder pink or black, with a little bow.",
      "Ballerina isiyoumiza: ngozi laini ya kondoo, kisigino cha sm 1, ndani yenye mto na soli isiyoteleza.\n\nWaridi au nyeusi, na kifundo kidogo.",
    ),
    price: 59000,
    compareAtPrice: null,
    promoLabel: null,
    visible: true,
    featured: false,
    sortOrder: 5,
    images: [
      img("ballerine-imena-rose.svg", L("Ballerine Imena rose poudré, profil", "Ballerine Imena, iroza", "Imena Ballet Flat in powder pink, side view", "Ballerina Imena waridi, pembeni")),
      img("ballerine-imena-noir.svg", L("Ballerine Imena noire", "Ballerine Imena, umukara", "Imena Ballet Flat in black", "Ballerina Imena nyeusi")),
    ],
    modelUrl: null,
    facts: [
      fact(SIZES, L("35 à 42", "35 gushika 42", "35 to 42", "35 hadi 42")),
      fact(MATERIAL, L("Cuir d’agneau", "Uruhu rworoshe", "Lambskin", "Ngozi ya kondoo")),
      fact(SOLE, L("Antidérapante", "Ntinyerera", "Non-slip", "Isiyoteleza")),
      fact(COLOURS, L("Rose poudré, noir", "Iroza, umukara", "Powder pink, black", "Waridi, nyeusi")),
    ],
  },
  {
    id: "demo-inyange-kids",
    tenantId: DEMO_TENANT_ID,
    slug: "inyange-kids",
    name: L("Inyange Kids", "Inyange Kids", "Inyange Kids", "Inyange Kids"),
    short: L(
      "La basket enfant à scratch, solide pour l’école et la récré.",
      "Inkweto z’abana, zikomeye.",
      "The kids’ hook-and-loop sneaker, tough enough for school and playtime.",
      "Raba ya watoto yenye velcro, imara kwa shule na michezo.",
    ),
    description: L(
      "Des scratchs que les enfants ferment seuls, un bout renforcé contre les chocs et une semelle souple qui accompagne la croissance du pied.\n\nLavable à la main. Bleu ou rose.",
      "Abana barashobora kuzambara bonyene.\n\nUbururu canke iroza.",
      "Hook-and-loop straps kids close by themselves, a reinforced toe against knocks and a flexible sole that follows growing feet.\n\nHand-washable. Blue or pink.",
      "Velcro ambazo watoto hufunga wenyewe, ncha iliyoimarishwa dhidi ya kugonga na soli laini inayofuata ukuaji wa mguu.\n\nInafuliwa kwa mkono. Bluu au waridi.",
    ),
    price: 45000,
    compareAtPrice: null,
    promoLabel: null,
    visible: true,
    featured: false,
    sortOrder: 6,
    images: [
      img("inyange-kids-profil.svg", L("Basket enfant Inyange Kids bleue, profil", "Inyange Kids, ubururu", "Blue Inyange Kids sneaker, side view", "Raba ya watoto Inyange Kids bluu, pembeni")),
      img("inyange-kids-autre.svg", L("Basket enfant Inyange Kids rose", "Inyange Kids, iroza", "Pink Inyange Kids sneaker", "Raba ya watoto Inyange Kids waridi")),
    ],
    modelUrl: null,
    facts: [
      fact(SIZES, L("26 à 35", "26 gushika 35", "26 to 35", "26 hadi 35")),
      fact(L("Fermeture", "Ugufunga", "Fastening", "Kufunga"), L("Scratch", "Velcro", "Hook-and-loop", "Velcro")),
      fact(SOLE, L("Souple", "Yoroshe", "Flexible", "Laini")),
      fact(L("Entretien", "Kwoza", "Care", "Utunzaji"), L("Lavable à la main", "Kwoza n’amaboko", "Hand-washable", "Kufua kwa mkono")),
    ],
  },
];

/** Storefront data of the demo shop for one request, as the platform would resolve it. */
export function demoShoesStorefront(locale: PlatformLocale): StorefrontData {
  return {
    tenant: demoTenant,
    products: demoProducts.filter((p) => p.visible),
    locale: demoTenant.locales.includes(locale) ? locale : demoTenant.locales[0],
  };
}
