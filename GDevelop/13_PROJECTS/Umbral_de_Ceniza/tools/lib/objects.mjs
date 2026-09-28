// Object, behavior, variable, layer and instance factories.
// Field layouts come from libGD 5.6.269 serialisation (see tools/README.md) and
// from the official example "starting-platformer-pixel".
import { createHash } from "node:crypto";

// ---------------------------------------------------------------- variables
export const vnum = (name, value = 0) => ({ name, type: "number", value });
export const vstr = (name, value = "") => ({ name, type: "string", value });
export const vbool = (name, value = false) => ({ name, type: "boolean", value });
export const vstruct = (name, children) => ({ name, type: "structure", children });
export const varr = (name, items) => ({
  name, type: "array",
  children: items.map((v) => (typeof v === "number" ? { type: "number", value: v } : { type: "string", value: v })),
});

// ---------------------------------------------------------------- behaviors
export const platformer = (name = "PlatformerObject", o = {}) => ({
  acceleration: 1800, canGoDownFromJumpthru: true, canGrabPlatforms: false, canGrabWithoutMoving: true,
  deceleration: 2400, gravity: 1600, ignoreDefaultControls: false, jumpSpeed: 720, jumpSustainTime: 0.12,
  ladderClimbingSpeed: 150, maxFallingSpeed: 950, maxSpeed: 270, name, slopeMaxAngle: 60,
  type: "PlatformBehavior::PlatformerObjectBehavior", useLegacyTrajectory: false, useRepeatedJump: false,
  xGrabTolerance: 10, yGrabOffset: 0, ...o,
});
export const platform = (name = "Plataforma", platformType = "NormalPlatform") => ({
  canBeGrabbed: false, name, platformType, type: "PlatformBehavior::PlatformBehavior", yGrabOffset: 0,
});
// Anchor enums (runtime): H 0 none,1 left,2 right,3 proportional,4 center ; V 0 none,1 top,2 bottom,3 prop,4 center
export const anchor = (h = 0, v = 0, name = "Ancla") => ({
  bottomEdgeAnchor: 0, leftEdgeAnchor: h, name, relativeToOriginalWindowSize: true, rightEdgeAnchor: 0,
  topEdgeAnchor: v, type: "AnchorBehavior::AnchorBehavior", useLegacyBottomAndRightAnchors: false,
});
export const multitouchButton = (id, name = "BotonTactil") => ({
  name, type: "SpriteMultitouchJoystick::MultitouchButton", ControllerIdentifier: 1, ButtonIdentifier: id,
  Radius: 0, TouchId: 0, TouchIndex: 0, IsReleased: false,
});
export const platformerMapper = (name = "Mapeo") => ({
  name, type: "SpriteMultitouchJoystick::PlatformerMultitouchMapper", Property: "PlatformerObject",
  ControllerIdentifier: 1, JoystickIdentifier: "Primary", JumpButton: "A",
});

// ---------------------------------------------------------------- objects
const box = (m) => (m ? [m.map(([x, y]) => ({ x, y }))] : []);

/** Sprite object from the art manifest. `anims` filters animation names (prefix match allowed). */
export function sprite(manifest, name, { from = name, anims = null, behaviors = [], variables = [], adapt = false } = {}) {
  const entry = manifest.sprites[from];
  if (!entry) throw new Error(`manifest has no sprite ${from}`);
  let list = entry.anims;
  if (anims) list = list.filter((a) => anims.some((f) => a.name === f || a.name.startsWith(f)));
  return {
    adaptCollisionMaskAutomatically: adapt, assetStoreId: "", name, type: "Sprite", updateIfNotVisible: false,
    variables, effects: [], behaviors,
    animations: list.map((a) => ({
      name: a.name, useMultipleDirections: false,
      directions: [{
        looping: a.loop, timeBetweenFrames: a.dt,
        sprites: a.frames.map((img) => ({
          hasCustomCollisionMask: !!a.mask, image: img, points: [],
          originPoint: { name: "origine", x: a.origin[0], y: a.origin[1] },
          centerPoint: { automatic: true, name: "centre", x: 0, y: 0 },
          customCollisionMask: box(a.mask),
        })),
      }],
    })),
  };
}

/** Sprite with a single image (used for invisible hitboxes, etc). */
export function simpleSprite(name, image, { origin = [0, 0], behaviors = [], variables = [] } = {}) {
  return {
    adaptCollisionMaskAutomatically: false, assetStoreId: "", name, type: "Sprite", updateIfNotVisible: false,
    variables, effects: [], behaviors,
    animations: [{ name: "Quieto", useMultipleDirections: false, directions: [{ looping: false, timeBetweenFrames: 1,
      sprites: [{ hasCustomCollisionMask: false, image, points: [], originPoint: { name: "origine", x: origin[0], y: origin[1] },
        centerPoint: { automatic: true, name: "centre", x: 0, y: 0 }, customCollisionMask: [] }] }] }],
  };
}

