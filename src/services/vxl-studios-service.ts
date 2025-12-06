import type { ModrinthProject } from "../types/modrinth";
import type { CurseForgeMod } from "../types/curseforge";
import { CurseForgeService } from "./curseforge-service";

const MODRINTH_API_V2_BASE = "https://api.modrinth.com/v2";
const MODRINTH_API_V3_BASE = "https://api.modrinth.com/v3";
const CURSEFORGE_API_BASE = "https://api.curseforge.com/v1";
const VXL_STUDIOS_ORG_ID = "bGnwiijo";

interface OrganizationProject {
  id: string;
  [key: string]: unknown;
}

export class VXLStudiosService {
  /**
   * Fetch VXL Studios projects from Modrinth using V3 API for organization filtering
   * Step 1: Get project IDs from organization endpoint (V3)
   * Step 2: Fetch full project details using bulk API (V2)
   * Step 3: Fetch version details for each project
   */
  static async getVXLStudiosModrinthProjects(): Promise<ModrinthProject[]> {
    try {
      // Step 1: Fetch project IDs from organization endpoint using V3 API
      const orgUrl = `${MODRINTH_API_V3_BASE}/organization/${VXL_STUDIOS_ORG_ID}/projects`;
      console.log("[VXLStudiosService] Fetching Modrinth organization projects from:", orgUrl);
      
      const orgResponse = await fetch(orgUrl);
      if (!orgResponse.ok) {
        throw new Error(`Failed to fetch organization projects: ${orgResponse.statusText}`);
      }

      const orgProjects = await orgResponse.json() as OrganizationProject[];
      const projectIds = orgProjects.map(p => p.id);
      console.log("[VXLStudiosService] Found Modrinth project IDs:", projectIds);

      if (projectIds.length === 0) {
        console.log("[VXLStudiosService] No projects found for VXL Studios organization");
        return [];
      }

      // Step 2: Fetch full project details using bulk API (V2)
      const idsParam = encodeURIComponent(JSON.stringify(projectIds));
      const projectsUrl = `${MODRINTH_API_V2_BASE}/projects?ids=${idsParam}`;
      
      console.log("[VXLStudiosService] Fetching full Modrinth project details from:", projectsUrl);
      
      const projectsResponse = await fetch(projectsUrl);
      if (!projectsResponse.ok) {
        const errorText = await projectsResponse.text();
        throw new Error(`Failed to fetch projects: ${projectsResponse.statusText} - ${errorText}`);
      }

      const projects = await projectsResponse.json();
      console.log("[VXLStudiosService] Received Modrinth projects:", projects);
      
      // Step 3: Fetch version details for each project
      const projectsWithVersions = await Promise.all(
        (projects as ModrinthProject[]).map(async (project) => {
          try {
            const versionsUrl = `${MODRINTH_API_V2_BASE}/project/${project.id}/version`;
            const versionsResponse = await fetch(versionsUrl);
            if (versionsResponse.ok) {
              const versions = await versionsResponse.json();
              return { ...project, versions };
            }
          } catch (error) {
            console.warn(`[VXLStudiosService] Failed to fetch versions for project ${project.id}:`, error);
          }
          return { ...project, versions: [] };
        })
      );
      
      return projectsWithVersions;
    } catch (error) {
      console.error("[VXLStudiosService] Error fetching Modrinth projects:", error);
      throw error;
    }
  }

  /**
   * Fetch VXL Studios projects from CurseForge
   * Uses the CurseForgeService which handles API authentication via Tauri backend
   */
  static async getVXLStudiosCurseForgeProjects(modIds: number[]): Promise<CurseForgeMod[]> {
    try {
      if (modIds.length === 0) {
        console.log("[VXLStudiosService] No CurseForge mod IDs provided");
        return [];
      }

      console.log("[VXLStudiosService] Fetching CurseForge projects with IDs:", modIds);
      
      const response = await CurseForgeService.getModsByIds(modIds, true);
      console.log("[VXLStudiosService] Received CurseForge projects:", response);
      
      return response.data || [];
    } catch (error) {
      console.error("[VXLStudiosService] Error fetching CurseForge projects:", error);
      throw error;
    }
  }

  /**
   * Get a specific Modrinth project by ID
   */
  static async getModrinthProjectById(projectId: string): Promise<ModrinthProject> {
    try {
      const response = await fetch(
        `${MODRINTH_API_V2_BASE}/project/${projectId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      const project = await response.json();
      return project as ModrinthProject;
    } catch (error) {
      console.error("[VXLStudiosService] Error fetching Modrinth project:", error);
      throw error;
    }
  }

  /**
   * Get a specific CurseForge project by ID
   */
  static async getCurseForgeProjectById(projectId: number): Promise<CurseForgeMod> {
    try {
      const response = await fetch(
        `${CURSEFORGE_API_BASE}/mods/${projectId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch CurseForge project: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data as CurseForgeMod;
    } catch (error) {
      console.error("[VXLStudiosService] Error fetching CurseForge project:", error);
      throw error;
    }
  }
}
