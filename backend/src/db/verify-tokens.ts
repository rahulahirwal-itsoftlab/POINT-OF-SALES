import { AuthService } from "../modules/auth/auth.service.js";
import { tokenService } from "../common/auth/token.service.js";
import { env } from "../config/env.js";

async function verifyTokenFlow() {
  console.log("=== STARTING TOKEN FLOW VERIFICATION ===");
  const authService = new AuthService();
  
  console.log("1. Testing Login...");
  const loginRes = await authService.login(
    { email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD },
    { ipAddress: "127.0.0.1", userAgent: "VerificationRunner/1.0" },
  );

  console.log("  - Access Token:", loginRes.accessToken.substring(0, 30) + "...");
  console.log("  - Refresh Token:", loginRes.refreshToken.substring(0, 30) + "...");
  
  console.log("2. Testing Access Token Verification...");
  const payload = await tokenService.verifyAccessToken(loginRes.accessToken);
  console.log("  - JWT Subject:", payload.sub);
  console.log("  - JWT Role:", payload.role);

  console.log("3. Testing Refresh Flow...");
  const refreshRes = await authService.refresh(loginRes.refreshToken, { ipAddress: "127.0.0.1", userAgent: "VerificationRunner/1.0" });
  console.log("  - New Access Token:", refreshRes.accessToken.substring(0, 30) + "...");
  console.log("  - New Refresh Token:", refreshRes.refreshToken.substring(0, 30) + "...");

  console.log("4. Testing Refresh Token Reuse (Should Fail)...");
  try {
    await authService.refresh(loginRes.refreshToken, { ipAddress: "127.0.0.1", userAgent: "VerificationRunner/1.0" });
    console.error("ERROR: Old refresh token was accepted.");
  } catch {
    console.log("  - Successfully rejected reused refresh token.");
  }

  console.log("5. Testing Logout...");
  await authService.logout(refreshRes.refreshToken, { ipAddress: "127.0.0.1", userAgent: "VerificationRunner/1.0" });
  console.log("  - Session revoked.");

  console.log("6. Testing Refresh after Logout (Should Fail)...");
  try {
    await authService.refresh(refreshRes.refreshToken, { ipAddress: "127.0.0.1", userAgent: "VerificationRunner/1.0" });
    console.error("ERROR: Revoked refresh token was accepted.");
  } catch {
    console.log("  - Successfully rejected revoked refresh token.");
  }

  console.log("=== TOKEN FLOW VERIFICATION COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

verifyTokenFlow().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
