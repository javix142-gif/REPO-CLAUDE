// External events "EV_Combate": damage, death, loot, level-up, saving, enemy HP bars.
import { q, C, A, NOT, OR, E, ELSE, FOREACH, REPEAT, COMMENT, GROUP, SET, SETS, IFN, IFS, OSET, OSETS, OIFN, OIFS, CMP,
  ANIM, ANIM_END, FLIPX, OPACITY, TINT, TEXT, TCOLOR, TSIZE, CREATE, DEL, SETX, SETY, HIDE, SOUND, DT, COLLIDE, PLAT, SPEED,
  MAXSPEED } from "../lib/dsl.mjs";
import { fx, fxE, hitE } from "./ev_jugador.mjs";
import { toast, floatText } from "./util.mjs";

const J = "Jugador";
const EN = "Enemigo";

export { toast, floatText };

const alive = (o = EN) => [OIFS(o, "Estado", "!=", q("muerto")), OIFS(o, "Estado", "!=", q("aparecer"))];

function projectiles() {
  const P = "ProyectilJugador";
  return GROUP("Proyectiles", [
    E([], [
      SETX(P, "+", "ProyectilJugador.VX * TimeDelta()"), SETY(P, "+", "ProyectilJugador.VY * TimeDelta()"), OSET(P, "Vida", "-", DT),
      SETX("ProyectilEnemigo", "+", "ProyectilEnemigo.VX * TimeDelta()"), SETY("ProyectilEnemigo", "+", "ProyectilEnemigo.VY * TimeDelta()"),
      OSET("ProyectilEnemigo", "Vida", "-", DT),
    ]),
    E([OIFN(P, "Vida", "<=", 0)], [DEL(P)]),
    E([OIFN("ProyectilEnemigo", "Vida", "<=", 0)], [DEL("ProyectilEnemigo")]),
    E([OR(COLLIDE(P, "Muro"), AND_PUERTA(P)), OIFS(P, "Tipo", "!=", q("Explosiva"))], [DEL(P)]),
    E([OR(COLLIDE(P, "Muro"), AND_PUERTA(P)), OIFS(P, "Tipo", "=", q("Explosiva"))], [OSET(P, "Borrar", "=", 1)]),
    E([OIFS(P, "Tipo", "=", q("Lluvia")), C("PosY", P, ">=", "SueloY - 12")], [
      ...fx("Polvo", "ProyectilJugador.X()", "SueloY - 12"), DEL(P)]),
    COMMENT("El meteoro explota al tocar el suelo."),
    E([OIFS(P, "Tipo", "=", q("Meteoro")), C("PosY", P, ">=", "SueloY - 40")], [
      SET("Tmp.X", "=", "ProyectilJugador.X()"), SOUND("assets/audio/explosion.wav", 80), SET("Temblor", "=", 0.4),
      SET("FuerzaTemblor", "=", 10),
    ], [
      hitE({ x: "Tmp.X", y: "SueloY - 100", w: 340, h: 240, dano: 3, vida: 0.1 }),
      fxE("Impacto", "Tmp.X", "SueloY - 70", { scale: 1.6 }),
      E([], [DEL(P)]),
    ]),
  ]);
}

// Puerta is only "solid" while closed.
function AND_PUERTA(o) {
  return { _kind: "cond", type: { value: "BuiltinCommonInstructions::And" }, _up: [],
    subInstructions: [COLLIDE(o, "Puerta"), OIFN("Puerta", "Abierta", "=", 0)] };
}

