import gsap from 'gsap';

/** Resolve the control's current position in the same SVG space as the pointer. */
function controlPoint(root: HTMLElement, selector: string) {
  const control = root.querySelector<HTMLElement>(selector)!;
  const svg = root.querySelector<SVGSVGElement>('.device-art > svg')!;
  const bounds = control.getBoundingClientRect();
  const matrix = svg.getScreenCTM();
  if (!matrix) throw new Error('The walkthrough SVG is not mounted.');
  return new DOMPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
    .matrixTransform(matrix.inverse());
}

export function appendCursorAction(
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  selector: string,
  reduced: boolean,
) {
  const cursor = root.querySelector<SVGPathElement>('.film-cursor')!;
  const pulse = root.querySelector<SVGCircleElement>('.cursor-click')!;
  const duration = reduced ? 0 : 0.9;
  const point = () => controlPoint(root, selector);

  // A distinct approach and settle makes every action readable, even when two
  // consecutive screens place their primary button in a similar position.
  timeline.to(cursor, {
    autoAlpha: reduced ? 0 : 1,
    x: () => point().x - 24,
    y: () => point().y + 16,
    scale: 0.85,
    duration,
    ease: 'sine.inOut',
  }).to(cursor, {
    x: () => point().x,
    y: () => point().y,
    duration,
    ease: 'sine.out',
  }).to({}, { duration: reduced ? 0 : 0.25 })
    .set(pulse, {
      attr: { cx: () => point().x, cy: () => point().y, r: 5 },
      autoAlpha: reduced ? 0 : 0.9,
    }).to(cursor, {
      scale: 0.8,
      duration: reduced ? 0 : 0.12,
      repeat: reduced ? 0 : 1,
      yoyo: true,
      ease: 'power1.inOut',
    }).to(pulse, {
      attr: { r: 18 },
      autoAlpha: 0,
      duration: reduced ? 0 : 0.4,
      ease: 'sine.out',
    });
}

export function appendPhoneTap(
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  selector: string,
  reduced: boolean,
) {
  const phone = root.querySelector<SVGGElement>('.moving-phone')!;
  const pulse = phone.querySelector<SVGCircleElement>('.phone-tap')!;
  const point = () => {
    const bounds = root.querySelector(selector)!.getBoundingClientRect();
    // The phone has its own animated transform. Resolve into that coordinate
    // system, rather than placing feedback at a fixed percentage of the screen.
    return new DOMPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      .matrixTransform(phone.getScreenCTM()!.inverse());
  };
  timeline.set(pulse, {
    attr: { cx: () => point().x, cy: () => point().y, r: 4 },
    autoAlpha: reduced ? 0 : 0.9,
  }).to(pulse, {
    attr: { r: 16 },
    autoAlpha: 0,
    duration: reduced ? 0 : 0.5,
    ease: 'sine.out',
  });
}
