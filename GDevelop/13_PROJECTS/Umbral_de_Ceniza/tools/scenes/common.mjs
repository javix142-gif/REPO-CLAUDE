// Shared definitions: global objects, global/scene variables, HUD and menu layouts.
import { sprite, simpleSprite, text, tiled, panel, painter, joystick, platformer, platform, anchor,
  multitouchButton, platformerMapper, vnum, vstr, vstruct, varr, inst } from "../lib/objects.mjs";
import { skillTables } from "./skills.mjs";
import { PROLOGO, INTROS, FINALES, DIARIO, NUM_ETAPAS, JEFES, poolString } from "./historia.mjs";

export const W = 1280;
export const H = 720;
export const SUELO = 600;
export const FONT = "fonts/PixelifySans-SemiBold.ttf";
export const FONT_TITLE = "fonts/Jersey10-Regular.ttf";
export const CLASES = ["Guerrero", "Maga", "Arquera"];

export const RAREZA_COL = ["255;255;255", "225;225;225", "90;170;255", "255;215;70", "196;110;255", "255;145;45"];

// ------------------------------------------------------------------ variables
export const globalVariables = () => [
  vstruct("Save", [
    vstr("Clase", ""), vnum("Nivel", 1), vnum("Exp", 0), vnum("Oro", 0), vnum("Pociones", 3),
    vnum("ArmaBonus", 0), vnum("ArmaRareza", 0), vstr("ArmaNombre", "Arma de novato"),
    vnum("ArmaduraBonus", 0), vnum("ArmaduraRareza", 0), vstr("ArmaduraNombre", "Ropa de viaje"),
    vnum("Forja", 0), vnum("Refuerzo", 0), vnum("EtapaMax", 1), vnum("EtapaSel", 1), vnum("Version", 1), vnum("Auto", 0),
    vnum("Puntos", 0), vnum("PuntosExtra", 0), vnum("AtFue", 0), vnum("AtVit", 0), vnum("AtDes", 0), vnum("AtEsp", 0),
    vnum("Hab1", 1), vnum("Hab2", 1), vnum("Hab3", 1), vnum("Historia", 0), vnum("ArenaMax", 0), vnum("IntroVista", 0),
  ]),
  vstruct("Stat", [
    vnum("VidaMax", 100), vnum("ManaMax", 50), vnum("Atq", 10), vnum("Def", 2), vnum("Crit", 0.1),
    vnum("RegenMP", 3), vnum("ExpSig", 50), vnum("CdAtk", 0.4), vnum("HitT", 0.06),
    vnum("Cd1Max", 5), vnum("Cd2Max", 6), vnum("Cd3Max", 14), vnum("Costo1", 10), vnum("Costo2", 12), vnum("Costo3", 20),
    vnum("AutoRango", 85), vnum("AutoAlto", 240), vnum("Cls", 0),
  ]),
  vstruct("Rarezas", [
    varr("F", ["", "Común", "Mágica", "Rara", "Épica", "Legendaria"]),
    varr("M", ["", "Común", "Mágico", "Raro", "Épico", "Legendario"]),
    varr("Col", RAREZA_COL),
  ]),
  vstruct("Juego", [vstr("Origen", ""), vnum("HayPartida", 0), vstr("Modo", "campana")]),
  vstruct("Skills", [varr("Nombre", skillTables().names), varr("Desc", skillTables().descs), varr("Nivel", skillTables().levels)]),
  vstruct("Relato", [vstr("Prologo", PROLOGO), varr("Intro", INTROS),
    varr("Final", Array.from({ length: NUM_ETAPAS + 1 }, (_, i) => FINALES[i] || "")),
    varr("Pool", Array.from({ length: NUM_ETAPAS + 1 }, (_, i) => (i ? poolString(i) : ""))),
    varr("Jefe", JEFES.map((j) => (j ? j.nombre : ""))), varr("JefeTipo", JEFES.map((j) => (j ? j.tipo : ""))),
    varr("JefeElite", JEFES.map((j) => (j && j.elite ? 1 : 0))),
  ]),
  vstruct("Diario", [varr("Titulo", DIARIO.map((e) => e[0])), varr("Texto", DIARIO.map((e) => e[1]))]),
];

