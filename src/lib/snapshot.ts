// Tiny registry so the export menu can pull a PNG from the live canvases
// without prop-drilling refs through the whole tree.
export const planSnapshot: { get: (() => string | undefined) | null } = { get: null }
export const threeSnapshot: { get: (() => string | undefined) | null } = { get: null }
