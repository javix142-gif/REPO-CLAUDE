// Scene "Mazmorra": 5 rooms (4 with waves + boss room), camera lock, gates, victory/defeat.
import { q, C, A, NOT, OR, AND, E, ELSE, FOREACH, REPEAT, COMMENT, GROUP, LINK, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS,
  CMP, ANIM, HIDE, SHOW, WIDTH, TEXT, SETX, SETY, XY, SOUND, MUSIC, DT, JUST_BEGINS, KEY_JUST, TAP_ON, GOTO, CREATE, DEL,
  OPACITY, COLLIDE, ON_FLOOR, PLAT } from "../lib/dsl.mjs";
import { inst, layer, vnum, vstr, vstruct, tiled, sprite, text, anchor } from "../lib/objects.mjs";
import { gameplaySceneVariables, hudInstances, menuInstances, SUELO, FONT_TITLE } from "./common.mjs";
import { menuSystem } from "./ev_hud.mjs";
import { characterMenus, characterEvents, storyMenus } from "./personaje.mjs";
import { toast, floatText } from "./util.mjs";
import { fx, fxE } from "./ev_jugador.mjs";

export const ANCHO_SALA = 1800;
export const NUM_SALAS = 5;
const MUNDO = ANCHO_SALA * NUM_SALAS;

export function mazmorraObjects(m) {
  return [
    tiled("FondoLejano", "assets/entorno/fondo_mazmorra_lejos.png", 2400, 720),
    tiled("FondoMedio", "assets/entorno/fondo_mazmorra_medio.png", 2400, 600),
    sprite(m, "Antorcha"), sprite(m, "Estandarte"), sprite(m, "Calaveras"), sprite(m, "Velas"), sprite(m, "Barril"), sprite(m, "Caja"),
    sprite(m, "Cofre", { variables: [vnum("Abierto", 0)] }), sprite(m, "Pinchos"),
    sprite(m, "BarraJefeMarco"), sprite(m, "BarraJefe"), sprite(m, "IconoCalavera"),
    text("TextoEtapa", { size: 24, color: [230, 220, 200] }),
    text("TextoJefe", { size: 30, font: FONT_TITLE, color: [255, 150, 90], outline: [40, 12, 8] }),
    sprite(m, "BotonAuto", { behaviors: [anchor(2, 1)] }),
  ];
}

function layout() {
  const I = [];
  // ground, fill, walls
  I.push(inst("Suelo", -200, SUELO, { w: MUNDO + 400, h: 96, z: 2 }));
  I.push(inst("Relleno", -200, SUELO + 96, { w: MUNDO + 400, h: 288, z: 1 }));
  I.push(inst("Muro", -192, -400, { w: 192, h: 1000, z: 3 }));
  I.push(inst("Muro", MUNDO, -400, { w: 192, h: 1000, z: 3 }));
  // background layers
  I.push(inst("FondoLejano", 0, 0, { layer: "Fondo", w: 2400, h: 720, z: 0 }));
  I.push(inst("FondoMedio", 0, 0, { layer: "Medio", w: 2400, h: 600, z: 0 }));
  // gates between rooms
  for (let i = 1; i < NUM_SALAS; i++) I.push(inst("Puerta", i * ANCHO_SALA, SUELO, { z: 6, vars: [vnum("Indice", i)] }));
  // platforms, chests and spikes are generated when the scene starts (see generateRooms)
  // decorations
  for (let r = 0; r < NUM_SALAS; r++) {
    const b = r * ANCHO_SALA;
    [260, 760, 1260].forEach((x) => I.push(inst("Antorcha", b + x, 360, { z: 1 })));
    I.push(inst("Estandarte", b + 560, 150, { z: 1 }));
    I.push(inst("Calaveras", b + 980, SUELO - 42, { z: 5 }));
    I.push(inst("Velas", b + 1500, SUELO - 54, { z: 5 }));
    if (r % 2 === 0) I.push(inst("Barril", b + 1650, SUELO - 66, { z: 5 }));
    else I.push(inst("Caja", b + 140, SUELO - 60, { z: 5 }));
  }
  // exit portal (hidden until the boss dies)
  I.push(inst("Portal", MUNDO - 260, SUELO, { z: 3 }));
  I.push(inst("Jugador", 220, SUELO - 4, { z: 20 }));
  I.push(inst("PintorBarras", 0, 0, { z: 45 }));
  // HUD
  I.push(...hudInstances());
  I.push(inst("TextoEtapa", 640, 22, { layer: "HUD", z: 5 }));
  I.push(inst("BarraJefeMarco", 382, 100, { layer: "HUD", z: 5 }));
  I.push(inst("BarraJefe", 391, 112, { layer: "HUD", z: 6 }));
  I.push(inst("IconoCalavera", 360, 121, { layer: "HUD", z: 7 }));
  I.push(inst("TextoJefe", 640, 64, { layer: "HUD", z: 6 }));
  I.push(inst("BotonAuto", 1100, 52, { layer: "HUD", z: 6 }));
  I.push(...menuInstances());
  return I;
}

