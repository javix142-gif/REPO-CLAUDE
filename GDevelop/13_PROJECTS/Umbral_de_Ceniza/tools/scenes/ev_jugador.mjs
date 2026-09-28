// External events "EV_Jugador": stats, input, movement, attacks, skills, potion.
import { q, C, A, NOT, OR, E, ELSE, REPEAT, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  ANIM_END, ANIM_PAUSE, FLIPX, OPACITY, SIZE, SCALE, TINT, CREATE, DEL, XY, HIDE, SOUND, DT, JUST_BEGINS, KEY, TOUCH_BTN,
  PLAT, SPEED, MAXSPEED } from "../lib/dsl.mjs";
import { CLASES } from "./common.mjs";

export const CLASS = {
  Guerrero: { vida: [160, 18], mana: [40, 3], atq: [12, 2.5], def: [6, 1], crit: 0.1, regen: 3, cdAtk: 0.4, hitT: 0.06,
    cd: [5, 6, 14], cost: [12, 14, 20] },
  Maga: { vida: [100, 11], mana: [110, 8], atq: [15, 3], def: [3, 0.6], crit: 0.1, regen: 6, cdAtk: 0.44, hitT: 0.06,
    cd: [5, 7, 14], cost: [16, 24, 20] },
  Arquera: { vida: [120, 14], mana: [70, 5], atq: [13, 2.8], def: [4, 0.8], crit: 0.18, regen: 4, cdAtk: 0.34, hitT: 0.12,
    cd: [3.5, 7, 6], cost: [10, 18, 12] },
};

const J = "Jugador";
const est = (s) => OIFS(J, "Estado", "=", q(s));
const notEst = (s) => OIFS(J, "Estado", "!=", q(s));
const hab = (s) => OIFS(J, "Hab", "=", q(s));
const clsAnim = (a) => ANIM(J, `Save.Clase + ${q("_" + a)}`);
const backToFree = () => [OSETS(J, "Estado", "=", q("libre")), OSETS(J, "Hab", "=", q("")), MAXSPEED(J, PLAT, 270)];

/** Player hitbox (actions). follow: attach to the player with offsets. Use hitE() to get it as its own sub-event. */
export const hitbox = ({ x, y, w, h, dano, vida = 0.1, congela = 0, follow = false, offX = "0", offY = "0" }) => [
  CREATE("GolpeJugador", x, y),
  SIZE("GolpeJugador", w, h),
  OSET("GolpeJugador", "Dano", "=", dano),
  OSET("GolpeJugador", "Vida", "=", vida),
  OSET("GolpeJugador", "Congela", "=", congela),
  OSET("GolpeJugador", "Id", "=", "NextId"),
  SET("NextId", "+", 1),
  OSET("GolpeJugador", "Sigue", "=", follow ? 1 : 0),
  OSET("GolpeJugador", "OffX", "=", offX),
  OSET("GolpeJugador", "OffY", "=", offY),
  HIDE("GolpeJugador"),
];

/** Player hitbox as an isolated sub-event (several "Create" of one object in one event would share the picking). */
export const hitE = (o) => E([], hitbox(o));

/** Visual effect at a position (optionally following the player). */
export const fx = (anim, x, y, { vida = 0, follow = false, offX = "0", offY = "0", scale = null, z = 30 } = {}) => [
  CREATE("Efecto", x, y),
  ANIM("Efecto", q(anim)),
  OSET("Efecto", "Vida", "=", vida),
  OSET("Efecto", "Sigue", "=", follow ? 1 : 0),
  OSET("Efecto", "OffX", "=", offX),
  OSET("Efecto", "OffY", "=", offY),
  A("SetZOrder", "Efecto", "=", z),
  ...(scale ? [SCALE("Efecto", scale)] : []),
];
/** Effect as an isolated sub-event, with optional sub-events (e.g. flip). */
export const fxE = (anim, x, y, opts = {}, subs = []) => E([], fx(anim, x, y, opts), subs);
const flipFxByDir = (obj = "Efecto") => E([OIFN(J, "Dir", "<", 0)], [FLIPX(obj, true)]);

