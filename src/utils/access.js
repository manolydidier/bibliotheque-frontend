// src/utils/access.js
export function computeRights(permissions = [], roles = [], user = {}) {
  const merge = (arr) => (Array.isArray(arr) ? arr : []);
  const allPerms = [...merge(permissions), ...merge(user?.permissions)];
  const allRoles = [...merge(roles), ...merge(user?.roles)];

  const hasModWord  = (s) => /(moderateur|modérateur|moderator|moderate|approver|approve|manage|manager|gerer|gérer)/i.test(String(s||""));
  const hasAdminWord= (s) => /(admin(istrateur)?|owner|super)/i.test(String(s||""));

  const isModerator =
    allPerms.some(p => String(p?.resource||"").toLowerCase()==="comments" && (hasModWord(p?.name) || hasAdminWord(p?.name))) ||
    allRoles.some(r => hasModWord(r?.name || r) || hasAdminWord(r?.name || r));

  const isAdmin =
    allRoles.some(r => hasAdminWord(r?.name || r)) ||
    allPerms.some(p => hasAdminWord(p?.name));

  const canDeleteAny =
    isAdmin || isModerator ||
    allPerms.some(p => String(p?.resource||"").toLowerCase()==="comments" && /(supprimer|delete|remove)/i.test(String(p?.name||"")));

  return { isModerator, isAdmin, canDeleteAny };
}
