// External events "EV_Enemigos": enemy initialisation (stats per type/stage) and AI. Linked from Mazmorra.
import { q, C, A, NOT, OR, AND, E, ELSE, FOREACH, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP, ANIM,
  ANIM_END, FLIPX, OPACITY, SIZE, CREATE, DEL, SETX, SETY, HIDE, SOUND, DT, COLLIDE, PLAT, SPEED, MAXSPEED } from "../lib/dsl.mjs";
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
  Esqueleto: { hp: 60, atq: 10, def: 2, vel: 115, rango: 80, windup: 0.22, cd: 1.4, exp: 12, oro: [3, 6], botin: 0.14, anim: "Idle" },
  Murcielago: { hp: 34, atq: 8, def: 1, vel: 190, rango: 0, windup: 0, cd: 2.8, exp: 9, oro: [2, 4], botin: 0.1, anim: "Fly" },
  Cultista: { hp: 48, atq: 12, def: 2, vel: 95, rango: 0, windup: 0.4, cd: 2.6, exp: 15, oro: [4, 8], botin: 0.16, anim: "Idle" },
  Bruto: { hp: 170, atq: 22, def: 5, vel: 78, rango: 118, windup: 0.24, cd: 2.3, exp: 32, oro: [8, 15], botin: 0.3, anim: "Idle" },
  Jefe: { hp: 650, atq: 24, def: 6, vel: 120, rango: 0, windup: 0, cd: 1.6, exp: 280, oro: [20, 34], botin: 1, anim: "Idle" },
};

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
      E([tipo("Murcielago")], [A("ActivateBehavior", EN, PL, "no"), OSET(EN, "Fase", "=", "RandomFloat(6.28)"),
        OSET(EN, "Lado", "=", "RandomWithStep(-1, 1, 2)")]),
      E([], [OSET(EN, "HP", "=", "Enemigo.HPMax"), MAXSPEED(EN, PL, "Enemigo.Vel")]),
      E([NOT(tipo("Jefe"))], [], [fxE("Portal", "Enemigo.X()", "Enemigo.CenterY()", { scale: 1.6 })]),
      E([tipo("Jefe")], [], [fxE("PortalFuego", "Enemigo.X()", "Enemigo.CenterY()", { scale: 4 })]),
    ]),
  ]);
}

