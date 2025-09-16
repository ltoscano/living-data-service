"use server"

import { 
  getKeycloakUser, 
  isKeycloakAuthenticated, 
  requireKeycloakAuth,
  requireKeycloakRole,
  requireKeycloakAdmin 
} from "@/lib/keycloak-helpers"

export async function getCurrentUser() {
  return await getKeycloakUser()
}

export async function checkAuthentication() {
  return await isKeycloakAuthenticated()
}

export async function requireAuthentication() {
  try {
    return await requireKeycloakAuth()
  } catch (error) {
    throw new Error("Authentication required")
  }
}

export async function requireRole(role: string) {
  try {
    return await requireKeycloakRole(role)
  } catch (error) {
    throw new Error(`Role '${role}' required`)
  }
}

export async function requireAdminRole() {
  try {
    return await requireKeycloakAdmin()
  } catch (error) {
    throw new Error("Admin role required")
  }
}