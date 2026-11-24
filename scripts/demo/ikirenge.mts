/**
 * Demo shop « Ikirenge Shoes » on the single storefront template (same experience as Krumbz):
 * palette, texts in the Krumbz content schema (fr complete; en / sw / rn short overrides),
 * life-moment scenes and section images. Photos: docs/demo-ikirenge-photos.md — each path is
 * used as soon as the file exists; until then the provisional visuals of
 * public/images/tenants/ikirenge/provisoire/ are shown (scenes) or the section uses its text-only variant.
 *
 * Fictitious shop (Rundinova Studio demo). Kirundi (rn): TO BE REVIEWED BY A NATIVE SPEAKER.
 */
import type { Localized, TenantContact, TenantScene, TenantTheme } from "../../src/lib/tenant/types.ts";

const L = (fr: string, rn: string, en: string, sw: string): Localized => ({ fr, rn, en, sw });
const ROOT = "/images/tenants/ikirenge";

export const ikirengeTheme: TenantTheme = {
  colors: { background: "#f4eee6", surface: "#fffaf3", primary: "#1d3b33", accent: "#f08a4b", text: "#14201b", muted: "#5f5d58" },
  // Every token explicit (contrast: navy/cream 10.3:1, rust/cream 5.6:1, navy/gold 6:1).
  palette: {
    cream: "#f4eee6",
    creamDeep: "#eadfcf",
    gold: "#f08a4b",
    goldLight: "#f7b98c",
    goldDark: "#c4501f",
    rust: "#b5401b",
    rustBright: "#e4572e",
    navy: "#1d3b33",
    navySoft: "#2a5247",
    ink: "#14201b",
    whatsapp: "#128c4a",
  },
  fonts: { display: "Bricolage Grotesque", body: "DM Sans" },
  radius: "soft",
  logoUrl: null,
};

export const ikirengeContact: TenantContact = {
  whatsapp: "25700000000", // PROVISIONAL (fictitious demo)
  phones: ["+25700000000"],
  email: "ikirenge@example.com",
  address: "Avenue de l’Amitié (adresse d’exemple)",
  city: "Bujumbura",
  hours: "Lundi – samedi : 8 h 30 – 18 h 30 ; dimanche : 10 h – 14 h",
  mapUrl: "https://www.openstreetmap.org/search?query=Bujumbura",
  socials: [],
};

// ---- scenes ----------------------------------------------------------------

type SceneSeed = {
  id: string;
  freeSide: "left" | "right";
  faces: TenantScene["framing"]["faces"];
  sachet: TenantScene["framing"]["sachet"];
  label: Localized;
  title: Localized;
  text: Localized;
  alt: Localized;
};

