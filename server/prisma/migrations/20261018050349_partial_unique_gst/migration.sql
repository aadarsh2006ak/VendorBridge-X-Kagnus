-- Drop the unconditional unique index
DROP INDEX IF EXISTS "Vendor_gstNumber_key";

-- Create partial unique index on active (non-deleted) vendors
CREATE UNIQUE INDEX "Vendor_gstNumber_active_key" ON "Vendor"("gstNumber") WHERE "deletedAt" IS NULL;