const heal = (frac) => OSET(J, "HP", "=", `min(Stat.VidaMax, Jugador.HP + Stat.VidaMax * ${frac})`);

// ---------------------------------------------------------------------------
function statsEvents() {
  const perClass = CLASES.map((c) => {
    const d = CLASS[c];
    const lv = (a) => `round(${a[0]} + ${a[1]} * (Save.Nivel - 1))`;
    return E([IFS("Save.Clase", "=", q(c))], [
      SET("Stat.VidaMax", "=", lv(d.vida)), SET("Stat.ManaMax", "=", lv(d.mana)), SET("Stat.Atq", "=", lv(d.atq)),
      SET("Stat.Def", "=", lv(d.def)), SET("Stat.Crit", "=", d.crit), SET("Stat.RegenMP", "=", `${d.regen} + Save.Nivel * 0.1`),
      SET("Stat.CdAtk", "=", d.cdAtk), SET("Stat.HitT", "=", d.hitT),
      SET("Stat.Cd1Max", "=", d.cd[0]), SET("Stat.Cd2Max", "=", d.cd[1]), SET("Stat.Cd3Max", "=", d.cd[2]),
      SET("Stat.Costo1", "=", d.cost[0]), SET("Stat.Costo2", "=", d.cost[1]), SET("Stat.Costo3", "=", d.cost[2]),
    ]);
  });
  return GROUP("Estadísticas del personaje", [
    COMMENT("Las estadísticas se recalculan cuando RecalcStats = 1 (inicio de escena, subir de nivel, equipar o mejorar)."),
    E([JUST_BEGINS(), IFS("Save.Clase", "=", q(""))], [SETS("Save.Clase", "=", q("Guerrero"))]),
    E([IFN("RecalcStats", "=", 1)], [], [
      ...perClass,
      E([], [
        SET("Stat.VidaMax", "=", "Stat.VidaMax + Save.ArmaduraBonus + Save.Refuerzo * 15"),
        SET("Stat.Def", "=", "round(Stat.Def + Save.Refuerzo + floor(Save.ArmaduraBonus / 12))"),
        SET("Stat.Atq", "=", "round(Stat.Atq + Save.ArmaBonus + Save.Forja * 3)"),
        SET("Stat.ExpSig", "=", "round(50 * pow(Save.Nivel, 1.45))"),
        OSET(J, "HP", "=", "min(Jugador.HP, Stat.VidaMax)"),
        OSET(J, "MP", "=", "min(Jugador.MP, Stat.ManaMax)"),
        SET("RecalcStats", "=", 0),
      ]),
    ]),
    E([IFN("CurarTodo", "=", 1)], [OSET(J, "HP", "=", "Stat.VidaMax"), OSET(J, "MP", "=", "Stat.ManaMax"), SET("CurarTodo", "=", 0)]),
    E([JUST_BEGINS()], [
      clsAnim("Idle"),
      ANIM("BotonAtaque", "Save.Clase"), ANIM("BotonHab1", "Save.Clase"), ANIM("BotonHab2", "Save.Clase"),
      ANIM("BotonHab3", "Save.Clase"), ANIM("Retrato", "Save.Clase"), ANIM_PAUSE("MascaraCD"),
      A("SetCameraCenterX", "=", "640", q("Menu")), A("HideLayer", q("Menu")),
    ]),
  ]);
}

