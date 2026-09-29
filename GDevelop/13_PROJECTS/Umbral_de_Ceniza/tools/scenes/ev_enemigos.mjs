// External events "EV_Enemigos": enemy initialisation (stats per type/stage) and AI. Linked from Mazmorra.
import { q, C, A, NOT, OR, AND, E, ELSE, FOREACH, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  ANIM_END, FLIPX, OPACITY, SIZE, CREATE, DEL, SETX, SETY, HIDE, SOUND, DT, COLLIDE, PLAT, SPEED, MAXSPEED, ON_FLOOR } from "../lib/dsl.mjs";
import { fx, fxE } from "./ev_jugador.mjs";
import { toast } from "./ev_combate.mjs";

const EN = "Enemigo";
const PL = "Plataformero";
const tipo = (t) => OIFS(EN, "Tipo", "=", q(t));
const est = (s) => OIFS(EN, "Estado", "=", q(s));
const setAnim = (a) => ANIM(EN, `Enemigo.Tipo + ${q("_" + a)}`);
const dx = "abs(Jugador.X() - Enemigo.X())";
const playerAlive = () => OIFS("Jugador", "Estado", "!=", q("muerto"));

// base stats at stage 1; scaled by Mult = 1 + 0.45 * (Etapa - 1)
export const ENEMIES = {
  Esqueleto: { hp: 60, elite: 10, atq: 10, def: 2, vel: 115, rango: 80, windup: 0.22, cd: 1.4, exp: 12, oro: [3, 6], botin: 0.14, anim: "Idle" },
  Murcielago: { hp: 34, elite: 15, atq: 8, def: 1, vel: 190, rango: 0, windup: 0, cd: 2.8, exp: 9, oro: [2, 4], botin: 0.1, anim: "Fly" },
  Cultista: { hp: 48, elite: 12, atq: 12, def: 2, vel: 95, rango: 0, windup: 0.4, cd: 2.6, exp: 15, oro: [4, 8], botin: 0.16, anim: "Idle" },
  Bruto: { hp: 170, elite: 4.5, atq: 22, def: 5, vel: 78, rango: 118, windup: 0.24, cd: 2.3, exp: 32, oro: [8, 15], botin: 0.3, anim: "Idle" },
  Jefe: { hp: 650, atq: 24, def: 6, vel: 120, rango: 0, windup: 0, cd: 1.6, exp: 280, oro: [20, 34], botin: 1, anim: "Idle" },
  Arquero: { hp: 46, elite: 13, atq: 11, def: 2, vel: 100, rango: 0, windup: 0.4, cd: 2.4, exp: 17, oro: [4, 8], botin: 0.16, anim: "Idle" },
  Espectro: { hp: 40, elite: 14, atq: 13, def: 1, vel: 125, rango: 0, windup: 0.3, cd: 3.2, exp: 20, oro: [5, 9], botin: 0.18, anim: "Fly" },
  Golem: { hp: 320, elite: 3, atq: 28, def: 9, vel: 60, rango: 135, windup: 0.4, cd: 3.0, exp: 60, oro: [15, 25], botin: 0.4, anim: "Idle" },
  Limo: { hp: 90, elite: 8, atq: 14, def: 3, vel: 120, rango: 0, windup: 0, cd: 1.3, exp: 22, oro: [6, 10], botin: 0.2, anim: "Idle" },
  LimoMini: { hp: 32, elite: 20, atq: 9, def: 1, vel: 175, rango: 0, windup: 0, cd: 1.0, exp: 6, oro: [1, 3], botin: 0.03, anim: "Idle" },
  Reina: { hp: 900, atq: 30, def: 8, vel: 140, rango: 0, windup: 0, cd: 1.8, exp: 700, oro: [60, 90], botin: 1, anim: "Idle" },
  Coloso: { hp: 1200, atq: 38, def: 14, vel: 70, rango: 0, windup: 0, cd: 2.2, exp: 1400, oro: [110, 160], botin: 1, anim: "Idle" },
};
/** Minion an elite/boss summons. */
const MINION = { Esqueleto: "Esqueleto", Bruto: "Esqueleto", Cultista: "Murcielago", Arquero: "Esqueleto", Espectro: "Espectro", Limo: "LimoMini", Golem: "Limo" };

const isBoss = () => OIFN(EN, "Boss", "=", 1);
const flyer = () => OR(tipo("Murcielago"), tipo("Espectro"));

/** Enemy projectile aimed at the player (angle in degrees added to the aim). */
const enemyShot = ({ anim, x, y, speed, dano, vida = 3.2, spread = "0", scale = null }) => E([], [
  CREATE("ProyectilEnemigo", x, y), ANIM("ProyectilEnemigo", q(anim)),
  SET("Tmp.Ang", "=", `ProyectilEnemigo.AngleToPosition(Jugador.X(), Jugador.Y() - 50) + ${spread}`),
  OSET("ProyectilEnemigo", "VX", "=", `cos(ToRad(Tmp.Ang)) * ${speed}`), OSET("ProyectilEnemigo", "VY", "=", `sin(ToRad(Tmp.Ang)) * ${speed}`),
  OSET("ProyectilEnemigo", "Dano", "=", dano), OSET("ProyectilEnemigo", "Vida", "=", vida), A("SetZOrder", "ProyectilEnemigo", "=", 28),
  A("SetAngle", "ProyectilEnemigo", "=", "Tmp.Ang"), ...(scale ? [A("ScalableCapability::ScalableBehavior::SetValue", "ProyectilEnemigo", "Scale", "=", scale)] : []),
]);
/** Projectile that falls from the sky at x (Cae = 1: it disappears with a puff when it reaches the ground). */
const fallingShot = (anim, x, dano, speed = 880, scale = 1.6) => E([], [
  CREATE("ProyectilEnemigo", x, "SueloY - 720"), ANIM("ProyectilEnemigo", q(anim)), OSET("ProyectilEnemigo", "VX", "=", 0), OSET("ProyectilEnemigo", "VY", "=", speed),
  OSET("ProyectilEnemigo", "Dano", "=", dano), OSET("ProyectilEnemigo", "Vida", "=", 2), OSET("ProyectilEnemigo", "Cae", "=", 1), A("SetZOrder", "ProyectilEnemigo", "=", 28),
  A("ScalableCapability::ScalableBehavior::SetValue", "ProyectilEnemigo", "Scale", "=", scale),
]);
/** Red ground marker that warns of a falling attack. */
const warnMark = (x, vida = 0.75) => fxE("Aviso", x, "SueloY - 8", { vida, scale: 1.4, z: 12 });