/** Scene variables shared by Pueblo and Mazmorra (used by the external events). */
export const gameplaySceneVariables = () => [
  vstruct("In", [vnum("Atk"), vnum("S1"), vnum("S2"), vnum("S3"), vnum("Pot"), vnum("Acc"), vnum("SaltoJ"), vnum("AX"), vnum("AY"),
    vnum("Aim")]),
  vnum("RecalcStats", 1), vnum("Guardar", 0), vstr("Menu", ""), vnum("Temblor", 0), vnum("FuerzaTemblor", 0),
  vnum("SueloY", SUELO), vnum("NextId", 1), vnum("CdPot", 0), vnum("CamMin", 0), vnum("CamMax", 0),
  vnum("MundoAncho", 4200), vnum("CurarTodo", 1), vnum("Vivos", 0), vnum("Mult", 1), vnum("Etapa", 1), vnum("JugAire", 0), vnum("SplitPend", 0), vnum("SplitX", 0), vstr("InvTipo", "Esqueleto"),
  vstruct("Tmp", [vnum("Dano"), vnum("Crit"), vnum("Buff"), vnum("DanoJ"), vstr("Json"), vnum("Rareza"), vnum("Valor"),
    vnum("Oro"), vnum("Ang"), vnum("N"), vstr("Nombre"), vstr("Tipo"), vnum("X"), vnum("Y"), vnum("R"), vnum("Cuantos"),
    vnum("Coste"), vstr("Clase"), vnum("A"), vnum("DX"), vnum("DY"), vnum("Perch"), vnum("PX0"), vnum("PX1"), vnum("PY")]),
  vstr("Accion", ""), vstr("MenuAbrir", ""), vnum("MenuFrames", 0), vnum("BufHab", 0), vnum("BufT", 0), vnum("DiarioPag", 0),
  vstruct("Stats", [vnum("Golpes"), vnum("Muertes"), vnum("DanoTotal"), vnum("Oro"), vnum("DanoRecibido"), vnum("Botin"),
    vnum("Exp"), vnum("Habilidades"), vnum("Pociones"), vnum("Cofres")]),
];

