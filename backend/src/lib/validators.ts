export function validateMultiple(quantiteDemandee: number, multipleCommande: number) {
  return quantiteDemandee % multipleCommande === 0;
}

export function parseEmplacementCode(code: string) {
  const m = code.match(/^([A-J])-(\d{3})-(\d{3})$/);
  if (!m) throw new Error('Code emplacement invalide');
  const niveau = Number(m[2]);
  const travee = Number(m[3]);
  if (niveau < 0 || niveau > 5 || travee < 0 || travee > 70) throw new Error('Niveau/travée invalides');
  return { allee: m[1], niveau, travee };
}
