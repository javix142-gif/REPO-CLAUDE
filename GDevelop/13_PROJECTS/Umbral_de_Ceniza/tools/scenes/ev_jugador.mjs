// External events "EV_Jugador": stats, input, movement, attacks, skills, potion.
import { q, C, A, NOT, OR, E, ELSE, REPEAT, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  ANIM_END, ANIM_PAUSE, FLIPX, OPACITY, SIZE, SCALE, TINT, CREATE, DEL, XY, HIDE, SOUND, DT, JUST_BEGINS, KEY, KEY_JUST, TOUCH_BTN,
  TOUCH_BTN_JUST, ON_FLOOR, PLAT, SPEED, MAXSPEED } from "../lib/dsl.mjs";
import { CLASES } from "./common.mjs";
import { SKILLS } from "./skills.mjs";
import { floatText, toast } from "./util.mjs";

export const CLASS = {
  Guerrero: { vida: [160, 18], mana: [40, 3], atq: [12, 2.5], def: [6, 1], crit: 0.1, regen: 3, cdAtk: 0.4, hitT: 0.06,
    cd: [5, 6, 14], cost: [12, 14, 20], autoRango: 85, autoAlto: 250 },
  Maga: { vida: [100, 11], mana: [110, 8], atq: [15, 3], def: [3, 0.6], crit: 0.1, regen: 6, cdAtk: 0.44, hitT: 0.06,
    cd: [5, 7, 14], cost: [16, 24, 20], autoRango: 330, autoAlto: 430 },
  Arquera: { vida: [120, 14], mana: [70, 5], atq: [13, 2.8], def: [4, 0.8], crit: 0.18, regen: 4, cdAtk: 0.34, hitT: 0.12,
    cd: [3.5, 7, 6], cost: [10, 18, 12], autoRango: 380, autoAlto: 430 },
};

const J = "Jugador";
const est = (s) => OIFS(J, "Estado", "=", q(s));
const notEst = (s) => OIFS(J, "Estado", "!=", q(s));
const hab = (s) => OIFS(J, "Hab", "=", q(s));
const clsAnim = (a) => ANIM(J, `Save.Clase + ${q("_" + a)}`);
const backToFree = () => [OSETS(J, "Estado", "=", q("libre")), OSETS(J, "Hab", "=", q("")), MAXSPEED(J, PLAT, 270),
  A("PlatformBehavior::JumpSpeed", J, PLAT, "=", 720)];