// ------------------------------------------------------------------ objects
export function globalObjects(m) {
  const hudBtn = (name, id, h = 2) => sprite(m, name, { behaviors: [multitouchButton(id), anchor(h, 0)] });
  return [
    sprite(m, "Jugador", {
      behaviors: [platformer("PlatformerObject"), platformerMapper("Mapeo")],
      variables: [vnum("HP", 100), vnum("MP", 50), vnum("Dir", 1), vstr("Estado", "libre"), vstr("Hab", ""), vnum("Inv"),
        vnum("Cd1"), vnum("Cd2"), vnum("Cd3"), vnum("CdAtk"), vnum("Buff"), vnum("Escudo"), vnum("Accion"), vnum("Paso"),
        vnum("Golpeo"), vnum("Saltos"), vnum("Combo"), vnum("ComboT"), vnum("Aim"), vnum("AimA"), vnum("PotF", 1), vnum("PotS", 1),
        vnum("Final"), vnum("Aura"), vnum("AuraT")],
    }),
    simpleSprite("GolpeJugador", "assets/sistema/caja.png", { origin: [8, 8],
      variables: [vnum("Dano", 1), vnum("Id"), vnum("Vida", 0.1), vnum("Congela"), vnum("Sigue"), vnum("OffX"), vnum("OffY"), vnum("Fuerte")] }),
    simpleSprite("GolpeEnemigo", "assets/sistema/caja.png", { origin: [8, 8], variables: [vnum("Dano", 5), vnum("Vida", 0.12)] }),
    sprite(m, "ProyectilJugador", { variables: [vnum("VX"), vnum("VY"), vnum("Dano", 1), vnum("Vida", 1), vnum("Perfora"),
      vstr("Tipo", ""), vnum("Id"), vnum("Borrar"), vnum("Fuerte")] }),
    sprite(m, "ProyectilEnemigo", { variables: [vnum("VX"), vnum("VY"), vnum("Dano", 5), vnum("Vida", 3), vnum("Cae")] }),
    sprite(m, "Efecto", { variables: [vnum("Vida"), vnum("Sigue"), vnum("OffX"), vnum("OffY")] }),
    text("TextoDano", { size: 30, variables: [vnum("VY", -90), vnum("Vida")] }),
    sprite(m, "Enemigo", {
      behaviors: [platformer("Plataformero", { ignoreDefaultControls: true, maxSpeed: 110, acceleration: 900, deceleration: 1500,
        jumpSpeed: 780 })],
      variables: [vstr("Tipo", "Esqueleto"), vnum("Init"), vnum("HP", 50), vnum("HPMax", 50), vnum("Atq", 5), vnum("Def"),
        vnum("Vel", 100), vstr("Estado", "aparecer"), vnum("Golpeo"), vstr("Golpes", ","), vnum("Congelado"), vnum("Destello"),
        vnum("Exp", 5), vnum("OroMin", 1), vnum("OroMax", 3), vnum("Sala"), vnum("TX"), vnum("TY"), vnum("Lado", 1), vnum("Fase"),
        vnum("Accion"), vnum("Cd"), vnum("CdAtk", 1.5), vnum("Rango", 80), vnum("Windup", 0.25), vnum("DanoPend"), vnum("KBDir"),
        vnum("CongelaPend"), vnum("KB"), vnum("Invoc"), vnum("Furia"), vnum("ProbBotin", 0.1), vnum("FuertePend"), vnum("VX"), vnum("VY"),
        vnum("Fase2"), vnum("SaltoT"), vnum("Percha"), vnum("PX0"), vnum("PX1"), vnum("RayoT"), vnum("Elite"), vnum("Boss"), vstr("Nombre", "")],
    }),
    sprite(m, "Moneda", { variables: [vnum("Valor", 1), vnum("VX"), vnum("VY", -300), vnum("Suelo"), vnum("Edad")] }),
    sprite(m, "OrbeVida", { variables: [vnum("VX"), vnum("VY", -300), vnum("Suelo"), vnum("Edad")] }),
    sprite(m, "Botin", { variables: [vstr("Tipo", "Arma"), vnum("Rareza", 1), vnum("Valor", 1), vstr("Nombre", ""), vnum("VX"),
      vnum("VY", -380), vnum("Suelo"), vnum("Edad")] }),
    painter("PintorBarras"),
    tiled("Suelo", "assets/entorno/suelo_mazmorra.png", 96, 96, { behaviors: [platform("Solido")] }),
    tiled("Relleno", "assets/entorno/relleno_mazmorra.png", 96, 96),
    tiled("Plataforma", "assets/entorno/plataforma_mazmorra.png", 96, 30, { behaviors: [platform("Solido", "Jumpthru")] }),
    tiled("Muro", "assets/entorno/muro_mazmorra.png", 96, 96, { behaviors: [platform("Solido")] }),
    sprite(m, "Puerta", { behaviors: [platform("Solido")], variables: [vnum("Indice", 1), vnum("Abierta", 0)] }),
    sprite(m, "Portal"),
    // HUD
    sprite(m, "MarcoHUD", { behaviors: [anchor(1, 1)] }),
    sprite(m, "BarraVida", { behaviors: [anchor(1, 1)] }),
    sprite(m, "BarraMana", { behaviors: [anchor(1, 1)] }),
    sprite(m, "BarraExp", { behaviors: [anchor(1, 1)] }),
    sprite(m, "Retrato", { behaviors: [anchor(1, 1)] }),
    text("TextoNivel", { size: 26, color: [255, 224, 140] }),
    text("TextoPuntos", { size: 20, color: [140, 255, 170], behaviors: [anchor(1, 1)] }),
    text("TextoVida", { size: 18, behaviors: [anchor(1, 1)] }),
    text("TextoOro", { size: 26, color: [255, 214, 90], behaviors: [anchor(2, 1)] }),
    sprite(m, "IconoMoneda", { behaviors: [anchor(2, 1)] }),
    hudBtn("BotonPausa", "Pausa"),
    hudBtn("BotonAtaque", "Atk"),
    hudBtn("BotonHab1", "S1"),
    hudBtn("BotonHab2", "S2"),
    hudBtn("BotonHab3", "S3"),
    hudBtn("BotonSalto", "A"),
    hudBtn("BotonPocion", "Pot"),
    hudBtn("BotonAccion", "Acc"),
    sprite(m, "MascaraCD", { behaviors: [anchor(2, 0)], variables: [vnum("Slot", 1)] }),
    text("TextoCD", { size: 30, behaviors: [anchor(2, 0)], variables: [vnum("Slot", 1)] }),
    text("TextoPociones", { size: 22, behaviors: [anchor(2, 0)] }),
    joystick("Joystick", "assets/ui/joystick_borde.png", "assets/ui/joystick_pulgar.png"),
    text("TextoAviso", { size: 30, variables: [vnum("Vida")] }),
    // Menus (layer "Menu", camera centred on 640 by events)
    panel("Panel", "assets/ui/panel.png", 21, 680, 500),
    panel("BotonMenu", "assets/ui/boton_menu.png", 15, 480, 58, { variables: [vstr("Accion", ""), vnum("Slot", 1)] }),
    text("TextoBoton", { size: 28, variables: [vnum("Slot", 1), vnum("CX", 640)] }),
    text("TextoTitulo", { size: 52, font: FONT_TITLE, color: [255, 214, 120], outline: [40, 12, 8], variables: [vnum("CX", 640)] }),
    text("TextoMenu", { size: 23, color: [230, 225, 215], variables: [vnum("CX", -1)] }),
    sprite(m, "BotonCerrar"),
    sprite(m, "Flecha", { variables: [vnum("Paso", 1)] }),
  ];
}