function sceneVariables() {
  return [
    ...gameplaySceneVariables(),
    vnum("Sala", 0), vstr("SalaEstado", "espera"), vnum("Oleada", 0), vnum("OleadasSala", 1), vnum("EsperaOleada", 0),
    vnum("SpawnPend", 0), vnum("AnchoSala", ANCHO_SALA), vnum("NumSalas", NUM_SALAS), vnum("SalaIni", 0), vnum("JefeVivo", 0),
    vnum("JefeMuerto", 0), vnum("TJefeMuerto", 0), vnum("PEsq", 0.65), vnum("PMur", 1), vnum("PCul", 1), vnum("Victoria", 0),
    vnum("TMuerte", 0), vnum("InvocarPend", 0), vnum("InvX", 0), vstr("Capitulo", ""),
    vstruct("Auto", [vnum("Hay", 0), vnum("Dx", 0), vnum("Dy", 0), vnum("Ang", 0), vnum("CofreT", 0)]),
    vstruct("Gen", [vnum("Sala"), vnum("X"), vnum("Y"), vnum("W"), vnum("TopX"), vnum("TopY")]),
  ];
}

function flow() {
  const spawnWave = () => E([IFN("SpawnPend", "=", 1)], [
    SET("SpawnPend", "=", 0), SET("Tmp.Cuantos", "=", "min(7, 3 + floor(Etapa / 2) + (Oleada - 1))"),
    SOUND("assets/audio/portal.wav", 50),
  ], [
    REPEAT("Tmp.Cuantos", [], [
      SET("Tmp.R", "=", "RandomFloat(1)"),
      SET("Tmp.X", "=", "RandomInRange(SalaIni + 260, SalaIni + AnchoSala - 200)"),
    ], [
      E([CMP("abs(Tmp.X - Jugador.X())", "<", 240)], [SET("Tmp.X", "=", "clamp(Tmp.X + 480 * sign(Tmp.X - Jugador.X() + 0.1), SalaIni + 200, SalaIni + AnchoSala - 160)")]),
      E([CMP("Tmp.R", "<", "PEsq")], [CREATE("Enemigo", "Tmp.X", "SueloY"), OSETS("Enemigo", "Tipo", "=", q("Esqueleto")), OSET("Enemigo", "Sala", "=", "Sala")]),
      E([CMP("Tmp.R", ">=", "PEsq"), CMP("Tmp.R", "<", "PMur")], [CREATE("Enemigo", "Tmp.X", "SueloY - 230"), OSETS("Enemigo", "Tipo", "=", q("Murcielago")),
        OSET("Enemigo", "Sala", "=", "Sala")]),
      E([CMP("Tmp.R", ">=", "PMur"), CMP("Tmp.R", "<", "PCul")], [SET("Tmp.Perch", "=", 0)], [
        COMMENT("Los cultistas se apostan el 60% de las veces en una plataforma de la sala (hay que subir a por ellos)."),
        E([CMP("RandomFloat(1)", "<", 0.6), C("PosX", "Plataforma", ">=", "SalaIni + 200"), C("PosX", "Plataforma", "<", "SalaIni + AnchoSala - 300"),
          C("PickRandomInstance", "Plataforma")], [
          SET("Tmp.Perch", "=", 1), SET("Tmp.PX0", "=", "Plataforma.X() + 40"), SET("Tmp.PX1", "=", "Plataforma.X() + Plataforma.Width() - 40"),
          SET("Tmp.PY", "=", "Plataforma.Y()")]),
        E([IFN("Tmp.Perch", "=", 1)], [CREATE("Enemigo", "(Tmp.PX0 + Tmp.PX1) / 2", "Tmp.PY - 2"), OSETS("Enemigo", "Tipo", "=", q("Cultista")),
          OSET("Enemigo", "Sala", "=", "Sala"), OSET("Enemigo", "Percha", "=", 1), OSET("Enemigo", "PX0", "=", "Tmp.PX0"), OSET("Enemigo", "PX1", "=", "Tmp.PX1")]),
        ELSE([], [CREATE("Enemigo", "Tmp.X", "SueloY"), OSETS("Enemigo", "Tipo", "=", q("Cultista")), OSET("Enemigo", "Sala", "=", "Sala")]),
      ]),
      E([CMP("Tmp.R", ">=", "PCul")], [CREATE("Enemigo", "Tmp.X", "SueloY"), OSETS("Enemigo", "Tipo", "=", q("Bruto")), OSET("Enemigo", "Sala", "=", "Sala")]),
    ]),
  ]);

  const chests = GROUP("Cofres y pinchos", [
    COMMENT("Cofres en las plataformas altas: se abren al tocarlos (monedas, orbe de vida y a veces una poción)."),
    E([C("CollisionNP", "Jugador", "Cofre"), OIFN("Cofre", "Abierto", "=", 0), OIFS("Jugador", "Estado", "!=", q("muerto"))], [
      OSET("Cofre", "Abierto", "=", 1), ANIM("Cofre", q("Abierto")), SET("Stats.Cofres", "+", 1), SET("Auto.CofreT", "=", 0),
      SET("Tmp.X", "=", "Cofre.X()"), SET("Tmp.Y", "=", "Cofre.Y() - 50"), SOUND("assets/audio/botin.wav", 70), SOUND("assets/audio/moneda.wav", 60),
      ...toast(q("¡Cofre abierto!"), q("255;214;90"), 1.6),
    ], [
      REPEAT(7, [], [], [E([], [
        CREATE("Moneda", "Tmp.X", "Tmp.Y"), OSET("Moneda", "Valor", "=", "max(2, round(Etapa * 3 + 6))"),
        OSET("Moneda", "VX", "=", "RandomInRange(-220, 220)"), OSET("Moneda", "VY", "=", "RandomInRange(-620, -380)"), A("SetZOrder", "Moneda", "=", 15),
      ])]),
      E([], [CREATE("OrbeVida", "Tmp.X", "Tmp.Y"), OSET("OrbeVida", "VX", "=", "RandomInRange(-80, 80)"), OSET("OrbeVida", "VY", "=", -520),
        A("SetZOrder", "OrbeVida", "=", 15)]),
      E([CMP("RandomFloat(1)", "<", 0.4), IFN("Save.Pociones", "<", 20)], [SET("Save.Pociones", "+", 1), SET("Guardar", "=", 1)]),
      fxE("Destello", "Tmp.X", "Tmp.Y", { scale: 1.6 }),
    ]),
    COMMENT("Pinchos: dañan al tocarlos (7% de la vida) y hacen rebotar al héroe."),
    E([C("CollisionNP", "Jugador", "Pinchos"), OIFN("Jugador", "Inv", "<=", 0), OIFS("Jugador", "Estado", "!=", q("muerto"))], [
      SET("Tmp.DanoJ", "=", "max(1, round(Stat.VidaMax * 0.07 + Etapa * 2))"), OSET("Jugador", "HP", "-", "Tmp.DanoJ"), OSET("Jugador", "Inv", "=", 1),
      SET("Stats.DanoRecibido", "+", "Tmp.DanoJ"), SOUND("assets/audio/herido.wav", 70), SET("Temblor", "=", 0.15), SET("FuerzaTemblor", "=", 5),
      A("PlatformBehavior::SetCanJump", "Jugador", PLAT), A("PlatformBehavior::SimulateJumpKey", "Jugador", PLAT),
      ...fx("ChispaRoja", "Jugador.X()", "Jugador.Y() - 30"),
      ...floatText("Jugador.X()", "Jugador.Y() - 140", "ToString(Tmp.DanoJ)", "255;80;80", 32),
    ]),
  ]);

  return GROUP("Salas, oleadas y jefe", [
    chests,
    E([], [SET("SalaIni", "=", "Sala * AnchoSala")]),
    COMMENT("Entrar en una sala la cierra y empieza el combate."),
    E([IFS("SalaEstado", "=", q("espera")), CMP("Jugador.X()", ">", "SalaIni + 300")], [SETS("SalaEstado", "=", q("combate")), SET("Oleada", "=", 1), SET("Auto.CofreT", "=", 0)], [
      E([CMP("Sala", "<", "NumSalas - 1")], [SET("SpawnPend", "=", 1), SET("OleadasSala", "=", 2)], [
        E([IFN("Sala", "=", 0)], [SET("OleadasSala", "=", 1)]),
        E([], toast("\"Sala \" + ToString(Sala + 1) + \" / \" + ToString(NumSalas)", q("230;225;215"), 1.6)),
      ]),
      ELSE([], [SET("JefeVivo", "=", 1), SET("OleadasSala", "=", 1), SET("Temblor", "=", 0.8), SET("FuerzaTemblor", "=", 8),
        SOUND("assets/audio/jefe_rugido.wav", 90), MUSIC("assets/audio/musica_jefe.wav", 55),
        SHOW("BarraJefeMarco"), SHOW("BarraJefe"), SHOW("TextoJefe"), SHOW("IconoCalavera"),
        ...toast(q("¡El Caballero de Ceniza despierta!"), q("255;130;80"), 2.5)], [
        E([], [CREATE("Enemigo", "SalaIni + AnchoSala - 420", "SueloY"), OSETS("Enemigo", "Tipo", "=", q("Jefe")), OSET("Enemigo", "Sala", "=", "Sala")]),
      ]),
    ]),
    spawnWave(),
    COMMENT("Recuento de enemigos vivos DESPUÉS de generar la oleada (si no, la sala se daría por limpia en el mismo frame)."),
    E([], [SET("Vivos", "=", 0)]),
    E([OIFS("Enemigo", "Estado", "!=", q("muerto"))], [SET("Vivos", "=", "Count(Enemigo)")]),
    E([IFS("SalaEstado", "=", q("combate")), IFN("Vivos", "=", 0), IFN("SpawnPend", "=", 0), IFN("JefeVivo", "=", 0), IFN("EsperaOleada", "<=", 0)], [], [
      E([CMP("Oleada", "<", "OleadasSala")], [SET("Oleada", "+", 1), SET("EsperaOleada", "=", 1.1),
        ...toast(q("¡Otra oleada!"), q("255;190;120"), 1.2)]),
      ELSE([CMP("Sala", "<", "NumSalas - 1")], [SETS("SalaEstado", "=", q("limpia")), SOUND("assets/audio/puerta.wav", 70),
        ...toast(q("¡Sala despejada!  Avanza →"), q("140;255;170"), 2)], [
        E([OIFN("Puerta", "Indice", "=", "Sala + 1")], [OSET("Puerta", "Abierta", "=", 1), ANIM("Puerta", q("Abriendo")),
          A("ActivateBehavior", "Puerta", "Solido", "no")]),
      ]),
    ]),
    E([IFN("EsperaOleada", ">", 0)], [SET("EsperaOleada", "-", DT)], [
      E([IFN("EsperaOleada", "<=", 0)], [SET("SpawnPend", "=", 1)]),
    ]),
    E([OIFN("Puerta", "Abierta", "=", 1), C("AnimatableCapability::AnimatableBehavior::HasAnimationEnded", "Puerta", "Animation")], [ANIM("Puerta", q("Abierta"))]),
    E([IFS("SalaEstado", "=", q("limpia")), CMP("Jugador.X()", ">", "SalaIni + AnchoSala + 60")], [SET("Sala", "+", 1), SETS("SalaEstado", "=", q("espera"))]),
    COMMENT("Durante el combate el jugador no puede salir por la izquierda de la sala."),
    E([IFS("SalaEstado", "=", q("combate")), CMP("Jugador.X()", "<", "SalaIni + 40")], [SETX("Jugador", "=", "SalaIni + 40")]),
    COMMENT("Jefe: barra de vida y derrota."),
    E([IFN("JefeVivo", "=", 1)], [], [
      E([OIFS("Enemigo", "Tipo", "=", q("Jefe"))], [WIDTH("BarraJefe", "498 * clamp(Enemigo.HP / Enemigo.HPMax, 0, 1)")]),
      E([OIFS("Enemigo", "Tipo", "=", q("Jefe")), OIFS("Enemigo", "Estado", "=", q("muerto"))], [SET("JefeVivo", "=", 0), SET("JefeMuerto", "=", 1),
        SET("TJefeMuerto", "=", 0), A("ChangeTimeScale", 0.35), SOUND("assets/audio/jefe_rugido.wav", 80, 0.7), SET("Temblor", "=", 1), SET("FuerzaTemblor", "=", 10),
        HIDE("BarraJefeMarco"), HIDE("BarraJefe"), HIDE("TextoJefe"), HIDE("IconoCalavera")]),
    ]),
    E([IFN("JefeMuerto", "=", 1)], [SET("TJefeMuerto", "+", DT)], [
      E([IFN("TJefeMuerto", ">=", 0.6), IFN("JefeMuerto", "=", 1)], [A("ChangeTimeScale", 1), SET("JefeMuerto", "=", 2),
        SET("Save.EtapaMax", "=", "min(10, max(Save.EtapaMax, Etapa + 1))"), SET("Guardar", "=", 1),
        SHOW("Portal"), SOUND("assets/audio/victoria.wav", 80), MUSIC("assets/audio/musica_mazmorra.wav", 45),
        ...toast(q("¡Has derrotado al Caballero de Ceniza!  Recoge el botín y entra al portal"), q("255;220;110"), 4)]),
    ]),
    E([OIFS("Enemigo", "Tipo", "=", q("Jefe")), OIFS("Enemigo", "Estado", "=", q("muerto")), OIFN("Enemigo", "Accion", ">=", 2.2)], [], [
      fxE("Humo", "Enemigo.CenterX()", "Enemigo.CenterY()", { scale: 4 }), E([], [A("Delete", "Enemigo")]),
    ]),
    E([IFN("JefeMuerto", "=", 2), C("Visible", "Portal"), COLLIDE("Jugador", "Portal"), IFS("Menu", "=", q(""))], [
      SETS("MenuAbrir", "=", q("victoria")), SET("Victoria", "=", 1), SOUND("assets/audio/portal.wav", 80)]),
    COMMENT("Derrota: menú tras la animación de muerte."),
    E([OIFS("Jugador", "Estado", "=", q("muerto"))], [SET("TMuerte", "+", DT)], [
      E([IFN("TMuerte", ">=", 1.6), IFS("Menu", "=", q("")), IFS("MenuAbrir", "=", q(""))], [SETS("MenuAbrir", "=", q("derrota"))]),
    ]),
  ]);
}

