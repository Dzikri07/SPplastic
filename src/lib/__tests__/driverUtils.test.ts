import { describe, it, expect } from 'vitest';
import {
  generateGoogleMapsNavigationUrl,
  normalizeWhatsAppPhone,
  generateWhatsAppUrl,
} from '../urlHelpers';
import {
  calculateTargetDimensions,
  MAX_IMAGE_DIMENSION,
} from '../photoCompression';
import { isSignatureCanvasBlank } from '../signatureCanvas';

describe('Driver Utilities & Helpers Unit Tests (Fase 6)', () => {
  describe('Google Maps Deep-Link Generator', () => {
    it('generates encoded navigation URL with travelmode=driving', () => {
      const lat = -6.827218;
      const lng = 107.291637;
      const url = generateGoogleMapsNavigationUrl(lat, lng);

      expect(url).toContain('https://www.google.com/maps/dir/?api=1');
      expect(url).toContain(`destination=${encodeURIComponent(`${lat},${lng}`)}`);
      expect(url).toContain('&travelmode=driving');
    });
  });

  describe('WhatsApp Phone Normalizer', () => {
    it('normalizes local 08xx phone to international 628xx format', () => {
      expect(normalizeWhatsAppPhone('081234567890')).toBe('6281234567890');
    });

    it('normalizes phone with spaces, hyphens, and parentheses', () => {
      expect(normalizeWhatsAppPhone('(0812) 3456-7890')).toBe('6281234567890');
    });

    it('normalizes +62 format to 62 format', () => {
      expect(normalizeWhatsAppPhone('+62 812 3456 7890')).toBe('6281234567890');
    });

    it('normalizes 8xx prefix to 628xx format', () => {
      expect(normalizeWhatsAppPhone('81234567890')).toBe('6281234567890');
    });

    it('keeps already normalized 628xx numbers intact', () => {
      expect(normalizeWhatsAppPhone('6281234567890')).toBe('6281234567890');
    });

    it('generates wa.me URL with encoded prefilled message', () => {
      const url = generateWhatsAppUrl('081234567890', 'Halo Toko Berkah, pesanan sedang dikirim.');
      expect(url).toBe('https://wa.me/6281234567890?text=Halo%20Toko%20Berkah%2C%20pesanan%20sedang%20dikirim.');
    });
  });

  describe('Adaptive Photo Resize & Dimensions', () => {
    it('maintains original dimensions if smaller than maximum boundary', () => {
      const dims = calculateTargetDimensions(800, 600, MAX_IMAGE_DIMENSION);
      expect(dims.width).toBe(800);
      expect(dims.height).toBe(600);
    });

    it('scales down landscape photo proportionally to max width 1280px', () => {
      const dims = calculateTargetDimensions(4000, 3000, MAX_IMAGE_DIMENSION);
      expect(dims.width).toBe(1280);
      expect(dims.height).toBe(960);
    });

    it('scales down portrait photo proportionally to max height 1280px', () => {
      const dims = calculateTargetDimensions(3000, 4000, MAX_IMAGE_DIMENSION);
      expect(dims.height).toBe(1280);
      expect(dims.width).toBe(960);
    });

    it('scales down square photo to 1280x1280px', () => {
      const dims = calculateTargetDimensions(2048, 2048, MAX_IMAGE_DIMENSION);
      expect(dims.width).toBe(1280);
      expect(dims.height).toBe(1280);
    });
  });

  describe('Signature Canvas Blank Validation', () => {
    it('identifies an all-white canvas as blank', () => {
      // Mock canvas object
      const width = 100;
      const height = 50;
      const totalPixels = width * height;
      const pixelData = new Uint8ClampedArray(totalPixels * 4);

      // Isi semua pixel dengan putih pekat (RGBA: 255, 255, 255, 255)
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 255;
        pixelData[i + 1] = 255;
        pixelData[i + 2] = 255;
        pixelData[i + 3] = 255;
      }

      const mockCanvas = {
        width,
        height,
        getContext: () => ({
          getImageData: () => ({ data: pixelData }),
        }),
      } as unknown as HTMLCanvasElement;

      expect(isSignatureCanvasBlank(mockCanvas)).toBe(true);
    });

    it('identifies canvas with strokes as NOT blank', () => {
      const width = 100;
      const height = 50;
      const totalPixels = width * height;
      const pixelData = new Uint8ClampedArray(totalPixels * 4);

      // Isi putih pekat
      for (let i = 0; i < pixelData.length; i += 4) {
        pixelData[i] = 255;
        pixelData[i + 1] = 255;
        pixelData[i + 2] = 255;
        pixelData[i + 3] = 255;
      }

      // Beri 50 pixel hitam (goresan tanda tangan)
      for (let i = 0; i < 50 * 4; i += 4) {
        pixelData[i] = 15;     // R
        pixelData[i + 1] = 23; // G
        pixelData[i + 2] = 42; // B
        pixelData[i + 3] = 255;
      }

      const mockCanvas = {
        width,
        height,
        getContext: () => ({
          getImageData: () => ({ data: pixelData }),
        }),
      } as unknown as HTMLCanvasElement;

      expect(isSignatureCanvasBlank(mockCanvas)).toBe(false);
    });
  });
});
