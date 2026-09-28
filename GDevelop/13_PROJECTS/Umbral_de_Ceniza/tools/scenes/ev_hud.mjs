// External events "EV_HUD" (bars, cooldowns, toasts) + a data-driven menu system used by scenes.
import { q, C, A, NOT, OR, E, ELSE, FOREACH, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  OPACITY, WIDTH, TEXT, TCOLOR, SETX, SETY, HIDE, SHOW, SOUND, DT, TAP_ON } from "../lib/dsl.mjs";

const J = "Jugador";

function bars() {
  return GROUP("Barras y textos del HUD", [
    E([], [
      WIDTH("BarraVida", "300 * clamp(Jugador.HP / Stat.VidaMax, 0, 1)"),
      WIDTH("BarraMana", "300 * clamp(Jugador.MP / Stat.ManaMax, 0, 1)"),
      WIDTH("BarraExp", "300 * clamp(Save.Exp / Stat.ExpSig, 0, 1)"),
      TEXT("TextoNivel", "ToString(Save.Nivel)"), SETX("TextoNivel", "=", "114 - TextoNivel.Width() / 2"),
      TEXT("TextoVida", "ToString(max(0, ceil(Jugador.HP))) + \" / \" + ToString(Stat.VidaMax)"),
      TEXT("TextoOro", "ToString(Save.Oro)"),
      TEXT("TextoPociones", "\"x\" + ToString(Save.Pociones)"),
    ]),
    ...[1, 2, 3].flatMap((n) => [
      E([OIFN("MascaraCD", "Slot", "=", n)], [A("ChangeSprite", "MascaraCD", "=", `round(16 * Jugador.Cd${n} / Stat.Cd${n}Max)`)]),
      E([OIFN("TextoCD", "Slot", "=", n)], [TEXT("TextoCD", q(""))], [
        E([OIFN(J, `Cd${n}`, ">", 0)], [TEXT("TextoCD", `ToString(ceil(Jugador.Cd${n}))`)]),
      ]),
      E([CMP("Jugador.MP", "<", `Stat.Costo${n}`)], [OPACITY(`BotonHab${n}`, 110)]),
      ELSE([], [OPACITY(`BotonHab${n}`, 255)]),
    ]),
    E([OR(IFN("Save.Pociones", "<=", 0), IFN("CdPot", ">", 0))], [OPACITY("BotonPocion", 110)]),
    ELSE([], [OPACITY("BotonPocion", 255)]),
    COMMENT("Aviso central (equipo, nivel, salas)."),
    E([OIFN("TextoAviso", "Vida", ">", 0)], [
      OSET("TextoAviso", "Vida", "-", DT), OPACITY("TextoAviso", "255 * clamp(TextoAviso.Vida * 1.6, 0, 1)"),
      SETX("TextoAviso", "=", "CameraX(\"HUD\") - TextoAviso.Width() / 2"),
    ]),
    ELSE([], [OPACITY("TextoAviso", 0)]),
  ]);
}

export function evHud() {
  return [COMMENT("EV_HUD — interfaz compartida por Pueblo y Mazmorra."), bars()];
}

/**
 * Menu system for a scene. menus: { id: { title, body, buttons:[{label, action}], close, arrows } }
 * Open a menu with SETS("MenuAbrir", "=", q(id)). Button taps store the action in scene var "Accion".
 */
export function menuSystem(menus) {
  const ev = [COMMENT("Sistema de menús: MenuAbrir abre un menú; los botones escriben su acción en la variable Accion.")];
  ev.push(E([C("SceneJustBegins")], [], [E([OIFN("Flecha", "Paso", "=", 1)], [ANIM("Flecha", q("Der"))])]));
  ev.push(E([], [SETS("Accion", "=", q(""))]));
  for (const [id, m] of Object.entries(menus)) {
    const open = [
      SETS("Menu", "=", q(id)), SETS("MenuAbrir", "=", q("")), A("ShowLayer", q("Menu")), SOUND("assets/audio/click.wav", 50),
      m.close ? SHOW("BotonCerrar") : HIDE("BotonCerrar"),
      m.arrows ? SHOW("Flecha") : HIDE("Flecha"),
      HIDE("BotonMenu"), HIDE("TextoBoton"),
    ];
    const subs = m.buttons.map((b, i) => [
      E([OIFN("BotonMenu", "Slot", "=", i + 1)], [SHOW("BotonMenu"), OSETS("BotonMenu", "Accion", "=", q(b.action))]),
      E([OIFN("TextoBoton", "Slot", "=", i + 1)], [SHOW("TextoBoton")]),
    ]).flat();
    ev.push(E([IFS("MenuAbrir", "=", q(id))], open, subs));
    // live refresh of texts while open
    const refresh = [TEXT("TextoTitulo", m.title), TEXT("TextoMenu", m.body)];
    const labelSubs = m.buttons.map((b, i) => E([OIFN("TextoBoton", "Slot", "=", i + 1)], [TEXT("TextoBoton", b.label)]));
    ev.push(E([IFS("Menu", "=", q(id))], refresh, labelSubs));
  }
  ev.push(
    E([NOT(IFS("Menu", "=", q("")))], [
      SETX("TextoTitulo", "=", "640 - TextoTitulo.Width() / 2"),
      SETX("TextoMenu", "=", "640 - TextoMenu.Width() / 2"),
      SETX("TextoBoton", "=", "TextoBoton.CX - TextoBoton.Width() / 2"),
    ], [
      E([IFN("MenuFrames", ">=", 1)], [], [
        FOREACH("BotonMenu", [...TAP_ON("BotonMenu"), C("Visible", "BotonMenu")], [SETS("Accion", "=", "BotonMenu.Accion"), SOUND("assets/audio/click.wav", 60)]),
        E([...TAP_ON("BotonCerrar"), C("Visible", "BotonCerrar")], [SETS("Accion", "=", q("cerrar"))]),
        FOREACH("Flecha", [...TAP_ON("Flecha"), C("Visible", "Flecha")], [SETS("Accion", "=", "\"flecha\" + ToString(Flecha.Paso)"), SOUND("assets/audio/click.wav", 60)]),
        E([C("KeyFromTextJustPressed", q("Escape"))], [SETS("Accion", "=", q("cerrar"))]),
      ]),
    ]),
    E([IFS("Accion", "=", q("cerrar"))], [SETS("Menu", "=", q("")), A("HideLayer", q("Menu"))]),
    E([NOT(IFS("Menu", "=", q("")))], [SET("MenuFrames", "+", 1)]),
    ELSE([], [SET("MenuFrames", "=", 0)]),
  );
  return GROUP("Menús", ev);
}