function hitsOnEnemies() {
  // Each enemy remembers the ids of the hitboxes/projectiles that already hit it (string ",12,15,"),
  // so a hitbox or a piercing arrow never hits the same enemy twice, even when several overlap.
  const notHitYet = (src) => CMP(`StrFind(Enemigo.Golpes, "," + ToString(${src}.Id) + ",")`, "<", 0);
  const register = (src) => [
    OSET(EN, "DanoPend", "+", `${src}.Dano`),
    OSETS(EN, "Golpes", "=", `Enemigo.Golpes + ToString(${src}.Id) + ","`),
    OSET(EN, "KBDir", "=", "sign(Enemigo.X() - Jugador.X() + 0.01)"),
    OSET(EN, "FuertePend", "=", `max(Enemigo.FuertePend, ${src}.Fuerte)`),
  ];
  const trim = (src) => E([CMP("StrLength(Enemigo.Golpes)", ">", 90)], [OSETS(EN, "Golpes", "=", `"," + ToString(${src}.Id) + ","`)]);
  return GROUP("Golpes del jugador sobre enemigos", [
    FOREACH("GolpeJugador", [], [], [
      FOREACH(EN, [COLLIDE("GolpeJugador", EN), ...alive(), notHitYet("GolpeJugador")], [
        ...register("GolpeJugador"),
        OSET(EN, "CongelaPend", "=", "max(Enemigo.CongelaPend, GolpeJugador.Congela)"),
      ], [trim("GolpeJugador")]),
    ]),
    FOREACH("ProyectilJugador", [OIFS("ProyectilJugador", "Tipo", "!=", q("Meteoro")), OIFN("ProyectilJugador", "Borrar", "=", 0)], [], [
      FOREACH(EN, [COLLIDE("ProyectilJugador", EN), ...alive(), notHitYet("ProyectilJugador")], register("ProyectilJugador"), [
        trim("ProyectilJugador"),
        E([OIFN("ProyectilJugador", "Perfora", "=", 0)], [OSET("ProyectilJugador", "Borrar", "=", 1)]),
      ]),
    ]),
    COMMENT("La flecha explosiva detona donde impacta (enemigo o muro)."),
    E([OIFN("ProyectilJugador", "Borrar", "=", 1), OIFS("ProyectilJugador", "Tipo", "=", q("Explosiva"))], [
      SET("Tmp.X", "=", "ProyectilJugador.X()"), SET("Tmp.Y", "=", "ProyectilJugador.Y()"), SOUND("assets/audio/explosion.wav", 60, 1.3),
      SET("Temblor", "=", "max(Temblor, 0.12)"), SET("FuerzaTemblor", "=", 4),
    ], [
      hitE({ x: "Tmp.X", y: "Tmp.Y", w: 300, h: 240, dano: 1.7, vida: 0.1, fuerte: 1 }),
      fxE("Explosion", "Tmp.X", "Tmp.Y", { scale: 1.7 }),
    ]),
    E([OIFN("ProyectilJugador", "Borrar", "=", 1)], [...fx("Chispa", "ProyectilJugador.X()", "ProyectilJugador.Y()"), DEL("ProyectilJugador")]),
    COMMENT("Los golpes del jugador duran unas décimas de segundo."),
    E([], [OSET("GolpeJugador", "Vida", "-", DT)]),
    E([OIFN("GolpeJugador", "Vida", "<=", 0)], [DEL("GolpeJugador")]),
    COMMENT("Aplicar el daño acumulado: ATQ x multiplicador, ±10%, crítico x1.8, reducido por DEF."),
    FOREACH(EN, [OIFN(EN, "DanoPend", ">", 0)], [SET("Tmp.Crit", "=", 0), SET("Tmp.Buff", "=", 1)], [
      E([CMP("RandomFloat(1)", "<", "Stat.Crit")], [SET("Tmp.Crit", "=", 1)]),
      E([OIFN(J, "Buff", ">", 0)], [SET("Tmp.Buff", "=", 1.35)]),
      E([], [
        SET("Tmp.Dano", "=", "max(1, round(Stat.Atq * Enemigo.DanoPend * Tmp.Buff * (1 + 0.8 * Tmp.Crit) * RandomFloatInRange(0.9, 1.1) - Enemigo.Def * 0.5))"),
        OSET(EN, "HP", "-", "Tmp.Dano"), SET("Stats.Golpes", "+", 1), SET("Stats.DanoTotal", "+", "Tmp.Dano"),
        OSET(EN, "Destello", "=", 0.12), TINT(EN, "255;110;110"),
        ...fx("Chispa", "Enemigo.CenterX() + RandomInRange(-10, 10)", "Enemigo.CenterY() + RandomInRange(-12, 12)"),
        ...floatText("Enemigo.X() + RandomInRange(-14, 14)", "Enemigo.BoundingBoxTop() - 34", "ToString(Tmp.Dano)", "255;255;255", 30),
      ], [
        E([IFN("Tmp.Crit", "=", 1)], [TEXT("TextoDano", "\"¡\" + ToString(Tmp.Dano) + \"!\""), TCOLOR("TextoDano", "255;214;60"), TSIZE("TextoDano", 44),
          SETX("TextoDano", "=", "Enemigo.X() - TextoDano.Width() / 2"), SOUND("assets/audio/critico.wav", 70),
          SET("Temblor", "=", "max(Temblor, 0.12)"), SET("FuerzaTemblor", "=", 5)]),
        ELSE([], [SOUND("assets/audio/golpe.wav", 55, "RandomFloatInRange(0.85, 1.15)")]),
        E([IFN("Tmp.Crit", "=", 0), OIFN(EN, "FuertePend", "=", 1)], [TCOLOR("TextoDano", "255;150;60"), TSIZE("TextoDano", 40),
          SETX("TextoDano", "=", "Enemigo.X() - TextoDano.Width() / 2")]),
      ]),
      E([OIFN(EN, "CongelaPend", ">", 0)], [OSET(EN, "Congelado", "=", "max(Enemigo.Congelado, Enemigo.CongelaPend)"),
        ...fx("ChispaHielo", "Enemigo.CenterX()", "Enemigo.CenterY()")]),
      COMMENT("Retroceso y aturdimiento (los Brutos y el jefe no se aturden)."),
      E([OIFS(EN, "Tipo", "!=", q("Bruto")), OIFS(EN, "Tipo", "!=", q("Jefe")), OIFS(EN, "Tipo", "!=", q("Maniqui")),
        OIFS(EN, "Tipo", "!=", q("Murcielago")), CMP("Enemigo.HP", ">", 0)], [
        OSETS(EN, "Estado", "=", q("herido")), OSET(EN, "Accion", "=", 0), ANIM(EN, "Enemigo.Tipo + \"_Hurt\""),
        MAXSPEED(EN, "Plataformero", 900), SPEED(EN, "Plataformero", "Enemigo.KBDir * 380"),
      ], [
        E([OIFN(EN, "FuertePend", "=", 1)], [SPEED(EN, "Plataformero", "Enemigo.KBDir * 680")]),
      ]),
      E([OIFS(EN, "Tipo", "=", q("Murcielago")), CMP("Enemigo.HP", ">", 0)], [
        OSETS(EN, "Estado", "=", q("herido")), OSET(EN, "Accion", "=", 0), ANIM(EN, q("Murcielago_Hurt")),
        OSET(EN, "VX", "=", "Enemigo.KBDir * 420"), OSET(EN, "VY", "=", -70)], [
        E([OIFN(EN, "FuertePend", "=", 1)], [OSET(EN, "VX", "=", "Enemigo.KBDir * 760"), OSET(EN, "VY", "=", -140)]),
      ]),
      COMMENT("El golpe final del combo también hace tambalear a los Brutos (el jefe y los élites no se aturden)."),
      E([OIFS(EN, "Tipo", "=", q("Bruto")), OIFN(EN, "FuertePend", "=", 1), CMP("Enemigo.HP", ">", 0)], [
        OSETS(EN, "Estado", "=", q("herido")), OSET(EN, "Accion", "=", 0), ANIM(EN, q("Bruto_Hurt")),
        MAXSPEED(EN, "Plataformero", 700), SPEED(EN, "Plataformero", "Enemigo.KBDir * 300")]),
      E([OIFS(EN, "Tipo", "=", q("Bruto")), OIFN(EN, "FuertePend", "=", 0)], [MAXSPEED(EN, "Plataformero", 400), SPEED(EN, "Plataformero", "Enemigo.KBDir * 140")]),
      E([OIFS(EN, "Tipo", "=", q("Maniqui"))], [ANIM(EN, q("Maniqui_Hurt"))], [
        E([CMP("Enemigo.HP", "<", "Enemigo.HPMax * 0.5")], [OSET(EN, "HP", "=", "Enemigo.HPMax")]),
      ]),
      E([], [OSET(EN, "DanoPend", "=", 0), OSET(EN, "CongelaPend", "=", 0), OSET(EN, "FuertePend", "=", 0)]),
    ]),
    E([OIFS(EN, "Tipo", "=", q("Maniqui")), ANIM_END(EN)], [ANIM(EN, q("Maniqui_Idle"))]),
  ]);
}

