// Scene "Pueblo": hub with blacksmith, alchemist, dungeon portal, sign and training dummy.
import { q, C, A, NOT, OR, AND, E, ELSE, FOREACH, COMMENT, GROUP, LINK, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP,
  ANIM, HIDE, SHOW, TEXT, SETX, SOUND, MUSIC, JUST_BEGINS, KEY_JUST, TAP_ON, GOTO, OPACITY } from "../lib/dsl.mjs";
import { inst, layer, vnum, vstr, tiled, sprite, text } from "../lib/objects.mjs";
import { gameplaySceneVariables, hudInstances, menuInstances, SUELO } from "./common.mjs";
import { menuSystem } from "./ev_hud.mjs";
import { toast } from "./ev_combate.mjs";

const ANCHO = 4200;

export function puebloObjects(m) {
  return [
    tiled("CieloPueblo", "assets/entorno/cielo_pueblo.png", 2400, 720),
    tiled("CasasPueblo", "assets/entorno/casas_pueblo.png", 2400, 510),
    sprite(m, "NPC", { variables: [vstr("Rol", "Herrera")] }),
    sprite(m, "Farol"), sprite(m, "Forja"), sprite(m, "Puesto"), sprite(m, "Pozo"), sprite(m, "Letrero"), sprite(m, "Arbol"),
    sprite(m, "Barril"), sprite(m, "Caja"),
    text("TextoNombre", { size: 22, color: [255, 224, 150], variables: [vstr("Rol", ""), vnum("CX", 0)] }),
  ];
}

function layout() {
  const I = [];
  I.push(inst("Suelo", -200, SUELO, { w: ANCHO + 400, h: 96, z: 2 }));
  I.push(inst("Relleno", -200, SUELO + 96, { w: ANCHO + 400, h: 288, z: 1 }));
  I.push(inst("Muro", -192, -400, { w: 192, h: 1000, z: 3 }));
  I.push(inst("Muro", ANCHO, -400, { w: 192, h: 1000, z: 3 }));
  I.push(inst("CieloPueblo", 0, 0, { layer: "Fondo", w: 2400, h: 720 }));
  I.push(inst("CasasPueblo", 0, SUELO - 510, { layer: "Medio", w: 2400, h: 510 }));
  I.push(inst("Plataforma", 1450, 450, { w: 192, h: 30, z: 4 }));
  I.push(inst("Plataforma", 2880, 440, { w: 288, h: 30, z: 4 }));
  const props = [["Letrero", 200, SUELO - 96], ["Farol", 380, SUELO - 192], ["Forja", 880, SUELO - 120], ["Barril", 1240, SUELO - 66],
    ["Farol", 1350, SUELO - 192], ["Pozo", 1700, SUELO - 114], ["Puesto", 1990, SUELO - 108], ["Caja", 2420, SUELO - 60],
    ["Farol", 2320, SUELO - 192], ["Arbol", 2720, SUELO - 216], ["Farol", 3250, SUELO - 192], ["Barril", 3780, SUELO - 66],
    ["Farol", 3980, SUELO - 192]];
  props.forEach(([o, x, y]) => I.push(inst(o, x, y, { z: 3 })));
  I.push(inst("Enemigo", 620, SUELO, { z: 8, vars: [vstr("Tipo", "Maniqui"), vnum("Init", 1)] }));
  I.push(inst("NPC", 1090, SUELO, { z: 9, vars: [vstr("Rol", "herrera")] }));
  I.push(inst("NPC", 2190, SUELO, { z: 9, vars: [vstr("Rol", "alquimista")] }));
  I.push(inst("Portal", 3520, SUELO, { z: 3 }));
  const names = [["herrera", 1090, 430], ["alquimista", 2190, 430], ["portal", 3520, 330], ["letrero", 236, 450], ["maniqui", 620, 420]];
  names.forEach(([rol, x, y]) => I.push(inst("TextoNombre", x, y, { z: 30, vars: [vstr("Rol", rol), vnum("CX", x)] })));
  I.push(inst("Jugador", 480, SUELO - 4, { z: 20 }));
  I.push(inst("PintorBarras", 0, 0, { z: 45 }));
  I.push(...hudInstances());
  I.push(inst("BotonAccion", 1192, 318, { layer: "HUD", z: 3 }));
  I.push(...menuInstances());
  return I;
}