function inputEvents() {
  const btn = (v, touch, ...keys) => E([OR(TOUCH_BTN(touch), ...keys.map((k) => KEY(k)))], [SET(`In.${v}`, "=", 1)]);
  return GROUP("Controles", [
    COMMENT("Táctil: joystick + botones (extensión oficial Multitouch joystick). Teclado: flechas/A-D, Espacio/W salto, J ataque, K/L/I habilidades, H poción, E interactuar."),
    E([], [SET("In.Atk", "=", 0), SET("In.S1", "=", 0), SET("In.S2", "=", 0), SET("In.S3", "=", 0), SET("In.Pot", "=", 0), SET("In.Acc", "=", 0)]),
    E([IFS("Menu", "=", q("")), notEst("muerto")], [], [
      btn("Atk", "Atk", "j", "x"),
      btn("S1", "S1", "k", "Numpad1"),
      btn("S2", "S2", "l", "Numpad2"),
      btn("S3", "S3", "i", "Numpad3"),
      btn("Pot", "Pot", "h", "q"),
      btn("Acc", "Acc", "e", "Return"),
      E([KEY("a")], [A("PlatformBehavior::SimulateLeftKey", J, PLAT)]),
      E([KEY("d")], [A("PlatformBehavior::SimulateRightKey", J, PLAT)]),
      E([KEY("w")], [A("PlatformBehavior::SimulateJumpKey", J, PLAT)]),
      E([KEY("s")], [A("PlatformBehavior::SimulateDownKey", J, PLAT)]),
    ]),
    COMMENT("Con un menú abierto o muerto, el personaje no recibe controles."),
    E([OR(NOT(IFS("Menu", "=", q(""))), est("muerto"))], [
      A("ActivateBehavior", J, "Mapeo", "no"), A("PlatformBehavior::IgnoreDefaultControls", J, PLAT, "yes"),
    ]),
    ELSE([], [A("ActivateBehavior", J, "Mapeo", "yes"), A("PlatformBehavior::IgnoreDefaultControls", J, PLAT, "no")]),
  ]);
}

function timersAndLook() {
  return GROUP("Temporizadores, orientación y animación", [
    E([], [
      OSET(J, "CdAtk", "=", "max(0, Jugador.CdAtk - TimeDelta())"),
      OSET(J, "Cd1", "=", "max(0, Jugador.Cd1 - TimeDelta())"),
      OSET(J, "Cd2", "=", "max(0, Jugador.Cd2 - TimeDelta())"),
      OSET(J, "Cd3", "=", "max(0, Jugador.Cd3 - TimeDelta())"),
      OSET(J, "Inv", "=", "max(0, Jugador.Inv - TimeDelta())"),
      OSET(J, "Buff", "=", "max(0, Jugador.Buff - TimeDelta())"),
      OSET(J, "Escudo", "=", "max(0, Jugador.Escudo - TimeDelta())"),
      OSET(J, "Accion", "+", DT),
      SET("CdPot", "=", "max(0, CdPot - TimeDelta())"),
    ]),
    E([notEst("muerto")], [OSET(J, "MP", "=", "min(Stat.ManaMax, Jugador.MP + Stat.RegenMP * TimeDelta())")]),
    E([est("libre")], [], [
      E([C("PlatformBehavior::PlatformerObjectBehavior::IsUsingControl", J, PLAT, q("Left"))], [OSET(J, "Dir", "=", -1)]),
      E([C("PlatformBehavior::PlatformerObjectBehavior::IsUsingControl", J, PLAT, q("Right"))], [OSET(J, "Dir", "=", 1)]),
      E([C("PlatformBehavior::IsOnFloor", J, PLAT)], [], [
        E([C("PlatformBehavior::PlatformerObjectBehavior::IsMovingEvenALittle", J, PLAT)], [clsAnim("Run")]),
        ELSE([], [clsAnim("Idle")]),
      ]),
      E([C("PlatformBehavior::IsJumping", J, PLAT)], [clsAnim("Jump")]),
      E([C("PlatformBehavior::IsFalling", J, PLAT)], [clsAnim("Fall")]),
    ]),
    E([OIFN(J, "Dir", "<", 0)], [FLIPX(J, true)]),
    ELSE([], [FLIPX(J, false)]),
    E([OIFN(J, "Inv", ">", 0), notEst("muerto")], [OPACITY(J, "150 + 105 * mod(floor(TimeFromStart() * 18), 2)")]),
    ELSE([], [OPACITY(J, 255)]),
    E([OIFN(J, "Buff", ">", 0)], [TINT(J, "255;196;150")]),
    ELSE([], [TINT(J, "255;255;255")]),
  ]);
}

