/**
 * Floating tab bar: gap above home indicator to the bottom of the pill + pill height.
 * Tuned to match `BottomTabBar` — update both if you change the bar layout.
 */
export const TAB_BAR_FLOAT_GAP = 10;
/** Total visual height of the floating pill (blur container + vertical padding). */
export const TAB_BAR_PILL_HEIGHT = 62;

/**
 * Extra bottom padding for scrollable content (e.g. search results) so it clears the
 * floating tab bar. The bottom sheet panel itself can use `bottomInset={0}` and sit
 * flush to the device bottom; this value only indents the list.
 */
export function tabBarBottomOffset(insets: { bottom: number }): number {
  return insets.bottom + TAB_BAR_FLOAT_GAP + TAB_BAR_PILL_HEIGHT;
}