function start() {
  return GROUP("Inicio del pueblo", [
    E([JUST_BEGINS()], [
      SET("MundoAncho", "=", ANCHO), MUSIC("assets/audio/musica_pueblo.wav", 45), A("SceneBackground", q("12;10;30")),
      ANIM("Portal", q("Mazmorra")), HIDE("BotonAccion"), SET("Guardar", "=", 1),
    ], [
      E([OIFS("NPC", "Rol", "=", q("herrera"))], [ANIM("NPC", q("Herrera_Idle"))]),
      E([OIFS("NPC", "Rol", "=", q("alquimista"))], [ANIM("NPC", q("Alquimista_Idle")), A("FlippableCapability::FlippableBehavior::FlipX", "NPC", "Flippable", "yes")]),
      E([OIFS("Enemigo", "Tipo", "=", q("Maniqui"))], [OSET("Enemigo", "HPMax", "=", 9999), OSET("Enemigo", "HP", "=", 9999), OSET("Enemigo", "Def", "=", 0),
        OSETS("Enemigo", "Estado", "=", q("maniqui")), ANIM("Enemigo", q("Maniqui_Idle")), A("ActivateBehavior", "Enemigo", "Plataformero", "no")]),
      E([OIFS("TextoNombre", "Rol", "=", q("herrera"))], [TEXT("TextoNombre", q("Herrera"))]),
      E([OIFS("TextoNombre", "Rol", "=", q("alquimista"))], [TEXT("TextoNombre", q("Alquimista"))]),
      E([OIFS("TextoNombre", "Rol", "=", q("portal"))], [TEXT("TextoNombre", q("Portal a las mazmorras"))]),
      E([OIFS("TextoNombre", "Rol", "=", q("letrero"))], [TEXT("TextoNombre", q("Consejos"))]),
      E([OIFS("TextoNombre", "Rol", "=", q("maniqui"))], [TEXT("TextoNombre", q("Maniquí de práctica"))]),
      E([IFS("Juego.Origen", "=", q("mazmorra"))], [A("SetXY", "Jugador", "=", 3380, "=", SUELO - 4), OSET("Jugador", "Dir", "=", -1)]),
      E([IFS("Juego.Origen", "=", q("nuevo"))], toast(q("¡Bienvenido a Villa Ceniza! Visita el portal para bajar a las mazmorras"), q("255;224;150"), 4)),
      E([], [SETS("Juego.Origen", "=", q(""))]),
    ]),
    E([], [SETX("TextoNombre", "=", "TextoNombre.CX - TextoNombre.Width() / 2")]),
  ]);
}

function interaction() {
  return GROUP("Interacción con NPCs", [
    E([], [SETS("Cerca", "=", q(""))]),
    E([C("Distance", "Jugador", "NPC", 160)], [SETS("Cerca", "=", "NPC.Rol")]),
    E([C("Distance", "Jugador", "Portal", 190)], [SETS("Cerca", "=", q("portal"))]),
    E([C("Distance", "Jugador", "Letrero", 150)], [SETS("Cerca", "=", q("letrero"))]),
    E([NOT(IFS("Cerca", "=", q(""))), IFS("Menu", "=", q(""))], [SHOW("BotonAccion")]),
    ELSE([], [HIDE("BotonAccion")]),
    E([OIFS("TextoNombre", "Rol", "=", "Cerca")], [OPACITY("TextoNombre", 255)]),
    E([OIFS("TextoNombre", "Rol", "!=", "Cerca")], [OPACITY("TextoNombre", 150)]),
    E([OR(IFN("In.Acc", "=", 1), AND(...TAP_ON("BotonAccion"), C("Visible", "BotonAccion"))), NOT(IFS("Cerca", "=", q(""))), IFS("Menu", "=", q("")),
      IFS("MenuAbrir", "=", q(""))], [SETS("MenuAbrir", "=", "Cerca")]),
    E([OR(AND(...TAP_ON("Retrato")), KEY_JUST("c")), IFS("Menu", "=", q("")), IFS("MenuAbrir", "=", q(""))], [SETS("MenuAbrir", "=", q("personaje"))]),
    E([OR(AND(...TAP_ON("BotonPausa")), KEY_JUST("Escape"), KEY_JUST("p")), IFS("Menu", "=", q("")), IFS("MenuAbrir", "=", q(""))], [SETS("MenuAbrir", "=", q("pausa"))]),
  ]);
}

