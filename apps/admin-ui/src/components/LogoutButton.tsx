"use client";
import React from 'react';
import { keycloak } from '../lib/keycloak';

export function LogoutButton() {
  return (
    <button
      onClick={() => keycloak.logout()}
      className="text-xs font-medium rounded border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
    >
      Logout
    </button>
  );
}
