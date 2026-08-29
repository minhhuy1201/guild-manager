ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE BOOLEAN USING ("status" = 'CO');
ALTER TABLE "AttendanceRecord" RENAME COLUMN "status" TO "isPresent";
DROP TYPE "AttendanceStatus";
