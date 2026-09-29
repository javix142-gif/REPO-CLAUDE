// Small event helpers shared by several external events.
import { q, A, OSET, CREATE, TEXT, TCOLOR, TSIZE, SETX } from "../lib/dsl.mjs";

/** Central toast (TextoAviso). */
export const toast = (textExpr, colorExpr = q("255;255;255"), dur = 2.4) => [
  TEXT("TextoAviso", textExpr), A("TextObject::ChangeColor", "TextoAviso", colorExpr), OSET("TextoAviso", "Vida", "=", dur),
];

/** Floating combat text (TextoDano). */
export const floatText = (x, y, textExpr, color, size = 30) => [
  CREATE("TextoDano", x, y),
  TEXT("TextoDano", textExpr), TCOLOR("TextoDano", color), TSIZE("TextoDano", size),
  OSET("TextoDano", "VY", "=", -120), OSET("TextoDano", "Vida", "=", 0), A("SetZOrder", "TextoDano", "=", 40),
  SETX("TextoDano", "-", "TextoDano.Width() / 2"),
];