function ai() {
  return GROUP("Inteligencia artificial", [
    COMMENT("Una iteración por enemigo vivo y no congelado."),
    FOREACH(EN, [OIFN(EN, "Congelado", "<=", 0), OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Tipo", "!=", q("Maniqui"))], [], [
      // appear
      E([est("aparecer")], [OPACITY(EN, "255 * min(1, Enemigo.Accion / 0.5)")], [
        E([OR(AND(NOT(tipo("Jefe")), CMP("Enemigo.Accion", ">=", 0.5)), AND(tipo("Jefe"), CMP("Enemigo.Accion", ">=", 1.4)))], [
          OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", "RandomFloat(0.8)"), OPACITY(EN, 255)]),
      ]),
      E([est("herido"), NOT(tipo("Murcielago")), CMP("Enemigo.Accion", ">=", 0.32)], [
        OSETS(EN, "Estado", "=", q("mover")), MAXSPEED(EN, PL, "Enemigo.Vel")]),

      // ---------------- melee: Esqueleto / Bruto
      E([OR(tipo("Esqueleto"), tipo("Bruto")), est("mover")], [], [
        ...face(),
        E([CMP(dx, ">", "Enemigo.Rango")], [ANIM(EN, "Enemigo.Tipo + \"_Walk\"")], walkToward()),
        ELSE([], [ANIM(EN, "Enemigo.Tipo + \"_Idle\"")], [
          E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP("abs(Jugador.Y() - Enemigo.Y())", "<", 150), playerAlive()], [
            OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0), setAnim("Attack")]),
        ]),
      ]),
      E([OR(tipo("Esqueleto"), tipo("Bruto")), est("atacar")], [], [
        E([OIFN(EN, "Golpeo", "=", 0), CMP("Enemigo.Accion", ">=", "Enemigo.Windup")], [OSET(EN, "Golpeo", "=", 1)], [
          E([tipo("Esqueleto")], [SOUND("assets/audio/tajo.wav", 35, 0.75)], [enemyHit("Enemigo.X() + Enemigo.Lado * 58", "Enemigo.Y() - 50", 112, 92, "Enemigo.Atq")]),
          E([tipo("Bruto")], [SOUND("assets/audio/impacto_suelo.wav", 70), SET("Temblor", "=", 0.25), SET("FuerzaTemblor", "=", 7)], [
            enemyHit("Enemigo.X() + Enemigo.Lado * 92", "Enemigo.Y() - 62", 185, 135, "Enemigo.Atq", 0.14),
            fxE("Polvo", "Enemigo.X() + Enemigo.Lado * 110", "Enemigo.Y() - 14", { scale: 2 }),
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

      // ---------------- Murcielago (volador)
      E([tipo("Murcielago"), est("mover")], [
        OSET(EN, "TX", "=", "Jugador.X() + Enemigo.Lado * 170"),
        OSET(EN, "TY", "=", "Jugador.Y() - 210 + sin(TimeFromStart() * 3 + Enemigo.Fase) * 28"),
        SETX(EN, "+", "clamp(Enemigo.TX - Enemigo.X(), -Enemigo.Vel * TimeDelta(), Enemigo.Vel * TimeDelta())"),
        SETY(EN, "+", "clamp(Enemigo.TY - Enemigo.Y(), -Enemigo.Vel * TimeDelta(), Enemigo.Vel * TimeDelta())"),
        ANIM(EN, q("Murcielago_Fly")),
      ], [
        E([CMP("Jugador.X()", "<", "Enemigo.X()")], [FLIPX(EN, true)]), ELSE([], [FLIPX(EN, false)]),
        E([CMP("Enemigo.Cd", ">=", "Enemigo.CdAtk"), CMP("Enemigo.Distance(Jugador)", "<", 480), playerAlive()], [
          OSETS(EN, "Estado", "=", q("atacar")), OSET(EN, "Accion", "=", 0), OSET(EN, "Golpeo", "=", 0),
          OSET(EN, "TX", "=", "Jugador.X()"), OSET(EN, "TY", "=", "Jugador.Y() - 48"), ANIM(EN, q("Murcielago_Attack"))]),
      ]),
      E([tipo("Murcielago"), est("atacar")], [
        SETX(EN, "+", "clamp(Enemigo.TX - Enemigo.X(), -540 * TimeDelta(), 540 * TimeDelta())"),
        SETY(EN, "+", "clamp(Enemigo.TY - Enemigo.Y(), -540 * TimeDelta(), 540 * TimeDelta())"),
      ], [
        E([COLLIDE(EN, "Jugador"), OIFN(EN, "Golpeo", "=", 0), OIFN("Jugador", "Inv", "<=", 0)], [OSET(EN, "Golpeo", "=", 1)], [
          enemyHit("Jugador.X()", "Jugador.Y() - 48", 60, 60, "Enemigo.Atq", 0.05)]),
        E([OR(CMP("Enemigo.Accion", ">=", 1.2), CMP("Enemigo.DistanceToPosition(Enemigo.TX, Enemigo.TY)", "<", 14))], [
          OSETS(EN, "Estado", "=", q("mover")), OSET(EN, "Cd", "=", 0), OSET(EN, "Lado", "=", "-Enemigo.Lado")]),
      ]),
      E([tipo("Murcielago"), est("herido")], [SETX(EN, "+", "Enemigo.KB * TimeDelta()"), OSET(EN, "KB", "=", "Enemigo.KB * max(0, 1 - 6 * TimeDelta())")], [
        E([CMP("Enemigo.Accion", ">=", 0.3)], [OSETS(EN, "Estado", "=", q("mover"))]),
      ]),

      // ---------------- Jefe: Caballero de Ceniza
      E([tipo("Jefe")], [OSET(EN, "Invoc", "+", DT)]),
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
      E([tipo("Jefe"), CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.3"), OIFN(EN, "Furia", "=", 0)], [
        OSET(EN, "Furia", "=", 1), OSET(EN, "CdAtk", "=", 1.0), OSET(EN, "Vel", "+", 40), MAXSPEED(EN, PL, "Enemigo.Vel"),
        SOUND("assets/audio/jefe_rugido.wav", 80), ...toast(q("¡El Caballero de Ceniza entra en furia!"), q("255;120;70"))]),
    ]),
    COMMENT("Invocación del jefe (fuera del 'Para cada' para no mezclar la selección de Enemigo)."),
    E([IFN("InvocarPend", ">", 0)], [SET("InvocarPend", "-", 1)], [
      E([], [CREATE(EN, "clamp(InvX + (InvocarPend * 2 - 1) * 260, SalaIni + 120, SalaIni + AnchoSala - 120)", "SueloY"),
        OSETS(EN, "Tipo", "=", q("Esqueleto")), OSET(EN, "Sala", "=", "Sala")]),
    ]),
    COMMENT("Los murciélagos muertos caen al suelo."),
    E([tipo("Murcielago"), est("muerto"), C("PosY", EN, "<", "SueloY - 30")], [SETY(EN, "+", "520 * TimeDelta()")]),
  ]);
}

export function evEnemigos() {
  return [COMMENT("EV_Enemigos — enemigos de la mazmorra."), init(), ai()];
}
