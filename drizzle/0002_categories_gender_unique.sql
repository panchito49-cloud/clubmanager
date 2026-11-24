DROP INDEX "categories_club_name_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_club_name_gender_uq" ON "categories" USING btree ("club_id","name","gender");