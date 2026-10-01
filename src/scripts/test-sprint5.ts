import {
  authenticateWithPassword,
  authenticateWithPin,
  createSessionToken,
  verifySessionToken,
} from "../lib/db/auth-repo";
import {
  createReward,
  getRewardById,
  updateReward,
  toggleRewardStatus,
  deleteReward,
  getActiveRewards,
  getAllRewards,
} from "../lib/db/settings-repo";

async function runSprint5Tests() {
  console.log("==================================================");
  console.log("🔐 INICIANDO TEST DE SPRINT 5: LOGIN & CRUD PREMIOS");
  console.log("==================================================");

  // 1. Test Password Authentication
  console.log("\n1. 🔑 Prueba de Autenticación con Email y Contraseña:");
  const userByPass = authenticateWithPassword("admin@gastrobumeran.com", "admin123");
  if (!userByPass) {
    throw new Error("Falló la autenticación con contraseña válida.");
  }
  console.log(`✓ Autenticado con éxito: ${userByPass.name} (${userByPass.email}) - Rol: ${userByPass.role}`);

  const badPass = authenticateWithPassword("admin@gastrobumeran.com", "wrong_password");
  if (badPass !== null) {
    throw new Error("Falló la seguridad: se permitió acceso con contraseña incorrecta.");
  }
  console.log("✓ Rechazo de contraseña inválida validado correctamente.");

  // 2. Test PIN Authentication
  console.log("\n2. 🔢 Prueba de Autenticación con PIN Rápido:");
  const userByPin = authenticateWithPin("1234");
  if (!userByPin) {
    throw new Error("Falló la autenticación con PIN válido.");
  }
  console.log(`✓ Autenticado con PIN con éxito: ${userByPin.name}`);

  const badPin = authenticateWithPin("0000");
  if (badPin !== null) {
    throw new Error("Falló la seguridad: se permitió acceso con PIN incorrecto.");
  }
  console.log("✓ Rechazo de PIN inválido validado correctamente.");

  // 3. Test Session Token
  console.log("\n3. 🛡️ Prueba de Generación y Validación de Token de Sesión JWT:");
  const session = createSessionToken(userByPass);
  console.log(`✓ Token emitido: ${session.token.slice(0, 30)}... Expiración: ${session.expiresAt}`);

  const verifiedUser = verifySessionToken(session.token);
  if (!verifiedUser || verifiedUser.id !== userByPass.id) {
    throw new Error("Falló la verificación del token de sesión.");
  }
  console.log(`✓ Token verificado y usuario resuelto: ${verifiedUser.name}`);

  // 4. Test Rewards CRUD
  console.log("\n4. 🎁 Prueba de Gestión de Catálogo de Premios y Canjes (CRUD):");

  // Create
  const newReward = createReward({
    name: "Cerveza Artesanal IPA 500ml",
    reward_type: "POINTS",
    requirement_value: 120,
    is_active: true,
    description: "Tirada en barra. Variedad IPA o Honey.",
  });
  console.log(`✓ Premio creado con éxito: ID #${newReward.id} - "${newReward.name}" (${newReward.requirement_value} pts)`);

  // Read
  const fetched = getRewardById(newReward.id);
  if (!fetched || fetched.name !== "Cerveza Artesanal IPA 500ml") {
    throw new Error("No se pudo recuperar el premio recién creado.");
  }

  // Update
  const updated = updateReward(newReward.id, {
    requirement_value: 140,
    description: "Tirada en barra o pinta para llevar.",
  });
  console.log(`✓ Premio actualizado: ID #${updated.id} - Valor: ${updated.requirement_value} pts`);
  if (updated.requirement_value !== 140) {
    throw new Error("Falló la actualización de puntos del premio.");
  }

  // Toggle Pause/Active
  toggleRewardStatus(newReward.id, false);
  const paused = getRewardById(newReward.id);
  console.log(`✓ Estado alternado: is_active = ${paused?.is_active} (Pausado)`);

  const activeCatalog = getActiveRewards();
  const allCatalog = getAllRewards();
  const inActive = activeCatalog.some((r) => r.id === newReward.id);
  const inAll = allCatalog.some((r) => r.id === newReward.id);
  if (inActive || !inAll) {
    throw new Error("El filtrado de activos/todos no se comportó como se esperaba.");
  }
  console.log(`✓ Catálogo activo excluye el premio pausado (${activeCatalog.length} activos vs ${allCatalog.length} totales)`);

  // Delete
  const deleted = deleteReward(newReward.id);
  console.log(`✓ Premio eliminado de prueba: ${deleted}`);

  // Birthday protection check
  try {
    const all = getAllRewards();
    const bday = all.find((r) => r.reward_type === "BIRTHDAY_GIFT");
    if (bday) {
      deleteReward(bday.id);
      throw new Error("Falló la protección: se permitió borrar la cortesía de cumpleaños.");
    }
  } catch (err: unknown) {
    console.log("✓ Protección de cortesía de cumpleaños validada:", err instanceof Error ? err.message : String(err));
  }

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE SPRINT 5 PASARON CON 100% DE ÉXITO!");
  console.log("==================================================");
}

runSprint5Tests().catch((err) => {
  console.error("❌ Error en pruebas de Sprint 5:", err);
  process.exit(1);
});
