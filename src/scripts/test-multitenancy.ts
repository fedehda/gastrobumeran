import { getDatabase } from "../lib/db/db";
import {
  createRestaurant,
  getRestaurantBySlug,
  getRestaurantById,
  createCustomerOtp,
  verifyCustomerOtp,
  createEmailVerificationToken,
  verifyEmailToken,
  createContactLead,
  checkRestaurantQuota,
} from "../lib/db/restaurant-repo";
import {
  findCustomerByDocument,
  findCustomerById,
  createCustomer,
} from "../lib/db/customer-repo";
import { processSale, redeemReward } from "../lib/loyalty/engine";
import { createReward } from "../lib/db/settings-repo";
import { authenticateWithPin, createAdminUser } from "../lib/db/auth-repo";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runMultitenancyTests() {
  console.log("\n=======================================================");
  console.log("   TEST MULTI-TENANCY & TENANT ISOLATION (SPRINT K)");
  console.log("=======================================================\n");

  // 1. Provision two test restaurants
  const restoAId = "test-resto-napoli-" + Date.now();
  const restoBId = "test-resto-burger-" + Date.now();

  const restoA = createRestaurant({
    id: restoAId,
    name: "Pizzería Napoli",
    slug: "pizzeria-napoli-" + Date.now(),
    cuit: "30-71000001-9",
    status: "ACTIVE",
  });

  const restoB = createRestaurant({
    id: restoBId,
    name: "Burger Joint",
    slug: "burger-joint-" + Date.now(),
    cuit: "30-71000002-7",
    status: "TRIAL_DEMO",
  });

  assert(Boolean(restoA && restoA.id === restoAId), "Resto A provisioned with PRO plan");
  assert(Boolean(restoB && restoB.status === "TRIAL_DEMO"), "Resto B provisioned with TRIAL_DEMO");

  // 2. Test Customer Isolation: Same DNI in both restaurants
  const testDni = "33444555";
  const custA = createCustomer({
    name: "Carlos Napoli",
    document_number: testDni,
  }, restoAId);

  const custB = createCustomer({
    name: "Carlos Burger",
    document_number: testDni,
  }, restoBId);

  assert(custA.id !== custB.id, "Customer IDs are distinct for same DNI in different restaurants");
  assert(custA.restaurant_id === restoAId, "Customer A belongs to Resto A");
  assert(custB.restaurant_id === restoBId, "Customer B belongs to Resto B");

  // Check lookup isolation
  const lookupA = findCustomerByDocument(testDni, restoAId);
  const lookupB = findCustomerByDocument(testDni, restoBId);
  assert(lookupA?.id === custA.id && lookupA?.name === "Carlos Napoli", "findCustomerByDocument scoped to Resto A");
  assert(lookupB?.id === custB.id && lookupB?.name === "Carlos Burger", "findCustomerByDocument scoped to Resto B");

  // 3. Test Sales and Points Isolation
  console.log("\n--- Testing Sales & Points Isolation ---");
  const neutralSaleDate = "2026-10-08T10:00:00Z";
  const saleA = processSale({
    documentNumber: testDni,
    totalAmount: 10000,
    restaurantId: restoAId,
    concept: "Pizza Napolitana",
    saleDate: neutralSaleDate,
  });
  assert(saleA.points_earned === 100, `Resto A: Sale generated 100 points (got ${saleA.points_earned})`);

  const saleB = processSale({
    documentNumber: testDni,
    totalAmount: 25000,
    restaurantId: restoBId,
    concept: "Combo Doble Cheeseburger",
    saleDate: neutralSaleDate,
  });
  assert(saleB.points_earned === 250, `Resto B: Sale generated 250 points (got ${saleB.points_earned})`);

  const balanceA = findCustomerById(custA.id, restoAId)?.points_balance;
  const balanceB = findCustomerById(custB.id, restoBId)?.points_balance;
  assert(balanceA === 100, `Resto A balance is exactly 100 (got ${balanceA})`);
  assert(balanceB === 250, `Resto B balance is exactly 250 (got ${balanceB})`);

  // 4. Test Redemption Isolation
  console.log("\n--- Testing Reward Redemption Isolation ---");
  const rewardA = createReward({
    name: "Cerveza Gratis Napoli",
    reward_type: "POINTS",
    requirement_value: 50,
    is_active: true,
  }, restoAId);

  const redeemResultA = redeemReward(custA.id, rewardA.id, restoAId);
  assert(redeemResultA.success, "Reward redeemed successfully in Resto A");
  assert(redeemResultA.customer.points_balance === 50, "Resto A balance decremented to 50");

  // Resto B balance must remain intact (250)
  const balanceBAfterRedeemA = findCustomerById(custB.id, restoBId)?.points_balance;
  assert(balanceBAfterRedeemA === 250, "Resto B balance unaffected by Resto A redemption");

  // 5. Test Terminal PIN Scoped Authentication
  console.log("\n--- Testing Terminal PIN Scoped Authentication ---");
  const uniqueTs = Date.now();
  createAdminUser({
    email: `cajero-${uniqueTs}@napoli.com`,
    pin: "9988",
    role: "OPERATOR",
    name: "Cajero Napoli",
    restaurant_id: restoAId,
  });

  createAdminUser({
    email: `cajero-${uniqueTs}@burger.com`,
    pin: "9988", // Same PIN as napoli, but in different restaurant
    role: "OPERATOR",
    name: "Cajero Burger",
    restaurant_id: restoBId,
  });

  const authNapoli = authenticateWithPin("9988", restoAId);
  assert(Boolean(authNapoli && authNapoli.restaurant_id === restoAId), "PIN 9988 in Resto A context authenticates Cajero Napoli");

  const authBurger = authenticateWithPin("9988", restoBId);
  assert(Boolean(authBurger && authBurger.restaurant_id === restoBId), "Same PIN 9988 in Resto B context authenticates Cajero Burger");

  const authWrongResto = authenticateWithPin("1111", restoAId);
  assert(authWrongResto === null, "Invalid PIN returns null");

  // 6. Test Trial Quota Validation
  console.log("\n--- Testing Trial Quota Limits ---");
  const quotaCheckB = checkRestaurantQuota(restoBId);
  assert(quotaCheckB.allowed, "Resto B trial quota allowed initially (1 customer < 50 limit)");

  // 7. Test Customer OTP Flow
  console.log("\n--- Testing Customer OTP Generation & Verification ---");
  const { otpCode } = createCustomerOtp(restoAId, testDni);
  assert(otpCode.length === 6, `OTP generated: ${otpCode}`);

  const badOtpVerify = verifyCustomerOtp(restoAId, testDni, "999999");
  assert(!badOtpVerify, "Invalid OTP rejected");

  const goodOtpVerify = verifyCustomerOtp(restoAId, testDni, otpCode);
  assert(goodOtpVerify, "Valid OTP accepted and marked verified");

  const reuseOtpVerify = verifyCustomerOtp(restoAId, testDni, otpCode);
  assert(!reuseOtpVerify, "Reused OTP rejected");

  // 8. Test Email Verification Token Flow
  console.log("\n--- Testing Email Verification Token Flow ---");
  const emailToken = createEmailVerificationToken(restoAId, "owner@restaurant.com");
  assert(typeof emailToken === "string" && emailToken.length > 0, "Email verification token generated");

  const verifyResult = verifyEmailToken(emailToken);
  assert(verifyResult.success && verifyResult.restaurant?.id === restoAId, "Email token consumed correctly");

  const reVerifyResult = verifyEmailToken(emailToken);
  assert(!reVerifyResult.success, "Used email token cannot be consumed again");

  // 9. Test Contact Lead
  console.log("\n--- Testing Contact Lead Storage ---");
  const lead = createContactLead({
    restaurant_name: "La Parrilla de Juan",
    name: "Juan Perez",
    email: "juan@parrilla.com",
    phone: "1122334455",
    message: "Quiero consultar por el plan Cadena",
  });
  assert(Boolean(lead && lead.id), "Contact lead saved successfully");

  console.log("\n=======================================================");
  console.log("   🎉 ALL MULTI-TENANCY ISOLATION TESTS PASSED! 🎉");
  console.log("=======================================================\n");
}

runMultitenancyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
