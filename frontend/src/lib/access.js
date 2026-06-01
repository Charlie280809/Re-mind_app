export function hasPremiumAccess(profile) {
  return Boolean(profile?.is_premium) || Boolean(profile?.company_id);
}

export function getPlanLabel(profile) {
  if (profile?.company_id) {
    return profile?.company_role === "admin" ? "Bedrijfslicentie (admin)" : "Bedrijfslicentie";
  }

  if (profile?.is_premium) {
    return "Premium plan";
  }

  return "Basis plan";
}