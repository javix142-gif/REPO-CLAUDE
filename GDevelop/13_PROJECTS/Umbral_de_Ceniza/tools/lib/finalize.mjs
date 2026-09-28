// Expands DSL instructions to full GDevelop parameter lists using the engine
// metadata, and validates types, parameter counts, objects, behaviours and
// variables. Any problem is collected and reported (the build then fails).

const OBJECT_PARAM_TYPES = new Set(["object", "objectList", "objectPtr", "objectListOrEmptyIfJustDeclared",
  "objectListOrEmptyWithoutPicking"]);
const RESOURCE_PARAM_TYPES = new Set(["imageResource", "soundfile", "musicfile", "fontResource", "audioResource", "jsonResource",
  "videoResource", "bitmapFontResource", "tilemapResource", "tilesetResource", "model3DResource", "atlasResource", "spineResource"]);
const CAPABILITY_BEHAVIORS = new Set(["Animation", "Flippable", "Opacity", "Resizable", "Scale", "Text", "Effect"]);

export class Finalizer {
  constructor(gd) {
    this.gd = gd;
    this.platform = gd.JsPlatform.get();
    this.errors = [];
    this.stats = { instructions: 0, events: 0 };
  }

  /** ctx: { name, objects: Map<name,{type, behaviors: Map<name,type>, variables:Set}>, groups: Map<name,[names]>, vars:Set } */
  events(list, ctx, path = "") {
    list.forEach((ev, i) => {
      const p = `${path}/${i}`;
      this.stats.events++;
      if (ev.type === "BuiltinCommonInstructions::ForEach" && !this.hasObject(ctx, ev.object)) {
        this.err(ctx, p, `ForEach on unknown object "${ev.object}"`);
      }
      for (const key of ["conditions", "whileConditions"]) if (ev[key]) ev[key].forEach((ins, j) => this.instr(ins, true, ctx, `${p}.${key}[${j}]`));
      if (ev.actions) ev.actions.forEach((ins, j) => this.instr(ins, false, ctx, `${p}.actions[${j}]`));
      if (ev.events) this.events(ev.events, ctx, p);
    });
  }

  err(ctx, path, msg) { this.errors.push(`[${ctx.name}] ${path}: ${msg}`); }

  hasObject(ctx, name) { return ctx.objects.has(name) || ctx.groups.has(name); }

  objectInfo(ctx, name) {
    if (ctx.objects.has(name)) return [ctx.objects.get(name)];
    if (ctx.groups.has(name)) return ctx.groups.get(name).map((n) => ctx.objects.get(n)).filter(Boolean);
    return [];
  }

  instr(ins, isCond, ctx, path) {
    if (!ins._up) { // already final (e.g. copied from an official example)
      if (ins.subInstructions) ins.subInstructions.forEach((s, k) => this.instr(s, isCond, ctx, `${path}.sub[${k}]`));
      return;
    }
    const gd = this.gd;
    const type = ins.type.value;
    const md = isCond ? gd.MetadataProvider.getConditionMetadata(this.platform, type)
      : gd.MetadataProvider.getActionMetadata(this.platform, type);
    this.stats.instructions++;
    if (gd.MetadataProvider.isBadInstructionMetadata(md)) {
      this.err(ctx, path, `unknown ${isCond ? "condition" : "action"} "${type}"`);
      return;
    }
    const n = md.getParametersCount();
    const up = ins._up;
    const params = [];
    let k = 0;
    for (let i = 0; i < n; i++) {
      const pm = md.getParameter(i);
      if (pm.isCodeOnly()) { params.push(""); continue; }
      if (k < up.length) params.push(up[k++]);
      else if (pm.isOptional()) params.push("");
      else { this.err(ctx, path, `${type}: missing parameter #${i} (${pm.getType()})`); params.push(""); }
    }
    if (k < up.length) this.err(ctx, path, `${type}: ${up.length - k} extra parameter(s): ${JSON.stringify(up.slice(k))}`);

    // semantic checks
    for (let i = 0; i < n; i++) {
      const pm = md.getParameter(i);
      const t = pm.getType();
      const v = params[i];
      if (pm.isCodeOnly()) continue;
      if (OBJECT_PARAM_TYPES.has(t) && v !== "" && !this.hasObject(ctx, v)) this.err(ctx, path, `${type}: unknown object "${v}"`);
      if (RESOURCE_PARAM_TYPES.has(t) && v !== "" && ctx.resources && !ctx.resources.has(v)) {
        this.err(ctx, path, `${type}: "${v}" is not a declared resource (resource parameters take the plain name, without quotes)`);
      }
      if (t === "behavior" && v !== "" && !CAPABILITY_BEHAVIORS.has(v)) {
        const objs = this.objectInfo(ctx, params[0]);
        const required = pm.getExtraInfo();
        for (const o of objs) {
          const bt = o.behaviors.get(v);
          if (!bt) this.err(ctx, path, `${type}: object "${params[0]}" has no behavior "${v}"`);
          else if (required && bt !== required) this.err(ctx, path, `${type}: behavior "${v}" is ${bt}, expected ${required}`);
        }
      }
      if (t === "objectvar" && v !== "") {
        const root = v.split(/[.[]/)[0];
        for (const o of this.objectInfo(ctx, params[0])) {
          if (!o.variables.has(root)) this.err(ctx, path, `${type}: object "${params[0]}" has no variable "${root}"`);
        }
      }
      if ((t === "variable" || t === "variableOrProperty" || t === "variableOrPropertyOrParameter" || t === "scenevar" || t === "globalvar") && v !== "") {
        const root = v.split(/[.[]/)[0];
        if (!ctx.vars.has(root)) this.err(ctx, path, `${type}: undeclared variable "${root}"`);
      }
    }
    // GDevelop string literals do not support "\n": rewrite it as a NewLine() call (checked against the engine).
    ins.parameters = params.map((p) => p.replace(/\\n/g, '" + NewLine() + "'));
    delete ins._up;
    delete ins._kind;
    if (ins.subInstructions) ins.subInstructions.forEach((s, j) => this.instr(s, isCond, ctx, `${path}.sub[${j}]`));
  }
}