function attackEvents() {
  const G = "Guerrero", M = "Maga", R = "Arquera";
  return GROUP("Ataque básico", [
    E([IFN("In.Atk", "=", 1), OIFN(J, "CdAtk", "<=", 0), est("libre")], [
      OSETS(J, "Estado", "=", q("ataque")), OSET(J, "Accion", "=", 0), OSET(J, "Golpeo", "=", 0),
      OSET(J, "CdAtk", "=", "Stat.CdAtk"), clsAnim("Attack"), MAXSPEED(J, PLAT, 70),
    ]),
    E([est("ataque"), OIFN(J, "Golpeo", "=", 0), CMP("Jugador.Accion", ">=", "Stat.HitT")], [OSET(J, "Golpeo", "=", 1)], [
      E([IFS("Save.Clase", "=", q(G))], [SOUND("assets/audio/tajo.wav", 55, "RandomFloatInRange(0.9, 1.1)")], [
        hitE({ x: "Jugador.X() + Jugador.Dir * 64", y: "Jugador.Y() - 48", w: 150, h: 112, dano: 1, vida: 0.1 }),
        fxE("Tajo", "Jugador.X() + Jugador.Dir * 60", "Jugador.Y() - 50", {}, [flipFxByDir()]),
      ]),
      E([IFS("Save.Clase", "=", q(M))], [
        CREATE("ProyectilJugador", "Jugador.X() + Jugador.Dir * 52", "Jugador.Y() - 64"),
        ANIM("ProyectilJugador", q("Fuego")), OSET("ProyectilJugador", "VX", "=", "Jugador.Dir * 720"),
        OSET("ProyectilJugador", "VY", "=", 0), OSET("ProyectilJugador", "Dano", "=", 1), OSET("ProyectilJugador", "Vida", "=", 1),
        OSET("ProyectilJugador", "Perfora", "=", 0), OSETS("ProyectilJugador", "Tipo", "=", q("Fuego")),
        OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1),
        SOUND("assets/audio/fuego.wav", 45, "RandomFloatInRange(0.95, 1.1)"),
      ], [
        flipFxByDir("ProyectilJugador"),
        fxE("Destello", "Jugador.X() + Jugador.Dir * 52", "Jugador.Y() - 64"),
      ]),
      E([IFS("Save.Clase", "=", q(R))], [
        CREATE("ProyectilJugador", "Jugador.X() + Jugador.Dir * 44", "Jugador.Y() - 58"),
        ANIM("ProyectilJugador", q("Flecha")), OSET("ProyectilJugador", "VX", "=", "Jugador.Dir * 1150"),
        OSET("ProyectilJugador", "VY", "=", 0), OSET("ProyectilJugador", "Dano", "=", 1), OSET("ProyectilJugador", "Vida", "=", 0.7),
        OSET("ProyectilJugador", "Perfora", "=", 0), OSETS("ProyectilJugador", "Tipo", "=", q("Flecha")),
        OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1),
        SOUND("assets/audio/flecha.wav", 50, "RandomFloatInRange(0.95, 1.1)"),
      ], [flipFxByDir("ProyectilJugador")]),
    ]),
    E([est("ataque"), C("AnimatableCapability::AnimatableBehavior::HasAnimationEnded", J, "Animation")], backToFree()),
  ]);
}

