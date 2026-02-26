-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TENANT', 'MAINTENANCE', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('WATER', 'ELECTRICITY');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateTable
CREATE TABLE "FoodCourt" (
    "food_court_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_slots" INTEGER NOT NULL,

    CONSTRAINT "FoodCourt_pkey" PRIMARY KEY ("food_court_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "title" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address_line" TEXT,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "RentalSlot" (
    "slot_id" SERIAL NOT NULL,
    "food_court_id" INTEGER NOT NULL,
    "slot_number" TEXT NOT NULL,
    "slot_size" TEXT,
    "rent" DOUBLE PRECISION NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'VACANT',

    CONSTRAINT "RentalSlot_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "RentalContract" (
    "contract_id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "contract_number" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "monthly_rent" DOUBLE PRECISION NOT NULL,
    "deposit_amount" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalContract_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "UtilityMeter" (
    "meter_id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "meter_type" "MeterType" NOT NULL,
    "meter_number" TEXT,
    "previous_reading" DOUBLE PRECISION NOT NULL,
    "current_reading" DOUBLE PRECISION NOT NULL,
    "unit_used" DOUBLE PRECISION NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilityMeter_pkey" PRIMARY KEY ("meter_id")
);

-- CreateTable
CREATE TABLE "MonthlyExpense" (
    "expense_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "billing_month" TIMESTAMP(3) NOT NULL,
    "rent_amount" DOUBLE PRECISION NOT NULL,
    "water_cost" DOUBLE PRECISION NOT NULL,
    "electricity_cost" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyExpense_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "payment_id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_amount" DOUBLE PRECISION NOT NULL,
    "payment_slip_url" TEXT,
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "request_id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "MaintenanceImage" (
    "image_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_type" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceImage_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "MaintenanceAssignment" (
    "assignment_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "assigned_to" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "estimated_completion" TIMESTAMP(3),
    "scheduled_date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "MaintenanceAssignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "MaintenanceUpdate" (
    "update_id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "status" "MaintenanceStatus" NOT NULL,
    "comment" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceUpdate_pkey" PRIMARY KEY ("update_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "reference_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "setting_id" SERIAL NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" TEXT NOT NULL,
    "description" TEXT,
    "data_type" TEXT,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("setting_id")
);

-- CreateTable
CREATE TABLE "DailyDishwareUsage" (
    "usage_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "usage_date" TIMESTAMP(3) NOT NULL,
    "plate_quantity" INTEGER NOT NULL DEFAULT 0,
    "bowl_quantity" INTEGER NOT NULL DEFAULT 0,
    "small_cup_quantity" INTEGER NOT NULL DEFAULT 0,
    "plate_unit_price" DOUBLE PRECISION NOT NULL,
    "bowl_unit_price" DOUBLE PRECISION NOT NULL,
    "small_cup_unit_price" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDishwareUsage_pkey" PRIMARY KEY ("usage_id")
);

-- CreateTable
CREATE TABLE "ShopType" (
    "shop_type_id" SERIAL NOT NULL,
    "type_name" TEXT NOT NULL,
    "require_grease_trap" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopType_pkey" PRIMARY KEY ("shop_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RentalContract_contract_number_key" ON "RentalContract"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_setting_key_key" ON "SystemSetting"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "ShopType_type_name_key" ON "ShopType"("type_name");

-- AddForeignKey
ALTER TABLE "RentalSlot" ADD CONSTRAINT "RentalSlot_food_court_id_fkey" FOREIGN KEY ("food_court_id") REFERENCES "FoodCourt"("food_court_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "RentalSlot"("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalContract" ADD CONSTRAINT "RentalContract_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityMeter" ADD CONSTRAINT "UtilityMeter_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "RentalSlot"("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityMeter" ADD CONSTRAINT "UtilityMeter_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpense" ADD CONSTRAINT "MonthlyExpense_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "RentalContract"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "MonthlyExpense"("expense_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "RentalSlot"("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceImage" ADD CONSTRAINT "MaintenanceImage_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "MaintenanceRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "MaintenanceRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAssignment" ADD CONSTRAINT "MaintenanceAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceUpdate" ADD CONSTRAINT "MaintenanceUpdate_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "MaintenanceRequest"("request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceUpdate" ADD CONSTRAINT "MaintenanceUpdate_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDishwareUsage" ADD CONSTRAINT "DailyDishwareUsage_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "RentalContract"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDishwareUsage" ADD CONSTRAINT "DailyDishwareUsage_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