const SCENES: SceneSeed[] = [
  {
    id: "au-travail",
    freeSide: "right",
    faces: [[16, 22, 27, 36], [30, 26, 40, 40]],
    sachet: [22, 84, 35, 97],
    label: L("Au travail", "Ku kazi", "At work", "Kazini"),
    title: L("Élégant du matin au soir", "Mwiza kuva mu gitondo gushika ku mugoroba", "Sharp from morning to night", "Maridadi asubuhi hadi jioni"),
    text: L("Le mocassin Rohero suit vos journées en ville, réunion après réunion.", "Mocassin Rohero ikujana mu misi yawe yose mu gisagara.", "The Rohero loafer keeps up with your city days, meeting after meeting.", "Mokasini Rohero inakufuata siku nzima mjini."),
    alt: L("Deux collègues en ville, chaussures en cuir", "Abakozi babiri mu gisagara", "Two colleagues in town wearing leather shoes", "Wafanyakazi wawili mjini wakiwa na viatu vya ngozi"),
  },
  {
    id: "course-lac",
    freeSide: "left",
    faces: [[68, 20, 78, 34]],
    sachet: [73, 84, 88, 97],
    label: L("Au bord du lac", "Ku nkengera y’ikiyaga", "By the lake", "Ufukweni mwa ziwa"),
    title: L("Courir face au Tanganyika", "Kwiruka ku Tanganyika", "Running along Lake Tanganyika", "Kukimbia kando ya Tanganyika"),
    text: L("La Runner amortit chaque foulée, du lever du soleil au dernier kilomètre.", "Runner ikingira intambwe zose, kuva izuba rirashe.", "The Runner cushions every stride, from sunrise to the last kilometre.", "Runner inapunguza mshtuko wa kila hatua, tangu jua linapochomoza."),
    alt: L("Une coureuse au bord du lac au lever du soleil", "Umukinyi yiruka ku kiyaga", "A runner by the lake at sunrise", "Mkimbiaji kando ya ziwa alfajiri"),
  },
  {
    id: "plage",
    freeSide: "right",
    faces: [[15, 24, 25, 38], [28, 28, 37, 42]],
    sachet: [20, 90, 33, 99],
    label: L("Week-end à la plage", "Impera y’indwi ku kiyaga", "Beach weekend", "Wikendi ufukweni"),
    title: L("Les pieds dans le sable", "Ibirenge mu musenyi", "Feet in the sand", "Miguu mchangani"),
    text: L("La sandale Tanganyika sèche vite et garde sa forme, même mouillée.", "Sandali Tanganyika yuma vuba kandi ntihinduka.", "The Tanganyika sandal dries fast and keeps its shape, even wet.", "Sandali Tanganyika hukauka haraka na haibadiliki umbo."),
    alt: L("Deux amis sur la plage du lac Tanganyika", "Abagenzi babiri ku kiyaga", "Two friends on a Lake Tanganyika beach", "Marafiki wawili ufukweni mwa Tanganyika"),
  },
  {
    id: "enfants",
    freeSide: "left",
    faces: [[62, 34, 70, 44], [76, 34, 83, 44]],
    sachet: [64, 91, 77, 99],
    label: L("À l’école", "Ku ishure", "At school", "Shuleni"),
    title: L("Prêts pour la récré", "Biteguye gukina", "Ready for break time", "Tayari kwa mapumziko"),
    text: L("Inyange Kids : semelle souple et scratch facile, pour courir toute la journée.", "Inyange Kids : isoli yoroshe, ifunga vuba.", "Inyange Kids: soft sole and easy strap, made for running all day.", "Inyange Kids: soli laini na kufunga kwa urahisi."),
    alt: L("Deux enfants dans la cour de l’école", "Abana babiri ku ishure", "Two children in the schoolyard", "Watoto wawili uwanjani mwa shule"),
  },
  {
    id: "ceremonie",
    freeSide: "right",
    faces: [[20, 20, 30, 35], [34, 25, 44, 38]],
    sachet: [27, 93, 39, 99],
    label: L("Grand jour", "Umusi mukuru", "Big day", "Siku kuu"),
    title: L("Pour les cérémonies", "Ku birori", "For ceremonies", "Kwa sherehe"),
    text: L("Ballerine Imena et mocassin Rohero : le cuir qui brille jusqu’à la dernière danse.", "Imena na Rohero : uruhu rurabagirana gushika ku mbyino ya nyuma.", "Imena flats and Rohero loafers: leather that shines until the last dance.", "Imena na Rohero: ngozi inayong’aa hadi ngoma ya mwisho."),
    alt: L("Un couple en tenue de fête, le soir", "Abubatse bambaye impuzu z’ibirori", "A couple dressed up for a celebration at night", "Wanandoa wamevaa nguo za sherehe usiku"),
  },
];

export const ikirengeScenes: TenantScene[] = SCENES.map((s) => ({
  id: s.id,
  image: {
    landscape: `${ROOT}/scenes/${s.id}-paysage.jpg`,
    portrait: `${ROOT}/scenes/${s.id}-portrait.jpg`,
    fallback: `${ROOT}/provisoire/scenes/${s.id}.svg`,
  },
  aspect: 16 / 9,
  label: s.label,
  title: s.title,
  text: s.text,
  alt: s.alt,
  framing: {
    freeSide: s.freeSide,
    faces: s.faces,
    sachet: s.sachet,
    wide: s.freeSide === "right" ? "0% 45%" : "100% 45%",
    copy: { width: 30 },
    anchor: s.freeSide === "right" ? { cx: 82, cy: 66, size: 30 } : { cx: 18, cy: 66, size: 30 },
  },
  pose: null,
}));

// ---- texts (Krumbz schema) --------------------------------------------------

