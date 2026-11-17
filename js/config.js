/*
 * fantaPLASTIC – connexion à Supabase
 *
 * À remplir avec les infos du projet Supabase (Project Settings > API) :
 *   - supabaseUrl     : la « Project URL », du type https://abcdefghijkl.supabase.co
 *   - supabaseAnonKey : la clé « anon public » (ou « publishable » sur les projets récents)
 *
 * Cette clé est faite pour être visible dans le navigateur : ce sont les règles RLS de
 * supabase/schema.sql qui protègent les données. Ne JAMAIS mettre ici la clé
 * « service_role » ou « secret » : elle donne tous les droits sur la base.
 *
 * Tant que c'est vide, l'appli tourne en démo locale (données dans le navigateur).
 */
window.FANTA_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