function cameraEvents() {
  return GROUP("Cámara y parallax", [
    E([], [SET("CamMin", "=", "CameraWidth() / 2"), SET("CamMax", "=", "(Sala + 1) * AnchoSala - CameraWidth() / 2")]),
    E([IFS("SalaEstado", "=", q("combate"))], [SET("CamMin", "=", "SalaIni + CameraWidth() / 2")]),
    E([IFS("SalaEstado", "=", q("limpia"))], [SET("CamMax", "=", "min(MundoAncho, (Sala + 2) * AnchoSala) - CameraWidth() / 2")]),
    E([], [
      A("SetCameraCenterX", "=", "lerp(CameraX(), clamp(Jugador.X() + Jugador.Dir * 70, CamMin, max(CamMin, CamMax)), min(1, 8 * TimeDelta()))"),
      A("SetCameraCenterY", "=", 360),
    ]),
    E([IFN("Temblor", ">", 0)], [SET("Temblor", "-", "TimeDelta()"),
      A("SetCameraCenterX", "+", "RandomFloatInRange(-FuerzaTemblor, FuerzaTemblor)"),
      A("SetCameraCenterY", "+", "RandomFloatInRange(-FuerzaTemblor, FuerzaTemblor)")]),
    E([], [
      A("TiledSpriteObject::XOffset", "FondoLejano", "=", "CameraX() * 0.25"),
      A("TiledSpriteObject::XOffset", "FondoMedio", "=", "CameraX() * 0.55"),
    ]),
  ]);
}