function enemyTimers() {
  return GROUP("Temporizadores de enemigos", [
    E([], [OSET(EN, "Accion", "+", DT), OSET(EN, "Cd", "+", DT), OSET(EN, "Congelado", "=", "max(0, Enemigo.Congelado - TimeDelta())")]),
    E([OIFN(EN, "Destello", ">", 0)], [OSET(EN, "Destello", "-", DT)], [
      E([OIFN(EN, "Destello", "<=", 0)], [TINT(EN, "255;255;255")]),
    ]),
    E([OIFN(EN, "Congelado", ">", 0), OIFN(EN, "Destello", "<=", 0)], [TINT(EN, "150;215;255"), A("AnimatableCapability::AnimatableBehavior::SetSpeedScale", EN, "Animation", "=", 0)]),
    E([OIFN(EN, "Congelado", "<=", 0)], [A("AnimatableCapability::AnimatableBehavior::SetSpeedScale", EN, "Animation", "=", 1)]),
  ]);
}

function deathAndLoot() {
  const coin = () => [
    CREATE("Moneda", "Tmp.X", "Tmp.Y"), OSET("Moneda", "Valor", "=", "max(1, round(RandomInRange(Enemigo.OroMin, Enemigo.OroMax) / 2))"),
    OSET("Moneda", "VX", "=", "RandomInRange(-160, 160)"), OSET("Moneda", "VY", "=", "RandomInRange(-460, -300)"), A("SetZOrder", "Moneda", "=", 15),
  ];
  const kinds = [["Guerrero", "Espada", "F"], ["Maga", "Baculo", "M"], ["Arquera", "Arco", "M"]];
  const kindLabel = { Espada: "Espada", Baculo: "Báculo", Arco: "Arco" };
  return GROUP("Muerte de enemigos, experiencia y botín", [
    FOREACH(EN, [OIFN(EN, "HP", "<=", 0), OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Tipo", "!=", q("Maniqui"))], [
      OSETS(EN, "Estado", "=", q("muerto")), OSET(EN, "Accion", "=", 0), ANIM(EN, "Enemigo.Tipo + \"_Dead\""),
      SPEED(EN, "Plataformero", 0), SET("Save.Exp", "+", "round(Enemigo.Exp)"), SET("Stats.Exp", "+", "round(Enemigo.Exp)"),
      SET("Stats.Muertes", "+", 1), SET("Tmp.X", "=", "Enemigo.X()"), SET("Tmp.Y", "=", "Enemigo.Y() - 50"),
      SOUND("assets/audio/muerte_enemigo.wav", 60, "RandomFloatInRange(0.9, 1.1)"),
      ...floatText("Enemigo.X()", "Enemigo.BoundingBoxTop() - 70", "\"+\" + ToString(round(Enemigo.Exp)) + \" EXP\"", "200;140;255", 24),
    ], [
      REPEAT(2, [], [], [E([], coin())]),
      E([OIFS(EN, "Tipo", "=", q("Jefe"))], [], [REPEAT(6, [], [], [E([], coin())])]),
      E([CMP("RandomFloat(1)", "<", 0.12)], [CREATE("OrbeVida", "Tmp.X", "Tmp.Y"), OSET("OrbeVida", "VX", "=", "RandomInRange(-120, 120)"),
        OSET("OrbeVida", "VY", "=", -420), A("SetZOrder", "OrbeVida", "=", 15)]),
      E([CMP("RandomFloat(1)", "<", "Enemigo.ProbBotin")], [SET("Tmp.R", "=", "RandomFloat(1)"), SET("Tmp.Rareza", "=", 1)], [
        E([CMP("Tmp.R", ">=", 0.5)], [SET("Tmp.Rareza", "=", 2)]),
        E([CMP("Tmp.R", ">=", 0.78)], [SET("Tmp.Rareza", "=", 3)]),
        E([CMP("Tmp.R", ">=", 0.93)], [SET("Tmp.Rareza", "=", 4)]),
        E([CMP("Tmp.R", ">=", 0.99)], [SET("Tmp.Rareza", "=", 5)]),
        E([OIFS(EN, "Tipo", "=", q("Jefe"))], [SET("Tmp.Rareza", "=", "min(5, max(3, Tmp.Rareza + 1))")]),
        E([], [CREATE("Botin", "Tmp.X", "Tmp.Y"), OSET("Botin", "Rareza", "=", "Tmp.Rareza"), OSET("Botin", "VX", "=", "RandomInRange(-100, 100)"),
          OSET("Botin", "VY", "=", -480), A("SetZOrder", "Botin", "=", 14), SET("Tmp.R", "=", "RandomFloat(1)")], [
          E([CMP("Tmp.R", "<", 0.55)], [OSETS("Botin", "Tipo", "=", q("Arma")),
            OSET("Botin", "Valor", "=", "round((3 + 2.6 * Etapa) * (1 + 0.4 * pow(Tmp.Rareza - 1, 1.2)) + RandomInRange(0, 2))")],
          kinds.map(([cls, kind, g]) => E([IFS("Save.Clase", "=", q(cls))], [
            ANIM("Botin", `${q(kind + "_")} + ToString(Tmp.Rareza)`),
            OSETS("Botin", "Nombre", "=", `${q(kindLabel[kind] + " ")} + Rarezas.${g}[Tmp.Rareza]`),
          ]))),
          ELSE([], [OSETS("Botin", "Tipo", "=", q("Armadura")),
            OSET("Botin", "Valor", "=", "round((10 + 8 * Etapa) * (1 + 0.4 * pow(Tmp.Rareza - 1, 1.2)) + RandomInRange(0, 4))"),
            ANIM("Botin", "\"Armadura_\" + ToString(Tmp.Rareza)"), OSETS("Botin", "Nombre", "=", "\"Armadura \" + Rarezas.F[Tmp.Rareza]")]),
        ]),
      ]),
    ]),
    FOREACH(EN, [OIFS(EN, "Estado", "=", q("muerto")), OIFN(EN, "Accion", ">=", 1.2), OIFS(EN, "Tipo", "!=", q("Jefe"))], [], [
      fxE("Humo", "Enemigo.CenterX()", "Enemigo.CenterY()"), E([], [DEL(EN)])]),
  ]);
}

