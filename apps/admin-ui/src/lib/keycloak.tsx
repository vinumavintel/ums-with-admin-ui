"use client";
// Thin compatibility shim. The real implementation now lives in keycloak-client.tsx.
// This file re-exports everything to avoid stale imports breaking.
export * from './keycloak-client';
export { default } from './keycloak-client';
