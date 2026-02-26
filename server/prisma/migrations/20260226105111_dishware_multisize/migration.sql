/*
  Warnings:

  - You are about to drop the column `bowl_quantity` on the `DailyDishwareUsage` table. All the data in the column will be lost.
  - You are about to drop the column `bowl_unit_price` on the `DailyDishwareUsage` table. All the data in the column will be lost.
  - You are about to drop the column `plate_quantity` on the `DailyDishwareUsage` table. All the data in the column will be lost.
  - You are about to drop the column `plate_unit_price` on the `DailyDishwareUsage` table. All the data in the column will be lost.
  - You are about to drop the column `small_cup_quantity` on the `DailyDishwareUsage` table. All the data in the column will be lost.
  - You are about to drop the column `small_cup_unit_price` on the `DailyDishwareUsage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DishwareStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DishwareCategory" AS ENUM ('PLATE', 'BOWL', 'CUP', 'OTHER');

-- AlterTable
ALTER TABLE "DailyDishwareUsage" DROP COLUMN "bowl_quantity",
DROP COLUMN "bowl_unit_price",
DROP COLUMN "plate_quantity",
DROP COLUMN "plate_unit_price",
DROP COLUMN "small_cup_quantity",
DROP COLUMN "small_cup_unit_price",
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" INTEGER,
ADD COLUMN     "status" "DishwareStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "last_name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DishwareType" (
    "dishware_type_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DishwareCategory" NOT NULL,
    "size_label" TEXT NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DishwareType_pkey" PRIMARY KEY ("dishware_type_id")
);

-- CreateTable
CREATE TABLE "DishwareOrderItem" (
    "item_id" SERIAL NOT NULL,
    "usage_id" INTEGER NOT NULL,
    "dishware_type_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DishwareOrderItem_pkey" PRIMARY KEY ("item_id")
);

-- AddForeignKey
ALTER TABLE "DailyDishwareUsage" ADD CONSTRAINT "DailyDishwareUsage_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishwareOrderItem" ADD CONSTRAINT "DishwareOrderItem_usage_id_fkey" FOREIGN KEY ("usage_id") REFERENCES "DailyDishwareUsage"("usage_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishwareOrderItem" ADD CONSTRAINT "DishwareOrderItem_dishware_type_id_fkey" FOREIGN KEY ("dishware_type_id") REFERENCES "DishwareType"("dishware_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
