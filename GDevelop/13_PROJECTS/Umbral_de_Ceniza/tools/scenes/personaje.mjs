// Character menus shared by Pueblo and Mazmorra: sheet, attributes and skill loadout.
// Menus are data for menuSystem() (ev_hud.mjs); the handlers below react to the button actions (variable Accion).
import { q, E, ELSE, COMMENT, SET, SETS, IFN, IFS, CMP, SOUND } from "../lib/dsl.mjs";
import { SKILLS } from "./skills.mjs";

const IDX = (n, hab) => `Stat.Cls * 6 + ${(n - 1) * 2} + Save.${hab} - 1`; // index of the skill equipped in slot n
export const costeReinicio = "round(60 + 20 * Save.Nivel)";

export function characterMenus() {
  const skillLine = (n) => `"[${n}]  " + Skills.Nombre[${IDX(n, `Hab${n}`)}] + "\\n" + Skills.Desc[${IDX(n, `Hab${n}`)}]`;
  return {
    personaje: {
      title: "ToUpperCase(Save.Clase) + \"  ·  NIVEL \" + ToString(Save.Nivel)",
      body: "\"Vida: \" + ToString(Stat.VidaMax) + \"      Maná: \" + ToString(Stat.ManaMax) + \"\\nAtaque: \" + ToString(Stat.Atq) + \"      Defensa: \" + ToString(Stat.Def) + \"\\nCrítico: \" + ToString(round(Stat.Crit * 100)) + \"%\\n\\nArma: \" + Save.ArmaNombre + \"\\nArmadura: \" + Save.ArmaduraNombre + \"\\n\\nExperiencia: \" + ToString(Save.Exp) + \" / \" + ToString(Stat.ExpSig)",
      buttons: [{ label: "\"Atributos  (\" + ToString(Save.Puntos) + \" puntos)\"", action: "abrirAtributos" }, { label: q("Habilidades"), action: "abrirHabilidades" },
        { label: q("Diario de Ceniza"), action: "abrirDiario" }],
      close: true,
    },
    atributos: {
      title: q("ATRIBUTOS"),
      body: "\"Puntos disponibles: \" + ToString(Save.Puntos) + \"   (3 por nivel)\\nATQ \" + ToString(Stat.Atq) + \"    VIDA \" + ToString(Stat.VidaMax) + \"    DEF \" + ToString(Stat.Def) + \"\\nCRIT \" + ToString(round(Stat.Crit * 100)) + \"%    MANÁ \" + ToString(Stat.ManaMax) + \"    ENFR. -\" + ToString(round(min(40, Save.AtEsp * 0.6))) + \"%\"",
      buttons: [
        { label: "\"Fuerza  \" + ToString(Save.AtFue) + \"     +1 ATQ\"", action: "atFue" },
        { label: "\"Vitalidad  \" + ToString(Save.AtVit) + \"     +8 VIDA\"", action: "atVit" },
        { label: "\"Destreza  \" + ToString(Save.AtDes) + \"     +0,5% CRIT\"", action: "atDes" },
        { label: "\"Espíritu  \" + ToString(Save.AtEsp) + \"     +3 MANÁ\"", action: "atEsp" },
        { label: `"Reiniciar puntos  (" + ToString(${costeReinicio}) + " oro)"`, action: "atReset" },
      ],
      slotsY: [280, 348, 416, 484, 552], close: true,
    },
    diario: {
      title: "\"DIARIO  ·  \" + ToString(DiarioPag + 1) + \" / \" + ToString(min(13, Save.EtapaMax + 1))",
      body: "Diario.Titulo[DiarioPag] + NewLine() + NewLine() + Diario.Texto[DiarioPag]",
      buttons: [], close: true, arrows: true,
    },
    habilidades: {
      title: q("HABILIDADES"),
      body: `${skillLine(1)} + "\\n\\n" + ${skillLine(2)} + "\\n\\n" + ${skillLine(3)}`,
      buttons: [{ label: q("Cambiar habilidad 1"), action: "hab1" }, { label: q("Cambiar habilidad 2"), action: "hab2" }, { label: q("Cambiar habilidad 3"), action: "hab3" }],
      close: true,
    },
  };
}

