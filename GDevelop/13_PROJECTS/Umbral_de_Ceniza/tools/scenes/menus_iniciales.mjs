// Scenes "Titulo" and "SeleccionClase".
import { q, C, A, NOT, OR, AND, E, ELSE, FOREACH, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  ANIM_END, HIDE, SHOW, TEXT, SETX, SCALE, TINT, SOUND, MUSIC, JUST_BEGINS, KEY_JUST, TAP_ON, GOTO, OPACITY, FLIPX } from "../lib/dsl.mjs";
import { inst, layer, vnum, vstr, vstruct, sprite, text } from "../lib/objects.mjs";
import { CLASES } from "./common.mjs";

const centerCamera = () => A("SetCameraCenterX", "=", 640);
const tapButtons = () => FOREACH("BotonMenu", [...TAP_ON("BotonMenu"), C("Visible", "BotonMenu")], [
  SETS("Accion", "=", "BotonMenu.Accion"), SOUND("assets/audio/click.wav", 60)]);

// ------------------------------------------------------------------ Titulo
export function tituloObjects(m) {
  return [
    sprite(m, "FondoTitulo"), sprite(m, "Logo"),
    text("TextoVersion", { size: 18, color: [170, 150, 150] }),
    text("TextoLema", { size: 26, color: [255, 200, 150] }),
  ];
}

export function tituloScene() {
  const btn = (slot, y) => [
    inst("BotonMenu", 440, y, { z: 5, w: 400, h: 62, vars: [vnum("Slot", slot)] }),
    inst("TextoBoton", 640, y + 13, { z: 6, vars: [vnum("Slot", slot), vnum("CX", 640)] }),
  ];
  return {
    name: "Titulo",
    background: [12, 5, 10],
    layers: [layer("", { base: true })],
    variables: [vstr("Accion", ""), vstruct("Tmp", [vstr("Json", "")])],
    instances: [
      inst("FondoTitulo", -5, 0, { z: 0 }),
      inst("Logo", 640, 190, { z: 3 }),
      inst("TextoLema", 640, 318, { z: 3 }),
      ...btn(1, 420), ...btn(2, 500),
      inst("TextoVersion", 640, 622, { z: 3 }),
    ],
    events: [
      COMMENT("TÍTULO — carga la partida guardada (almacenamiento 'UmbralSave') y ofrece Continuar / Nueva partida."),
      E([JUST_BEGINS()], [
        centerCamera(), MUSIC("assets/audio/musica_titulo.wav", 50), A("SceneBackground", q("12;5;10")),
        TEXT("TextoLema", q("RPG de acción · Desciende, lucha y forja tu leyenda")),
        TEXT("TextoVersion", q("v1.0  ·  Hecho con GDevelop  ·  Arte y música originales")),
        SET("Juego.HayPartida", "=", 0),
      ], [
        E([C("GroupExists", q("UmbralSave"), q("datos"))], [
          A("ReadStringFromStorage", q("UmbralSave"), q("datos"), "Tmp.Json"),
          A("JSONToVariableStructure2", "Tmp.Json", "Save"),
        ]),
        E([NOT(IFS("Save.Clase", "=", q("")))], [SET("Juego.HayPartida", "=", 1)]),
        E([IFN("Juego.HayPartida", "=", 1)], [], [
          E([OIFN("BotonMenu", "Slot", "=", 1)], [OSETS("BotonMenu", "Accion", "=", q("continuar"))]),
          E([OIFN("BotonMenu", "Slot", "=", 2)], [OSETS("BotonMenu", "Accion", "=", q("nueva"))]),
          E([OIFN("TextoBoton", "Slot", "=", 1)], [TEXT("TextoBoton", "\"CONTINUAR  (\" + Save.Clase + \" nv. \" + ToString(Save.Nivel) + \")\"")]),
          E([OIFN("TextoBoton", "Slot", "=", 2)], [TEXT("TextoBoton", q("NUEVA PARTIDA"))]),
        ]),
        ELSE([], [], [
          E([OIFN("BotonMenu", "Slot", "=", 1)], [OSETS("BotonMenu", "Accion", "=", q("nueva"))]),
          E([OIFN("TextoBoton", "Slot", "=", 1)], [TEXT("TextoBoton", q("COMENZAR"))]),
          E([OIFN("BotonMenu", "Slot", "=", 2)], [HIDE("BotonMenu")]),
          E([OIFN("TextoBoton", "Slot", "=", 2)], [HIDE("TextoBoton")]),
        ]),
      ]),
      E([], [
        SETS("Accion", "=", q("")),
        A("ScalableCapability::ScalableBehavior::SetValue", "FondoTitulo", "Scale", "=", "max(1, (CameraWidth() + 8) / 1290)"),
        SETX("FondoTitulo", "=", "CameraX() - FondoTitulo.Width() / 2"), A("SetY", "FondoTitulo", "=", "CameraY() - FondoTitulo.Height() / 2"),
        SETX("TextoBoton", "=", "TextoBoton.CX - TextoBoton.Width() / 2"),
        SETX("TextoLema", "=", "640 - TextoLema.Width() / 2"), SETX("TextoVersion", "=", "640 - TextoVersion.Width() / 2"),
        SCALE("Logo", "1 + 0.015 * sin(TimeFromStart() * 2)"),
        OPACITY("TextoLema", "190 + 65 * sin(TimeFromStart() * 3)"),
      ]),
      tapButtons(),
      E([OR(KEY_JUST("Return"), KEY_JUST("Space"))], [SETS("Accion", "=", "BotonMenu.Accion")]),
      E([IFS("Accion", "=", q("continuar"))], [SETS("Juego.Origen", "=", q("titulo")), GOTO("Pueblo")]),
      E([IFS("Accion", "=", q("nueva"))], [GOTO("SeleccionClase")]),
    ],
  };
}

