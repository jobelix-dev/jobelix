/**
 * PDF.js Polyfills for Node.js/Serverless Environments
 * 
 * pdfjs-dist requires browser APIs (DOMMatrix, Path2D, ImageData) even when only
 * extracting text. This file provides minimal polyfills for serverless environments
 * like Vercel where these APIs don't exist.
 * 
 * IMPORTANT: This file must be imported BEFORE any pdfjs-dist imports.
 */

// Ensure this is treated as an ES module (required for webpack compatibility)
export {};

// Polyfill DOMMatrix (2D transformation matrix)
if (typeof DOMMatrix === 'undefined') {
  // @ts-ignore - Webpack compatibility
  global.DOMMatrix = class {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor() {}
  };
}

// Polyfill Path2D (Canvas path object)
if (typeof Path2D === 'undefined') {
  // @ts-ignore - Webpack compatibility
  global.Path2D = class {
    constructor() {}
    addPath() {}
    arc() {}
    arcTo() {}
    bezierCurveTo() {}
    closePath() {}
    ellipse() {}
    lineTo() {}
    moveTo() {}
    quadraticCurveTo() {}
    rect() {}
  };
}

// Polyfill ImageData (Pixel data container)
if (typeof ImageData === 'undefined') {
  // @ts-ignore - Webpack compatibility
  global.ImageData = class {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}