function pickups() {
  const fall = (o, off) => [
    E([OIFN(o, "Suelo", "=", 0)], [SETX(o, "+", `${o}.VX * TimeDelta()`), SETY(o, "+", `${o}.VY * TimeDelta()`), OSET(o, "VY", "+", "1500 * TimeDelta()")], [
      E([C("PosY", o, ">=", `SueloY - ${off}`), OIFN(o, "VY", ">", 0)], [SETY(o, "=", `SueloY - ${off}`), OSET(o, "Suelo", "=", 1)]),
    ]),
    E([], [OSET(o, "Edad", "+", DT)]),
  ];
  return GROUP("Botín: monedas, orbes y equipo", [
    ...fall("Moneda", 18), ...fall("OrbeVida", 21), ...fall("Botin", 0),
    COMMENT("Las monedas vuelan hacia el jugador cuando está cerca."),
    E([OIFN("Moneda", "Edad", ">", 0.5), C("Distance", "Moneda", J, 280)], [
      OSET("Moneda", "Suelo", "=", 1),
      SETX("Moneda", "+", "(Jugador.X() - Moneda.X()) * min(1, 9 * TimeDelta())"),
      SETY("Moneda", "+", "(Jugador.Y() - 50 - Moneda.Y()) * min(1, 9 * TimeDelta())"),
    ]),
    E([COLLIDE(J, "Moneda"), OIFN("Moneda", "Edad", ">", 0.3)], [
      SET("Save.Oro", "+", "Moneda.Valor"), SET("Stats.Oro", "+", "Moneda.Valor"), SOUND("assets/audio/moneda.wav", 40, "RandomFloatInRange(0.95, 1.15)"),
      DEL("Moneda")]),
    E([COLLIDE(J, "OrbeVida"), OIFN("OrbeVida", "Edad", ">", 0.4)], [
      OSET(J, "HP", "=", "min(Stat.VidaMax, Jugador.HP + Stat.VidaMax * 0.12)"), SOUND("assets/audio/pocion.wav", 50, 1.2),
      ...fx("Curacion", "Jugador.X()", "Jugador.Y() - 50", { follow: true, offY: "-50" }), DEL("OrbeVida")]),
    FOREACH("Botin", [COLLIDE(J, "Botin"), OIFN("Botin", "Edad", ">", 0.7)], [SET("Stats.Botin", "+", 1), SET("Guardar", "=", 1)], [
      E([OIFS("Botin", "Tipo", "=", q("Arma"))], [], [
        E([CMP("Botin.Valor", ">", "Save.ArmaBonus")], [
          SET("Save.ArmaBonus", "=", "Botin.Valor"), SET("Save.ArmaRareza", "=", "Botin.Rareza"), SETS("Save.ArmaNombre", "=", "Botin.Nombre"),
          SET("RecalcStats", "=", 1), SOUND("assets/audio/botin.wav", 70),
          ...toast("\"¡Equipado! \" + Botin.Nombre + \"  +\" + ToString(Botin.Valor) + \" ATQ\"", "Rarezas.Col[Botin.Rareza]"),
        ]),
        ELSE([], [SET("Tmp.Oro", "=", "round(Botin.Valor * 2 + Botin.Rareza * 6)"), SET("Save.Oro", "+", "Tmp.Oro"), SET("Stats.Oro", "+", "Tmp.Oro"),
          SOUND("assets/audio/moneda.wav", 60, 0.8),
          ...toast("\"Vendido: \" + Botin.Nombre + \"  +\" + ToString(Tmp.Oro) + \" oro\"", "Rarezas.Col[Botin.Rareza]")]),
      ]),
      E([OIFS("Botin", "Tipo", "=", q("Armadura"))], [], [
        E([CMP("Botin.Valor", ">", "Save.ArmaduraBonus")], [
          SET("Save.ArmaduraBonus", "=", "Botin.Valor"), SET("Save.ArmaduraRareza", "=", "Botin.Rareza"), SETS("Save.ArmaduraNombre", "=", "Botin.Nombre"),
          SET("RecalcStats", "=", 1), SOUND("assets/audio/botin.wav", 70),
          ...toast("\"¡Equipado! \" + Botin.Nombre + \"  +\" + ToString(Botin.Valor) + \" VIDA\"", "Rarezas.Col[Botin.Rareza]"),
        ]),
        ELSE([], [SET("Tmp.Oro", "=", "round(Botin.Valor + Botin.Rareza * 6)"), SET("Save.Oro", "+", "Tmp.Oro"), SET("Stats.Oro", "+", "Tmp.Oro"),
          SOUND("assets/audio/moneda.wav", 60, 0.8),
          ...toast("\"Vendido: \" + Botin.Nombre + \"  +\" + ToString(Tmp.Oro) + \" oro\"", "Rarezas.Col[Botin.Rareza]")]),
      ]),
      E([], [DEL("Botin")]),
    ]),
  ]);
}