const fr = {
  brand: {
    tagline: "Chaque pas compte",
    promise: "Des chaussures en cuir, confortables et durables, pensées au Burundi.",
    origin: "Bujumbura, Burundi",
    base: "Cuir tanné végétal",
  },
  common: { madeIn: "Pensé et assemblé à Bujumbura" },
  home: {
    intro: {
      eyebrow: "Ikirenge · chaussures en cuir",
      title: "Chaque pas compte",
      subtitle: "Des chaussures confortables pour le travail, le sport, l’école et les grands jours.",
      packAlt: "Basket Ikirenge Runner",
    },
    fromMushroom: {
      eyebrow: "Du cuir à vos pas",
      title: "Tout commence par un bon cuir",
      text: "Nous choisissons des peaux tannées au végétal, puis nos artisans coupent, cousent et finissent chaque paire.",
      steps: [
        { title: "Le cuir", text: "Tanné au végétal, souple et respirant." },
        { title: "L’atelier", text: "Coupe, couture et montage à la main." },
        { title: "Vos pas", text: "Une paire qui se patine et dure des années." },
      ],
      alt: "Peaux de cuir et outils d’artisan",
    },
    moments: {
      eyebrow: "Pour chaque pas",
      title: "Ikirenge, du bureau à la plage",
      subtitle: "Au travail, au bord du lac, à l’école ou en fête : une paire pour chaque moment.",
      breaks: [
        { eyebrow: "Fait main", text: "Chaque paire passe entre les mains de nos artisans.", alt: "Un artisan coud une chaussure" },
        { eyebrow: "Cuir durable", text: "Un cuir qui vieillit bien, comme vos souvenirs.", alt: "Gros plan sur un cuir patiné" },
      ],
    },
    benefits: {
      eyebrow: "Pourquoi Ikirenge",
      title: "Ce qui fait la différence",
      items: [
        { id: "shoe", title: "Confort toute la journée", text: "Semelles amortissantes et formes pensées pour marcher longtemps." },
        { id: "star", title: "Finitions soignées", text: "Coutures renforcées et cuir sélectionné paire par paire." },
        { id: "burundi", title: "Pensé au Burundi", text: "Dessiné à Bujumbura pour nos routes, nos pluies et nos fêtes." },
        { id: "everyone", title: "Pour toute la famille", text: "Des pointures enfant aux grandes tailles adultes." },
      ],
    },
    products: { eyebrow: "Nos modèles", title: "Les incontournables", subtitle: "Baskets, mocassins, ballerines : trouvez votre paire." },
    cta: { title: "Trouvé votre paire ?", text: "Commandez en quelques secondes : votre commande part directement sur WhatsApp." },
    mushroom: {
      eyebrow: "Le savoir-faire Ikirenge",
      title: "Le cuir, au cœur de chaque paire",
      intro: "Un cuir de qualité respire, se patine et dure. C’est la base de toutes nos chaussures.",
      whyTitle: "Ce que le cuir apporte",
      items: [
        { symbol: "Air", title: "Respirant", text: "Le pied reste au sec, même par temps chaud." },
        { symbol: "+10", title: "Durable", text: "Bien entretenu, il accompagne de longues années." },
        { symbol: "Fit", title: "Il se forme", text: "Le cuir épouse votre pied au fil des jours." },
        { symbol: "Eco", title: "Tanné au végétal", text: "Sans chrome, avec des tanins naturels." },
        { symbol: "Fix", title: "Réparable", text: "Semelles et coutures peuvent être refaites." },
        { symbol: "Wow", title: "Belle patine", text: "Chaque paire devient unique avec le temps." },
      ],
      disclaimer: "Boutique de démonstration Rundinova Studio : modèles, prix et coordonnées sont fictifs.",
      cta: "Voir les modèles",
      images: { harvestAlt: "Artisan au travail dans l’atelier", closeupAlt: "Gros plan sur un cuir naturel" },
    },
  },
  products: {
    eyebrow: "Nos chaussures",
    title: "La collection Ikirenge",
    intro: "Tournez, zoomez, regardez de près : choisissez votre modèle et votre pointure sur WhatsApp.",
    chooseTitle: "Choisissez votre modèle",
    factsTitle: "Matières et entretien",
    formats: { title: "Les modèles", product: "Modèle" },
    ingredients: {
      title: "Matières",
      baseTitle: "Matière principale",
      base: "Cuir tanné végétal",
      othersTitle: "Autres matières",
      list: ["Liège moulé", "Caoutchouc naturel", "Mesh respirant", "Fil polyester renforcé"],
      labelNote: "La composition exacte figure sur chaque fiche modèle.",
      storageTitle: "Entretien",
      storage: "Brossez après usage, nourrissez le cuir une fois par mois, séchez loin du soleil.",
      shelfLifeTitle: "Garantie",
      shelfLife: "Coutures et semelles garanties 6 mois (démonstration).",
      allergensTitle: "Pointures",
      allergens: "Du 28 au 46 selon les modèles. Échange possible sous 7 jours.",
      producerTitle: "Atelier",
      producer: "Ikirenge Shoes, Bujumbura (boutique fictive).",
      imageAlt: "Gros plan sur un cuir naturel",
    },
  },
  story: {
    eyebrow: "Notre histoire",
    title: "Né à Bujumbura, fait pour marcher",
    intro: "Ikirenge veut dire « pied » en kirundi. Notre idée : des chaussures belles, solides et accessibles.",
    chapters: [
      { id: "atelier", image: "", title: "L’atelier", text: "Une petite équipe d’artisans coupe, coud et finit chaque paire à la main.", alt: "L’atelier Ikirenge" },
      { id: "cuir", image: "", title: "Le choix du cuir", text: "Nous sélectionnons des cuirs tannés au végétal, souples et durables.", alt: "Peaux de cuir naturel" },
    ],
    values: {
      title: "Ce qui nous guide",
      items: [
        { title: "Le confort", text: "Une chaussure se juge après une journée entière." },
        { title: "La durée", text: "Mieux vaut une paire qui dure que trois qui s’usent." },
        { title: "La proximité", text: "Conseils et pointures directement sur WhatsApp." },
      ],
    },
    journey: {
      eyebrow: "Du cuir à votre porte",
      title: "Comment naît une paire",
      intro: "Trois étapes, de la peau à la livraison.",
      steps: [
        { title: "La sélection", text: "Les peaux sont choisies une à une.", alt: "Sélection des peaux" },
        { title: "La fabrication", text: "Coupe, couture, montage et finitions.", alt: "Couture d’une chaussure" },
        { title: "La livraison", text: "Votre paire arrive chez vous, à Bujumbura et ailleurs.", alt: "Une boîte de chaussures prête à partir" },
      ],
    },
  },
  legal: {
    updated: "Dernière mise à jour : 24 novembre 2026",
    sections: [
      {
        title: "Boutique de démonstration",
        body: [
          "Ikirenge Shoes est une boutique fictive créée par Rundinova Studio pour présenter son modèle de boutique en ligne.",
          "Les produits, prix, coordonnées et numéros affichés sont des exemples : aucune commande n’est traitée.",
        ],
      },
      {
        title: "Modèle 3D",
        body: ["Modèle 3D de basket sous licence CC BY 4.0 — crédit et source : public/demo/README.md."],
      },
      {
        title: "Données personnelles",
        body: ["Le site ne collecte aucune donnée : le formulaire de commande prépare un message WhatsApp sur votre appareil."],
      },
    ],
  },
  seo: {
    defaultDescription: "Ikirenge Shoes (démo) : chaussures en cuir confortables et durables, commandées en quelques secondes sur WhatsApp.",
    pages: {
      home: { title: "Ikirenge Shoes — Chaque pas compte", description: "Chaussures en cuir pour le travail, le sport, l’école et les grands jours." },
      products: { title: "La collection", description: "Baskets, mocassins, sandales, bottines et ballerines Ikirenge." },
      story: { title: "Notre histoire", description: "L’atelier et le cuir derrière chaque paire Ikirenge." },
      order: { title: "Commander", description: "Commandez vos chaussures Ikirenge sur WhatsApp." },
      contact: { title: "Contact", description: "Écrivez-nous ou appelez-nous." },
      legal: { title: "Mentions légales", description: "Informations sur la boutique de démonstration Ikirenge." },
    },
  },
};

