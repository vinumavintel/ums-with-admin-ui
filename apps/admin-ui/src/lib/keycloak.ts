"use client";
// Re-export everything from client implementation keeping original import path stable.
// Having this file marked as a client module ensures that importing '@/lib/keycloak'
// or '@/lib/keycloak-client' doesn't cause two separate module graphs in Turbopack.
export * from './keycloak-client';
export { default } from './keycloak-client';