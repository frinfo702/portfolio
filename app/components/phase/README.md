# Phase

The home page is a scroll-controlled light sculpture. Two offset, twisted annuli make the phase symbol. The first downward scroll automatically advances to the revealed scene over 1.7 seconds, clearing the central fog and powering the red inlay. Upward input cancels the advance; returning to the top rearms it. The surrounding fog continues drifting.

`shaders.ts` contains the signed-distance geometry, reflective floor, and a 64-step volumetric integration. `PhaseScene.tsx` renders the solid scene at full resolution and the smoke at half resolution, then composites them with a small bloom. Only smoke resolution adapts under sustained load. Three.js uses WebGL2; no WebGPU adapter or external assets are required for live rendering.

LinkedIn, GitHub, and email links float below the sculpture. SVG copies with displacement and blur create their water reflections. The only visible text is the owner’s name.

Motion pauses while the tab is hidden. The Pause button and reduced-motion preference freeze autonomous movement; scroll reveal still works. Render targets and event listeners are released on unmount. If WebGL initialization fails or the context is lost, the captured still is shown. The mist poster covers loading and JavaScript-disabled visits.

The two WebP posters in `public/` are captures of this shader, with interface elements hidden. Regenerate them when changing the sculpture. Existing writing and misc routes retain their original frame, loaded separately from the home page.

Visual references: the user's smoke photographs and [vgpu's Next.js Flare](https://vgpu.sh/examples/nextjs-flare). The shader here is an independent GLSL implementation.

Verify with `npm run lint`, `npx tsc --noEmit`, and `npm run build -- --webpack`. In a browser check initial fog, mid-scroll light scattering, the revealed sculpture, reverse scroll, Pause then resize, a narrow viewport, and WebGL context loss. The rendering still needs physical-device testing on mobile Safari.