/**
 * Procedural rooms: every run each room gets a fresh chain of floating platforms (3-4 platforms, rising steps of at most
 * 100 px and gaps of at most 150 px, so every one is reachable with jump + double jump), a treasure chest on the highest
 * platform and, from the second room on, a patch of spikes on the floor.
 */
function generateRooms() {
  const platform = E([CMP("Gen.X", "<", "Gen.Sala * AnchoSala + AnchoSala - 380")], [
    SET("Gen.W", "=", "96 * (2 + floor(RandomFloat(2)))"),
    CREATE("Plataforma", "Gen.X", "Gen.Y"), A("ResizableCapability::ResizableBehavior::SetSize", "Plataforma", "Resizable", "Gen.W", 30),
    A("SetZOrder", "Plataforma", "=", 4),
  ], [
    E([CMP("Gen.Y", "<", "Gen.TopY")], [SET("Gen.TopY", "=", "Gen.Y"), SET("Gen.TopX", "=", "Gen.X + Gen.W / 2")]),
    E([], [SET("Gen.X", "+", "Gen.W + RandomInRange(70, 150)"), SET("Gen.Y", "=", "clamp(Gen.Y + RandomInRange(-100, 50), 330, 490)")]),
  ]);
  return GROUP("Generación de salas (plataformas, cofres y pinchos)", [
    COMMENT("Cada sala recibe una cadena de plataformas alcanzable con salto + doble salto, un cofre en la más alta y (desde la 2.ª) pinchos en el suelo."),
    E([JUST_BEGINS()], [SET("Gen.Sala", "=", 0)], [
      REPEAT("NumSalas", [], [], [
        E([], [SET("Gen.X", "=", "Gen.Sala * AnchoSala + 430 + RandomInRange(0, 90)"), SET("Gen.Y", "=", "RandomInRange(460, 500)"), SET("Gen.TopY", "=", 9999)], [
          REPEAT(4, [], [], [platform]),
          E([], [CREATE("Cofre", "Gen.TopX", "Gen.TopY"), A("SetZOrder", "Cofre", "=", 5)]),
          E([CMP("Gen.Sala", ">=", 1), CMP("Gen.Sala", "<", "NumSalas - 1")], [
            CREATE("Pinchos", "Gen.Sala * AnchoSala + RandomInRange(760, 1500)", "SueloY"), A("SetZOrder", "Pinchos", "=", 5)]),
          E([], [SET("Gen.Sala", "+", 1)]),
        ]),
      ]),
    ]),
  ]);
}