const face = () => [
  E([CMP("Jugador.X()", "<", "Enemigo.X()")], [FLIPX(EN, true), OSET(EN, "Lado", "=", -1)]),
  ELSE([], [FLIPX(EN, false), OSET(EN, "Lado", "=", 1)]),
];
const walkToward = () => [E([OIFN(EN, "Lado", "<", 0)], [A("PlatformBehavior::SimulateLeftKey", EN, PL)]),
  ELSE([], [A("PlatformBehavior::SimulateRightKey", EN, PL)])];
const walkAway = () => [E([OIFN(EN, "Lado", "<", 0)], [A("PlatformBehavior::SimulateRightKey", EN, PL)]),
  ELSE([], [A("PlatformBehavior::SimulateLeftKey", EN, PL)])];
const enemyHit = (x, y, w, h, dano, vida = 0.12) => E([], [
  CREATE("GolpeEnemigo", x, y), SIZE("GolpeEnemigo", w, h), OSET("GolpeEnemigo", "Dano", "=", dano),
  OSET("GolpeEnemigo", "Vida", "=", vida), HIDE("GolpeEnemigo"),
]);

function init() {
  const perType = Object.entries(ENEMIES).map(([t, d]) => E([tipo(t)], [
    OSET(EN, "HPMax", "=", `round(${d.hp} * Mult)`), OSET(EN, "Atq", "=", `round(${d.atq} * Mult)`),
    OSET(EN, "Def", "=", `round(${d.def} * Mult)`), OSET(EN, "Vel", "=", `${d.vel} + Etapa * 4`), OSET(EN, "Rango", "=", d.rango),
    OSET(EN, "Windup", "=", d.windup), OSET(EN, "CdAtk", "=", d.cd), OSET(EN, "Exp", "=", `round(${d.exp} * (1 + 0.35 * (Etapa - 1)))`),
    OSET(EN, "OroMin", "=", `${d.oro[0]} + Etapa`), OSET(EN, "OroMax", "=", `${d.oro[1]} + Etapa * 2`), OSET(EN, "ProbBotin", "=", d.botin),
    ANIM(EN, q(`${t}_${d.anim}`)),
  ]));
  return GROUP("Inicialización de enemigos", [
    COMMENT("Para crear un enemigo basta con crear 'Enemigo' y poner su variable Tipo; aquí se le asignan sus estadísticas."),
    FOREACH(EN, [OIFN(EN, "Init", "=", 0), OIFS(EN, "Tipo", "!=", q("Maniqui"))], [
      OSET(EN, "Init", "=", 1), OSET(EN, "Accion", "=", 0), OSET(EN, "Cd", "=", 0), OSETS(EN, "Estado", "=", q("aparecer")),
      OPACITY(EN, 0), A("SetZOrder", EN, "=", 10),
    ], [
      ...perType,
      E([flyer()], [A("ActivateBehavior", EN, PL, "no"), OSET(EN, "Fase", "=", "RandomFloat(6.28)"),
        OSET(EN, "Lado", "=", "RandomWithStep(-1, 1, 2)")]),
      E([tipo("Limo")], [A("PlatformBehavior::JumpSpeed", EN, PL, "=", 560)]),
      E([tipo("LimoMini")], [A("PlatformBehavior::JumpSpeed", EN, PL, "=", 500)]),
      COMMENT("Élites: un enemigo normal con mucha más vida (el factor depende del tipo), más daño y más grande (jefe de las etapas sin jefe propio)."),
      ...Object.entries(ENEMIES).filter(([, d]) => d.elite).map(([t, d]) => E([OIFN(EN, "Elite", "=", 1), tipo(t)], [OSET(EN, "HPMax", "=", `round(Enemigo.HPMax * ${d.elite})`)])),
      E([OIFN(EN, "Elite", "=", 1)], [
        OSET(EN, "Atq", "=", "round(Enemigo.Atq * 1.35)"), OSET(EN, "Exp", "=", "round(Enemigo.Exp * 8)"),
        OSET(EN, "ProbBotin", "=", 1), OSET(EN, "OroMin", "=", "Enemigo.OroMin * 3"), OSET(EN, "OroMax", "=", "Enemigo.OroMax * 3"),
        OSET(EN, "CdAtk", "=", "Enemigo.CdAtk * 0.8"), OSET(EN, "Vel", "=", "Enemigo.Vel * 1.1"),
        A("ScalableCapability::ScalableBehavior::SetValue", EN, "Scale", "=", 1.4),
      ]),
      E([], [OSET(EN, "HP", "=", "Enemigo.HPMax"), MAXSPEED(EN, PL, "Enemigo.Vel")]),
      E([NOT(isBoss())], [], [fxE("Portal", "Enemigo.X()", "Enemigo.CenterY()", { scale: 1.6 })]),
      E([isBoss()], [], [fxE("PortalFuego", "Enemigo.X()", "Enemigo.CenterY()", { scale: 4 })]),
    ]),
  ]);
}