// ------------------------------------------------------------------ SeleccionClase
const INFO = {
  Guerrero: ["Cuerpo a cuerpo  ·  Mucha vida", "Torbellino\nEmbestida\nGrito de guerra"],
  Maga: ["Magia a distancia  ·  Mucho maná", "Nova de escarcha\nMeteoro\nBarrera arcana"],
  Arquera: ["Flechas veloces  ·  Críticos", "Disparo triple\nLluvia de flechas\nPaso sombrío"],
};

export function claseObjects(m) {
  return [
    sprite(m, "FondoTitulo"),
    sprite(m, "HeroePreview", { variables: [vstr("Clase", "Guerrero")] }),
    text("TextoClase", { size: 44, font: "fonts/Jersey10-Regular.ttf", color: [255, 214, 120], outline: [40, 12, 8], variables: [vstr("Clase", ""), vnum("CX", 0)] }),
    text("TextoDesc", { size: 22, color: [230, 225, 215], align: "center", variables: [vstr("Clase", ""), vnum("CX", 0)] }),
  ];
}

export function claseScene() {
  const I = [inst("FondoTitulo", -5, 0, { z: 0 }), inst("TextoTitulo", 640, 22, { z: 5, vars: [vnum("CX", 640)] })];
  CLASES.forEach((c, i) => {
    const x = 70 + i * 400;
    const cx = x + 170;
    I.push(inst("Panel", x, 100, { z: 1, w: 340, h: 560 }));
    I.push(inst("HeroePreview", cx, 380, { z: 3, vars: [vstr("Clase", c)] }));
    I.push(inst("TextoClase", cx, 392, { z: 3, vars: [vstr("Clase", c), vnum("CX", cx)] }));
    I.push(inst("TextoDesc", cx, 440, { z: 3, vars: [vstr("Clase", c), vnum("CX", cx)] }));
    I.push(inst("BotonMenu", x + 40, 588, { z: 4, w: 260, h: 58, vars: [vstr("Accion", c), vnum("Slot", i + 1)] }));
    I.push(inst("TextoBoton", cx, 600, { z: 5, vars: [vnum("Slot", i + 1), vnum("CX", cx)] }));
  });
  const perClass = CLASES.flatMap((c) => [
    E([OIFS("HeroePreview", "Clase", "=", q(c))], [ANIM("HeroePreview", q(`${c}_Idle`))]),
    E([OIFS("TextoClase", "Clase", "=", q(c))], [TEXT("TextoClase", q(c.toUpperCase()))]),
    E([OIFS("TextoDesc", "Clase", "=", q(c))], [TEXT("TextoDesc", q(`${INFO[c][0]}\n\n${INFO[c][1]}`))]),
  ]);
  const newGame = (c) => [
    SETS("Save.Clase", "=", q(c)), SET("Save.Nivel", "=", 1), SET("Save.Exp", "=", 0), SET("Save.Oro", "=", 60), SET("Save.Pociones", "=", 3),
    SET("Save.ArmaBonus", "=", 0), SET("Save.ArmaRareza", "=", 0), SETS("Save.ArmaNombre", "=", q("Arma de novato")),
    SET("Save.ArmaduraBonus", "=", 0), SET("Save.ArmaduraRareza", "=", 0), SETS("Save.ArmaduraNombre", "=", q("Ropa de viaje")),
    SET("Save.Forja", "=", 0), SET("Save.Refuerzo", "=", 0), SET("Save.EtapaMax", "=", 1), SET("Save.EtapaSel", "=", 1),
    A("EcrireFichierTxt", q("UmbralSave"), q("datos"), "ToJSON(Save)"), SETS("Juego.Origen", "=", q("nuevo")), GOTO("Pueblo"),
  ];
  return {
    name: "SeleccionClase",
    background: [12, 5, 10],
    layers: [layer("", { base: true })],
    variables: [vstr("Accion", "")],
    instances: I,
    events: [
      COMMENT("SELECCIÓN DE CLASE — crea una partida nueva con la clase elegida."),
      E([JUST_BEGINS()], [centerCamera(), TEXT("TextoTitulo", q("ELIGE TU CLASE")), TINT("FondoTitulo", "110;90;100"),
        A("ScalableCapability::ScalableBehavior::SetValue", "HeroePreview", "Scale", "=", 2), TEXT("TextoBoton", q("ELEGIR"))], perClass),
      E([], [
        SETS("Accion", "=", q("")),
        A("ScalableCapability::ScalableBehavior::SetValue", "FondoTitulo", "Scale", "=", "max(1, (CameraWidth() + 8) / 1290)"),
        SETX("FondoTitulo", "=", "CameraX() - FondoTitulo.Width() / 2"), A("SetY", "FondoTitulo", "=", "CameraY() - FondoTitulo.Height() / 2"),
        SETX("TextoTitulo", "=", "640 - TextoTitulo.Width() / 2"),
        SETX("TextoClase", "=", "TextoClase.CX - TextoClase.Width() / 2"),
        SETX("TextoDesc", "=", "TextoDesc.CX - TextoDesc.Width() / 2"),
        SETX("TextoBoton", "=", "TextoBoton.CX - TextoBoton.Width() / 2"),
      ]),
      tapButtons(),
      FOREACH("HeroePreview", [...TAP_ON("HeroePreview")], [ANIM("HeroePreview", "HeroePreview.Clase + \"_Attack\""), SOUND("assets/audio/tajo.wav", 50)]),
      E([ANIM_END("HeroePreview")], [ANIM("HeroePreview", "HeroePreview.Clase + \"_Idle\"")]),
      E([KEY_JUST("Num1")], [SETS("Accion", "=", q("Guerrero"))]),
      E([KEY_JUST("Num2")], [SETS("Accion", "=", q("Maga"))]),
      E([KEY_JUST("Num3")], [SETS("Accion", "=", q("Arquera"))]),
      ...CLASES.map((c) => E([IFS("Accion", "=", q(c))], newGame(c))),
    ],
  };
}
