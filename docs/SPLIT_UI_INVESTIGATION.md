# Split UI Investigation

At a 385×772 mobile viewport, the overview screen remains horizontally aligned, while `/split` clips the left side of the header, explanatory text, total card, allocation cards, and category grid. The clipping is isolated to the split screen rather than the shared tab layout. The split form uses a full-screen `ScreenContainer`, `KeyboardAvoidingView`, and `FlatList`; its content is not explicitly stretched to the viewport width. The repair will add explicit stretch/width constraints to the split form and verify the same viewport again.

The first explicit `width: "100%"` patch did not change the screenshot, and the shared `SurfaceCard` has no width or transform rules. The remaining likely cause is the FlatList content box combining a full percentage width with horizontal padding under the web renderer; the next adjustment will use stretch alignment without a percentage width on the padded content container.

The final correction keeps the form stretched, removes horizontal safe-area edges from this portrait form, and disables autofocus only on web. At 385×772, the close button, title, subtitle, total card, allocation cards, and category grid are fully visible. At 1280×720, the form remains correctly laid out across the available width. TypeScript and the Vitest suite pass.