const en = {
  brand: { tagline: "Every step counts", promise: "Comfortable, durable leather shoes designed in Burundi.", base: "Vegetable-tanned leather" },
  common: { madeIn: "Designed and assembled in Bujumbura" },
  home: {
    intro: { eyebrow: "Ikirenge · leather shoes", title: "Every step counts", subtitle: "Comfortable shoes for work, sport, school and the big days.", packAlt: "Ikirenge Runner sneaker" },
    fromMushroom: {
      eyebrow: "From leather to your steps",
      title: "It all starts with good leather",
      text: "We choose vegetable-tanned hides; our craftspeople cut, stitch and finish every pair.",
      steps: [
        { title: "The leather", text: "Vegetable-tanned, supple and breathable." },
        { title: "The workshop", text: "Cut, stitched and lasted by hand." },
        { title: "Your steps", text: "A pair that ages well and lasts for years." },
      ],
    },
    moments: {
      eyebrow: "For every step",
      title: "Ikirenge, from the office to the beach",
      subtitle: "At work, by the lake, at school or at a party: a pair for every moment.",
      breaks: [
        { eyebrow: "Handmade", text: "Every pair goes through our craftspeople’s hands." },
        { eyebrow: "Lasting leather", text: "Leather that ages well, like your memories." },
      ],
    },
    benefits: {
      eyebrow: "Why Ikirenge",
      title: "What makes the difference",
      items: [
        { title: "All-day comfort", text: "Cushioned soles and shapes made for long walks." },
        { title: "Careful finishing", text: "Reinforced stitching and leather chosen pair by pair." },
        { title: "Designed in Burundi", text: "Drawn in Bujumbura for our roads, rains and parties." },
        { title: "For the whole family", text: "From kids’ sizes to large adult sizes." },
      ],
    },
    products: { eyebrow: "Our models", title: "The essentials", subtitle: "Sneakers, loafers, flats: find your pair." },
    cta: { title: "Found your pair?", text: "Order in seconds: your order goes straight to WhatsApp." },
    mushroom: {
      eyebrow: "Ikirenge craftsmanship",
      title: "Leather, at the heart of every pair",
      intro: "Good leather breathes, ages well and lasts. It is the base of all our shoes.",
      whyTitle: "What leather brings",
      items: [
        { title: "Breathable", text: "Feet stay dry, even when it is hot." },
        { title: "Durable", text: "Well cared for, it lasts for years." },
        { title: "Shapes to you", text: "Leather moulds to your foot day after day." },
        { title: "Vegetable-tanned", text: "Chrome-free, with natural tannins." },
        { title: "Repairable", text: "Soles and stitching can be redone." },
        { title: "Beautiful patina", text: "Every pair becomes unique over time." },
      ],
      disclaimer: "Rundinova Studio demo shop: models, prices and contact details are fictitious.",
      cta: "See the models",
    },
  },
  products: {
    eyebrow: "Our shoes",
    title: "The Ikirenge collection",
    intro: "Turn, zoom, look closely: pick your model and size on WhatsApp.",
    chooseTitle: "Choose your model",
    factsTitle: "Materials and care",
    formats: { title: "The models", product: "Model" },
    ingredients: {
      title: "Materials",
      baseTitle: "Main material",
      base: "Vegetable-tanned leather",
      othersTitle: "Other materials",
      list: ["Moulded cork", "Natural rubber", "Breathable mesh", "Reinforced polyester thread"],
      labelNote: "The exact composition is listed for each model.",
      storageTitle: "Care",
      storage: "Brush after use, feed the leather once a month, dry away from the sun.",
      shelfLifeTitle: "Warranty",
      shelfLife: "Stitching and soles guaranteed for 6 months (demo).",
      allergensTitle: "Sizes",
      allergens: "From 28 to 46 depending on the model. Exchange within 7 days.",
      producerTitle: "Workshop",
      producer: "Ikirenge Shoes, Bujumbura (fictitious shop).",
    },
  },
  story: {
    title: "Born in Bujumbura, made for walking",
    intro: "Ikirenge means “foot” in Kirundi. Our idea: beautiful, sturdy and affordable shoes.",
    chapters: [
      { title: "The workshop", text: "A small team of craftspeople cuts, stitches and finishes every pair by hand." },
      { title: "Choosing the leather", text: "We select supple, durable vegetable-tanned leathers." },
    ],
    values: {
      title: "What guides us",
      items: [
        { title: "Comfort", text: "A shoe is judged after a whole day." },
        { title: "Durability", text: "One pair that lasts beats three that wear out." },
        { title: "Closeness", text: "Advice and sizes straight on WhatsApp." },
      ],
    },
    journey: {
      eyebrow: "From leather to your door",
      title: "How a pair is born",
      intro: "Three steps, from hide to delivery.",
      steps: [
        { title: "Selection", text: "Hides are chosen one by one." },
        { title: "Making", text: "Cutting, stitching, lasting and finishing." },
        { title: "Delivery", text: "Your pair comes to you, in Bujumbura and beyond." },
      ],
    },
  },
  legal: {
    updated: "Last updated: 24 November 2026",
    sections: [
      { title: "Demo shop", body: ["Ikirenge Shoes is a fictitious shop created by Rundinova Studio to present its online shop template.", "Products, prices, contact details and numbers are examples: no order is processed."] },
      { title: "3D model", body: ["Sneaker 3D model under CC BY 4.0 licence — credit and source: public/demo/README.md."] },
      { title: "Personal data", body: ["The site collects no data: the order form prepares a WhatsApp message on your device."] },
    ],
  },
  seo: {
    defaultDescription: "Ikirenge Shoes (demo): comfortable, durable leather shoes, ordered in seconds on WhatsApp.",
    pages: {
      home: { title: "Ikirenge Shoes — Every step counts", description: "Leather shoes for work, sport, school and the big days." },
      products: { title: "The collection", description: "Ikirenge sneakers, loafers, sandals, boots and flats." },
      story: { title: "Our story", description: "The workshop and the leather behind every Ikirenge pair." },
    },
  },
};

