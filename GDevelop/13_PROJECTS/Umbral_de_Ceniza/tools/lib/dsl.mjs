// Small DSL to write GDevelop events as data.
//
// Instructions are written with their *visible* parameters only ("user params").
// finalize.mjs later expands them to the full parameter list using the engine's
// own metadata (code-only slots such as currentScene become ""), and fails the
// build if a type is unknown or the number of parameters does not match.

/** Quote a literal string for a GDevelop string expression. */
export const q = (s) => JSON.stringify(String(s));

const instr = (kind, type, params) => ({ _kind: kind, type: { value: type }, _up: params.map((p) => String(p)) });

/** Condition */
export const C = (type, ...params) => instr("cond", type, params);
/** Action */
export const A = (type, ...params) => instr("act", type, params);
/** Inverted condition */
export const NOT = (c) => ({ ...c, type: { inverted: true, value: c.type.value } });
export const OR = (...subs) => ({ _kind: "cond", type: { value: "BuiltinCommonInstructions::Or" }, _up: [], subInstructions: subs });
export const AND = (...subs) => ({ _kind: "cond", type: { value: "BuiltinCommonInstructions::And" }, _up: [], subInstructions: subs });
export const ONCE = () => C("BuiltinCommonInstructions::Once");

/** Standard event */
export const E = (conditions = [], actions = [], events = []) => ({
  type: "BuiltinCommonInstructions::Standard",
  conditions: conditions.flat().filter(Boolean),
  actions: actions.flat().filter(Boolean),
  ...(events.length ? { events: events.flat().filter(Boolean) } : {}),
});
export const ELSE = (conditions = [], actions = [], events = []) => ({ ...E(conditions, actions, events), type: "BuiltinCommonInstructions::Else" });
export const FOREACH = (object, conditions = [], actions = [], events = []) => ({
  type: "BuiltinCommonInstructions::ForEach",
  object,
  conditions: conditions.flat().filter(Boolean),
  actions: actions.flat().filter(Boolean),
  ...(events.length ? { events: events.flat().filter(Boolean) } : {}),
});
export const REPEAT = (expr, conditions = [], actions = [], events = []) => ({
  type: "BuiltinCommonInstructions::Repeat",
  repeatExpression: String(expr),
  conditions: conditions.flat().filter(Boolean),
  actions: actions.flat().filter(Boolean),
  ...(events.length ? { events: events.flat().filter(Boolean) } : {}),
});
export const COMMENT = (comment) => ({
  type: "BuiltinCommonInstructions::Comment",
  color: { b: 109, g: 230, r: 255, textB: 0, textG: 0, textR: 0 },
  comment,
});
export const GROUP = (name, events, color = [74, 176, 228]) => ({
  colorB: color[2], colorG: color[1], colorR: color[0], creationTime: 0, name, source: "",
  type: "BuiltinCommonInstructions::Group", events: events.flat().filter(Boolean), parameters: [],
});
export const LINK = (target) => ({ type: "BuiltinCommonInstructions::Link", include: { includeConfig: 0 }, target });

// ---------------------------------------------------------------------------
// Frequent instructions (shortcuts). Parameter order follows the engine metadata.

export const SET = (v, op, val) => A("SetNumberVariable", v, op, val);
export const SETS = (v, op, val) => A("SetStringVariable", v, op, val);
export const IFN = (v, op, val) => C("NumberVariable", v, op, val);
export const IFS = (v, op, val) => C("StringVariable", v, op, val);
export const OSET = (o, v, op, val) => A("SetNumberObjectVariable", o, v, op, val);
export const OSETS = (o, v, op, val) => A("SetStringObjectVariable", o, v, op, val);
export const OIFN = (o, v, op, val) => C("NumberObjectVariable", o, v, op, val);
export const OIFS = (o, v, op, val) => C("StringObjectVariable", o, v, op, val);
export const CMP = (a, op, b) => C("BuiltinCommonInstructions::CompareNumbers", a, op, b);
export const CMPS = (a, op, b) => C("BuiltinCommonInstructions::CompareStrings", a, op, b);

