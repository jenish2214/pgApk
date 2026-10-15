/** Keeps long shop lists drawing only the rows near the screen. */
export const listWindow = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 40,
  windowSize: 7,
};
