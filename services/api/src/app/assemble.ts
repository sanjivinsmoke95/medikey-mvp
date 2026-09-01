import { createContext, createTestContext, createServerContext, type AppContext } from "./context";
import { AuthService } from "../auth/service";
import { ProfileService } from "../profile/service";
import { MedicalService } from "../medical/service";
import { DisclosureService } from "../disclosure/service";
import { QrService } from "../qr/service";
import { ScannerService } from "../scanner/service";
import { BreakGlassService } from "../breakglass/service";
import { RightsService } from "../rights/service";

/** Composition root: wires all services + the rebuild hook. */
export interface App {
  ctx: AppContext;
  auth: AuthService;
  profile: ProfileService;
  medical: MedicalService;
  disclosure: DisclosureService;
  qr: QrService;
  scanner: ScannerService;
  breakGlass: BreakGlassService;
  rights: RightsService;
}

export function assembleApp(ctx: AppContext): App {
  const auth = new AuthService(ctx);
  const profile = new ProfileService(ctx);
  const medical = new MedicalService(ctx);
  const disclosure = new DisclosureService(ctx);
  const qr = new QrService(ctx);
  const scanner = new ScannerService(ctx, qr, disclosure);
  const breakGlass = new BreakGlassService(ctx, qr, disclosure);
  const rights = new RightsService(ctx);

  // Rebuild the emergency_view whenever medical data changes.
  medical.onChange((subjectId) => disclosure.buildAndCacheView(subjectId));

  return { ctx, auth, profile, medical, disclosure, qr, scanner, breakGlass, rights };
}

export function createApp(source: Record<string, string | undefined> = process.env): App {
  return assembleApp(createContext(source));
}

export function createTestApp(): App {
  return assembleApp(createTestContext());
}

/**
 * Environment-driven composition root: uses Postgres/Redis adapters when
 * DATABASE_URL/REDIS_URL are set, otherwise the in-memory adapters. This is the
 * entrypoint the HTTP server boots from.
 */
export async function createServerApp(source: Record<string, string | undefined> = process.env): Promise<App> {
  return assembleApp(await createServerContext(source));
}