function playerDamage() {
  const apply = (src) => [
    OSET(J, "HP", "-", "Tmp.DanoJ"), OSET(J, "Inv", "=", 0.7), SET("Stats.DanoRecibido", "+", "Tmp.DanoJ"),
    SOUND("assets/audio/herido.wav", 70, "RandomFloatInRange(0.9, 1.1)"), SET("Temblor", "=", 0.2), SET("FuerzaTemblor", "=", 6),
    ...fx("ChispaRoja", "Jugador.X()", "Jugador.Y() - 50"),
    ...floatText("Jugador.X()", "Jugador.Y() - 140", "ToString(Tmp.DanoJ)", "255;80;80", 32),
    SET("Tmp.X", "=", `sign(Jugador.X() - ${src}.X() + 0.01)`),
  ];
  const stagger = () => E([OR(OIFS(J, "Estado", "=", q("libre")), OIFS(J, "Estado", "=", q("ataque")))], [
    OSETS(J, "Estado", "=", q("herido")), OSET(J, "Accion", "=", 0), ANIM(J, "Save.Clase + \"_Hurt\""), MAXSPEED(J, PLAT, 600),
    SPEED(J, PLAT, "Tmp.X * 320"),
  ]);
  const block = (src) => E([COLLIDE(src, J), OIFN(J, "Inv", "<=", 0), OIFS(J, "Estado", "!=", q("muerto"))], [
    SET("Tmp.DanoJ", "=", `max(1, round(${src}.Dano * RandomFloatInRange(0.9, 1.1) - Stat.Def * 0.6))`),
  ], [
    E([OIFN(J, "Escudo", ">", 0)], [SET("Tmp.DanoJ", "=", "max(1, round(Tmp.DanoJ * 0.35))")]),
    E([], apply(src), [stagger()]),
    E([], [DEL(src)]),
  ]);
  return GROUP("Daño al jugador", [
    E([], [OSET("GolpeEnemigo", "Vida", "-", DT)]),
    block("GolpeEnemigo"),
    block("ProyectilEnemigo"),
    E([OIFN("GolpeEnemigo", "Vida", "<=", 0)], [DEL("GolpeEnemigo")]),
  ]);
}