function skillEvents() {
  const start = (n) => E([IFN(`In.S${n}`, "=", 1), OIFN(J, `Cd${n}`, "<=", 0), est("libre"), CMP("Jugador.MP", ">=", `Stat.Costo${n}`)], [
    OSET(J, "MP", "-", `Stat.Costo${n}`), OSET(J, `Cd${n}`, "=", `Stat.Cd${n}Max`), OSETS(J, "Estado", "=", q("hab")),
    OSETS(J, "Hab", "=", `Save.Clase + ToString(${n})`), OSET(J, "Accion", "=", 0), OSET(J, "Paso", "=", 0),
    OSET(J, "Golpeo", "=", 0), SET("Stats.Habilidades", "+", 1),
  ]);
  const init = (acts, subs = []) => E([OIFN(J, "Golpeo", "=", 0)], [OSET(J, "Golpeo", "=", 1), ...acts], subs);
  const endOnAnim = () => E([ANIM_END(J)], backToFree());

  return GROUP("Habilidades", [
    COMMENT("Cada clase tiene 3 habilidades (Estado = \"hab\", Hab = Clase + número). Coste de maná y enfriamiento en Stat.*"),
    start(1), start(2), start(3),
    // ---------------- Guerrero
    E([est("hab"), hab("Guerrero1")], [], [
      COMMENT("Torbellino: 3 golpes en área alrededor del guerrero."),
      init([clsAnim("Attack"), MAXSPEED(J, PLAT, 140)], [fxE("Torbellino", "Jugador.X()", "Jugador.Y() - 48", { vida: 0.6, follow: true, offY: "-48" })]),
      E([OIFN(J, "Paso", "<", 3), CMP("Jugador.Accion", ">=", "Jugador.Paso * 0.18")], [
        OSET(J, "Paso", "+", 1), SOUND("assets/audio/tajo.wav", 55, "0.8 + Jugador.Paso * 0.1"),
      ], [hitE({ x: "Jugador.X()", y: "Jugador.Y() - 48", w: 300, h: 140, dano: 0.9, vida: 0.08, follow: true, offY: "-48" })]),
      E([CMP("mod(floor(Jugador.Accion * 14), 2)", "=", 0)], [FLIPX(J, true)]),
      ELSE([], [FLIPX(J, false)]),
      E([OIFN(J, "Accion", ">=", 0.56)], backToFree()),
    ]),
    E([est("hab"), hab("Guerrero2")], [], [
      COMMENT("Embestida: carga hacia delante, invulnerable, golpe fuerte."),
      init([clsAnim("Attack"), OSET(J, "Inv", "=", "max(Jugador.Inv, 0.45)"), MAXSPEED(J, PLAT, 1300),
        SOUND("assets/audio/grito.wav", 40, 1.4)], [
        hitE({ x: "Jugador.X() + Jugador.Dir * 50", y: "Jugador.Y() - 48", w: 160, h: 115, dano: 1.8, vida: 0.3, follow: true,
          offX: "Jugador.Dir * 50", offY: "-48" }),
        fxE("Polvo", "Jugador.X()", "Jugador.Y() - 14", {}, [flipFxByDir()]),
      ]),
      E([OIFN(J, "Accion", "<", 0.26)], [SPEED(J, PLAT, "Jugador.Dir * 1300")]),
      ELSE([], [...backToFree(), SPEED(J, PLAT, "Jugador.Dir * 200")]),
    ]),
    E([est("hab"), hab("Guerrero3")], [], [
      COMMENT("Grito de guerra: cura 25% y +35% de ataque durante 8 s."),
      init([clsAnim("Cast"), heal(0.25), OSET(J, "Buff", "=", 8), SOUND("assets/audio/grito.wav", 70)], [
        fxE("Grito", "Jugador.X()", "Jugador.Y() - 48", { follow: true, offY: "-48" }),
        fxE("Curacion", "Jugador.X()", "Jugador.Y() - 50", { follow: true, offY: "-50" })]),
      endOnAnim(),
    ]),
    // ---------------- Maga
    E([est("hab"), hab("Maga1")], [], [
      COMMENT("Nova de escarcha: área alrededor que congela."),
      init([clsAnim("Cast")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.1)], [
        OSET(J, "Paso", "=", 1), SOUND("assets/audio/hielo.wav", 70), SET("Temblor", "=", 0.15), SET("FuerzaTemblor", "=", 4),
      ], [
        hitE({ x: "Jugador.X()", y: "Jugador.Y() - 48", w: 340, h: 300, dano: 1.5, vida: 0.1, congela: 1.8 }),
        fxE("Nova", "Jugador.X()", "Jugador.Y() - 48"),
      ]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Maga2")], [], [
      COMMENT("Meteoro: cae delante y explota al tocar el suelo (ver EV_Combate)."),
      init([clsAnim("Cast")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.14)], [
        OSET(J, "Paso", "=", 1),
        CREATE("ProyectilJugador", "Jugador.X() + Jugador.Dir * 40", "Jugador.Y() - 620"),
        ANIM("ProyectilJugador", q("Meteoro")), OSET("ProyectilJugador", "VX", "=", "Jugador.Dir * 330"),
        OSET("ProyectilJugador", "VY", "=", 1000), OSET("ProyectilJugador", "Dano", "=", 0), OSET("ProyectilJugador", "Vida", "=", 3),
        OSETS("ProyectilJugador", "Tipo", "=", q("Meteoro")), OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1),
        SOUND("assets/audio/fuego.wav", 70, 0.7),
      ], [flipFxByDir("ProyectilJugador")]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Maga3")], [], [
      COMMENT("Barrera arcana: -65% de daño recibido durante 6 s y cura 15%."),
      init([clsAnim("Cast"), OSET(J, "Escudo", "=", 6), heal(0.15), SOUND("assets/audio/escudo.wav", 70)], [
        fxE("Escudo", "Jugador.X()", "Jugador.Y() - 46", { vida: 6, follow: true, offY: "-46", z: 25 })]),
      endOnAnim(),
    ]),
    // ---------------- Arquera
    E([est("hab"), hab("Arquera1")], [], [
      COMMENT("Disparo triple: tres flechas perforantes en abanico."),
      init([clsAnim("Attack")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.12)], [OSET(J, "Paso", "=", 1), SET("Tmp.N", "=", -1),
        SOUND("assets/audio/flecha.wav", 60, 0.9)], [
        REPEAT(3, [], [], [E([], [
          CREATE("ProyectilJugador", "Jugador.X() + Jugador.Dir * 44", "Jugador.Y() - 58"),
          ANIM("ProyectilJugador", q("Flecha")),
          OSET("ProyectilJugador", "VX", "=", "Jugador.Dir * 1150 * cos(ToRad(Tmp.N * 9))"),
          OSET("ProyectilJugador", "VY", "=", "1150 * sin(ToRad(Tmp.N * 9))"),
          A("SetAngle", "ProyectilJugador", "=", "Tmp.N * 9 * Jugador.Dir"),
          OSET("ProyectilJugador", "Dano", "=", 1.1), OSET("ProyectilJugador", "Vida", "=", 0.75),
          OSET("ProyectilJugador", "Perfora", "=", 1), OSETS("ProyectilJugador", "Tipo", "=", q("Flecha")),
          OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1), SET("Tmp.N", "+", 1),
        ], [flipFxByDir("ProyectilJugador")])]),
      ]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Arquera2")], [], [
      COMMENT("Lluvia de flechas: 10 flechas caen delante de la arquera."),
      init([clsAnim("Cast")]),
      E([OIFN(J, "Paso", "<", 10), CMP("Jugador.Accion", ">=", "0.15 + Jugador.Paso * 0.06")], [
        CREATE("ProyectilJugador", "Jugador.X() + Jugador.Dir * (170 + Jugador.Paso * 36) + RandomInRange(-15, 15)", "Jugador.Y() - 650"),
        ANIM("ProyectilJugador", q("Flecha")), OSET("ProyectilJugador", "VX", "=", "Jugador.Dir * 120"),
        OSET("ProyectilJugador", "VY", "=", 1250), A("SetAngle", "ProyectilJugador", "=", "90 - 6 * Jugador.Dir"),
        OSET("ProyectilJugador", "Dano", "=", 0.85), OSET("ProyectilJugador", "Vida", "=", 1.2),
        OSET("ProyectilJugador", "Perfora", "=", 0), OSETS("ProyectilJugador", "Tipo", "=", q("Lluvia")),
        OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1), OSET(J, "Paso", "+", 1),
        SOUND("assets/audio/flecha.wav", 30, "RandomFloatInRange(1.1, 1.4)"),
      ]),
      E([OIFN(J, "Paso", ">=", 10), ANIM_END(J)], backToFree()),
    ]),
    E([est("hab"), hab("Arquera3")], [], [
      COMMENT("Paso sombrío: salto atrás invulnerable, humo que daña y cura 10%."),
      init([clsAnim("Fall"), OSET(J, "Inv", "=", "max(Jugador.Inv, 0.6)"), MAXSPEED(J, PLAT, 1100), heal(0.1),
        SOUND("assets/audio/salto.wav", 60, 0.7)], [
        hitE({ x: "Jugador.X()", y: "Jugador.Y() - 48", w: 180, h: 130, dano: 0.9, vida: 0.1 }),
        fxE("Humo", "Jugador.X()", "Jugador.Y() - 46")]),
      E([OIFN(J, "Accion", "<", 0.22)], [SPEED(J, PLAT, "-Jugador.Dir * 1100")]),
      ELSE([], [...backToFree(), SPEED(J, PLAT, 0)]),
    ]),
  ]);
}

