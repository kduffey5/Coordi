/**
 * Diagnostic utilities for testing Twilio Media Streams
 * Use these to isolate whether issues are with encoding, Twilio, or network
 */

/**
 * Generate known-good MuLaw silence frames (0xFF bytes)
 * Used to test if Twilio connection is working correctly
 */
export function generateSilenceFrame(size: number = 160): Buffer {
  // MuLaw silence is 0xFF
  return Buffer.alloc(size, 0xFF);
}

/**
 * Generate known-good MuLaw sine wave tone for testing
 * Useful for verifying audio is being transmitted correctly
 */
export function generateToneFrame(frequency: number = 440, sampleRate: number = 8000, size: number = 160): Buffer {
  // Generate PCM16 sine wave
  const pcm16Buffer = Buffer.allocUnsafe(size * 2);
  const amplitude = 8000; // Moderate volume to avoid clipping
  
  for (let i = 0; i < size; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * amplitude;
    const int16Sample = Math.max(-32768, Math.min(32767, Math.round(sample)));
    pcm16Buffer.writeInt16LE(int16Sample, i * 2);
  }
  
  // Convert PCM16 to MuLaw
  return pcm16ToMulaw(pcm16Buffer);
}

/**
 * Simple PCM16 to MuLaw converter for diagnostics
 */
function pcm16ToMulaw(pcm16Buffer: Buffer): Buffer {
  const mulawBuffer = Buffer.allocUnsafe(pcm16Buffer.length / 2);
  const BIAS = 33;
  const MAX = 32635;
  
  for (let i = 0; i < mulawBuffer.length; i++) {
    let sample = pcm16Buffer.readInt16LE(i * 2);
    const sign = (sample >>> 15) & 0x01;
    let magnitude = Math.abs(sample);
    magnitude = Math.min(magnitude, MAX);
    magnitude += BIAS;
    
    let exponent = 7;
    if (magnitude < 0x20) exponent = 0;
    else if (magnitude < 0x40) exponent = 1;
    else if (magnitude < 0x80) exponent = 2;
    else if (magnitude < 0x100) exponent = 3;
    else if (magnitude < 0x200) exponent = 4;
    else if (magnitude < 0x400) exponent = 5;
    else if (magnitude < 0x800) exponent = 6;
    
    const mantissa = (magnitude >> (exponent + 3)) & 0x0F;
    let mulaw = (sign << 7) | (exponent << 4) | mantissa;
    mulaw ^= 0xFF;
    mulawBuffer[i] = mulaw;
  }
  
  return mulawBuffer;
}

/**
 * Test if MuLaw encoding is correct by verifying known values
 */
export function verifyMulawEncoding(): boolean {
  try {
    // Test: PCM16 value 0 should encode to MuLaw 0xFF (silence)
    const pcm16Zero = Buffer.from([0x00, 0x00]); // 16-bit signed 0
    const mulawResult = pcm16ToMulaw(pcm16Zero);
    const isCorrect = mulawResult[0] === 0xFF;
    
    console.log(`MuLaw encoding test: ${isCorrect ? 'PASS' : 'FAIL'}`);
    console.log(`  PCM16 0 → MuLaw ${mulawResult[0].toString(16).padStart(2, '0')} (expected 0xFF)`);
    
    return isCorrect;
  } catch (error) {
    console.error("MuLaw encoding test error:", error);
    return false;
  }
}
