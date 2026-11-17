/*
 * fantaPLASTIC – connexion à Supabase
 *
 * À remplir avec les infos du projet Supabase (Project Settings > API) :
 *   - supabaseUrl     : la « Project URL », du type https://abcdefghijkl.supabase.co
 *   - supabaseAnonKey : la clé « publishable » (sb_publishable_…). L'ancienne clé « anon »
 *     marche aussi, mais Supabase retire ces anciennes clés début 2027.
 *
 * Projet : organisation « fantaPLASTIC », projet « fantaplastic », région West EU (Paris).
 *
 * Cette clé est faite pour être visible dans le navigateur : ce sont les règles RLS de
 * supabase/schema.sql qui protègent les données. Ne JAMAIS mettre ici la clé
 * « service_role » ou « secret » : elle donne tous les droits sur la base.
 *
 * Tant que c'est vide, l'appli tourne en démo locale (données dans le navigateur).
 */
window.FANTA_CONFIG = {
  supabaseUrl: 'https://ddrduyrtgfiqjgahfgdk.supabase.co',
  supabaseAnonKey: 'sb_publishable_C5QQmQmwMXX9zlXEqPNYbg_ducqZKrp'
};
