import { onMount, onCleanup } from "solid-js";
import { isMotionOkay } from "@/utils/motion";

type Props = {
  startSelector: string;
  endSelector: string;
  options?: {
    color?: string;
    width?: number;
    animate?: boolean;
  };
  // top-level convenience props
  color?: string;
  width?: number;
  animate?: boolean;
};

export default function CanvasConnector(props: Props) {
  let canvas: HTMLCanvasElement | null = null;
  let ctx!: CanvasRenderingContext2D;
  // do NOT access window/devicePixelRatio at module init — keep safe for SSR
  let dpr = 1;

  // tunable parameters (change these to experiment with curve shape)
  const START_NORMAL_MIN = 300; // minimum length of start normal (px)
  const START_NORMAL_SCALE = 1.0; // fraction of distance used to scale start normal
  const START_OFFSET = 20; // how many pixels away from element to start the drawn path
  const LOOP_DEPTH_MIN = 60; // minimum loop depth for mobile-like behavior (px)
  const BRANCH_CTRL_MIN = 60; // minimum branch control offset (px)
  const BRANCH_CTRL_SCALE = 0.35; // fraction for branch control based on delta
  const BRANCH_TANGENT_SCALE = 0.9; // how much of main tangent branches inherit (1.0 = exact)
  const BRANCH_END_APPROACH_MIN = 80; // min approach distance for branch->end (px)
  const END_GAP = 20; // gap (px) to keep between arrow tip and target element
  // randomness / natural variance (px)
  const START_OFFSET_VARIANCE = 6; // +/- px to vary the start offset
  const END_GAP_VARIANCE = 6; // +/- px to vary the end gap
  const CTRL_JITTER = 8; // +/- px jitter applied to control points
  // canvas-level opacity (0..1) so strokes read lighter on bright backgrounds
  const CANVAS_OPACITY = 0.35;
  // trace / fade timing (ms)
  const TRACE_DELAY_MS = 1200; // wait before starting the trace
  const TRACE_DURATION_MS = 900; // how long the trace animation runs (matches previous)
  const VISIBLE_AFTER_MS = 1600; // how long to keep the drawing visible before untracing
  const UNTRACE_DURATION_MS = 600; // duration of the untrace (reverse draw)

  // guard so we only run the trace once per mount (re-navigation mounts again)
  let hasRun = false;

  function resize() {
    if (!canvas) return;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cubicPoint(t: number, p0: any, c1: any, c2: any, p3: any) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    const x = uuu * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * p3.y;
    return { x, y };
  }

  function cubicDerivative(t: number, p0: any, c1: any, c2: any, p3: any) {
    const u = 1 - t;
    const a = { x: c1.x - p0.x, y: c1.y - p0.y };
    const b = { x: c2.x - c1.x, y: c2.y - c1.y };
    const c = { x: p3.x - c2.x, y: p3.y - c2.y };
    const term1 = u * u;
    const term2 = 2 * u * t;
    const term3 = t * t;
    return {
      x: 3 * (term1 * a.x + term2 * b.x + term3 * c.x),
      y: 3 * (term1 * a.y + term2 * b.y + term3 * c.y),
    };
  }

  function makeCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "site-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    // set a global canvas opacity so the arrow is visually lighter on light
    // backgrounds; this can be tuned via CANVAS_OPACITY above
    canvas.style.opacity = String(CANVAS_OPACITY);
    document.body.appendChild(canvas);
  ctx = canvas.getContext("2d")!;
    resize();
  }

  function drawConnector(opts: any) {
    if (!canvas) return;
  // choose default color based on current theme (lighter gray for light mode)
  const defaultDark = "rgba(107,114,128,0.9)"; // original neutral for dark mode
  // make the light-mode default even lighter for better contrast on white backgrounds
  const defaultLight = "rgba(229,231,235,0.95)"; // Tailwind gray-200-ish, lighter than before
  const themeClassList = typeof document !== 'undefined' ? document.documentElement.classList : null;
  const isDarkTheme = themeClassList ? themeClassList.contains("dark") : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const { startEl, endEls = [], color = (isDarkTheme ? defaultDark : defaultLight), width = 2, animate = true } = opts;
    if (!startEl || (!endEls || endEls.length === 0)) return;

    const isMobile = false; // keep consistent with prior logic; can be enabled
    const startRect = startEl.getBoundingClientRect();
  const endRects = Array.from(endEls as any).map((el: any) => (el as HTMLElement).getBoundingClientRect());
    const centroid = endRects.reduce((acc: any, r: any) => ({ x: acc.x + (r.left + r.width / 2), y: acc.y + (r.top + r.height) }), { x: 0, y: 0 });
    centroid.x /= endRects.length; centroid.y /= endRects.length;

    // small RNG helper for natural variance
    function randRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    let p0: any, p3: any, c1: any, c2: any;
    if (!isMobile) {
      p0 = { x: startRect.left + startRect.width, y: startRect.top + startRect.height / 2 };
      // offset start point away from the element by START_OFFSET (to the right)
      // add a small random variance so repeated traces look natural
      const startOffsetRand = START_OFFSET + randRange(-START_OFFSET_VARIANCE, START_OFFSET_VARIANCE);
      p0.x = p0.x + startOffsetRand;
      // raw centroid at bottom-center of targets
      p3 = { x: centroid.x, y: centroid.y };
      const dy = Math.max(START_NORMAL_MIN, Math.abs(p3.y - p0.y) * START_NORMAL_SCALE);
      const dx = Math.max(START_NORMAL_MIN, Math.abs(p3.x - p0.x) * START_NORMAL_SCALE);
      c1 = { x: p0.x + dx, y: p0.y };
      c2 = { x: p3.x, y: p3.y + dy };
      // apply small jitter to controls for natural curve variation
      c1.x += randRange(-CTRL_JITTER, CTRL_JITTER);
      c1.y += randRange(-CTRL_JITTER, CTRL_JITTER);
      c2.x += randRange(-CTRL_JITTER, CTRL_JITTER);
      c2.y += randRange(-CTRL_JITTER, CTRL_JITTER);
      // nudge the final p3 back along the approach vector (from c2 -> p3)
      // so the arrow tip stops END_GAP pixels short of the element regardless of angle
      const vx = p3.x - c2.x;
      const vy = p3.y - c2.y;
      const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
      const endGapRand = END_GAP + randRange(-END_GAP_VARIANCE, END_GAP_VARIANCE);
      p3 = { x: p3.x - (vx / vlen) * endGapRand, y: p3.y - (vy / vlen) * endGapRand };
    } else {
      p0 = { x: startRect.left + startRect.width / 2, y: startRect.top + startRect.height };
      // offset start point away from the element by START_OFFSET (downwards)
      p0.y = p0.y + START_OFFSET;
      p3 = { x: centroid.x, y: centroid.y };
      const loopDepth = Math.max(LOOP_DEPTH_MIN, window.innerHeight * 0.18);
      const midX = Math.min(window.innerWidth - 40, p0.x + Math.max(BRANCH_CTRL_MIN, (p3.x - p0.x) * START_NORMAL_SCALE));
      const midY = p0.y + loopDepth;
      c1 = { x: p0.x, y: p0.y + loopDepth * START_NORMAL_SCALE };
      c2 = { x: midX + 20, y: midY + 20 };
      var pMid = { x: midX, y: midY };
      var c3 = { x: p3.x, y: p3.y + Math.max(BRANCH_END_APPROACH_MIN, loopDepth * START_NORMAL_SCALE) };
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    function renderMain(tMax: number) {
      ctx.beginPath();
      const steps = Math.max(8, Math.floor(120 * (tMax / 0.5)));
      let prev: any = null;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tMax;
        const pt = cubicPoint(t, p0, c1, c2, p3);
        if (!prev) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        prev = pt;
      }
      ctx.stroke();
    }

    function renderBranch(midPt: any, endPt: any, ctrl1: any, ctrl2: any, tMax: number) {
      ctx.beginPath();
      const steps = Math.max(6, Math.floor(80 * tMax));
      let prev: any = null;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tMax;
        const pt = cubicPoint(t, midPt, ctrl1, ctrl2, endPt);
        if (!prev) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        prev = pt;
      }
      ctx.stroke();
    }

  const branches = endRects.map((r: any) => ({ endPt: { x: r.left + r.width / 2, y: r.top + r.height }, ctrlA: null, ctrlB: null }));
    const midPoint = cubicPoint(0.5, p0, c1, c2, p3);
    const dMid = cubicDerivative(0.5, p0, c1, c2, p3);

    branches.forEach((b: any) => {
  // compute controls based on the raw end point, then push the end point back
  // along the approach vector by END_GAP and recompute the end-approach control
  const endPtRaw = b.endPt;
  const desired = { x: dMid.x * BRANCH_TANGENT_SCALE, y: dMid.y * BRANCH_TANGENT_SCALE };
  b.ctrlA = { x: midPoint.x + desired.x / 3, y: midPoint.y + desired.y / 3 };
  // add a small jitter to ctrlA for variety
  b.ctrlA.x += randRange(-CTRL_JITTER, CTRL_JITTER);
  b.ctrlA.y += randRange(-CTRL_JITTER, CTRL_JITTER);
  // initial ctrlB based on raw end
  const vyRaw = endPtRaw.y - midPoint.y;
  const ctrlBraw = { x: endPtRaw.x, y: endPtRaw.y + Math.max(BRANCH_END_APPROACH_MIN, Math.abs(vyRaw) * BRANCH_CTRL_SCALE) };
  // approach vector from ctrlBraw -> endPtRaw
  const avx = endPtRaw.x - ctrlBraw.x;
  const avy = endPtRaw.y - ctrlBraw.y;
  const alen = Math.sqrt(avx * avx + avy * avy) || 1;
  // move end back by END_GAP along approach, with small variance
  const endGapRand = END_GAP + randRange(-END_GAP_VARIANCE, END_GAP_VARIANCE);
  const endAdj = { x: endPtRaw.x - (avx / alen) * endGapRand, y: endPtRaw.y - (avy / alen) * endGapRand };
  // recompute ctrlB to approach the adjusted end point, add jitter
  const vy = endAdj.y - midPoint.y;
  b.endPt = endAdj;
  b.ctrlB = { x: endAdj.x, y: endAdj.y + Math.max(BRANCH_END_APPROACH_MIN, Math.abs(vy) * BRANCH_CTRL_SCALE) };
  b.ctrlB.x += randRange(-CTRL_JITTER, CTRL_JITTER);
  b.ctrlB.y += randRange(-CTRL_JITTER, CTRL_JITTER);
    });

    function renderProgress(tProgress: number, opts: { composite?: GlobalCompositeOperation; strokeW?: number } = {}) {
      const composite = opts.composite || 'source-over';
      const strokeW = typeof opts.strokeW === 'number' ? opts.strokeW : width;
      // Only clear canvas for normal drawing passes. For erase passes (destination-out)
      // we want to overlay erasing strokes on top of the existing drawing, so do not clear.
      if (composite === 'source-over') {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      }
      ctx!.globalCompositeOperation = composite;
      ctx!.lineWidth = strokeW;
      ctx!.strokeStyle = color;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";

      if (branches.length === 1) {
        const steps = Math.max(12, Math.floor(120 * tProgress));
        let prev: any = null;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * tProgress;
          const pt = cubicPoint(t, p0, c1, c2, p3);
          if (!prev) ctx!.moveTo(pt.x, pt.y); else ctx!.lineTo(pt.x, pt.y);
          prev = pt;
        }
        ctx!.stroke();
        if (tProgress >= 1) {
          const ctrl = c2;
          const vx = p3.x - ctrl.x;
          const vy = p3.y - ctrl.y;
          const theta = Math.atan2(vy, vx);
          const angleOffset = Math.PI / 6;
          const len = 12;
          const lx = p3.x - len * Math.cos(theta - angleOffset);
          const ly = p3.y - len * Math.sin(theta - angleOffset);
          const rx = p3.x - len * Math.cos(theta + angleOffset);
          const ry = p3.y - len * Math.sin(theta + angleOffset);
          ctx!.beginPath();
          ctx!.moveTo(lx, ly);
          ctx!.lineTo(p3.x, p3.y);
          ctx!.moveTo(rx, ry);
          ctx!.lineTo(p3.x, p3.y);
          ctx!.stroke();
        }
        return;
      }

      const mainDuration = 0.5;
      if (tProgress < mainDuration) {
        const prog = tProgress / mainDuration;
        const tMax = 0.5 * prog;
        renderMain(tMax);
      } else {
        renderMain(0.5);
        const branchProg = (tProgress - mainDuration) / (1 - mainDuration);
        const n = branches.length;
        const share = 1 / n;
        branches.forEach((b: any, i: number) => {
          const start = i * share;
          const end = (i + 1) * share;
          const local = Math.min(1, Math.max(0, (branchProg - start) / (end - start)));
          if (local > 0) {
            renderBranch(midPoint, b.endPt, b.ctrlA, b.ctrlB, local);
          }
          if (local >= 1) {
            const ctrl = b.ctrlB;
            const vx = b.endPt.x - ctrl.x;
            const vy = b.endPt.y - ctrl.y;
            const theta = Math.atan2(vy, vx);
            const angleOffset = Math.PI / 6;
            const len = 12;
            const lx = b.endPt.x - len * Math.cos(theta - angleOffset);
            const ly = b.endPt.y - len * Math.sin(theta - angleOffset);
            const rx = b.endPt.x - len * Math.cos(theta + angleOffset);
            const ry = b.endPt.y - len * Math.sin(theta + angleOffset);
            ctx!.beginPath();
            ctx!.moveTo(lx, ly);
            ctx!.lineTo(b.endPt.x, b.endPt.y);
            ctx!.moveTo(rx, ry);
            ctx!.lineTo(b.endPt.x, b.endPt.y);
            ctx!.stroke();
          }
        });
      }
    }

    // animate once then fade out; if not animating, render static and fade
    function startAnimationOnce() {
      // ensure canvas is present (keep configured translucency)
      if (canvas) canvas.style.opacity = String(CANVAS_OPACITY);

      const motionAllowed = (() => {
        try {
          return isMotionOkay();
        } catch (e) {
          return false;
        }
      })();

      if (!motionAllowed) {
        // Render a static, fully-drawn connector (no animation, no erase)
        renderProgress(1);
        return;
      }

      function eraseForward() {
        if (!canvas || !ctx) return;
        const duration = UNTRACE_DURATION_MS;
        let startTime: number | null = null;
        function step(ts: number) {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          const prog = Math.min(1, elapsed / duration);
          // erase along the forward path using destination-out composite
          renderProgress(prog, { composite: 'destination-out', strokeW: width + 6 });
          if (prog < 1) requestAnimationFrame(step);
          else {
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (ctx) ctx.globalCompositeOperation = 'source-over';
          }
        }
        requestAnimationFrame(step);
      }

      if (animate) {
        let startTime: number | null = null;
        function step(ts: number) {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          const prog = Math.min(1, elapsed / TRACE_DURATION_MS);
          renderProgress(prog);
          if (prog < 1) requestAnimationFrame(step);
        }
        setTimeout(() => requestAnimationFrame(step), TRACE_DELAY_MS);
        // after the trace completes + visible hold, perform a forward erase
        setTimeout(() => {
          eraseForward();
        }, TRACE_DELAY_MS + TRACE_DURATION_MS + VISIBLE_AFTER_MS);
      } else {
        renderProgress(1);
        // hold visible then erase forward
        setTimeout(() => {
          eraseForward();
        }, VISIBLE_AFTER_MS);
      }
    }

    // start the first-run animation only once
    if (!hasRun) {
      hasRun = true;
      startAnimationOnce();
    }
  }

  onMount(() => {
    // Always create the canvas element; decide animation vs static rendering later
    makeCanvas();

    function scheduleInitial() {
      if (hasRun) return;
      const startEl = document.querySelector(props.startSelector);
      const endEls = document.querySelectorAll(props.endSelector || "");
      const opts = props.options || { color: props.color, width: props.width, animate: props.animate };
      drawConnector({ startEl, endEls: Array.from(endEls), ...(opts || {}) });
    }

    // expose a backwards-compatible window API and initial draw
    try {
      (window as any).CanvasConnector = {
        connect: ({ startSelector, endSelector, options }: any) => {
          const startEl = document.querySelector(startSelector);
          const endEls = document.querySelectorAll(endSelector || "");
          drawConnector({ startEl, endEls: Array.from(endEls), ...(options || {}) });
        }
      };
    } catch (e) {}

  // initial draw (runs once)
  scheduleInitial();

  // resize handler only resizes canvas; do not re-run the trace
  window.addEventListener("resize", resize);

    onCleanup(() => {
      try {
        window.removeEventListener("resize", resize);
        // schedule listeners removed; only resize listener remains
      } catch (e) {}
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  canvas = null;
    });
  });

  return null;
}