export function text(name, { size = 26, color = [255, 255, 255], font = "fonts/PixelifySans-SemiBold.ttf", value = "",
  align = "left", outline = [20, 15, 26], outlineThickness = 4, shadow = false, behaviors = [], variables = [] } = {}) {
  const col = `${color[0]};${color[1]};${color[2]}`;
  return {
    assetStoreId: "", bold: false, italic: false, name, smoothed: false, type: "TextObject::Text", underlined: false,
    variables, effects: [], behaviors, string: value, font, textAlignment: align, characterSize: size,
    color: { b: color[2], g: color[1], r: color[0] },
    content: {
      bold: false, isOutlineEnabled: !!outline, isShadowEnabled: shadow, italic: false,
      outlineColor: outline ? outline.join(";") : "0;0;0", outlineThickness, shadowAngle: 90, shadowBlurRadius: 0,
      shadowColor: "0;0;0", shadowDistance: 3, shadowOpacity: 160, smoothed: false, underlined: false, text: value, font,
      textAlignment: align, verticalTextAlignment: "top", characterSize: size, lineHeight: 0, color: col,
    },
  };
}

export const tiled = (name, texture, w, h, { behaviors = [], variables = [] } = {}) => ({
  assetStoreId: "", height: h, name, texture, type: "TiledSpriteObject::TiledSprite", width: w, variables, effects: [], behaviors,
});

export const panel = (name, texture, margin, w, h, { behaviors = [], variables = [], tiledCenter = false } = {}) => ({
  assetStoreId: "", bottomMargin: margin, height: h, leftMargin: margin, name, rightMargin: margin, texture, tiled: tiledCenter,
  topMargin: margin, type: "PanelSpriteObject::PanelSprite", width: w, variables, effects: [], behaviors,
});

export const painter = (name) => ({
  assetStoreId: "", name, type: "PrimitiveDrawing::Drawer", variables: [], effects: [], behaviors: [],
  fillOpacity: 255, outlineSize: 0, outlineOpacity: 255, absoluteCoordinates: true, clearBetweenFrames: true,
  antialiasing: "none", fillColor: { r: 255, g: 255, b: 255 }, outlineColor: { r: 0, g: 0, b: 0 },
});

/** Multitouch joystick custom object (structure copied from the official example). */
export const joystick = (name, border, thumb) => {
  const child = (anim, image) => ({
    adaptCollisionMaskAutomatically: false, updateIfNotVisible: false,
    animations: [{ name: anim, useMultipleDirections: false, directions: [{ looping: false, timeBetweenFrames: 0.08,
      sprites: [{ hasCustomCollisionMask: false, image, points: [], originPoint: { name: "origine", x: 0, y: 0 },
        centerPoint: { automatic: true, name: "centre", x: 0, y: 0 }, customCollisionMask: [] }] }] }],
  });
  return {
    assetStoreId: "", name, type: "SpriteMultitouchJoystick::SpriteMultitouchJoystick", variant: "",
    variables: [], effects: [], behaviors: [], content: { DeadZoneRadius: 0.25 },
    childrenContent: { Border: child("Idle", border), Thumb: child("Idle", thumb) },
  };
};

// ---------------------------------------------------------------- layers
export const layer = (name, { visible = true, base = false } = {}) => ({
  ambientLightColorB: 200, ambientLightColorG: 200, ambientLightColorR: 200, camera2DPlaneMaxDrawingDistance: 5000,
  camera3DFarPlaneDistance: 10000, camera3DFieldOfView: 45, camera3DNearPlaneDistance: 3, cameraType: "",
  followBaseLayerCamera: false, isLightingLayer: false, isLocked: false, name, renderingType: "", visibility: visible,
  cameras: base || name === "" ? [{ defaultSize: true, defaultViewport: true, height: 0, viewportBottom: 1, viewportLeft: 0,
    viewportRight: 1, viewportTop: 0, width: 0 }] : [],
  effects: [],
});

// ---------------------------------------------------------------- instances
let uuidCounter = 0;
export const uuid = (seed) => {
  const h = createHash("sha1").update(`${seed}:${uuidCounter++}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const resetUuid = () => { uuidCounter = 0; };

/** Instance. opts: layer, z, w, h (custom size), vars: [{name,type,value}], locked, angle */
export function inst(name, x, y, opts = {}) {
  const o = {
    angle: opts.angle || 0, customSize: opts.w !== undefined, height: opts.h || 0, keepRatio: true,
    layer: opts.layer || "", name, persistentUuid: uuid(`${name}@${x},${y}`), width: opts.w || 0,
    x, y, zOrder: opts.z ?? 0, numberProperties: [], stringProperties: [], initialVariables: opts.vars || [],
  };
  if (opts.locked) o.locked = true;
  return o;
}
