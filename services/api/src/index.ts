/**
 * @medikey/api — service layer + adapters + composition root.
 * The service layer encrypts sensitive fields before persistence and routes all
 * disclosure through @medikey/core `project()`.
 */
export * from "./domain/model";
export * from "./adapters/ports";
export {
  MemoryRepository,
  MemoryAuditSink,
  MemoryCache,
  MemoryRateLimiter,
  MemoryNotifier,
} from "./adapters/memory";

export * from "./app/errors";
export { createContext, createTestContext, type AppContext } from "./app/context";
export { assembleApp, createApp, createTestApp, type App } from "./app/assemble";

export { AuthService } from "./auth/service";
export { DevAuthProvider } from "./auth/provider";
export type { AuthProvider } from "./auth/provider";
export { ProfileService } from "./profile/service";
export { MedicalService } from "./medical/service";
export { DisclosureService } from "./disclosure/service";
export { QrService } from "./qr/service";
export { ScannerService } from "./scanner/service";
export { BreakGlassService } from "./breakglass/service";
export { RightsService } from "./rights/service";
export { renderEmergencyPage } from "./emergency/render";
