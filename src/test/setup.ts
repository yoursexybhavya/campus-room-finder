import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. ResizeObserver Polyfill
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 2. window.matchMedia Polyfill
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Polyfill requestAnimationFrame / cancelAnimationFrame for headless jsdom
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(() => callback(performance.now()), 16) as unknown as number;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
}

// 3. Pure JavaScript Canvas & WebGL / WebGL2 Context Mock
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        canvas: this,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      };
    }

    if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
      return {
        canvas: this,
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getExtension: vi.fn(() => null),
        getParameter: vi.fn((param: number) => {
          // MAX_TEXTURE_SIZE = 0x0D33 -> 4096
          if (param === 0x0d33) return 4096;
          // MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C -> 4096
          if (param === 0x851c) return 4096;
          // MAX_RENDERBUFFER_SIZE = 0x84E8 -> 4096
          if (param === 0x84e8) return 4096;
          return 0;
        }),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        bufferSubData: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        clearDepth: vi.fn(),
        viewport: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        getShaderInfoLog: vi.fn(() => ''),
        getProgramInfoLog: vi.fn(() => ''),
        getUniformLocation: vi.fn(() => ({})),
        getAttribLocation: vi.fn(() => 0),
        enableVertexAttribArray: vi.fn(),
        disableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createTexture: vi.fn(() => ({})),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        texImage2D: vi.fn(),
        createFramebuffer: vi.fn(() => ({})),
        bindFramebuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        createRenderbuffer: vi.fn(() => ({})),
        bindRenderbuffer: vi.fn(),
        renderbufferStorage: vi.fn(),
        depthFunc: vi.fn(),
        blendFunc: vi.fn(),
        cullFace: vi.fn(),
        frontFace: vi.fn(),
        scissor: vi.fn(),
        pixelStorei: vi.fn(),
      };
    }

    return null;
  } as any;
}