function cameraEvents() {
  return GROUP("Cámara y parallax", [
    E([], [
      A("SetCameraCenterX", "=", "lerp(CameraX(), clamp(Jugador.X(), CameraWidth() / 2, MundoAncho - CameraWidth() / 2), min(1, 7 * TimeDelta()))"),
      A("SetCameraCenterY", "=", 360),
      A("TiledSpriteObject::XOffset", "CieloPueblo", "=", "CameraX() * 0.08"),
      A("TiledSpriteObject::XOffset", "CasasPueblo", "=", "CameraX() * 0.5"),
    ]),
  ]);
}

const costForja = "round(60 * pow(1.55, Save.Forja))";
const costRefuerzo = "round(50 * pow(1.55, Save.Refuerzo))";

function shops() {
  const noGold = () => [SOUND("assets/audio/herido.wav", 40, 1.4), ...toast(q("No tienes suficiente oro"), q("255;120;120"), 1.6)];
  return GROUP("Tiendas y portal", [
    E([IFN("Save.EtapaSel", "<=", 5)], [SETS("NombreEtapa", "=", q("Catacumbas Olvidadas"))]),
    ELSE([], [SETS("NombreEtapa", "=", q("Fortaleza Carmesí"))]),
    menuSystem({
      herrera: { title: q("HERRERÍA"),
        body: "\"Arma: \" + Save.ArmaNombre + \"  (+\" + ToString(Save.ArmaBonus) + \" ATQ)\\nArmadura: \" + Save.ArmaduraNombre + \"  (+\" + ToString(Save.ArmaduraBonus) + \" VIDA)\\n\\nForja nivel \" + ToString(Save.Forja) + \":  +\" + ToString(Save.Forja * 3) + \" ATQ\\nRefuerzo nivel \" + ToString(Save.Refuerzo) + \":  +\" + ToString(Save.Refuerzo * 15) + \" VIDA  +\" + ToString(Save.Refuerzo) + \" DEF\\n\\nOro: \" + ToString(Save.Oro)",
        buttons: [{ label: `"Forjar arma  (" + ToString(${costForja}) + " oro)"`, action: "forjar" },
          { label: `"Reforzar armadura  (" + ToString(${costRefuerzo}) + " oro)"`, action: "reforzar" }], close: true },
      alquimista: { title: q("ALQUIMISTA"),
        body: "\"Pociones: \" + ToString(Save.Pociones) + \" / 20\\nCada poción restaura el 40% de la vida.\\n\\nOro: \" + ToString(Save.Oro)",
        buttons: [{ label: q("Comprar 1 poción  (30 oro)"), action: "pocion1" }, { label: q("Comprar 5 pociones  (140 oro)"), action: "pocion5" }], close: true },
      portal: { title: q("PORTAL"),
        body: "\"Etapa \" + ToString(Save.EtapaSel) + \" de 10\\n\" + NombreEtapa + \"\\n\\nNivel recomendado: \" + ToString(Save.EtapaSel * 2 - 1) + \"\\nTu nivel: \" + ToString(Save.Nivel) + \"\\n\\nEtapas desbloqueadas: \" + ToString(Save.EtapaMax)",
        buttons: [{ label: q("Entrar a la mazmorra"), action: "entrar" }], close: true, arrows: true },
      letrero: { title: q("CONSEJOS"),
        body: q("· Mantén pulsado ATACAR para encadenar golpes.\n· Las habilidades gastan maná, que se regenera solo.\n· Limpia cada sala para abrir la siguiente puerta.\n· El equipo mejor que el tuyo se equipa solo;\n   el peor se vende automáticamente.\n· Mejora tu arma y armadura en la herrería."),
        buttons: [], close: true },
      personaje: { title: "ToUpperCase(Save.Clase) + \"  ·  NIVEL \" + ToString(Save.Nivel)",
        body: "\"Vida: \" + ToString(Stat.VidaMax) + \"      Maná: \" + ToString(Stat.ManaMax) + \"\\nAtaque: \" + ToString(Stat.Atq) + \"      Defensa: \" + ToString(Stat.Def) + \"\\nCrítico: \" + ToString(round(Stat.Crit * 100)) + \"%\\n\\nArma: \" + Save.ArmaNombre + \"\\nArmadura: \" + Save.ArmaduraNombre + \"\\n\\nExperiencia: \" + ToString(Save.Exp) + \" / \" + ToString(Stat.ExpSig)",
        buttons: [], close: true },
      pausa: { title: q("PAUSA"), body: q("Tu progreso se guarda automáticamente."),
        buttons: [{ label: q("Continuar"), action: "cerrar" }, { label: q("Salir al título"), action: "titulo" }], close: true },
    }),
    E([IFS("Accion", "=", q("forjar"))], [], [
      E([CMP("Save.Oro", ">=", costForja)], [SET("Save.Oro", "-", costForja), SET("Save.Forja", "+", 1), SET("RecalcStats", "=", 1), SET("Guardar", "=", 1),
        SOUND("assets/audio/impacto_suelo.wav", 50, 1.6), SOUND("assets/audio/botin.wav", 60), ...toast(q("¡Arma forjada!  +3 ATQ"), q("255;214;90"), 1.8)]),
      ELSE([], noGold()),
    ]),
    E([IFS("Accion", "=", q("reforzar"))], [], [
      E([CMP("Save.Oro", ">=", costRefuerzo)], [SET("Save.Oro", "-", costRefuerzo), SET("Save.Refuerzo", "+", 1), SET("RecalcStats", "=", 1), SET("Guardar", "=", 1),
        SOUND("assets/audio/impacto_suelo.wav", 50, 1.4), SOUND("assets/audio/botin.wav", 60), ...toast(q("¡Armadura reforzada!  +15 VIDA  +1 DEF"), q("255;214;90"), 1.8)]),
      ELSE([], noGold()),
    ]),
    E([IFS("Accion", "=", q("pocion1"))], [], [
      E([IFN("Save.Oro", ">=", 30), IFN("Save.Pociones", "<", 20)], [SET("Save.Oro", "-", 30), SET("Save.Pociones", "+", 1), SET("Guardar", "=", 1),
        SOUND("assets/audio/pocion.wav", 60)]),
      ELSE([], noGold()),
    ]),
    E([IFS("Accion", "=", q("pocion5"))], [], [
      E([IFN("Save.Oro", ">=", 140), IFN("Save.Pociones", "<=", 15)], [SET("Save.Oro", "-", 140), SET("Save.Pociones", "+", 5), SET("Guardar", "=", 1),
        SOUND("assets/audio/pocion.wav", 60)]),
      ELSE([], noGold()),
    ]),
    E([IFS("Accion", "=", q("flecha-1"))], [SET("Save.EtapaSel", "=", "clamp(Save.EtapaSel - 1, 1, Save.EtapaMax)")]),
    E([IFS("Accion", "=", q("flecha1"))], [SET("Save.EtapaSel", "=", "clamp(Save.EtapaSel + 1, 1, Save.EtapaMax)")]),
    E([IFS("Accion", "=", q("entrar"))], [SET("Guardar", "=", 1), SOUND("assets/audio/portal.wav", 80), GOTO("Mazmorra")]),
    E([IFS("Accion", "=", q("titulo"))], [SET("Guardar", "=", 1), GOTO("Titulo")]),
  ]);
}

export function puebloScene() {
  return {
    name: "Pueblo",
    background: [12, 10, 30],
    layers: [layer("Fondo"), layer("Medio"), layer("", { base: true }), layer("HUD"), layer("Menu", { visible: false })],
    variables: [...gameplaySceneVariables(), vstr("Cerca", ""), vstr("NombreEtapa", "")],
    instances: layout(),
    events: [
      COMMENT("PUEBLO — zona segura: herrera, alquimista, portal a las mazmorras y maniquí de práctica."),
      start(),
      LINK("EV_Jugador"),
      LINK("EV_Combate"),
      interaction(),
      cameraEvents(),
      LINK("EV_HUD"),
      shops(),
    ],
  };
}
