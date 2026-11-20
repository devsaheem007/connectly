let ctx

/** Plays a short two-note "pop" using WebAudio (no audio file needed). */
export function playMessageSound(volume = 0.12) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    ;[
      [880, 0],
      [1318.5, 0.09],
    ].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.25)
    })
  } catch {
    /* audio blocked until a user gesture — ignore */
  }
}
