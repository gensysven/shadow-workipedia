#!/usr/bin/env node
import { createCanvasContext } from '../src/main/canvas';

const stubDocument = {
  getElementById(_id: string) {
    return {
      getContext(_type: string) {
        return {};
      },
    };
  },
} as Document;

const { canvas, ctx } = createCanvasContext(stubDocument);
if (!canvas || !ctx) {
  throw new Error('Expected canvas and context from createCanvasContext.');
}
console.log('main canvas test passed.');