export const ANIM = (o, nameExpr) => A("AnimatableCapability::AnimatableBehavior::SetName", o, "Animation", "=", nameExpr);
export const ANIM_IS = (o, op, nameExpr) => C("AnimatableCapability::AnimatableBehavior::Name", o, "Animation", op, nameExpr);
export const ANIM_END = (o) => C("AnimatableCapability::AnimatableBehavior::HasAnimationEnded", o, "Animation");
export const ANIM_PAUSE = (o) => A("AnimatableCapability::AnimatableBehavior::PauseAnimation", o, "Animation");
export const ANIM_PLAY = (o) => A("AnimatableCapability::AnimatableBehavior::PlayAnimation", o, "Animation");
export const ANIM_SPEED = (o, v) => A("AnimatableCapability::AnimatableBehavior::SetSpeedScale", o, "Animation", "=", v);
export const FLIPX = (o, yes) => A("FlippableCapability::FlippableBehavior::FlipX", o, "Flippable", yes ? "yes" : "no");
export const OPACITY = (o, v) => A("OpacityCapability::OpacityBehavior::SetValue", o, "Opacity", "=", v);
export const WIDTH = (o, v) => A("ResizableCapability::ResizableBehavior::SetWidth", o, "Resizable", "=", v);
export const SIZE = (o, w, h) => A("ResizableCapability::ResizableBehavior::SetSize", o, "Resizable", w, h);
export const SCALE = (o, v) => A("ScalableCapability::ScalableBehavior::SetValue", o, "Scale", "=", v);
export const TEXT = (o, v) => A("TextContainerCapability::TextContainerBehavior::SetValue", o, "Text", "=", v);
export const TCOLOR = (o, rgb) => A("TextObject::ChangeColor", o, q(rgb));
export const TSIZE = (o, v) => A("TextObject::Text::SetFontSize", o, "=", v);
export const TINT = (o, rgb) => A("ChangeColor", o, q(rgb));
export const CREATE = (o, x, y, layer = "") => A("Create", o, x, y, layer ? q(layer) : "");
export const DEL = (o) => A("Delete", o);
export const XY = (o, x, y) => A("SetXY", o, "=", x, "=", y);
export const SETX = (o, op, v) => A("SetX", o, op, v);
export const SETY = (o, op, v) => A("SetY", o, op, v);
export const Z = (o, z) => A("SetZOrder", o, "=", z);
export const HIDE = (o) => A("Hide", o);
export const SHOW = (o) => A("Show", o);
export const SOUND = (file, vol = 100, pitch = 1) => A("PlaySound", file, "no", vol, pitch);
export const MUSIC = (file, vol = 60) => A("PlayMusicOnChannel", file, "0", "yes", vol, 1);
export const COLLIDE = (a, b) => C("CollisionNP", a, b);
export const DT = "TimeDelta()";
export const JUST_BEGINS = () => C("SceneJustBegins");
export const KEY = (k) => C("KeyFromTextPressed", q(k));
export const KEY_JUST = (k) => C("KeyFromTextJustPressed", q(k));
export const TOUCH_BTN = (id) => C("SpriteMultitouchJoystick::IsButtonPressed", "1", q(id));
export const TAP_ON = (o) => [C("IsCursorOnObject", o), C("MouseButtonFromTextReleased", q("Left"))];
export const GOTO = (scene) => A("Scene", q(scene), "no");
export const PLAT = "PlatformerObject";
export const SPEED = (o, beh, v) => A("PlatformBehavior::PlatformerObjectBehavior::SetCurrentSpeed", o, beh, "=", v);
export const MAXSPEED = (o, beh, v) => A("PlatformBehavior::MaxSpeed", o, beh, "=", v);