function ai() {
  return GROUP("Inteligencia artificial", [
    COMMENT("Una iteración por enemigo vivo y no congelado."),
    FOREACH(EN, [OIFN(EN, "Congelado", "<=", 0), OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Tipo", "!=", q("Maniqui"))], [], [
      // appear
      E([est("aparecer")], [OPACITY(EN, "255 * min(1, Enemigo.Accion / 0.5)")], [
        E([OR(AND(NOT(isBoss()), CMP("Enemigo.Accion", ">=", 0.5)), AND(isBoss(), CMP("Enemigo.Accion", ">=", 1.4)))], [
          OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", "RandomFloat(0.8)"), OPACITY(EN, 255)]),
      ]),
      E([est("herido"), NOT(flyer()), CMP("Enemigo.Accion", ">=", 0.32)], [
        OSETS(EN, "Estado", "=", q("mover")), MAXSPEED(EN, PL, "Enemigo.Vel")]),

      // ---------------- melee: Esqueleto / Bruto
      E([], [OSET(EN, "SaltoT", "=", "max(0, Enemigo.SaltoT - TimeDelta())")]),
      E([OR(tipo("Esqueleto"), tipo("Bruto"), tipo("Golem")), est("mover")], [], [
        ...face(),
        COMMENT("Los esqueletos saltan tras el jugador cuando está en una plataforma por encima de ellos."),
        E([tipo("Esqueleto"), CMP("Jugador.Y()", "<", "Enemigo.Y() - 110"), CMP(dx, "<", 260), C("PlatformBehavior::IsOnFloor", EN, PL),
          OIFN(EN, "SaltoT", "<=", 0), playerAlive()], [A("PlatformBehavior::SimulateJumpKey", EN, PL), OSET(EN, "SaltoT", "=", 1.6)]),
        E([CMP(dx, ">", "Enemigo.Rango")], [ANIM(EN, "Enemigo.Tipo + \"_Walk\"")], walkToward()),
        ELSE([], [ANIM(EN, "Enemigo.Tipo + \"_Idle\"")], [
          E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP("abs(Jugador.Y() - Enemigo.Y())", "<", 150), playerAlive()], [
            OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), setAnim("Attack")]),
        ]),
      ]),
      E([OR(tipo("Esqueleto"), tipo("Bruto"), tipo("Golem")), est("atacar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", "Enemigo.Windup")], [OSET(EN, "Golpeo", "=", 1)], [
          E([tipo("Esqueleto")], [SOUND("assets/audio/tajo.wav", 35, 0.75)], [enemyHit("Enemigo.X() + Enemigo.Lado * 58", "Enemigo.Y() - 50", 112, 92, "Enemigo.Atq")]),
          E([tipo("Bruto")], [SOUND("assets/audio/impacto_suelo.wav", 70), SET("Temblor", "=", 0.25), SET("FuerzaTemblor", "=", 7)], [
            enemyHit("Enemigo.X() + Enemigo.Lado * 92", "Enemigo.Y() - 62", 185, 135, "Enemigo.Atq", 0.14),
            fxE("Polvo", "Enemigo.X() + Enemigo.Lado * 110", "Enemigo.Y() - 14", { scale: 2 }),
          ]),
          COMMENT("Gólem: golpe en área y una onda de choque que avanza por el suelo (hay que saltarla)."),
          E([tipo("Golem")], [SOUND("assets/audio/impacto_suelo.wav", 80), SET("Temblor", "=", 0.3), SET("FuerzaTemblor", "=", 8)], [
            enemyHit("Enemigo.X() + Enemigo.Lado * 100", "Enemigo.Y() - 70", 220, 150, "Enemigo.Atq", 0.14),
            fxE("Polvo", "Enemigo.X() + Enemigo.Lado * 130", "Enemigo.Y() - 14", { scale: 2.4 }),
            E([], [CREATE("ProyectilEnemigo", "Enemigo.X() + Enemigo.Lado * 150", "SueloY - 33"), ANIM("ProyectilEnemigo", q("Onda")),
              OSET("ProyectilEnemigo", "VX", "=", "Enemigo.Lado * 390"), OSET("ProyectilEnemigo", "VY", "=", 0),
              OSET("ProyectilEnemigo", "Dano", "=", "round(Enemigo.Atq * 0.7)"), OSET("ProyectilEnemigo", "Vida", "=", 1.5), A("SetZOrder", "ProyectilEnemigo", "=", 28)]),
          ]),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),

      // ---------------- Cultista (a distancia)
      E([tipo("Cultista"), est("mover")], [], [
        ...face(),
        E([CMP(dx, "<", 300)], [ANIM(EN, q("Cultista_Walk"))], walkAway()),
        ELSE([CMP(dx, ">", 560)], [ANIM(EN, q("Cultista_Walk"))], walkToward()),
        ELSE([], [ANIM(EN, q("Cultista_Idle"))]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP(dx, "<", 760), CMP("abs(Jugador.Y() - Enemigo.Y())", "<", 300), playerAlive()], [
          OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), ANIM(EN, q("Cultista_Cast"))]),
      ]),
      E([tipo("Cultista"), est("atacar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", "Enemigo.Windup")], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/orbe.wav", 50)], [
          E([], [
            CREATE("ProyectilEnemigo", "Enemigo.X() + Enemigo.Lado * 30", "Enemigo.Y() - 74"), ANIM("ProyectilEnemigo", q("Orbe")),
            SET("Tmp.Ang", "=", "ProyectilEnemigo.AngleToPosition(Jugador.X(), Jugador.Y() - 50)"),
            OSET("ProyectilEnemigo", "VX", "=", "cos(ToRad(Tmp.Ang)) * 340"), OSET("ProyectilEnemigo", "VY", "=", "sin(ToRad(Tmp.Ang)) * 340"),
            OSET("ProyectilEnemigo", "Dano", "=", "Enemigo.Atq"), OSET("ProyectilEnemigo", "Vida", "=", 3.2), A("SetZOrder", "ProyectilEnemigo", "=", 28),
          ]),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),

      // ---------------- Arquero esquelético (a distancia, se apuesta en las plataformas)
      E([tipo("Arquero"), est("mover")], [], [
        ...face(),
        E([CMP(dx, "<", 260)], [ANIM(EN, q("Arquero_Walk"))], walkAway()),
        ELSE([CMP(dx, ">", 540)], [ANIM(EN, q("Arquero_Walk"))], walkToward()),
        ELSE([], [ANIM(EN, q("Arquero_Idle"))]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP(dx, "<", 760), CMP("abs(Jugador.Y() - Enemigo.Y())", "<", 330), playerAlive()], [
          OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), ANIM(EN, q("Arquero_Attack"))]),
      ]),
      E([tipo("Arquero"), est("atacar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", "Enemigo.Windup")], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/flecha.wav", 45, 0.85)], [
          enemyShot({ anim: "Flecha", x: "Enemigo.X() + Enemigo.Lado * 36", y: "Enemigo.Y() - 64", speed: 640, dano: "Enemigo.Atq", vida: 2.2 }),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),

      // ---------------- Espectro (vuela, dispara orbes y se teletransporta)
      COMMENT("Espectro: flota a media altura, lanza dos orbes y cada ~6,5 s se desvanece y reaparece al otro lado del jugador."),
      E([tipo("Espectro")], [OSET(EN, "Invoc", "+", DT)]),
      E([tipo("Espectro"), est("mover")], [
        OSET(EN, "TX", "=", "clamp(Jugador.X() + Enemigo.Lado * (250 + 40 * sin(TimeFromStart() * 1.1 + Enemigo.Fase)), SalaIni + 90, SalaIni + AnchoSala - 90)"),
        OSET(EN, "TY", "=", "Jugador.Y() - 150 + sin(TimeFromStart() * 2.2 + Enemigo.Fase) * 30"),
      ], [
        E([], [
          OSET(EN, "VX", "+", "(clamp((Enemigo.TX - Enemigo.X()) * 1.6, -Enemigo.Vel, Enemigo.Vel) - Enemigo.VX) * min(1, 3.2 * TimeDelta())"),
          OSET(EN, "VY", "+", "(clamp((Enemigo.TY - Enemigo.Y()) * 1.6, -Enemigo.Vel, Enemigo.Vel) - Enemigo.VY) * min(1, 3.2 * TimeDelta())"),
          SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"), ANIM(EN, q("Espectro_Fly")),
        ]),
        E([CMP("Jugador.X()", "<", "Enemigo.X()")], [FLIPX(EN, true)]), ELSE([], [FLIPX(EN, false)]),
        E([CMP("Enemigo.Invoc", ">=", 6.5), playerAlive()], [OSETS(EN, "Estado", "=", q("desvanecer")), OSET(EN, "Accion", "=", 0), OSET(EN, "Invoc", "=", 0)]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP("Enemigo.Distance(Jugador)", "<", 640), playerAlive(), NOT(est("desvanecer"))], [
          OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), ANIM(EN, q("Espectro_Cast"))]),
      ]),
      E([tipo("Espectro"), est("atacar")], [
        OSET(EN, "VX", "=", "Enemigo.VX * max(0, 1 - 6 * TimeDelta())"), OSET(EN, "VY", "=", "Enemigo.VY * max(0, 1 - 6 * TimeDelta())"),
        SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"),
      ], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", "Enemigo.Windup")], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/orbe.wav", 50, 1.3)], [
          enemyShot({ anim: "Orbe", x: "Enemigo.X() + Enemigo.Lado * 34", y: "Enemigo.Y() - 6", speed: 300, dano: "Enemigo.Atq", vida: 3.4, spread: "-9" }),
          enemyShot({ anim: "Orbe", x: "Enemigo.X() + Enemigo.Lado * 34", y: "Enemigo.Y() - 6", speed: 300, dano: "Enemigo.Atq", vida: 3.4, spread: "9" }),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Espectro"), est("desvanecer")], [OPACITY(EN, "255 * max(0, 1 - Enemigo.Accion / 0.4)")], [
        E([CMP("Enemigo.Accion", ">=", 0.4)], [
          OSET(EN, "Lado", "=", "-Enemigo.Lado"), SETX(EN, "=", "clamp(Jugador.X() + Enemigo.Lado * 300, SalaIni + 120, SalaIni + AnchoSala - 120)"),
          SETY(EN, "=", "Jugador.Y() - 150"), OSET(EN, "VX", "=", 0), OSET(EN, "VY", "=", 0),
          OSETS(EN, "Estado", "=", q("aparecer")), OSET(EN, "Accion", "=", 0),
        ], [fxE("Portal", "Enemigo.X()", "Enemigo.Y()", { scale: 1.6 })]),
      ]),

      // ---------------- Limo (salta hacia el jugador; se divide al morir)
      COMMENT("Limo y limo pequeño: saltan hacia el jugador y dañan al tocarlo. Un limo grande se divide en dos pequeños al morir."),
      E([OR(tipo("Limo"), tipo("LimoMini")), est("mover")], [], [
        ...face(),
        E([C("PlatformBehavior::IsOnFloor", EN, PL)], [ANIM(EN, "Enemigo.Tipo + \"_Idle\"")], [
          E([OIFN(EN, "SaltoT", "<=", 0), playerAlive()], [A("PlatformBehavior::SimulateJumpKey", EN, PL), OSET(EN, "SaltoT", "=", "RandomInRange(0.9, 1.5)")]),
        ]),
        ELSE([], [ANIM(EN, "Enemigo.Tipo + \"_Walk\"")], walkToward()),
        E([COLLIDE(EN, "Jugador"), CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), OIFN("Jugador", "Inv", "<=", 0)], [OSET(EN, "Cd", "=", 0)], [
          enemyHit("Jugador.X()", "Jugador.Y() - 48", 60, 60, "Enemigo.Atq", 0.05)]),
      ]),

      // ---------------- Murcielago (volador): vuelo con inercia, ondulación y picado con aviso
      COMMENT("Murciélago: vuela hacia un punto de espera con velocidad e inercia (VX/VY) y ondulación en ocho. Si el jugador está en el aire y cerca, baja a su altura y ataca antes."),
      E([tipo("Murcielago"), est("mover")], [
        OSET(EN, "TX", "=", "clamp(Jugador.X() + Enemigo.Lado * (170 + 60 * sin(TimeFromStart() * 1.3 + Enemigo.Fase)), SalaIni + 70, SalaIni + AnchoSala - 70)"),
        OSET(EN, "TY", "=", "Jugador.Y() - 210 + sin(TimeFromStart() * 3 + Enemigo.Fase) * 26 + cos(TimeFromStart() * 1.7 + Enemigo.Fase * 2) * 18"),
        OSET(EN, "Fase2", "=", 1),
      ], [
        E([IFN("JugAire", "=", 1), CMP("Enemigo.Distance(Jugador)", "<", 640)], [
          OSET(EN, "TX", "=", "clamp(Jugador.X() + Enemigo.Lado * 130, SalaIni + 70, SalaIni + AnchoSala - 70)"),
          OSET(EN, "TY", "=", "Jugador.Y() - 100 + sin(TimeFromStart() * 4 + Enemigo.Fase) * 22"),
          OSET(EN, "Fase2", "=", 1.5), OSET(EN, "Cd", "+", "TimeDelta() * 0.9"),
        ]),
        E([], [OSET(EN, "TY", "=", "min(Enemigo.TY, Jugador.Y() - 70)")]),
        E([], [
          OSET(EN, "VX", "+", "(clamp((Enemigo.TX - Enemigo.X()) * 2.2, -Enemigo.Vel * Enemigo.Fase2, Enemigo.Vel * Enemigo.Fase2) - Enemigo.VX) * min(1, 4.5 * TimeDelta())"),
          OSET(EN, "VY", "+", "(clamp((Enemigo.TY - Enemigo.Y()) * 2.2, -Enemigo.Vel * Enemigo.Fase2, Enemigo.Vel * Enemigo.Fase2) - Enemigo.VY) * min(1, 4.5 * TimeDelta())"),
          SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"),
          A("SetAngle", EN, "=", "clamp(Enemigo.VX * 0.04, -12, 12)"), ANIM(EN, q("Murcielago_Fly")),
        ]),
        E([CMP("Jugador.X()", "<", "Enemigo.X()")], [FLIPX(EN, true)]), ELSE([], [FLIPX(EN, false)]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP("Enemigo.Distance(Jugador)", "<", 520), playerAlive()], [
          OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), ANIM(EN, q("Murcielago_Attack"))]),
      ]),
      E([tipo("Murcielago"), est("atacar")], [], [
        COMMENT("Aviso (0,32 s): frena y se eleva apuntando; luego pica atravesando la posición del jugador y sigue de largo."),
        E([CMP("Enemigo.Accion", "<", 0.32)], [
          OSET(EN, "VX", "=", "Enemigo.VX * max(0, 1 - 9 * TimeDelta())"), OSET(EN, "VY", "=", -90),
          SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"),
          OSET(EN, "TX", "=", "Jugador.X() + sign(Jugador.X() - Enemigo.X() + 0.01) * 240"), OSET(EN, "TY", "=", "Jugador.Y() - 40"),
          A("SetAngle", EN, "=", 0),
        ]),
        E([CMP("Enemigo.Accion", ">=", 0.32)], [
          OSET(EN, "VX", "+", "((Enemigo.TX - Enemigo.X()) / max(1, Enemigo.DistanceToPosition(Enemigo.TX, Enemigo.TY)) * 650 - Enemigo.VX) * min(1, 12 * TimeDelta())"),
          OSET(EN, "VY", "+", "((Enemigo.TY - Enemigo.Y()) / max(1, Enemigo.DistanceToPosition(Enemigo.TX, Enemigo.TY)) * 650 - Enemigo.VY) * min(1, 12 * TimeDelta())"),
          SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"),
          A("SetAngle", EN, "=", "ToDeg(atan2(Enemigo.VY, max(1, abs(Enemigo.VX)))) * sign(Enemigo.VX + 0.001) * 0.6"),
        ], [
          E([CMP("Enemigo.VX", ">", 20)], [FLIPX(EN, false)]),
          E([CMP("Enemigo.VX", "<", -20)], [FLIPX(EN, true)]),
          E([COLLIDE(EN, "Jugador"), OIFN(EN, "Golpeo", "=", 0), OIFN("Jugador", "Inv", "<=", 0)], [OSET(EN, "Golpeo", "=", 1)], [
            enemyHit("Jugador.X()", "Jugador.Y() - 48", 60, 60, "Enemigo.Atq", 0.05)]),
          E([OR(CMP("Enemigo.Accion", ">=", 1.3), CMP("Enemigo.DistanceToPosition(Enemigo.TX, Enemigo.TY)", "<", 30))], [
            OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0), OSET(EN, "Lado", "=", "-Enemigo.Lado")]),
        ]),
      ]),
      E([flyer(), est("herido")], [
        SETX(EN, "+", "Enemigo.VX * TimeDelta()"), SETY(EN, "+", "Enemigo.VY * TimeDelta()"),
        OSET(EN, "VX", "=", "Enemigo.VX * max(0, 1 - 5 * TimeDelta())"), OSET(EN, "VY", "=", "Enemigo.VY * max(0, 1 - 5 * TimeDelta())"),
        A("SetAngle", EN, "=", 0),
      ], [
        E([CMP("Enemigo.Accion", ">=", 0.3)], [OSETS(EN, "Estado", "=", q("mover"))]),
      ]),
      COMMENT("Los murciélagos no atraviesan el suelo."),
      E([flyer(), OR(est("mover"), est("atacar"), est("herido")), CMP("Enemigo.Y()", ">", "SueloY - 40")], [SETY(EN, "=", "SueloY - 40")]),

      // ---------------- Jefe: Caballero de Ceniza
      E([isBoss()], [OSET(EN, "Invoc", "+", DT)]),
      E([tipo("Jefe"), est("mover")], [], [
        ...face(),
        E([CMP(dx, ">", 180)], [ANIM(EN, q("Jefe_Walk"))], walkToward()),
        ELSE([], [ANIM(EN, q("Jefe_Idle"))]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), playerAlive()], [OSET(EN, "Fase", "=", "RandomInRange(0, 2)"), OSET(EN, "Accion", "=", 0),
          OSET(EN, "Golpeo", "=", 0)], [
          E([CMP("Enemigo.Fase", "=", 0), CMP(dx, ">=", 320)], [OSET(EN, "Fase", "=", 1)]),
          E([CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.5"), CMP("Enemigo.Invoc", ">=", 14)], [OSET(EN, "Fase", "=", 3)]),
          E([CMP("Enemigo.Fase", "=", 0)], [OSETS(EN, "Estado", "=", q("tajo")), ANIM(EN, q("Jefe_Slash"))]),
          E([CMP("Enemigo.Fase", "=", 1)], [OSETS(EN, "Estado", "=", q("carga")), ANIM(EN, q("Jefe_Charge")), SOUND("assets/audio/grito.wav", 60, 0.6)]),
          E([CMP("Enemigo.Fase", "=", 2)], [OSETS(EN, "Estado", "=", q("golpe")), ANIM(EN, q("Jefe_Slam"))]),
          E([CMP("Enemigo.Fase", "=", 3)], [OSETS(EN, "Estado", "=", q("invocar")), ANIM(EN, q("Jefe_Summon")), OSET(EN, "Invoc", "=", 0),
            SOUND("assets/audio/jefe_rugido.wav", 70, 1.2)]),
        ]),
      ]),
      E([tipo("Jefe"), est("tajo")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.22)], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/tajo.wav", 80, 0.6),
          SET("Temblor", "=", 0.2), SET("FuerzaTemblor", "=", 6)], [
          enemyHit("Enemigo.X() + Enemigo.Lado * 125", "Enemigo.Y() - 125", 270, 230, "round(Enemigo.Atq * 1.1)", 0.14)]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Jefe"), est("carga")], [], [
        E([CMP("Enemigo.Accion", ">=", 0.35), CMP("Enemigo.Accion", "<", 1.15)], [MAXSPEED(EN, PL, 820), SPEED(EN, PL, "Enemigo.Lado * 820")], [
          E([COLLIDE(EN, "Jugador"), OIFN(EN, "Golpeo", "=", 0), OIFN("Jugador", "Inv", "<=", 0)], [OSET(EN, "Golpeo", "=", 1)], [
            enemyHit("Jugador.X()", "Jugador.Y() - 48", 60, 60, "round(Enemigo.Atq * 1.3)", 0.05)]),
        ]),
        E([CMP("Enemigo.Accion", ">=", 1.15)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0), MAXSPEED(EN, PL, "Enemigo.Vel"), SPEED(EN, PL, 0)]),
      ]),
      E([tipo("Jefe"), est("golpe")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.24)], [OSET(EN, "Golpeo", "=", 1),
          SOUND("assets/audio/impacto_suelo.wav", 90), SET("Temblor", "=", 0.45), SET("FuerzaTemblor", "=", 12)], [
          enemyHit("Enemigo.X()", "Enemigo.Y() - 70", 340, 140, "Enemigo.Atq", 0.12),
          ...[-1, 1].map((s) => E([], [
            CREATE("ProyectilEnemigo", `Enemigo.X() + ${s * 80}`, "SueloY - 33"), ANIM("ProyectilEnemigo", q("Onda")),
            OSET("ProyectilEnemigo", "VX", "=", s * 430), OSET("ProyectilEnemigo", "VY", "=", 0),
            OSET("ProyectilEnemigo", "Dano", "=", "round(Enemigo.Atq * 0.8)"), OSET("ProyectilEnemigo", "Vida", "=", 2.4),
            A("SetZOrder", "ProyectilEnemigo", "=", 28),
          ])),
          fxE("Impacto", "Enemigo.X()", "Enemigo.Y() - 40", { scale: 1.3 }),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Jefe"), est("invocar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.45)], [OSET(EN, "Golpeo", "=", 1), SET("InvocarPend", "=", 2),
          SET("InvX", "=", "Enemigo.X()")]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      // ---------------- Reina Carmesí (jefe del capítulo 2)
      COMMENT("Reina Carmesí: orbes de sangre en abanico, lluvia de sangre (con aviso en el suelo), teletransporte + tajo por la espalda y, herida, invoca murciélagos."),
      E([tipo("Reina"), est("mover")], [], [
        ...face(),
        E([CMP(dx, ">", 430)], [ANIM(EN, q("Reina_Walk"))], walkToward()),
        ELSE([CMP(dx, "<", 230)], [ANIM(EN, q("Reina_Walk"))], walkAway()),
        ELSE([], [ANIM(EN, q("Reina_Idle"))]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), playerAlive()], [OSET(EN, "Fase", "=", "RandomInRange(0, 2)"), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0)], [
          E([CMP("Enemigo.Fase", "=", 0)], [OSETS(EN, "Estado", "=", q("orbes")), ANIM(EN, q("Reina_Cast"))]),
          E([CMP("Enemigo.Fase", "=", 1)], [OSETS(EN, "Estado", "=", q("sangre")), ANIM(EN, q("Reina_Cast")), OSET(EN, "TX", "=", "Jugador.X()")]),
          E([CMP("Enemigo.Fase", "=", 2)], [OSETS(EN, "Estado", "=", q("desvanecer")), SOUND("assets/audio/portal.wav", 60, 0.7)]),
          E([CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.6"), CMP("Enemigo.Invoc", ">=", 13)], [OSETS(EN, "Estado", "=", q("invocar")), ANIM(EN, q("Reina_Cast")),
            OSET(EN, "Invoc", "=", 0), SOUND("assets/audio/jefe_rugido.wav", 60, 1.4)]),
        ]),
      ]),
      E([tipo("Reina"), est("orbes")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.5)], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/orbe.wav", 70, 0.8)],
          [-24, -12, 0, 12, 24].map((a) => enemyShot({ anim: "OrbeRojo", x: "Enemigo.X() + Enemigo.Lado * 60", y: "Enemigo.Y() - 190", speed: 330,
            dano: "round(Enemigo.Atq * 0.6)", vida: 3.6, spread: String(a) }))),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Reina"), est("sangre")], [], [
        E([OIFN(EN, "Golpeo", "=", 0)], [OSET(EN, "Golpeo", "=", 1)], [-240, -120, 0, 120, 240].map((o) => warnMark(`clamp(Enemigo.TX + ${o}, SalaIni + 90, SalaIni + AnchoSala - 90)`))),
        E([OIFN(EN, "Golpeo", "=", 1), CMP("Enemigo.Accion", ">=", 0.8)], [OSET(EN, "Golpeo", "=", 2), SOUND("assets/audio/fuego.wav", 70, 0.6)],
          [-240, -120, 0, 120, 240].map((o) => fallingShot("OrbeRojo", `clamp(Enemigo.TX + ${o}, SalaIni + 90, SalaIni + AnchoSala - 90)`, "round(Enemigo.Atq * 0.9)"))),
        E([CMP("Enemigo.Accion", ">=", 1.5)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Reina"), est("desvanecer")], [OPACITY(EN, "255 * max(0, 1 - Enemigo.Accion / 0.4)")], [
        E([CMP("Enemigo.Accion", ">=", 0.4)], [
          SETX(EN, "=", "clamp(Jugador.X() - Jugador.Dir * 250, SalaIni + 140, SalaIni + AnchoSala - 140)"), OSETS(EN, "Estado", "=", q("corte")), OSET(EN, "Accion", "=", 0),
          OSET(EN, "Golpeo", "=", 0), ANIM(EN, q("Reina_Slash")), OPACITY(EN, 255), SOUND("assets/audio/portal.wav", 60, 1.2),
        ], [fxE("PortalFuego", "Enemigo.X()", "Enemigo.CenterY()", { scale: 3 })]),
      ]),
      E([tipo("Reina"), est("corte")], [], [
        E([CMP("Jugador.X()", "<", "Enemigo.X()")], [FLIPX(EN, true), OSET(EN, "Lado", "=", -1)]), ELSE([], [FLIPX(EN, false), OSET(EN, "Lado", "=", 1)]),
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.35)], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/tajo.wav", 80, 0.7), SET("Temblor", "=", 0.2), SET("FuerzaTemblor", "=", 6)], [
          enemyHit("Enemigo.X() + Enemigo.Lado * 130", "Enemigo.Y() - 120", 300, 220, "round(Enemigo.Atq * 1.2)", 0.14)]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Reina"), est("invocar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.5)], [OSET(EN, "Golpeo", "=", 1), SET("InvocarPend", "=", 3), SET("InvX", "=", "Enemigo.X()"), SETS("InvTipo", "=", q("Murcielago"))]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),

      // ---------------- Coloso del Umbral (jefe del capítulo 3)
      COMMENT("Coloso del Umbral: puñetazo con ondas de choque, barrido, lluvia de cristales (con aviso) y, a media vida, invoca limos."),
      E([tipo("Coloso"), est("mover")], [], [
        ...face(),
        E([CMP(dx, ">", 190)], [ANIM(EN, q("Coloso_Walk"))], walkToward()),
        ELSE([], [ANIM(EN, q("Coloso_Idle"))]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), playerAlive()], [OSET(EN, "Fase", "=", "RandomInRange(0, 2)"), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0)], [
          E([CMP("Enemigo.Fase", "=", 0)], [OSETS(EN, "Estado", "=", q("golpe")), ANIM(EN, q("Coloso_Slam"))]),
          E([CMP("Enemigo.Fase", "=", 1)], [OSETS(EN, "Estado", "=", q("barrido")), ANIM(EN, q("Coloso_Sweep"))]),
          E([CMP("Enemigo.Fase", "=", 2)], [OSETS(EN, "Estado", "=", q("rocas")), ANIM(EN, q("Coloso_Cast")), OSET(EN, "TX", "=", "Jugador.X()"), SOUND("assets/audio/grito.wav", 60, 0.5)]),
          E([CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.5"), CMP("Enemigo.Invoc", ">=", 16)], [OSETS(EN, "Estado", "=", q("invocar")), ANIM(EN, q("Coloso_Cast")),
            OSET(EN, "Invoc", "=", 0), SOUND("assets/audio/jefe_rugido.wav", 80, 0.7)]),
        ]),
      ]),
      E([tipo("Coloso"), est("golpe")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.33)], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/impacto_suelo.wav", 95), SET("Temblor", "=", 0.5), SET("FuerzaTemblor", "=", 13)], [
          enemyHit("Enemigo.X()", "Enemigo.Y() - 80", 420, 160, "Enemigo.Atq", 0.12),
          ...[-1, 1].map((sg) => E([], [
            CREATE("ProyectilEnemigo", `Enemigo.X() + ${sg * 100}`, "SueloY - 33"), ANIM("ProyectilEnemigo", q("Onda")), OSET("ProyectilEnemigo", "VX", "=", sg * 470),
            OSET("ProyectilEnemigo", "VY", "=", 0), OSET("ProyectilEnemigo", "Dano", "=", "round(Enemigo.Atq * 0.8)"), OSET("ProyectilEnemigo", "Vida", "=", 2.6),
            A("SetZOrder", "ProyectilEnemigo", "=", 28)])),
          fxE("Impacto", "Enemigo.X()", "Enemigo.Y() - 40", { scale: 1.8 }),
        ]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Coloso"), est("barrido")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.45)], [OSET(EN, "Golpeo", "=", 1), SOUND("assets/audio/tajo.wav", 85, 0.5), SET("Temblor", "=", 0.3), SET("FuerzaTemblor", "=", 8)], [
          enemyHit("Enemigo.X() + Enemigo.Lado * 210", "Enemigo.Y() - 100", 480, 200, "round(Enemigo.Atq * 1.1)", 0.14)]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Coloso"), est("rocas")], [], [
        E([OIFN(EN, "Golpeo", "=", 0)], [OSET(EN, "Golpeo", "=", 1)], [-270, -90, 90, 270].map((o) => warnMark(`clamp(Enemigo.TX + ${o}, SalaIni + 90, SalaIni + AnchoSala - 90)`, 0.95))),
        E([OIFN(EN, "Golpeo", "=", 1), CMP("Enemigo.Accion", ">=", 0.95)], [OSET(EN, "Golpeo", "=", 2), SOUND("assets/audio/explosion.wav", 60, 0.9)],
          [-270, -90, 90, 270].map((o) => fallingShot("Cristal", `clamp(Enemigo.TX + ${o}, SalaIni + 90, SalaIni + AnchoSala - 90)`, "round(Enemigo.Atq * 0.9)", 900, 1.8))),
        E([CMP("Enemigo.Accion", ">=", 1.6)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),
      E([tipo("Coloso"), est("invocar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", 0.3)], [OSET(EN, "Golpeo", "=", 1), SET("InvocarPend", "=", 2), SET("InvX", "=", "Enemigo.X()"), SETS("InvTipo", "=", q("Limo"))]),
        E([ANIM_END(EN)], [OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0)]),
      ]),

      // ---------------- Élites y jefes: refuerzos periódicos y furia
      COMMENT("Los élites (un enemigo normal reforzado) invocan refuerzos cada ~11 s."),
      E([isBoss(), OIFN(EN, "Elite", "=", 1), est("mover"), CMP("Enemigo.Invoc", ">=", 11)], [OSET(EN, "Invoc", "=", 0), SET("InvocarPend", "=", 2), SET("InvX", "=", "Enemigo.X()"),
        SOUND("assets/audio/jefe_rugido.wav", 50, 1.5)], [
        ...Object.entries(MINION).map(([t, m]) => E([tipo(t)], [SETS("InvTipo", "=", q(m))])),
      ]),
      E([isBoss(), CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.3"), OIFN(EN, "Furia", "=", 0)], [
        OSET(EN, "Furia", "=", 1), OSET(EN, "CdAtk", "=", "Enemigo.CdAtk * 0.65"), OSET(EN, "Vel", "+", 35), MAXSPEED(EN, PL, "Enemigo.Vel"),
        SOUND("assets/audio/jefe_rugido.wav", 80), ...toast("\"¡\" + BossNombre + \" entra en furia!\"", q("255;120;70"))]),
    ]),
    COMMENT("Enemigos apostados en una plataforma (Percha = 1) no se salen de ella."),
    E([OIFN(EN, "Percha", "=", 1), OIFS(EN, "Estado", "!=", q("muerto"))], [], [
      E([CMP("Enemigo.X()", "<", "Enemigo.PX0")], [SETX(EN, "=", "Enemigo.PX0"), SPEED(EN, PL, 0)]),
      E([CMP("Enemigo.X()", ">", "Enemigo.PX1")], [SETX(EN, "=", "Enemigo.PX1"), SPEED(EN, PL, 0)]),
    ]),
    COMMENT("Invocación del jefe (fuera del 'Para cada' para no mezclar la selección de Enemigo)."),
    E([IFN("InvocarPend", ">", 0)], [SET("InvocarPend", "-", 1)], [
      E([IFS("InvTipo", "=", q("Murcielago"))], [CREATE(EN, "clamp(InvX + (InvocarPend * 2 - 1) * 260, SalaIni + 120, SalaIni + AnchoSala - 120)", "SueloY - 230"),
        OSETS(EN, "Tipo", "=", q("Murcielago")), OSET(EN, "Sala", "=", "Sala")]),
      E([IFS("InvTipo", "=", q("Espectro"))], [CREATE(EN, "clamp(InvX + (InvocarPend * 2 - 1) * 260, SalaIni + 120, SalaIni + AnchoSala - 120)", "SueloY - 200"),
        OSETS(EN, "Tipo", "=", q("Espectro")), OSET(EN, "Sala", "=", "Sala")]),
      E([IFS("InvTipo", "!=", q("Murcielago")), IFS("InvTipo", "!=", q("Espectro"))], [
        CREATE(EN, "clamp(InvX + (InvocarPend * 2 - 1) * 260, SalaIni + 120, SalaIni + AnchoSala - 120)", "SueloY"),
        OSETS(EN, "Tipo", "=", "InvTipo"), OSET(EN, "Sala", "=", "Sala")]),
    ]),
    COMMENT("Un limo grande se divide en limos pequeños al morir (SplitPend lo pone EV_Combate)."),
    E([IFN("SplitPend", ">", 0)], [SET("SplitPend", "-", 1)], [
      E([], [CREATE(EN, "SplitX + (SplitPend * 2 - 1) * 45 + RandomInRange(-15, 15)", "SueloY - 20"), OSETS(EN, "Tipo", "=", q("LimoMini")), OSET(EN, "Sala", "=", "Sala")]),
    ]),
    COMMENT("Los murciélagos muertos caen al suelo."),
    E([tipo("Murcielago"), est("muerto")], [A("SetAngle", EN, "=", 0)]),
    E([tipo("Murcielago"), est("muerto"), C("PosY", EN, "<", "SueloY - 30")], [SETY(EN, "+", "520 * TimeDelta()")]),
  ]);
}

function playerAir() {
  return GROUP("Jugador en el aire", [
    COMMENT("JugAire = 1 cuando el jugador está saltando o cayendo: los murciélagos cercanos lo siguen en altura."),
    E([], [SET("JugAire", "=", 0)]),
    E([NOT(ON_FLOOR("Jugador"))], [SET("JugAire", "=", 1)]),
  ]);
}

export function evEnemigos() {
  return [COMMENT("EV_Enemigos — enemigos de la mazmorra."), playerAir(), init(), ai()];
}
