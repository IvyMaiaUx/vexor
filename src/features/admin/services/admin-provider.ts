import type { IAdminDataProvider } from "../types";
import { createSupabaseAdminProvider } from "../data/supabase-admin-provider";

export { createSupabaseAdminProvider };

/**
 * Live administrative data provider.
 * Every read and mutation goes through the authenticated `/api/admin/*` routes,
 * which authorize the caller on the server and execute Supabase RPCs / RLS queries.
 */
export const adminDataProvider: IAdminDataProvider = createSupabaseAdminProvider();