function progression() {
  return GROUP("Experiencia y nivel", [
    E([CMP("Save.Exp", ">=", "Stat.ExpSig"), IFN("Save.Nivel", "<", 60), IFN("RecalcStats", "=", 0)], [
      SET("Save.Exp", "-", "Stat.ExpSig"), SET("Save.Nivel", "+", 1), SET("RecalcStats", "=", 1), SET("CurarTodo", "=", 1),
      SET("Guardar", "=", 1), SOUND("assets/audio/nivel.wav", 80),
      ...fx("Nivel", "Jugador.X()", "Jugador.Y() - 120", { follow: true, offY: "-120", z: 35 }),
      ...toast("\"¡Nivel \" + ToString(Save.Nivel) + \"!  +3 puntos de atributo (toca tu retrato)\"", q("255;220;110"), 3),
    ], [
      COMMENT("Cada 4 niveles se desbloquea y equipa una habilidad nueva (ranura 2 en el nivel 4, ranura 1 en el 8, ranura 3 en el 12)."),
      ...[[4, 2], [8, 1], [12, 3]].map(([lvl, slot]) => E([IFN("Save.Nivel", "=", lvl)], [
        SET(`Save.Hab${slot}`, "=", 2), SET("RecalcStats", "=", 1),
        ...toast(`"¡Nivel ${lvl}!  Nueva habilidad: " + Skills.Nombre[Stat.Cls * 6 + ${(slot - 1) * 2 + 1}] + "  (ficha > Habilidades)"`, q("140;255;170"), 4.2),
      ])),
    ]),
    E([IFN("Guardar", "=", 1)], [A("EcrireFichierTxt", q("UmbralSave"), q("datos"), "ToJSON(Save)"), SET("Guardar", "=", 0)]),
  ]);
}