const sw = {
  brand: { tagline: "Kila hatua ni muhimu", promise: "Viatu vya ngozi, vizuri na imara, vilivyobuniwa Burundi.", base: "Ngozi iliyotengenezwa kwa mimea" },
  common: { madeIn: "Vimebuniwa na kuunganishwa Bujumbura" },
  home: {
    intro: { eyebrow: "Ikirenge · viatu vya ngozi", title: "Kila hatua ni muhimu", subtitle: "Viatu vizuri kwa kazi, michezo, shule na siku kuu." },
    fromMushroom: {
      eyebrow: "Kutoka ngozi hadi hatua zako",
      title: "Yote huanza na ngozi nzuri",
      text: "Tunachagua ngozi bora; mafundi wetu hukata, kushona na kumalizia kila jozi.",
      steps: [
        { title: "Ngozi", text: "Laini na inayopitisha hewa." },
        { title: "Karakana", text: "Kukata na kushona kwa mkono." },
        { title: "Hatua zako", text: "Jozi inayodumu kwa miaka." },
      ],
    },
    moments: {
      eyebrow: "Kwa kila hatua",
      title: "Ikirenge, kutoka ofisini hadi ufukweni",
      subtitle: "Kazini, ziwani, shuleni au sherehe: jozi kwa kila wakati.",
      breaks: [
        { eyebrow: "Kazi ya mkono", text: "Kila jozi hupita mikononi mwa mafundi wetu." },
        { eyebrow: "Ngozi imara", text: "Ngozi inayozeeka vizuri, kama kumbukumbu zako." },
      ],
    },
    benefits: {
      eyebrow: "Kwa nini Ikirenge",
      title: "Kinacholeta tofauti",
      items: [
        { title: "Starehe siku nzima", text: "Soli laini kwa kutembea muda mrefu." },
        { title: "Umaliziaji makini", text: "Mishono imara na ngozi iliyochaguliwa." },
        { title: "Imebuniwa Burundi", text: "Kwa barabara, mvua na sherehe zetu." },
        { title: "Kwa familia nzima", text: "Kutoka saizi za watoto hadi za watu wazima." },
      ],
    },
    products: { eyebrow: "Mitindo yetu", title: "Vipendwa", subtitle: "Raba, mokasini, ballerina: pata jozi yako." },
    cta: { title: "Umepata jozi yako?", text: "Agiza kwa sekunde chache: oda yako inakwenda moja kwa moja WhatsApp." },
    mushroom: {
      eyebrow: "Ufundi wa Ikirenge",
      title: "Ngozi, moyo wa kila jozi",
      intro: "Ngozi bora hupitisha hewa, huzeeka vizuri na hudumu.",
      whyTitle: "Faida za ngozi",
      items: [
        { title: "Hupitisha hewa", text: "Miguu hubaki mikavu." },
        { title: "Imara", text: "Hudumu miaka mingi." },
        { title: "Hujipanga", text: "Hufuata umbo la mguu wako." },
        { title: "Asilia", text: "Bila kemikali kali." },
        { title: "Hurekebishika", text: "Soli na mishono hurekebishwa." },
        { title: "Mng’ao mzuri", text: "Kila jozi huwa ya kipekee." },
      ],
      disclaimer: "Duka la maonyesho la Rundinova Studio: bidhaa, bei na mawasiliano ni ya kubuni.",
      cta: "Angalia mitindo",
    },
  },
  products: {
    eyebrow: "Viatu vyetu",
    title: "Mkusanyiko wa Ikirenge",
    intro: "Zungusha, kuza, angalia kwa karibu: chagua mtindo na saizi kwenye WhatsApp.",
    chooseTitle: "Chagua mtindo wako",
    factsTitle: "Malighafi na utunzaji",
    formats: { title: "Mitindo", product: "Mtindo" },
    ingredients: { title: "Malighafi", baseTitle: "Malighafi kuu", base: "Ngozi asilia", othersTitle: "Malighafi nyingine", storageTitle: "Utunzaji", storage: "Piga brashi baada ya matumizi, kausha mbali na jua." },
  },
  story: {
    title: "Tulizaliwa Bujumbura, kwa ajili ya kutembea",
    intro: "Ikirenge ina maana ya « mguu » kwa Kirundi.",
    chapters: [
      { title: "Karakana", text: "Mafundi wachache hukata, kushona na kumalizia kila jozi kwa mkono." },
      { title: "Kuchagua ngozi", text: "Tunachagua ngozi laini na imara." },
    ],
    values: { title: "Kinachotuongoza", items: [{ title: "Starehe" , text: "Kiatu hupimwa baada ya siku nzima." }, { title: "Uimara", text: "Jozi moja inayodumu ni bora." }, { title: "Ukaribu", text: "Ushauri na saizi kwenye WhatsApp." }] },
    journey: { eyebrow: "Kutoka ngozi hadi mlangoni", title: "Jinsi jozi inavyozaliwa", intro: "Hatua tatu.", steps: [{ title: "Uchaguzi", text: "Ngozi huchaguliwa moja moja." }, { title: "Utengenezaji", text: "Kukata, kushona na kumalizia." }, { title: "Usafirishaji", text: "Jozi yako inakufikia." }] },
  },
  legal: {
    updated: "Ilisasishwa: 24 Novemba 2026",
    sections: [
      { title: "Duka la maonyesho", body: ["Ikirenge Shoes ni duka la kubuni la Rundinova Studio.", "Bidhaa, bei na namba ni mifano: hakuna oda inayoshughulikiwa."] },
      { title: "Modeli ya 3D", body: ["Modeli ya 3D chini ya leseni CC BY 4.0 — tazama public/demo/README.md."] },
      { title: "Data binafsi", body: ["Tovuti haikusanyi data yoyote."] },
    ],
  },
  seo: { defaultDescription: "Ikirenge Shoes (maonyesho): viatu vya ngozi vizuri na imara, agiza kupitia WhatsApp.", pages: { home: { title: "Ikirenge Shoes — Kila hatua ni muhimu", description: "Viatu vya ngozi kwa kila wakati." } } },
};

