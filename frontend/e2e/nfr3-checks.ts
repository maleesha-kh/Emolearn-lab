// Layout checks that run inside the page (passed to page.evaluate, so self-contained).

export type ControlInfo = { label: string; tag: string; x: number; y: number; width: number; height: number };
export type LayoutResult = {
  viewport: { width: number; height: number };
  horizontalScroll: { scrollWidth: number; clientWidth: number; overflows: boolean; widestOffenders: { element: string; right: number }[] };
  controls: number;
  outOfView: ControlInfo[];
  cutOff: (ControlInfo & { clippedBy: string })[];
  reachableByScrolling: (ControlInfo & { scrollContainer: string })[];
  under24: ControlInfo[];
  under44: ControlInfo[];
  covered: (ControlInfo & { coveredBy: string })[];
  paintedOver: (ControlInfo & { paintedBy: string; opacity: number })[];
  textOverlaps: { a: string; b: string; overlap: { width: number; height: number } }[];
  decorativeTextElements: number;
  modalOnly: boolean;
};

export function runLayoutChecks(): LayoutResult {
  const SELECTOR = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="tab"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
  const round = (n: number) => Math.round(n * 10) / 10;
  const describe = (el: Element) => {
    const html = el as HTMLElement;
    const text = (html.getAttribute("aria-label") || html.innerText || html.getAttribute("title") || el.querySelector("img")?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
    const cls = typeof html.className === "string" && html.className ? "." + html.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text.slice(0, 50)}"` : ""}`;
  };
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const v = el as Element & { checkVisibility?: (o: object) => boolean };
    return v.checkVisibility ? v.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) : true;
  };

  // With a modal open, only its own controls are reachable (the rest is meant to be covered)
  const modal = document.querySelector('[aria-modal="true"]');
  const scope: ParentNode = modal ?? document;
  const controls = Array.from(scope.querySelectorAll(SELECTOR)).filter(visible);
  const info = (el: Element): ControlInfo => {
    const r = el.getBoundingClientRect();
    return { label: describe(el), tag: el.tagName.toLowerCase(), x: round(r.left + scrollX), y: round(r.top + scrollY), width: round(r.width), height: round(r.height) };
  };

  const result: LayoutResult = {
    viewport: { width: innerWidth, height: innerHeight },
    horizontalScroll: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      widestOffenders: [],
    },
    controls: controls.length, outOfView: [], cutOff: [], reachableByScrolling: [], under24: [], under44: [],
    covered: [], paintedOver: [], textOverlaps: [], decorativeTextElements: 0, modalOnly: !!modal,
  };

  // What sticks out past the right edge (ignoring anything inside a clipping ancestor)
  if (result.horizontalScroll.overflows) {
    const clipped = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== "visible") return true;
      }
      return false;
    };
    result.horizontalScroll.widestOffenders = Array.from(document.body.querySelectorAll("*"))
      .map((el) => ({ el, right: el.getBoundingClientRect().right + scrollX }))
      .filter(({ el, right }) => right > document.documentElement.clientWidth + 1 && !clipped(el))
      .sort((a, b) => b.right - a.right)
      .slice(0, 5)
      .map(({ el, right }) => ({ element: describe(el), right: round(right) }));
  }

  scrollTo(0, 0);
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const base = info(el);
    if (r.width < 24 || r.height < 24) result.under24.push(base);
    if (r.width < 44 || r.height < 44) result.under44.push(base);

    let inScrollContainer = false;
    for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const p = parent.getBoundingClientRect();
      const inside = r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
      if (inside) continue;
      const scrolls = /(auto|scroll)/.test(style.overflowX + style.overflowY) &&
        (parent.scrollWidth > parent.clientWidth + 1 || parent.scrollHeight > parent.clientHeight + 1);
      if (scrolls) {
        inScrollContainer = true;
        result.reachableByScrolling.push({ ...base, scrollContainer: describe(parent) });
      } else {
        result.cutOff.push({ ...base, clippedBy: describe(parent) });
      }
      break;
    }
    // Inside a sideways-scrolling row it can be scrolled to, so it isn't out of view
    if (!inScrollContainer && (r.left < -1 || r.right > innerWidth + 1)) result.outOfView.push(base);
  }

  // Covered: bring each control into view and hit-test its centre, first as the
  // browser would for a tap, then with pointer-events forced on so that
  // decorations that ignore the pointer are found too
  const force = document.createElement("style");
  force.textContent = "*, *::before, *::after { pointer-events: auto !important; }";
  for (const el of controls) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
    const hit = document.elementFromPoint(cx, cy);
    if (hit && hit !== el && !el.contains(hit)) result.covered.push({ ...info(el), coveredBy: describe(hit) });
    document.head.appendChild(force);
    const painted = document.elementFromPoint(cx, cy);
    force.remove();
    if (painted && painted !== el && !el.contains(painted) && !(hit && hit !== el && !el.contains(hit))) {
      let opacity = 1;
      for (let node: Element | null = painted; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      if (opacity > 0.01) result.paintedOver.push({ ...info(el), paintedBy: describe(painted), opacity: round(opacity) });
    }
  }
  scrollTo(0, 0);

  // Overlapping text: boxes of visible text in different elements. Left out:
  // fixed or sticky bars (content scrolls under them by design; real covering
  // is caught by the hit test above) and the two faces of a 3D flip card.
  const positioned = (el: Element, values: string[]) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (values.includes(getComputedStyle(node).position)) return true;
    }
    return false;
  };
  const flipContainer = (el: Element) => {
    for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).transformStyle === "preserve-3d") return node;
    }
    return null;
  };
  // The visible part of a box: cut to every ancestor that hides overflow
  const clipRect = (el: Element, rect: DOMRect) => {
    let { left, top, right, bottom } = rect;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const c = node.getBoundingClientRect();
      left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom);
    }
    return right - left > 0 && bottom - top > 0 ? new DOMRect(left, top, right - left, bottom - top) : null;
  };
  const boxes: { el: Element; rects: DOMRect[] }[] = [];
  const walker = document.createTreeWalker(scope as Node, NodeFilter.SHOW_TEXT);
  const byElement = new Map<Element, DOMRect[]>();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const el = node.parentElement!;
    if (!visible(el)) continue;
    // Decorations ignore the pointer (BgDeco, Confetti) or are hidden from assistive tech
    if (getComputedStyle(el).pointerEvents === "none" || el.closest('[aria-hidden="true"]')) {
      result.decorativeTextElements++;
      continue;
    }
    if (positioned(el, ["fixed", "sticky"])) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects())
      .map((rect) => clipRect(el, rect))
      .filter((rect): rect is DOMRect => rect !== null);
    byElement.set(el, [...(byElement.get(el) ?? []), ...rects]);
  }
  byElement.forEach((rects, el) => boxes.push({ el, rects }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const flip = flipContainer(a.el);
      if (flip && flip === flipContainer(b.el)) continue;
      let found: { width: number; height: number } | null = null;
      for (const ra of a.rects) {
        for (const rb of b.rects) {
          const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
          if (w >= 2 && h >= 4 && w * h > 0.25 * smaller) found = { width: round(w), height: round(h) };
        }
      }
      if (found) result.textOverlaps.push({ a: describe(a.el), b: describe(b.el), overlap: found });
    }
  }
  return result;
}
