const MOVEMENT_THRESHOLD = 10;

let movementState = "leve";
let previousMovementState = "leve";

let mainTile = null;
let fragmentTiles = [];
let fragmentLayoutIndex = 0;

const panel = {
  x: 30,
  y: 20,
  w: 520,
  h: 760
};

const mosaicArea = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

let compositionBounds = {
  x: 0,
  y: 0,
  w: 1,
  h: 1
};

const FRAGMENT_ZOOM = 1.45;
const FRAG_W = 96;
const FRAG_H = 96;
const FRAGMENT_MARGIN_X = 22;
const FRAGMENT_MARGIN_TOP = 18;
const FRAGMENT_MARGIN_BOTTOM = 22;
const FRAGMENT_GAP = 10;

// estabilización del cambio de estilo
let smoothedMovementPercentage = 0;
let lastStyleChangeFrame = 0;

const MOVEMENT_UP_THRESHOLD = 15;
const MOVEMENT_DOWN_THRESHOLD = 13;
const STYLE_CHANGE_COOLDOWN = 15;

function lmInit() {
  mosaicArea.x = panel.x + 40;
  mosaicArea.y = panel.y + 150;
  mosaicArea.w = panel.w - 80;
  mosaicArea.h = 470;

  mainTile = createMainTile();
  fragmentTiles = getFragmentTilesFromLayout(fragmentLayoutIndex);
  computeCompositionBounds();
}

function createMainTile() {
  return {
    x: mosaicArea.x,
    y: mosaicArea.y,
    w: mosaicArea.w,
    h: 255,
    type: "main"
  };
}

function lmNextStyle() {
  currentStyleIndex = (currentStyleIndex + 1) % styles.length;
}

function lmNextFragmentLayout() {
  fragmentLayoutIndex = (fragmentLayoutIndex + 1) % getFragmentLayouts().length;
  fragmentTiles = getFragmentTilesFromLayout(fragmentLayoutIndex);
  computeCompositionBounds();
}

function lmUpdateMovement() {
  if (!hasProcessedFrame) return;

  smoothedMovementPercentage = lerp(
    smoothedMovementPercentage,
    lastMovementPercentage,
    0.12
  );

  previousMovementState = movementState;

  if (movementState === "leve" && smoothedMovementPercentage >= MOVEMENT_UP_THRESHOLD) {
    movementState = "moderado";
  } else if (movementState === "moderado" && smoothedMovementPercentage <= MOVEMENT_DOWN_THRESHOLD) {
    movementState = "leve";
  }

  const canChangeStyle = frameCount - lastStyleChangeFrame > STYLE_CHANGE_COOLDOWN;

  if (movementState !== previousMovementState && canChangeStyle) {
    lmNextStyle();
    lmNextFragmentLayout();
    lastStyleChangeFrame = frameCount;
  }
}

function getFragmentLayouts() {
  const innerLeft = mosaicArea.x + FRAGMENT_MARGIN_X;
  const innerRight = mosaicArea.x + mosaicArea.w - FRAGMENT_MARGIN_X;
  const innerTop = mainTile.y + mainTile.h + FRAGMENT_MARGIN_TOP;
  const innerBottom = mosaicArea.y + mosaicArea.h - FRAGMENT_MARGIN_BOTTOM;

  const usableW = innerRight - innerLeft;
  const usableH = innerBottom - innerTop;

  const totalRowW = FRAG_W * 4 + FRAGMENT_GAP * 3;
  const startX = innerLeft + (usableW - totalRowW) / 2;
  const baseY = innerTop + (usableH - FRAG_H) / 2;

  const upSmall = 8;
  const downSmall = 8;
  const sideSmall = 8;

  return [
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - upSmall },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY + downSmall },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY - 4 }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP) - sideSmall, y: baseY - 6 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP),             y: baseY + 8 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP),             y: baseY - 4 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP) + sideSmall, y: baseY + 6 }
    ],
    [
      { x: startX + 0 * (FRAG_W + FRAGMENT_GAP), y: baseY + 4 },
      { x: startX + 1 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 },
      { x: startX + 2 * (FRAG_W + FRAGMENT_GAP), y: baseY - 10 },
      { x: startX + 3 * (FRAG_W + FRAGMENT_GAP), y: baseY + 4 }
    ]
  ];
}

function getFragmentTilesFromLayout(layoutIndex) {
  const layouts = getFragmentLayouts();
  const selected = layouts[layoutIndex % layouts.length];

  const minX = mosaicArea.x + FRAGMENT_MARGIN_X;
  const maxX = mosaicArea.x + mosaicArea.w - FRAGMENT_MARGIN_X - FRAG_W;
  const minY = mainTile.y + mainTile.h + FRAGMENT_MARGIN_TOP;
  const maxY = mosaicArea.y + mosaicArea.h - FRAGMENT_MARGIN_BOTTOM - FRAG_H;

  return selected.map(pos => ({
    x: constrain(pos.x, minX, maxX),
    y: constrain(pos.y, minY, maxY),
    w: FRAG_W,
    h: FRAG_H,
    type: "fragment"
  }));
}

function computeCompositionBounds() {
  compositionBounds.x = mosaicArea.x;
  compositionBounds.y = mosaicArea.y;
  compositionBounds.w = mosaicArea.w;
  compositionBounds.h = mosaicArea.h;
}