function stateEvents() {
  return GROUP("Poción, daño y muerte", [
    E([IFN("In.Pot", "=", 1), IFN("Save.Pociones", ">", 0), IFN("CdPot", "<=", 0), CMP("Jugador.HP", "<", "Stat.VidaMax"), notEst("muerto")], [
      SET("Save.Pociones", "-", 1), heal(0.4), SET("CdPot", "=", 1), SET("Guardar", "=", 1), SET("Stats.Pociones", "+", 1),
      SOUND("assets/audio/pocion.wav", 70),
    ], [fxE("Curacion", "Jugador.X()", "Jugador.Y() - 50", { follow: true, offY: "-50" })]),
    E([est("herido"), OIFN(J, "Accion", ">=", 0.3)], [OSETS(J, "Estado", "=", q("libre")), MAXSPEED(J, PLAT, 270)]),
    E([OIFN(J, "HP", "<=", 0), notEst("muerto")], [
      OSETS(J, "Estado", "=", q("muerto")), OSETS(J, "Hab", "=", q("")), OSET(J, "Accion", "=", 0), clsAnim("Dead"),
      SPEED(J, PLAT, 0), SOUND("assets/audio/derrota.wav", 80), SET("Temblor", "=", 0.3), SET("FuerzaTemblor", "=", 6),
    ]),
  ]);
}

function followers() {
  return GROUP("Golpes y efectos que siguen al jugador", [
    E([OIFN("GolpeJugador", "Sigue", "=", 1)], [XY("GolpeJugador", "Jugador.X() + GolpeJugador.OffX", "Jugador.Y() + GolpeJugador.OffY")]),
    E([OIFN("Efecto", "Sigue", "=", 1)], [XY("Efecto", "Jugador.X() + Efecto.OffX", "Jugador.Y() + Efecto.OffY")]),
    E([OIFN("Efecto", "Vida", ">", 0)], [OSET("Efecto", "Vida", "-", DT)], [
      E([OIFN("Efecto", "Vida", "<=", 0)], [DEL("Efecto")]),
    ]),
    E([OIFN("Efecto", "Vida", "=", 0), ANIM_END("Efecto")], [DEL("Efecto")]),
  ]);
}

export function evJugador() {
  return [
    COMMENT("EV_Jugador — eventos compartidos por Pueblo y Mazmorra (enlazados con un evento 'Enlace')."),
    statsEvents(),
    inputEvents(),
    timersAndLook(),
    attackEvents(),
    skillEvents(),
    stateEvents(),
    followers(),
  ];
}
