import { notFound } from "next/navigation";

/** Any other path of a « vitrine » shop: the 404 page. */
export default function VitrineCatchAll() {
  notFound();
}