// Kirundi: TO BE REVIEWED BY A NATIVE SPEAKER.
const rn = {
  brand: { tagline: "Intambwe yose ifise akamaro", promise: "Ibirato vy’uruhu, vyoroshe kandi bikomeye, vyateguriwe mu Burundi.", base: "Uruhu rwiza" },
  common: { madeIn: "Vyateguriwe i Bujumbura" },
  home: {
    intro: { eyebrow: "Ikirenge · ibirato vy’uruhu", title: "Intambwe yose ifise akamaro", subtitle: "Ibirato vyiza ku kazi, mu mikino, ku ishure no ku misi mikuru." },
    fromMushroom: {
      eyebrow: "Kuva ku ruhu gushika ku ntambwe zawe",
      title: "Vyose bitangurira ku ruhu rwiza",
      text: "Duhitamwo uruhu rwiza ; abanyabukorikori bacu baraca, baradoda, bakarangiza ikirato cose.",
      steps: [
        { title: "Uruhu", text: "Rworoshe kandi ruhumeka." },
        { title: "Ubukorikori", text: "Guca no kudoda n’amaboko." },
        { title: "Intambwe zawe", text: "Ibirato bimara imyaka myinshi." },
      ],
    },
    moments: {
      eyebrow: "Ku ntambwe yose",
      title: "Ikirenge, kuva ku biro gushika ku kiyaga",
      subtitle: "Ku kazi, ku kiyaga, ku ishure canke mu birori.",
      breaks: [
        { eyebrow: "Vyakozwe n’amaboko", text: "Ikirato cose gica mu maboko y’abanyabukorikori bacu." },
        { eyebrow: "Uruhu rukomeye", text: "Uruhu rumara igihe kirekire." },
      ],
    },
    benefits: {
      eyebrow: "Kubera iki Ikirenge",
      title: "Ibituma dutandukana",
      items: [
        { title: "Biroroshe umusi wose", text: "Isoli yoroshe yo kugenda igihe kirekire." },
        { title: "Bikozwe neza", text: "Kudoda gukomeye n’uruhu rwatoranijwe." },
        { title: "Vyateguriwe mu Burundi", text: "Ku mihanda yacu, imvura n’ibirori." },
        { title: "Ku muryango wose", text: "Kuva ku bana gushika ku bakuze." },
      ],
    },
    products: { eyebrow: "Ibirato vyacu", title: "Ivyo abantu bakunda", subtitle: "Shoza, mocassin, ballerine : torora ikirato cawe." },
    cta: { title: "Watoye ikirato cawe?", text: "Tumiza mu masegonda make : igitumizo cawe kija kuri WhatsApp." },
    mushroom: {
      eyebrow: "Ubuhinga bwa Ikirenge",
      title: "Uruhu, umutima w’ikirato cose",
      intro: "Uruhu rwiza ruhumeka kandi rumara igihe kirekire.",
      whyTitle: "Ivyiza vy’uruhu",
      items: [
        { title: "Ruhumeka", text: "Ibirenge ntibibira icuya." },
        { title: "Rukomeye", text: "Rumara imyaka myinshi." },
        { title: "Rwisanisha", text: "Rufata ishusho y’ikirenge cawe." },
        { title: "Kamere", text: "Nta miti mibi." },
        { title: "Rurasanurwa", text: "Isoli n’ivyadodwe birasanurwa." },
        { title: "Rurabagirana", text: "Ikirato cose kiba ica nyene." },
      ],
      disclaimer: "Iduka ry’akarorero rya Rundinova Studio : ibicuruzwa, ibiciro n’aderesi si ivy’ukuri.",
      cta: "Raba ibirato",
    },
  },
  products: {
    eyebrow: "Ibirato vyacu",
    title: "Ibirato vya Ikirenge",
    intro: "Hindukiza, egereza : hitamwo ikirato n’inomero kuri WhatsApp.",
    chooseTitle: "Hitamwo ikirato cawe",
    factsTitle: "Ivyo bikozwemwo n’ukubibungabunga",
    formats: { title: "Ibirato", product: "Ikirato" },
    ingredients: { title: "Ivyo bikozwemwo", baseTitle: "Ikintu nyamukuru", base: "Uruhu rwiza", othersTitle: "Ibindi", storageTitle: "Ukubibungabunga", storage: "Bihanagure inyuma yo kubikoresha, ubyumishe kure y’izuba." },
  },
  story: {
    title: "Twavukiye i Bujumbura, ku bwo kugenda",
    intro: "Ikirenge bisigura « ikirenge » mu Kirundi.",
    chapters: [
      { title: "Ubukorikori", text: "Abanyabukorikori bake baraca, baradoda bakarangiza ikirato cose n’amaboko." },
      { title: "Uguhitamwo uruhu", text: "Duhitamwo uruhu rworoshe kandi rukomeye." },
    ],
    values: { title: "Ibitwerekera", items: [{ title: "Uguhimbarwa", text: "Ikirato gisuzumwa inyuma y’umusi wose." }, { title: "Ukumara igihe", text: "Ikirato kimwe kimara igihe ni ciza." }, { title: "Ukuba hafi", text: "Impanuro n’inomero kuri WhatsApp." }] },
    journey: { eyebrow: "Kuva ku ruhu gushika iwawe", title: "Uko ikirato kivuka", intro: "Intambwe zitatu.", steps: [{ title: "Uguhitamwo", text: "Uruhu ruhitwamwo rumwe rumwe." }, { title: "Ugukora", text: "Guca, kudoda no kurangiza." }, { title: "Ukurungika", text: "Ikirato cawe kigushikira." }] },
  },
  legal: {
    updated: "Vyasubiwemo : 24 Ugushyingo 2026",
    sections: [
      { title: "Iduka ry’akarorero", body: ["Ikirenge Shoes ni iduka ry’akarorero rya Rundinova Studio.", "Ibicuruzwa, ibiciro n’inomero ni uturorero : nta gitumizo gikorwa."] },
      { title: "Ishusho 3D", body: ["Ishusho 3D iri munsi y’uruhusha CC BY 4.0 — raba public/demo/README.md."] },
      { title: "Amakuru bwite", body: ["Uru rubuga ntirukusanya amakuru yanyu."] },
    ],
  },
  seo: { defaultDescription: "Ikirenge Shoes (akarorero) : ibirato vy’uruhu, tumiza kuri WhatsApp.", pages: { home: { title: "Ikirenge Shoes — Intambwe yose ifise akamaro", description: "Ibirato vy’uruhu ku misi yose." } } },
};

export const ikirengeContent = {
  fr,
  en,
  sw,
  rn,
  media: {
    og: `${ROOT}/og/og-image.jpg`,
    studio: `${ROOT}/produits/ikirenge-runner.png`,
    story: [`${ROOT}/histoire/atelier.jpg`, `${ROOT}/histoire/cuir.jpg`],
    highlight: `${ROOT}/histoire/cuir.jpg`,
    closeup: `${ROOT}/histoire/cuir.jpg`,
    harvest: `${ROOT}/histoire/atelier.jpg`,
    ingredients: `${ROOT}/histoire/cuir.jpg`,
  },
  gallery: {
    imageUrl: "/demo/images/runner-street.webp",
    tagline: L(
      "Chaussures en cuir confortables, du bureau à la plage.",
      "Ibirato vy’uruhu vyoroshe, kuva ku biro gushika ku kiyaga.",
      "Comfortable leather shoes, from the office to the beach.",
      "Viatu vya ngozi vizuri, kutoka ofisini hadi ufukweni.",
    ),
  },
};