/** Player hitbox (actions). follow: attach to the player with offsets. Use hitE() to get it as its own sub-event. */
export const hitbox = ({ x, y, w, h, dano, vida = 0.1, congela = 0, follow = false, offX = "0", offY = "0", fuerte = 0 }) => [
  CREATE("GolpeJugador", x, y),
  SIZE("GolpeJugador", w, h),
  OSET("GolpeJugador", "Dano", "=", dano),
  OSET("GolpeJugador", "Vida", "=", vida),
  OSET("GolpeJugador", "Congela", "=", congela),
  OSET("GolpeJugador", "Fuerte", "=", fuerte),
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
export const fx = (anim, x, y, { vida = 0, follow = false, offX = "0", offY = "0", scale = null, z = 30, angle = null } = {}) => [
  CREATE("Efecto", x, y),
  ANIM("Efecto", q(anim)),
  OSET("Efecto", "Vida", "=", vida),
  OSET("Efecto", "Sigue", "=", follow ? 1 : 0),
  OSET("Efecto", "OffX", "=", offX),
  OSET("Efecto", "OffY", "=", offY),
  A("SetZOrder", "Efecto", "=", z),
  ...(scale ? [SCALE("Efecto", scale)] : []),
  ...(angle ? [A("SetAngle", "Efecto", "=", angle)] : []),
];
/** Effect as an isolated sub-event, with optional sub-events (e.g. flip). */
export const fxE = (anim, x, y, opts = {}, subs = []) => E([], fx(anim, x, y, opts), subs);
const flipFxByDir = (obj = "Efecto") => E([OIFN(J, "Dir", "<", 0)], [FLIPX(obj, true)]);

/** Aim geometry of the last attack / skill cast (Jugador.AimA: degrees up, 0 = forward). */
const CA = "cos(ToRad(Jugador.AimA))";
const SA = "sin(ToRad(Jugador.AimA))";
const AIM_ANGLE = "-Jugador.AimA * Jugador.Dir"; // sprites face right; flipX + clockwise angle

/** Player projectile along the aim direction. Each option is an expression string. */
export const shootP = ({ anim, ox = 44, oy = 58, speed, vida, tipo, dano = "Jugador.PotF", scale = "Jugador.PotS", perfora = "Jugador.Final",
  fuerte = "Jugador.Final", spread = "0", sound = null, vol = 50, pitch = 1 }) => [
  CREATE("ProyectilJugador", `Jugador.X() + Jugador.Dir * ${CA} * ${ox}`, `Jugador.Y() - ${oy} - ${SA} * ${ox}`),
  ANIM("ProyectilJugador", q(anim)),
  OSET("ProyectilJugador", "VX", "=", `Jugador.Dir * ${speed} * cos(ToRad(Jugador.AimA + ${spread}))`),
  OSET("ProyectilJugador", "VY", "=", `-${speed} * sin(ToRad(Jugador.AimA + ${spread}))`),
  OSET("ProyectilJugador", "Dano", "=", dano), OSET("ProyectilJugador", "Vida", "=", vida),
  OSET("ProyectilJugador", "Perfora", "=", perfora), OSET("ProyectilJugador", "Fuerte", "=", fuerte),
  OSETS("ProyectilJugador", "Tipo", "=", q(tipo)), OSET("ProyectilJugador", "Id", "=", "NextId"), SET("NextId", "+", 1),
  SCALE("ProyectilJugador", scale), A("SetAngle", "ProyectilJugador", "=", `-(Jugador.AimA + ${spread}) * Jugador.Dir`),
  ...(sound ? [SOUND(sound, vol, pitch)] : []),
];

/** Sets Aim / AimA from the input (used at the start of an attack and of a skill). */
const aimEvents = () => [
  E([IFN("In.Aim", "=", 1)], [OSET(J, "AimA", "=", 45), OSET(J, "Dir", "=", "sign(In.AX)")]),
  E([IFN("In.Aim", "=", 2)], [OSET(J, "AimA", "=", 90)]),
  E([IFN("In.Aim", "=", 3)], [OSET(J, "AimA", "=", -45)]),
];

const heal = (frac) => OSET(J, "HP", "=", `min(Stat.VidaMax, Jugador.HP + Stat.VidaMax * ${frac})`);

// ---------------------------------------------------------------------------
function statsEvents() {
  const perClass = CLASES.map((c, ci) => {
    const d = CLASS[c];
    const lv = (a) => `round(${a[0]} + ${a[1]} * (Save.Nivel - 1))`;
    // cooldown and mana cost of the equipped skill of each slot (Save.Hab1..3 = 1 or 2)
    const slots = SKILLS[c].flatMap((variants, i) => variants.map((v, k) => E([IFN(`Save.Hab${i + 1}`, "=", k + 1)],
      [SET(`Stat.Cd${i + 1}Max`, "=", v.cd), SET(`Stat.Costo${i + 1}`, "=", v.cost)])));
    return E([IFS("Save.Clase", "=", q(c))], [
      SET("Stat.Cls", "=", ci), SET("Stat.VidaMax", "=", lv(d.vida)), SET("Stat.ManaMax", "=", lv(d.mana)), SET("Stat.Atq", "=", lv(d.atq)),
      SET("Stat.Def", "=", lv(d.def)), SET("Stat.Crit", "=", d.crit), SET("Stat.RegenMP", "=", `${d.regen} + Save.Nivel * 0.1`),
      SET("Stat.CdAtk", "=", d.cdAtk), SET("Stat.HitT", "=", d.hitT),
      SET("Stat.AutoRango", "=", d.autoRango), SET("Stat.AutoAlto", "=", d.autoAlto),
    ], slots);
  });
  return GROUP("Estadísticas del personaje", [
    COMMENT("Las estadísticas se recalculan cuando RecalcStats = 1 (inicio de escena, subir de nivel, equipar, mejorar o repartir atributos)."),
    E([JUST_BEGINS(), IFS("Save.Clase", "=", q(""))], [SETS("Save.Clase", "=", q("Guerrero"))]),
    COMMENT("Partidas guardadas con una versión anterior no tienen las ranuras de habilidad: se ponen a la habilidad inicial."),
    ...[1, 2, 3].map((n) => E([JUST_BEGINS(), IFN(`Save.Hab${n}`, "<", 1)], [SET(`Save.Hab${n}`, "=", 1)])),
    E([IFN("RecalcStats", "=", 1)], [], [
      ...perClass,
      COMMENT("Atributos: Fuerza +1 ATQ · Vitalidad +8 vida y +1 DEF cada 5 · Destreza +0,5% crítico y -0,4% enfriamiento del ataque · Espíritu +3 maná, +0,15 regeneración y -0,6% enfriamiento de habilidades."),
      E([], [
        SET("Stat.VidaMax", "=", "Stat.VidaMax + Save.ArmaduraBonus + Save.Refuerzo * 15 + Save.AtVit * 8"),
        SET("Stat.Def", "=", "round(Stat.Def + Save.Refuerzo + floor(Save.ArmaduraBonus / 12) + floor(Save.AtVit / 5))"),
        SET("Stat.Atq", "=", "round(Stat.Atq + Save.ArmaBonus + Save.Forja * 3 + Save.AtFue)"),
        SET("Stat.ManaMax", "=", "Stat.ManaMax + Save.AtEsp * 3"), SET("Stat.RegenMP", "+", "Save.AtEsp * 0.15"),
        SET("Stat.Crit", "=", "min(0.75, Stat.Crit + Save.AtDes * 0.005)"),
        SET("Stat.CdAtk", "=", "Stat.CdAtk * (1 - min(0.3, Save.AtDes * 0.004))"),
        SET("Stat.Cd1Max", "=", "Stat.Cd1Max * (1 - min(0.4, Save.AtEsp * 0.006))"),
        SET("Stat.Cd2Max", "=", "Stat.Cd2Max * (1 - min(0.4, Save.AtEsp * 0.006))"),
        SET("Stat.Cd3Max", "=", "Stat.Cd3Max * (1 - min(0.4, Save.AtEsp * 0.006))"),
        SET("Save.Puntos", "=", "3 * (Save.Nivel - 1) + Save.PuntosExtra - Save.AtFue - Save.AtVit - Save.AtDes - Save.AtEsp"),
        SET("Stat.ExpSig", "=", "round(50 * pow(Save.Nivel, 1.45))"),
        OSET(J, "HP", "=", "min(Jugador.HP, Stat.VidaMax)"),
        OSET(J, "MP", "=", "min(Jugador.MP, Stat.ManaMax)"),
        SET("RecalcStats", "=", 0),
      ]),
    ]),
    E([IFN("CurarTodo", "=", 1)], [OSET(J, "HP", "=", "Stat.VidaMax"), OSET(J, "MP", "=", "Stat.ManaMax"), SET("CurarTodo", "=", 0)]),
    E([JUST_BEGINS()], [
      clsAnim("Idle"),
      ANIM("BotonAtaque", "Save.Clase"), ANIM("Retrato", "Save.Clase"), ANIM_PAUSE("MascaraCD"),
      A("SetCameraCenterX", "=", "640", q("Menu")), A("HideLayer", q("Menu")),
    ]),
  ]);
}

function inputEvents() {
  const btn = (v, touch, ...keys) => E([OR(TOUCH_BTN(touch), ...keys.map((k) => KEY(k)))], [SET(`In.${v}`, "=", 1)]);
  return GROUP("Controles", [
    COMMENT("Táctil: joystick + botones (extensión oficial Multitouch joystick). Teclado: flechas/A-D mover, Espacio/W salto (doble salto en el aire), J ataque, K/L/I habilidades, H poción, E interactuar, ↑ apuntar arriba."),
    E([], [SET("In.Atk", "=", 0), SET("In.S1", "=", 0), SET("In.S2", "=", 0), SET("In.S3", "=", 0), SET("In.Pot", "=", 0), SET("In.Acc", "=", 0),
      SET("In.SaltoJ", "=", 0), SET("In.AX", "=", 0), SET("In.AY", "=", 0), SET("In.Aim", "=", 0)]),
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
      COMMENT("Salto pulsado en este fotograma (para el doble salto)."),
      E([OR(TOUCH_BTN_JUST("A"), KEY_JUST("Space"), KEY_JUST("w"))], [SET("In.SaltoJ", "=", 1)]),
      COMMENT("Dirección de apuntado: joystick (táctil) o flechas. Sirve para atacar hacia arriba o en diagonal."),
      E([], [SET("In.AX", "=", "SpriteMultitouchJoystick::StickForceX(1, \"Primary\")"),
        SET("In.AY", "=", "SpriteMultitouchJoystick::StickForceY(1, \"Primary\")")]),
      E([OR(KEY("a"), KEY("Left"))], [SET("In.AX", "=", -1)]),
      E([OR(KEY("d"), KEY("Right"))], [SET("In.AX", "=", 1)]),
      E([KEY("Up")], [SET("In.AY", "=", -1)]),
      E([OR(KEY("s"), KEY("Down"))], [SET("In.AY", "=", 1)]),
      COMMENT("In.Aim: 0 = de frente, 1 = diagonal hacia arriba, 2 = hacia arriba, 3 = diagonal hacia abajo (sólo en el aire)."),
      E([CMP("In.AY", "<", -0.5)], [SET("In.Aim", "=", 2)], [E([CMP("abs(In.AX)", ">", 0.45)], [SET("In.Aim", "=", 1)])]),
      E([CMP("In.AY", ">", 0.6), NOT(ON_FLOOR())], [SET("In.Aim", "=", 3)]),
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
      OSET(J, "ComboT", "=", "max(0, Jugador.ComboT - TimeDelta())"),
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

/** Double jump: one extra jump in the air (Allow jumping again + simulated jump key). */
function jumpEvents() {
  return GROUP("Doble salto", [
    COMMENT("En el suelo se recupera el salto extra. En el aire, un nuevo toque de salto usa el doble salto (una vez por salto)."),
    E([ON_FLOOR()], [OSET(J, "Saltos", "=", 0)]),
    E([IFN("In.SaltoJ", "=", 1), NOT(ON_FLOOR()), OIFN(J, "Saltos", "<", 1), OR(est("libre"), est("ataque")), notEst("muerto")], [
      A("PlatformBehavior::SetCanJump", J, PLAT), A("PlatformBehavior::SimulateJumpKey", J, PLAT), OSET(J, "Saltos", "+", 1),
      SOUND("assets/audio/salto.wav", 55, 1.4),
    ], [fxE("Salto", "Jugador.X()", "Jugador.Y() - 4")]),
  ]);
}

function attackEvents() {
  const G = "Guerrero", M = "Maga", R = "Arquera";
  const ca = CA, sa = SA, ang = AIM_ANGLE;
  const shoot = shootP;
  return GROUP("Ataque básico, dirección de apuntado y combo", [
    COMMENT("Ataque: de frente, en diagonal hacia arriba o hacia arriba, según el joystick/flechas (In.Aim). Tres ataques seguidos: el tercero (Combo = 3) es potenciado: x1,9 de daño, más grande, perfora y empuja."),
    E([IFN("In.Atk", "=", 1), OIFN(J, "CdAtk", "<=", 0), est("libre")], [
      OSETS(J, "Estado", "=", q("ataque")), OSET(J, "Accion", "=", 0), OSET(J, "Golpeo", "=", 0),
      OSET(J, "CdAtk", "=", "Stat.CdAtk"), MAXSPEED(J, PLAT, 70),
      OSET(J, "Aim", "=", "In.Aim"), OSET(J, "AimA", "=", 0), OSET(J, "PotF", "=", 1), OSET(J, "PotS", "=", 1), OSET(J, "Final", "=", 0),
    ], [
      ...aimEvents(),
      E([OIFN(J, "ComboT", ">", 0)], [OSET(J, "Combo", "+", 1)]),
      ELSE([], [OSET(J, "Combo", "=", 1)]),
      E([OIFN(J, "Combo", ">", 3)], [OSET(J, "Combo", "=", 1)]),
      E([], [OSET(J, "ComboT", "=", "Stat.CdAtk + 0.45")]),
      E([OIFN(J, "Combo", "=", 3)], [OSET(J, "PotF", "=", 1.9), OSET(J, "PotS", "=", 1.4), OSET(J, "Final", "=", 1),
        OSET(J, "CdAtk", "=", "Stat.CdAtk * 1.4")]),
      E([OR(IFN("In.Aim", "=", 0), IFN("In.Aim", "=", 3))], [clsAnim("Attack")]),
      E([IFN("In.Aim", "=", 1)], [clsAnim("AttackDiag")]),
      E([IFN("In.Aim", "=", 2)], [clsAnim("AttackUp")]),
    ]),
    E([est("ataque"), OIFN(J, "Golpeo", "=", 0), CMP("Jugador.Accion", ">=", "Stat.HitT")], [OSET(J, "Golpeo", "=", 1)], [
      E([IFS("Save.Clase", "=", q(G))], [SOUND("assets/audio/tajo.wav", 55, "RandomFloatInRange(0.9, 1.1) - 0.25 * Jugador.Final")], [
        hitE({ x: `Jugador.X() + Jugador.Dir * ${ca} * 64`, y: `Jugador.Y() - 48 - ${sa} * 82`, w: "150 * Jugador.PotS", h: "112 * Jugador.PotS",
          dano: "Jugador.PotF", vida: 0.1, fuerte: "Jugador.Final" }),
        fxE("Tajo", `Jugador.X() + Jugador.Dir * ${ca} * 60`, `Jugador.Y() - 50 - ${sa} * 80`, { scale: "Jugador.PotS", angle: ang }, [flipFxByDir()]),
      ]),
      E([IFS("Save.Clase", "=", q(M))], shoot({ anim: "Fuego", ox: 52, oy: 64, speed: 720, vida: 1, tipo: "Fuego",
        sound: "assets/audio/fuego.wav", vol: 45, pitch: "RandomFloatInRange(0.95, 1.1) - 0.3 * Jugador.Final" }), [
        flipFxByDir("ProyectilJugador"),
        fxE("Destello", `Jugador.X() + Jugador.Dir * ${ca} * 52`, `Jugador.Y() - 64 - ${sa} * 52`, { scale: "Jugador.PotS" }),
      ]),
      E([IFS("Save.Clase", "=", q(R))], shoot({ anim: "Flecha", ox: 44, oy: 58, speed: 1150, vida: 0.7, tipo: "Flecha",
        sound: "assets/audio/flecha.wav", vol: 50, pitch: "RandomFloatInRange(0.95, 1.1) - 0.2 * Jugador.Final" }), [flipFxByDir("ProyectilJugador")]),
      COMMENT("Retroalimentación del combo: texto flotante y, en el golpe final, sacudida, destello y sonido."),
      E([OIFN(J, "Combo", "=", 2)], floatText("Jugador.X()", "Jugador.Y() - 150", q("Combo x2"), "255;255;255", 22)),
      E([OIFN(J, "Final", "=", 1)], [SET("Temblor", "=", "max(Temblor, 0.12)"), SET("FuerzaTemblor", "=", 4), SOUND("assets/audio/critico.wav", 60, 0.8),
        ...floatText("Jugador.X()", "Jugador.Y() - 150", q("¡GOLPE FINAL!"), "255;190;60", 34)], [
        fxE("Impacto", `Jugador.X() + Jugador.Dir * ${ca} * 75`, `Jugador.Y() - 55 - ${sa} * 75`, { scale: 0.8 }),
      ]),
    ]),
    E([est("ataque"), C("AnimatableCapability::AnimatableBehavior::HasAnimationEnded", J, "Animation")], backToFree()),
  ]);
}

function skillEvents() {
  // Input buffer: a skill pressed while attacking or stunned is cast as soon as the hero is free (0.35 s window).
  const buffer = (n) => E([IFN(`In.S${n}`, "=", 1)], [SET("BufHab", "=", n), SET("BufT", "=", 0.35)]);
  const start = (n) => E([IFN("BufHab", "=", n), IFN("BufT", ">", 0), OIFN(J, `Cd${n}`, "<=", 0), est("libre"), CMP("Jugador.MP", ">=", `Stat.Costo${n}`)], [
    OSET(J, "MP", "-", `Stat.Costo${n}`), OSET(J, `Cd${n}`, "=", `Stat.Cd${n}Max`), OSETS(J, "Estado", "=", q("hab")),
    OSETS(J, "Hab", "=", `Save.Clase + ToString(${n})`), OSET(J, "Accion", "=", 0), OSET(J, "Paso", "=", 0),
    OSET(J, "Golpeo", "=", 0), SET("Stats.Habilidades", "+", 1), SET("BufHab", "=", 0),
    OSET(J, "Aim", "=", "In.Aim"), OSET(J, "AimA", "=", 0),
  ], [
    COMMENT("La habilidad equipada en la ranura (Save.Hab1..3): 1 = la inicial, 2 = la desbloqueada (sufijo b)."),
    E([IFN(`Save.Hab${n}`, "=", 2)], [OSETS(J, "Hab", "=", `Save.Clase + ToString(${n}) + "b"`)]),
    ...aimEvents(),
  ]);
  const init = (acts, subs = []) => E([OIFN(J, "Golpeo", "=", 0)], [OSET(J, "Golpeo", "=", 1), ...acts], subs);
  const endOnAnim = () => E([ANIM_END(J)], backToFree());
  const EN = "Enemigo";
  const flipProj = () => flipFxByDir("ProyectilJugador");

  return GROUP("Habilidades", [
    COMMENT("Cada clase tiene 3 ranuras de habilidad (Estado = \"hab\", Hab = Clase + ranura [+ \"b\" si es la segunda habilidad]). Coste y enfriamiento en Stat.* (ver SKILLS en skills.mjs)."),
    buffer(1), buffer(2), buffer(3),
    E([], [SET("BufT", "=", "max(0, BufT - TimeDelta())")]),
    start(1), start(2), start(3),
    // ================================================================ Guerrero
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
    E([est("hab"), hab("Guerrero1b")], [], [
      COMMENT("Ciclón de acero: 6 tajos giratorios en un área enorme mientras avanzas despacio."),
      init([clsAnim("Attack"), MAXSPEED(J, PLAT, 230)], [fxE("Torbellino", "Jugador.X()", "Jugador.Y() - 48", { vida: 1.05, follow: true, offY: "-48", scale: 1.6 })]),
      E([OIFN(J, "Paso", "<", 6), CMP("Jugador.Accion", ">=", "Jugador.Paso * 0.17")], [
        OSET(J, "Paso", "+", 1), SOUND("assets/audio/tajo.wav", 55, "0.7 + Jugador.Paso * 0.07"),
      ], [hitE({ x: "Jugador.X()", y: "Jugador.Y() - 50", w: 400, h: 170, dano: 0.8, vida: 0.08, follow: true, offY: "-50" })]),
      E([CMP("mod(floor(Jugador.Accion * 16), 2)", "=", 0)], [FLIPX(J, true)]),
      ELSE([], [FLIPX(J, false)]),
      E([OIFN(J, "Accion", ">=", 1.1)], backToFree()),
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
    E([est("hab"), hab("Guerrero2b")], [], [
      COMMENT("Salto sísmico: un gran salto hacia delante y, al caer, una onda de choque que aturde."),
      init([clsAnim("Jump"), MAXSPEED(J, PLAT, 560), OSET(J, "Inv", "=", "max(Jugador.Inv, 0.5)"), A("PlatformBehavior::JumpSpeed", J, PLAT, "=", 950),
        A("PlatformBehavior::SetCanJump", J, PLAT), A("PlatformBehavior::SimulateJumpKey", J, PLAT), SOUND("assets/audio/salto.wav", 60, 0.8)]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", "<", 0.5)], [SPEED(J, PLAT, "Jugador.Dir * 480"), A("PlatformBehavior::SimulateJumpKey", J, PLAT)]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.3), ON_FLOOR()], [
        OSET(J, "Paso", "=", 1), OSET(J, "Accion", "=", 0), SPEED(J, PLAT, 0), clsAnim("Attack"),
        SOUND("assets/audio/impacto_suelo.wav", 85), SET("Temblor", "=", 0.4), SET("FuerzaTemblor", "=", 9),
      ], [
        hitE({ x: "Jugador.X()", y: "Jugador.Y() - 50", w: 440, h: 150, dano: 2.6, vida: 0.12, fuerte: 1 }),
        fxE("Impacto", "Jugador.X()", "Jugador.Y() - 30", { scale: 1.8 }),
        fxE("Polvo", "Jugador.X() - 120", "Jugador.Y() - 14", { scale: 1.6 }),
        fxE("Polvo", "Jugador.X() + 120", "Jugador.Y() - 14", { scale: 1.6 }),
      ]),
      E([OIFN(J, "Paso", "=", 1), OIFN(J, "Accion", ">=", 0.35)], backToFree()),
      E([OIFN(J, "Accion", ">=", 2.5)], backToFree()),
    ]),
    E([est("hab"), hab("Guerrero3")], [], [
      COMMENT("Grito de guerra: cura 25% y +35% de ataque durante 8 s."),
      init([clsAnim("Cast"), heal(0.25), OSET(J, "Buff", "=", 8), SOUND("assets/audio/grito.wav", 70)], [
        fxE("Grito", "Jugador.X()", "Jugador.Y() - 48", { follow: true, offY: "-48" }),
        fxE("Curacion", "Jugador.X()", "Jugador.Y() - 50", { follow: true, offY: "-50" })]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Guerrero3b")], [], [
      COMMENT("Espada giratoria: lanza una espada enorme que atraviesa a todos los enemigos en su camino."),
      init([clsAnim("Attack")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.14)], [OSET(J, "Paso", "=", 1), SOUND("assets/audio/tajo.wav", 70, 0.6)], [
        E([], shootP({ anim: "Espada", ox: 50, oy: 60, speed: 820, vida: 1.05, tipo: "Espada", dano: 2.6, scale: 1.6, perfora: 1, fuerte: 1,
          sound: "assets/audio/grito.wav", vol: 45, pitch: 1.6 }), [flipProj()]),
      ]),
      E([OIFN(J, "Paso", "=", 1), CMP("Jugador.Accion", ">=", 0.3)], backToFree()),
    ]),
    // ================================================================ Maga
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
    E([est("hab"), hab("Maga1b")], [], [
      COMMENT("Tormenta de rayos: tres rayos caen del cielo sobre los enemigos más cercanos y los aturden."),
      init([clsAnim("Cast")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.12)], [OSET(J, "Paso", "=", 1), SOUND("assets/audio/explosion.wav", 60, 1.8),
        SET("Temblor", "=", 0.25), SET("FuerzaTemblor", "=", 5)], [
        REPEAT(3, [], [], [
          E([OIFN(EN, "RayoT", "=", 0), OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Estado", "!=", q("aparecer")),
            C("PickNearest", EN, "Jugador.X()", "Jugador.Y() - 40")], [
            OSET(EN, "RayoT", "=", 1), SET("Tmp.X", "=", "Enemigo.X()"), SET("Tmp.Y", "=", "Enemigo.Y()"), SOUND("assets/audio/critico.wav", 55, 1.5),
          ], [
            hitE({ x: "Tmp.X", y: "Tmp.Y - 60", w: 130, h: 170, dano: 1.7, vida: 0.08, fuerte: 1 }),
            fxE("Rayo", "Tmp.X", "Tmp.Y", { z: 35 }),
            fxE("Chispa", "Tmp.X", "Tmp.Y - 40", { scale: 1.6 }),
          ]),
        ]),
        E([], [OSET(EN, "RayoT", "=", 0)]),
      ]),
      E([OIFN(J, "Paso", "=", 1), CMP("Jugador.Accion", ">=", 0.4)], backToFree()),
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
    E([est("hab"), hab("Maga2b")], [], [
      COMMENT("Aura ígnea: un anillo de fuego te rodea 4,5 s y quema a los enemigos cercanos cada 0,4 s (ver 'Aura' en los temporizadores)."),
      init([clsAnim("Cast"), OSET(J, "Aura", "=", 4.5), OSET(J, "AuraT", "=", 0.4), SOUND("assets/audio/fuego.wav", 70, 0.7)], [
        fxE("Aura", "Jugador.X()", "Jugador.Y() - 40", { vida: 4.5, follow: true, offY: "-40", scale: 1.5, z: 12 })]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Maga3")], [], [
      COMMENT("Barrera arcana: -65% de daño recibido durante 6 s y cura 15%."),
      init([clsAnim("Cast"), OSET(J, "Escudo", "=", 6), heal(0.15), SOUND("assets/audio/escudo.wav", 70)], [
        fxE("Escudo", "Jugador.X()", "Jugador.Y() - 46", { vida: 6, follow: true, offY: "-46", z: 25 })]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Maga3b")], [], [
      COMMENT("Cataclismo: tras una breve carga (invulnerable), una explosión enorme sacude toda la pantalla."),
      init([clsAnim("Cast"), OSET(J, "Inv", "=", "max(Jugador.Inv, 1.0)"), SOUND("assets/audio/hielo.wav", 50, 0.5)]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.5)], [
        OSET(J, "Paso", "=", 1), SOUND("assets/audio/explosion.wav", 95, 0.6), SET("Temblor", "=", 0.7), SET("FuerzaTemblor", "=", 12),
      ], [
        hitE({ x: "Jugador.X()", y: "Jugador.Y() - 110", w: 1100, h: 520, dano: 3.4, vida: 0.1, fuerte: 1 }),
        fxE("Explosion", "Jugador.X() - 280", "Jugador.Y() - 70", { scale: 4.5 }),
        fxE("Explosion", "Jugador.X() + 280", "Jugador.Y() - 70", { scale: 4.5 }),
        fxE("Nova", "Jugador.X()", "Jugador.Y() - 50", { scale: 4 }),
      ]),
      E([OIFN(J, "Paso", "=", 1), CMP("Jugador.Accion", ">=", 0.9)], backToFree()),
    ]),
    // ================================================================ Arquera
    E([est("hab"), hab("Arquera1")], [], [
      COMMENT("Disparo triple: tres flechas perforantes en abanico (siguen la dirección de apuntado)."),
      init([clsAnim("Attack")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.12)], [OSET(J, "Paso", "=", 1), SET("Tmp.N", "=", -1),
        SOUND("assets/audio/flecha.wav", 60, 0.9)], [
        REPEAT(3, [], [], [E([], [
          ...shootP({ anim: "Flecha", speed: 1150, vida: 0.75, tipo: "Flecha", dano: 1.1, scale: 1, perfora: 1, fuerte: 0, spread: "Tmp.N * 9" }),
          SET("Tmp.N", "+", 1),
        ], [flipProj()])]),
      ]),
      endOnAnim(),
    ]),
    E([est("hab"), hab("Arquera1b")], [], [
      COMMENT("Flecha explosiva: una flecha potente que explota al impactar (ver EV_Combate)."),
      init([clsAnim("Attack")]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.12)], [OSET(J, "Paso", "=", 1)], [
        E([], shootP({ anim: "Explosiva", speed: 1050, vida: 0.9, tipo: "Explosiva", dano: 1.6, scale: 1.2, perfora: 0, fuerte: 0,
          sound: "assets/audio/flecha.wav", vol: 60, pitch: 0.7 }), [flipProj()]),
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
    E([est("hab"), hab("Arquera2b")], [], [
      COMMENT("Ráfaga: 8 flechas rápidas hacia donde apuntas (de frente, en diagonal o hacia arriba)."),
      init([clsAnim("Attack"), MAXSPEED(J, PLAT, 90)]),
      E([OIFN(J, "Paso", "<", 8), CMP("Jugador.Accion", ">=", "0.08 + Jugador.Paso * 0.07")], [OSET(J, "Paso", "+", 1)], [
        E([], shootP({ anim: "Flecha", speed: 1250, vida: 0.6, tipo: "Flecha", dano: 0.75, scale: 1, perfora: 0, fuerte: 0,
          spread: "RandomInRange(-3, 3)", sound: "assets/audio/flecha.wav", vol: 35, pitch: "RandomFloatInRange(1.1, 1.4)" }), [flipProj()]),
      ]),
      E([OIFN(J, "Paso", ">=", 8), CMP("Jugador.Accion", ">=", 0.7)], backToFree()),
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
    E([est("hab"), hab("Arquera3b")], [], [
      COMMENT("Disparo celestial: una flecha gigante que atraviesa todo lo que encuentra."),
      init([clsAnim("Attack"), MAXSPEED(J, PLAT, 60)]),
      E([OIFN(J, "Paso", "=", 0), OIFN(J, "Accion", ">=", 0.22)], [OSET(J, "Paso", "=", 1), SET("Temblor", "=", 0.2), SET("FuerzaTemblor", "=", 5)], [
        E([], shootP({ anim: "Flecha", ox: 50, speed: 1700, vida: 1.3, tipo: "Flecha", dano: 3.2, scale: 2.4, perfora: 1, fuerte: 1,
          sound: "assets/audio/explosion.wav", vol: 55, pitch: 1.6 }), [flipProj()]),
        fxE("Destello", `Jugador.X() + Jugador.Dir * ${CA} * 60`, `Jugador.Y() - 58 - ${SA} * 60`, { scale: 2.2 }),
      ]),
      E([OIFN(J, "Paso", "=", 1), CMP("Jugador.Accion", ">=", 0.5)], backToFree()),
    ]),
    COMMENT("Aura ígnea (Maga): golpea cada 0,4 s alrededor mientras dura."),
    E([OIFN(J, "Aura", ">", 0), notEst("muerto")], [OSET(J, "Aura", "-", DT), OSET(J, "AuraT", "+", DT)], [
      E([OIFN(J, "AuraT", ">=", 0.4)], [OSET(J, "AuraT", "=", 0), SOUND("assets/audio/fuego.wav", 25, 1.3)], [
        hitE({ x: "Jugador.X()", y: "Jugador.Y() - 44", w: 320, h: 170, dano: 0.55, vida: 0.06, follow: true, offY: "-44" }),
      ]),
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

/** Stats + input: first external events of Pueblo/Mazmorra, so a scene can add input (e.g. AUTO) before EV_Jugador. */
export function evEntrada() {
  return [
    COMMENT("EV_Entrada — estadísticas y lectura de controles (táctil y teclado). Se enlaza antes de EV_Jugador."),
    statsEvents(),
    inputEvents(),
  ];
}

export function evJugador() {
  return [
    COMMENT("EV_Jugador — movimiento, ataques, habilidades y poción. Compartido por Pueblo y Mazmorra (evento 'Enlace')."),
    timersAndLook(),
    jumpEvents(),
    attackEvents(),
    skillEvents(),
    stateEvents(),
    followers(),
  ];
}
