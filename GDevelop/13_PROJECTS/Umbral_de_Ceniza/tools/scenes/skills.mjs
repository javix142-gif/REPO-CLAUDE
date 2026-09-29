// Skill data: 3 slots per class, each with two skills (the second one unlocks at levels 4 / 8 / 12).
// The hero equips one skill per slot (Save.Hab1..3 = 1 or 2); the loadout menu switches between them.
export const SKILLS = {
  Guerrero: [
    [{ n: "Torbellino", d: "3 tajos en área a tu alrededor", cost: 12, cd: 5, lvl: 1 },
      { n: "Ciclón de acero", d: "6 tajos giratorios, área enorme", cost: 22, cd: 8, lvl: 8 }],
    [{ n: "Embestida", d: "Carga invulnerable con golpe fuerte", cost: 14, cd: 6, lvl: 1 },
      { n: "Salto sísmico", d: "Saltas y aplastas el suelo con onda", cost: 18, cd: 8, lvl: 4 }],
    [{ n: "Grito de guerra", d: "Cura 25% y +35% de ataque 8 s", cost: 20, cd: 14, lvl: 1 },
      { n: "Espada giratoria", d: "Lanza una espada que perfora", cost: 24, cd: 10, lvl: 12 }],
  ],
  Maga: [
    [{ n: "Nova de escarcha", d: "Onda de hielo que congela", cost: 16, cd: 5, lvl: 1 },
      { n: "Tormenta de rayos", d: "3 rayos caen sobre los más cercanos", cost: 26, cd: 9, lvl: 8 }],
    [{ n: "Meteoro", d: "Cae delante y explota", cost: 24, cd: 7, lvl: 1 },
      { n: "Aura ígnea", d: "Anillo de fuego que quema 4,5 s", cost: 22, cd: 12, lvl: 4 }],
    [{ n: "Barrera arcana", d: "-65% de daño 6 s y cura 15%", cost: 20, cd: 14, lvl: 1 },
      { n: "Cataclismo", d: "Explosión enorme en toda la pantalla", cost: 45, cd: 22, lvl: 12 }],
  ],
  Arquera: [
    [{ n: "Disparo triple", d: "3 flechas perforantes en abanico", cost: 10, cd: 3.5, lvl: 1 },
      { n: "Flecha explosiva", d: "Explota al impactar", cost: 18, cd: 6, lvl: 8 }],
    [{ n: "Lluvia de flechas", d: "10 flechas caen delante", cost: 18, cd: 7, lvl: 1 },
      { n: "Ráfaga", d: "8 flechas rápidas hacia donde apuntas", cost: 16, cd: 6, lvl: 4 }],
    [{ n: "Paso sombrío", d: "Salto atrás invulnerable, cura 10%", cost: 12, cd: 6, lvl: 1 },
      { n: "Disparo celestial", d: "Flecha gigante que atraviesa todo", cost: 26, cd: 12, lvl: 12 }],
  ],
};

export const CLASES = ["Guerrero", "Maga", "Arquera"];

/** Flat arrays indexed by  classIndex * 6 + slot * 2 + (variant - 1). */
export function skillTables() {
  const rows = CLASES.flatMap((c) => SKILLS[c].flat());
  return { names: rows.map((r) => r.n), descs: rows.map((r) => r.d), levels: rows.map((r) => r.lvl) };
}