/** Story pages (one "Continuar" button each): prologue, stage introduction and chapter ending. */
export function storyMenus() {
  const page = (body) => ({ title: q("HISTORIA"), body, buttons: [{ label: q("Continuar"), action: "cerrar" }], close: false });
  return { prologo: page("Relato.Prologo"), intro: page("Relato.Intro[Etapa]"), final: page("Relato.Final[Etapa]") };
}

/** Handlers for the character menus (put them after the scene's menuSystem group). */
export function characterEvents() {
  const attr = (a) => E([IFS("Accion", "=", q(`at${a}`))], [], [
    E([IFN("Save.Puntos", ">", 0)], [SET(`Save.At${a}`, "+", 1), SET("Save.Puntos", "-", 1), SET("RecalcStats", "=", 1), SET("Guardar", "=", 1),
      SOUND("assets/audio/nivel.wav", 40, 1.6)]),
    ELSE([], [SOUND("assets/audio/herido.wav", 40, 1.4)]),
  ]);
  const swap = (n) => E([IFS("Accion", "=", q(`hab${n}`))], [], [
    COMMENT("Cambia entre la habilidad inicial y la desbloqueada de esta ranura (sólo si tu nivel la permite)."),
    E([IFN(`Save.Hab${n}`, "=", 1), CMP("Save.Nivel", ">=", `Skills.Nivel[Stat.Cls * 6 + ${(n - 1) * 2 + 1}]`)],
      [SET(`Save.Hab${n}`, "=", 2), SET("RecalcStats", "=", 1), SET("Guardar", "=", 1), SOUND("assets/audio/click.wav", 60, 1.3)]),
    ELSE([IFN(`Save.Hab${n}`, "=", 2)], [SET(`Save.Hab${n}`, "=", 1), SET("RecalcStats", "=", 1), SET("Guardar", "=", 1), SOUND("assets/audio/click.wav", 60, 0.9)]),
    ELSE([], [SOUND("assets/audio/herido.wav", 40, 1.4)]),
  ]);
  return [
    COMMENT("Menús del personaje: reparto de atributos, cambio de habilidades y accesos desde la ficha."),
    E([IFS("Accion", "=", q("abrirPersonaje"))], [SETS("MenuAbrir", "=", q("personaje"))]),
    E([IFS("Accion", "=", q("abrirAtributos"))], [SETS("MenuAbrir", "=", q("atributos"))]),
    E([IFS("Accion", "=", q("abrirHabilidades"))], [SETS("MenuAbrir", "=", q("habilidades"))]),
    E([IFS("Accion", "=", q("abrirDiario"))], [SETS("MenuAbrir", "=", q("diario"))]),
    attr("Fue"), attr("Vit"), attr("Des"), attr("Esp"),
    E([IFS("Accion", "=", q("atReset"))], [], [
      E([CMP("Save.Oro", ">=", costeReinicio), CMP("Save.AtFue + Save.AtVit + Save.AtDes + Save.AtEsp", ">", 0)], [
        SET("Save.Oro", "-", costeReinicio), SET("Save.AtFue", "=", 0), SET("Save.AtVit", "=", 0), SET("Save.AtDes", "=", 0), SET("Save.AtEsp", "=", 0),
        SET("RecalcStats", "=", 1), SET("Guardar", "=", 1), SOUND("assets/audio/portal.wav", 50, 1.4)]),
      ELSE([], [SOUND("assets/audio/herido.wav", 40, 1.4)]),
    ]),
    swap(1), swap(2), swap(3),
    COMMENT("Diario: las flechas pasan las páginas (entradas desbloqueadas = etapa máxima alcanzada + 1)."),
    E([IFS("Accion", "=", q("flecha-1")), IFS("Menu", "=", q("diario"))], [SET("DiarioPag", "=", "max(0, DiarioPag - 1)")]),
    E([IFS("Accion", "=", q("flecha1")), IFS("Menu", "=", q("diario"))], [SET("DiarioPag", "=", "min(min(12, Save.EtapaMax), DiarioPag + 1)")]),
  ];
}