function effectsAndBars() {
  return GROUP("Números de daño y barras de vida", [
    E([], [SETY("TextoDano", "+", "TextoDano.VY * TimeDelta()"), OSET("TextoDano", "VY", "=", "min(0, TextoDano.VY + 160 * TimeDelta())"),
      OSET("TextoDano", "Vida", "+", DT), OPACITY("TextoDano", "255 * clamp(2.2 - TextoDano.Vida * 2.5, 0, 1)")]),
    E([OIFN("TextoDano", "Vida", ">=", 0.9)], [DEL("TextoDano")]),
    A_PAINTER(),
  ]);
}

function A_PAINTER() {
  const P = "PintorBarras";
  return FOREACH(EN, [OIFS(EN, "Estado", "!=", q("muerto")), OIFS(EN, "Tipo", "!=", q("Jefe")), OR(CMP("Enemigo.HP", "<", "Enemigo.HPMax"), OIFS(EN, "Tipo", "=", q("Maniqui")))], [
    A("PrimitiveDrawing::FillColor", P, q("20;15;26")),
    A("PrimitiveDrawing::Rectangle", P, "Enemigo.X() - 33", "Enemigo.BoundingBoxTop() - 16", "Enemigo.X() + 33", "Enemigo.BoundingBoxTop() - 7"),
    A("PrimitiveDrawing::FillColor", P, q("222;58;70")),
    A("PrimitiveDrawing::Rectangle", P, "Enemigo.X() - 30", "Enemigo.BoundingBoxTop() - 13",
      "Enemigo.X() - 30 + 60 * clamp(Enemigo.HP / Enemigo.HPMax, 0, 1)", "Enemigo.BoundingBoxTop() - 10"),
  ]);
}

export function evCombate() {
  return [
    COMMENT("EV_Combate — daño, muerte, botín, experiencia y guardado. Compartido por Pueblo y Mazmorra."),
    projectiles(),
    hitsOnEnemies(),
    enemyTimers(),
    deathAndLoot(),
    pickups(),
    playerDamage(),
    progression(),
    effectsAndBars(),
  ];
}
