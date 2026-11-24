-- One storefront template for every shop: the former generic « vitrine » rows become « boutique »
-- (same Krumbz experience, fed by the tenant's data). Old scenes ({ imageUrl, … }) are normalised when read.
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_template_known";--> statement-breakpoint
UPDATE "tenants" SET "template" = 'boutique' WHERE "template" <> 'krumbz';--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "template" SET DEFAULT 'boutique';--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_template_known" CHECK ("tenants"."template" in ('krumbz', 'boutique'));
