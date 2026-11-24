/**
 * Products of the demo shop « Ikirenge Shoes » (texts, prices, facts: unchanged from the former
 * demo). Images, in order of preference — the storefront shows the FIRST file that exists:
 *   1. owner cut-out   /images/tenants/ikirenge/produits/<slug>.png        (docs/demo-ikirenge-photos.md)
 *   2. owner profile   /images/tenants/ikirenge/produits/<slug>-profil.png (optional)
 *   3. provisional     /images/tenants/ikirenge/provisoire/produits/<slug>.svg, or for the Runner the
 *                      renders of the CC BY 4.0 3D model (/demo/images/runner-*.webp, see public/demo/README.md).
 * Kirundi (rn): to be reviewed by a native speaker.
 */
import type { Localized, Product } from "../../src/lib/tenant/types.ts";

const L = (fr: string, rn: string, en: string, sw: string): Localized => ({ fr, rn, en, sw });
const DEMO_TENANT_ID = "demo-ikirenge";
const IMG = "/demo/images";

type DemoImage = Product["images"][number];
const img =(file: string, alt: Localized): DemoImage => ({ url: `${IMG}/${file}`, alt, width: 1000, height: 1000 });
const fact = (label: Localized, value: Localized) => ({ label, value });

const SIZES = L("Pointures", "Inomero", "Sizes", "Saizi");
const MATERIAL = L("Matière", "Ivyo zikozwemwo", "Material", "Malighafi");
const SOLE = L("Semelle", "Isoli", "Sole", "Soli");
const COLOURS = L("Coloris", "Amabara", "Colours", "Rangi");

const demoProducts: Product[] = [
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

const OWNER = "/images/tenants/ikirenge/produits";
const PROVISIONAL = "/images/tenants/ikirenge/provisoire/produits";
/** Featured on the home page (3D journey: the Runner model plays the main role, the others their photos). */
const FEATURED = new Set(["ikirenge-runner", "mocassin-rohero", "ballerine-imena"]);

export type DemoProduct = Omit<Product, "id" | "tenantId">;

export const ikirengeProducts: DemoProduct[] = demoProducts.map((source) => {
  const { id: _id, tenantId: _tenantId, ...product } = source;
  void _id;
  void _tenantId;
  const alt = product.images[0]?.alt ?? product.name;
  const provisional =
    product.slug === "ikirenge-runner"
      ? product.images.map((image) => ({ ...image, width: 1098, height: 1479 }))
      : [{ url: `${PROVISIONAL}/${product.slug}.svg`, alt, width: 1200, height: 1200 }];
  return {
    ...product,
    featured: FEATURED.has(product.slug),
    images: [
      { url: `${OWNER}/${product.slug}.png`, alt, width: 1600, height: 1600 },
      { url: `${OWNER}/${product.slug}-profil.png`, alt: product.images[1]?.alt ?? alt, width: 1600, height: 1600 },
      ...provisional,
    ],
  };
});