function startEvents() {
  const theme = (tex) => [
    // imageResource parameters take the plain resource name (no quotes)
    A("TiledSpriteObject::SetImageFromResource", "FondoLejano", `assets/entorno/fondo_${tex}_lejos.png`),
    A("TiledSpriteObject::SetImageFromResource", "FondoMedio", `assets/entorno/fondo_${tex}_medio.png`),
    A("TiledSpriteObject::SetImageFromResource", "Suelo", `assets/entorno/suelo_${tex}.png`),
    A("TiledSpriteObject::SetImageFromResource", "Relleno", `assets/entorno/relleno_${tex}.png`),
    A("TiledSpriteObject::SetImageFromResource", "Plataforma", `assets/entorno/plataforma_${tex}.png`),
    A("TiledSpriteObject::SetImageFromResource", "Muro", `assets/entorno/muro_${tex}.png`),
  ];
  return GROUP("Inicio de la etapa", [
    E([JUST_BEGINS()], [
      SET("Etapa", "=", "clamp(Save.EtapaSel, 1, 10)"), SET("Mult", "=", "1 + 0.45 * (Etapa - 1)"), SET("MundoAncho", "=", MUNDO),
      SETS("Capitulo", "=", q("Catacumbas Olvidadas")),
      HIDE("BarraJefeMarco"), HIDE("BarraJefe"), HIDE("TextoJefe"), HIDE("IconoCalavera"), HIDE("Portal"), HIDE("BotonAccion"),
      ANIM("Portal", q("Salida")), ANIM("Puerta", q("Cerrada")), OSET("Puerta", "Abierta", "=", 0), ANIM("Cofre", q("Cerrado")), OSET("Cofre", "Abierto", "=", 0),
      MUSIC("assets/audio/musica_mazmorra.wav", 45), A("SceneBackground", q("7;9;16")),
      TEXT("TextoJefe", q("CABALLERO DE CENIZA")),
    ], [
      E([IFN("Etapa", "=", 1)], [SET("PEsq", "=", 0.65), SET("PMur", "=", 1), SET("PCul", "=", 1)]),
      E([IFN("Etapa", "=", 2)], [SET("PEsq", "=", 0.5), SET("PMur", "=", 0.75), SET("PCul", "=", 1)]),
      E([IFN("Etapa", ">=", 3)], [SET("PEsq", "=", 0.38), SET("PMur", "=", 0.58), SET("PCul", "=", 0.82)]),
      E([IFN("Etapa", ">=", 6)], [SET("PEsq", "=", 0.3), SET("PMur", "=", 0.5), SET("PCul", "=", 0.75), SETS("Capitulo", "=", q("Fortaleza Carmesí")),
        A("SceneBackground", q("16;6;7")), ...theme("fortaleza")]),
      E([], [TEXT("TextoEtapa", "Capitulo + \"  ·  Etapa \" + ToString(Etapa)")]),
    ]),
    E([], [
      SETX("TextoEtapa", "=", "CameraX(\"HUD\") - TextoEtapa.Width() / 2"), SETX("TextoJefe", "=", "CameraX(\"HUD\") - TextoJefe.Width() / 2"),
      SETX("BarraJefeMarco", "=", "CameraX(\"HUD\") - 258"), SETX("BarraJefe", "=", "CameraX(\"HUD\") - 249"), SETX("IconoCalavera", "=", "CameraX(\"HUD\") - 280"),
    ]),
  ]);
}