// ------------------------------------------------------------------ HUD instances (Pueblo & Mazmorra)
export function hudInstances() {
  const L = { layer: "HUD" };
  const R = (x) => W - x; // from right edge
  return [
    inst("MarcoHUD", 36, 20, { ...L, z: 1 }),
    inst("BarraVida", 132, 35, { ...L, z: 2 }),
    inst("BarraMana", 132, 62, { ...L, z: 2 }),
    inst("BarraExp", 132, 83, { ...L, z: 2 }),
    inst("Retrato", 81, 64, { ...L, z: 2 }),
    inst("TextoNivel", 106, 76, { ...L, z: 4 }),
    inst("TextoPuntos", 40, 116, { ...L, z: 6 }),
    inst("TextoVida", 142, 34, { ...L, z: 4 }),
    inst("IconoMoneda", R(372), 46, { ...L, z: 2 }),
    inst("TextoOro", R(346), 30, { ...L, z: 2 }),
    inst("BotonPausa", R(70), 52, { ...L, z: 3 }),
    inst("Joystick", 176, 548, { ...L, z: 3 }),
    inst("BotonAtaque", 1110, 590, { ...L, z: 3 }),
    inst("BotonHab1", 960, 642, { ...L, z: 3 }),
    inst("BotonHab2", 975, 492, { ...L, z: 3 }),
    inst("BotonHab3", 1090, 425, { ...L, z: 3 }),
    inst("BotonSalto", 1192, 452, { ...L, z: 3 }),
    inst("BotonPocion", 832, 652, { ...L, z: 3 }),
    inst("TextoPociones", 852, 664, { ...L, z: 5 }),
    ...[[960, 642], [975, 492], [1090, 425]].flatMap(([x, y], i) => [
      inst("MascaraCD", x, y, { ...L, z: 4, vars: [vnum("Slot", i + 1)] }),
      inst("TextoCD", x - 10, y - 18, { ...L, z: 5, vars: [vnum("Slot", i + 1)] }),
    ]),
    inst("TextoAviso", 640, 150, { ...L, z: 10 }),
  ];
}

/** Generic menu panel on layer "Menu": panel, title, body, 3 buttons with labels, close, arrows. */
export function menuInstances() {
  const L = { layer: "Menu" };
  const out = [
    inst("Panel", 290, 70, { ...L, z: 1, w: 700, h: 590 }),
    inst("TextoTitulo", 640, 84, { ...L, z: 2 }),
    inst("TextoMenu", 350, 158, { ...L, z: 2 }),
    inst("BotonCerrar", 950, 108, { ...L, z: 3 }),
    inst("Flecha", 338, 250, { ...L, z: 3, vars: [vnum("Paso", -1)] }),
    inst("Flecha", 942, 250, { ...L, z: 3, vars: [vnum("Paso", 1)] }),
  ];
  [448, 516, 584, 380, 312].forEach((y, i) => {
    out.push(inst("BotonMenu", 400, y, { ...L, z: 3, w: 480, h: 58, vars: [vnum("Slot", i + 1)] }));
    out.push(inst("TextoBoton", 640, y + 11, { ...L, z: 4, vars: [vnum("Slot", i + 1)] }));
  });
  return out;
}