function menus() {
  const hudPause = E([OR(AND(...TAP_ON("BotonPausa")), KEY_JUST("Escape"), KEY_JUST("p")), IFS("Menu", "=", q("")), IFS("MenuAbrir", "=", q("")),
    OIFS("Jugador", "Estado", "!=", q("muerto"))], [SETS("MenuAbrir", "=", q("pausa"))]);
  return [
    hudPause,
    menuSystem({
      pausa: { title: q("PAUSA"), body: "Capitulo + \"\\nEtapa \" + ToString(Etapa) + \"   ·   Sala \" + ToString(Sala + 1) + \" / 5\\n\\nNivel \" + ToString(Save.Nivel) + \"     Oro \" + ToString(Save.Oro)",
        buttons: [{ label: q("Continuar"), action: "cerrar" }, { label: q("Personaje (atributos y habilidades)"), action: "abrirPersonaje" },
          { label: q("Volver al pueblo"), action: "pueblo" }], close: true },
      victoria: { title: q("¡VICTORIA!"), body: "\"Etapa \" + ToString(Etapa) + \" completada\\n\\nEnemigos derrotados: \" + ToString(Stats.Muertes) + \"\\nOro obtenido: \" + ToString(Stats.Oro) + \"\\nExperiencia: \" + ToString(Stats.Exp) + \"\\nObjetos recogidos: \" + ToString(Stats.Botin)",
        buttons: [{ label: q("Siguiente etapa"), action: "siguiente" }, { label: q("Volver al pueblo"), action: "pueblo" }], close: false },
      derrota: { title: q("HAS CAÍDO"), body: q("Conservas el oro, la experiencia\ny el equipo que obtuviste.\n\nMejora tu equipo en el pueblo."),
        buttons: [{ label: q("Reintentar etapa"), action: "reintentar" }, { label: q("Volver al pueblo"), action: "pueblo" }], close: false },
      ...characterMenus(),
      ...storyMenus(),
    }),
    ...characterEvents(),
    E([OR(AND(...TAP_ON("Retrato")), KEY_JUST("c")), IFS("Menu", "=", q("")), IFS("MenuAbrir", "=", q("")), OIFS("Jugador", "Estado", "!=", q("muerto"))],
      [SETS("MenuAbrir", "=", q("personaje"))]),
    E([NOT(IFS("Menu", "=", q("")))], [A("ChangeTimeScale", 0)]),
    ELSE([IFN("JefeMuerto", "!=", 1)], [A("ChangeTimeScale", 1)]),
    E([IFS("Accion", "=", q("pueblo"))], [A("ChangeTimeScale", 1), SET("Guardar", "=", 1), SETS("Juego.Origen", "=", q("mazmorra")), GOTO("Pueblo")]),
    E([IFS("Accion", "=", q("reintentar"))], [A("ChangeTimeScale", 1), GOTO("Mazmorra")]),
    E([IFS("Accion", "=", q("siguiente"))], [A("ChangeTimeScale", 1), SET("Save.EtapaSel", "=", "min(10, Etapa + 1)"), SET("Guardar", "=", 1), GOTO("Mazmorra")]),
  ];
}

function autoBattle() {
  const J = "Jugador";
  const EN = "Enemigo";
  const right = () => A("PlatformBehavior::SimulateRightKey", J, "PlatformerObject");
  const left = () => A("PlatformBehavior::SimulateLeftKey", J, "PlatformerObject");
  const toward = (dx) => [E([CMP(dx, ">", 0)], [right()]), ELSE([], [left()])];
  const away = (dx) => [E([CMP(dx, ">", 0)], [left()]), ELSE([], [right()])];
  return GROUP("Combate automático (AUTO)", [
    COMMENT("Como en los ARPG móviles: con AUTO activo el héroe avanza, elige al enemigo más cercano, ataca, usa habilidades y bebe pociones. Sólo escribe en las variables In.* (las mismas que los botones)."),
    E([OR(AND(...TAP_ON("BotonAuto")), KEY_JUST("t")), IFS("Menu", "=", q(""))], [SET("Save.Auto", "=", "1 - Save.Auto"), SET("Guardar", "=", 1),
      SOUND("assets/audio/click.wav", 60)], [
      E([IFN("Save.Auto", "=", 1)], toast(q("Combate automático: ACTIVADO"), q("255;214;90"), 1.4)),
      ELSE([], toast(q("Combate automático: desactivado"), q("200;200;200"), 1.4)),
    ]),
    E([IFN("Save.Auto", "=", 1)], [ANIM("BotonAuto", q("On"))]),
    ELSE([], [ANIM("BotonAuto", q("Off"))]),
    E([IFN("Save.Auto", "=", 1), IFS("Menu", "=", q("")), OIFS(J, "Estado", "!=", q("muerto"))], [SET("Auto.Hay", "=", 0)], [
      E([OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Estado", "!=", q("aparecer")), C("PickNearest", EN, "Jugador.X()", "Jugador.Y() - 40")], [
        SET("Auto.Hay", "=", 1), SET("Auto.Dx", "=", "Enemigo.X() - Jugador.X()"), SET("Auto.Dy", "=", "Enemigo.CenterY() - (Jugador.Y() - 66)"),
        SET("Auto.Ang", "=", "ToDeg(atan2(-Auto.Dy, max(1, abs(Auto.Dx))))")]),
      E([CMP("Jugador.HP", "<", "Stat.VidaMax * 0.35")], [SET("In.Pot", "=", 1)]),
      E([IFN("Auto.Hay", "=", 1)], [], [
        COMMENT("Apunta al objetivo: de frente, en diagonal o hacia arriba; salta (y usa el doble salto) para alcanzar enemigos en plataformas o en el aire."),
        E([CMP("Auto.Ang", ">=", 24), CMP("Auto.Ang", "<", 66)], [SET("In.Aim", "=", 1), SET("In.AX", "=", "sign(Auto.Dx)")]),
        E([CMP("Auto.Ang", ">=", 66)], [SET("In.Aim", "=", 2)]),
        E([CMP("Auto.Ang", "<=", -26), NOT(ON_FLOOR())], [SET("In.Aim", "=", 3), SET("In.AX", "=", "sign(Auto.Dx)")]),
        E([CMP("Auto.Dy", "<", -110), CMP("abs(Auto.Dx)", "<", 260), ON_FLOOR()], [A("PlatformBehavior::SimulateJumpKey", J, PLAT)]),
        E([CMP("Auto.Dy", "<", -150), CMP("abs(Auto.Dx)", "<", 320), NOT(ON_FLOOR()), C("PlatformBehavior::IsFalling", J, PLAT), OIFN(J, "Saltos", "<", 1)],
          [SET("In.SaltoJ", "=", 1)]),
        E([CMP("abs(Auto.Dx)", ">", "Stat.AutoRango")], [], toward("Auto.Dx")),
        ELSE([], [], [
          E([CMP("Auto.Dx * Jugador.Dir", "<", 0), OIFS(J, "Estado", "=", q("libre"))], [], toward("Auto.Dx")),
          E([CMP("abs(Auto.Dy)", "<", "Stat.AutoAlto")], [SET("In.Atk", "=", 1)], [
            E([OIFN(J, "Cd2", "<=", 0), CMP("Jugador.MP", ">=", "Stat.Costo2")], [SET("In.S2", "=", 1)]),
            ELSE([OIFN(J, "Cd1", "<=", 0), CMP("Jugador.MP", ">=", "Stat.Costo1")], [SET("In.S1", "=", 1)]),
            ELSE([OIFN(J, "Cd3", "<=", 0), CMP("Jugador.MP", ">=", "Stat.Costo3"), CMP("Jugador.HP", "<", "Stat.VidaMax * 0.65")], [SET("In.S3", "=", 1)]),
          ]),
        ]),
        E([IFS("Save.Clase", "!=", q("Guerrero")), CMP("abs(Auto.Dx)", "<", 110)], [], away("Auto.Dx")),
      ]),
      E([IFN("Auto.Hay", "=", 0)], [], [
        E([IFN("JefeMuerto", "=", 2), C("Visible", "Portal")], [], toward("Portal.X() - Jugador.X()")),
        ELSE([IFS("SalaEstado", "!=", q("combate")), IFN("Auto.CofreT", "<", 14), OIFN("Cofre", "Abierto", "=", 0), C("PosX", "Cofre", ">", "SalaIni"),
          C("PosX", "Cofre", "<", "SalaIni + AnchoSala"), C("PickNearest", "Cofre", "Jugador.X()", "Jugador.Y()")], [
          SET("Auto.CofreT", "+", DT), SET("Auto.Dx", "=", "Cofre.X() - Jugador.X()"), SET("Auto.Dy", "=", "Cofre.Y() - Jugador.Y()")], [
          COMMENT("Sin enemigos: va a por el cofre de la sala (salta y usa el doble salto hasta la plataforma)."),
          E([CMP("abs(Auto.Dx)", ">", 30)], [], toward("Auto.Dx")),
          E([CMP("Auto.Dy", "<", -60), CMP("abs(Auto.Dx)", "<", 220), ON_FLOOR()], [A("PlatformBehavior::SimulateJumpKey", J, PLAT)]),
          E([CMP("Auto.Dy", "<", -100), CMP("abs(Auto.Dx)", "<", 300), NOT(ON_FLOOR()), C("PlatformBehavior::IsFalling", J, PLAT), OIFN(J, "Saltos", "<", 1)],
            [SET("In.SaltoJ", "=", 1)]),
        ]),
        ELSE([IFS("SalaEstado", "!=", q("combate"))], [right()]),
      ]),
    ]),
  ]);
}

export function mazmorraScene() {
  return {
    name: "Mazmorra",
    background: [7, 9, 16],
    layers: [layer("Fondo"), layer("Medio"), layer("", { base: true }), layer("HUD"), layer("Menu", { visible: false })],
    variables: sceneVariables(),
    instances: layout(),
    events: [
      COMMENT("MAZMORRA — la lógica compartida está en los eventos externos EV_Jugador, EV_Combate, EV_HUD y EV_Enemigos."),
      startEvents(),
      generateRooms(),
      LINK("EV_Entrada"),
      autoBattle(),
      LINK("EV_Jugador"),
      LINK("EV_Enemigos"),
      LINK("EV_Combate"),
      flow(),
      cameraEvents(),
      LINK("EV_HUD"),
      GROUP("Menús de pausa, victoria y derrota", menus()),
    ],
  };
}
