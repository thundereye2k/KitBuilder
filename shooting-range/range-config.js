/**
 * Shooting range configuration.  Edit the numbers, reload the page. No build step.
 *
 * Units: metres, seconds, degrees (unless a name says otherwise).
 * World frame of the range model: Y up, floor at y = 0, the lanes run towards -Z, the shooting booths are at +Z.
 *
 * Settings that depend on the gun live in `profiles` (see the bottom). A gun gets
 *   profiles.default  ->  overridden by profiles["<category id>"]  ->  overridden by profiles["<weapon id>"]
 * so you only write down what differs.
 */
window.KITBUILDER_RANGE = {
  /* ---------------------------------------------------------------- the room */
  model: "shooting-range/Shooting-range.glb",
  modelFix: { scale: 1, rot: [0, 0, 0], offset: [0, 0, 0] },   // only if the GLB needs correcting

  /* ---------------------------------------------------------------- the player (camera) */
  camera: {
    position: [0.0, 1.62, 7.7],      // standing in booth 3, just behind the bench (eye height 1.62 m)
    yaw: 0,                           // start direction in degrees; 0 = down the lane (towards -Z), positive = left
    pitch: 0,                         // start up/down angle
    fov: 70,                          // vertical field of view while standing
    adsFov: 52,                       // field of view while aiming (hold right mouse button / Aim button)
    near: 0.03, far: 80,
    limits: { yaw: [-75, 75], pitch: [-55, 65] },    // how far you can look away from the start direction
    sensitivity: { mouse: 0.0022, touch: 0.0042, adsFactor: 0.6 },   // radians per pixel; adsFactor slows turning while aiming
    sway: { breathe: 0.12, breatheHz: 0.22, adsFactor: 0.4 },         // gentle idle movement of the view (degrees)
    moveBounds: null                  // reserved: [minX, maxX, minZ, maxZ] if walking is ever added
  },

  /* ---------------------------------------------------------------- lighting of the range */
  lighting: {
    exposure: 1.0,
    envIntensity: 0.4,               // image based light (the room reflection), makes the dark walls readable
    hemisphere: { sky: "#cfd8e6", ground: "#2a2a30", intensity: 0.35 },
    fill: [                           // extra point lights above the lanes: { pos, color, intensity, distance }
      { pos: [0, 2.5, 5], color: "#ffffff", intensity: 9, distance: 14 },
      { pos: [0, 2.5, -3], color: "#fff2dd", intensity: 11, distance: 16 },
      { pos: [0, 2.5, -10], color: "#fff2dd", intensity: 11, distance: 16 }
    ],
    fog: { color: "#0b0c0e", near: 25, far: 60 }
  },

  /* ---------------------------------------------------------------- first-person weapon: where it sits on screen */
  // position / rotation are relative to the camera: +X right, +Y up, -Z forward. They place the weapon's own origin
  // (the receiver; barrel points to +X in the model).  `ads` is the same while aiming.  rotation = [pitch, yaw, roll] degrees.
  viewmodel: {
    scale: 1,
    aimSpeed: 11,                     // how fast the weapon moves to / from the aim position
    near: 0.01
  },

  /* ---------------------------------------------------------------- impacts */
  impact: {
    decals: { enabled: true, max: 400, diameter_mm: 22, color: "#e8d9a8", opacity: 0.9 },   // BB marks on walls, floor and paper
    bounce: { enabled: true, restitution: 0.38, friction: 0.7, minSpeed: 6 },           // BBs bounce off hard surfaces
    puff: { enabled: true, count: 5, size: 0.02, life: 0.25 }                          // little burst where a BB lands
  },

  /* ---------------------------------------------------------------- muzzle flash */
  muzzleFlash: {
    enabled: true,
    size: 0.34,                       // metres across
    duration_ms: 55,
    color: "#ffd9a0",
    light: { intensity: 14, distance: 7, color: "#ffc477" }   // brief light that lights the lane and the weapon
  },

  /* ---------------------------------------------------------------- muzzle devices (part id in data.js -> modifiers) */
  muzzleDevices: {
    none:          { flash: 1.0, volume: 1.0,  lowpass: 1.0 },
    "flash-hider": { flash: 0.35, volume: 1.0, lowpass: 1.0 },
    compensator:   { flash: 1.2, volume: 1.15, lowpass: 1.0 },
    suppressor:    { flash: 0.05, volume: 0.28, lowpass: 0.38 }    // quieter and duller, almost no flash
  },

  /* ---------------------------------------------------------------- sound */
  sound: {
    master: 0.8,
    reverb: { amount: 0.28, seconds: 0.9 },    // the room echo
    // optional recorded shot; leave null to use the built-in synthesised shot. Files go in shooting-range/sounds/
    shotFile: null,                             // e.g. "shooting-range/sounds/shot.mp3"
    reloadFile: null,
    impactTick: 0.18,                           // volume of a BB landing on a wall, floor or paper
    plateHit: 0.5                               // volume of a BB hitting a steel plate
  },

  /* ---------------------------------------------------------------- extra reactive targets: swinging steel plates */
  plates: {
    enabled: true,
    resetAfter: 3.5,                            // seconds after the last plate falls until they all stand up again
    radius: 0.14,
    color: "#b9c0c8",
    items: [                                    // pos = centre of the plate, [x, y, z]
      { pos: [-0.9, 1.25, -2.5] }, { pos: [0.0, 1.25, -2.5] }, { pos: [0.9, 1.25, -2.5] },
      { pos: [-1.2, 1.2, -5.2] }, { pos: [0.0, 1.2, -5.2] }, { pos: [1.2, 1.2, -5.2] }
    ]
  },

  /* ---------------------------------------------------------------- per gun values */
  profiles: {
    default: {
      bb: {
        velocity: 110,                // m/s at the muzzle (~360 fps)
        mass_g: 0.20,
        diameter_mm: 6,
        gravity: 9.81,                // m/s^2
        dragCoefficient: 0.3,         // 0 = vacuum. Higher = BB slows down faster
        airDensity: 1.225,
        hopUp: 9.2,                   // upward lift (m/s^2) from backspin at the start. ~gravity = flat flight. 0 = off
        spinDecay: 0.45,              // how fast the backspin dies (1/s)
        spreadDeg: 0.35,              // random cone around the aim direction
        convergence: 25,              // distance (m) at which the BB path crosses the crosshair when nothing is hit
        life: 2.2,                    // seconds before a BB is removed
        visualScale: 2.6,             // BBs are drawn this much bigger so they can be seen
        streak: 0.9,                  // visual streak length as a fraction of the distance travelled per frame, 0 = ball only
        color: "#f2f2ee",
        pellets: 1,                   // BBs per trigger pull (shotguns)
        pelletSpreadDeg: 0
      },
      fire: {
        rpm: 600,
        modes: ["semi", "auto"],      // modes you can cycle through; first = default
        magazine: 30,                 // BBs per magazine; 0 = never needs reloading
        reloadTime: 1.9,              // seconds
        pump: false                   // true: a pumping movement after each shot (shotguns)
      },
      recoil: {
        // Strength is scaled by the build: (weapon base recoil + parts)/statRef, so stocks, grips and brakes change the feel.
        statRef: 150, statMin: 0.35, statMax: 2.6,
        kickBack: 0.022,              // weapon moves back (m) per shot
        kickUp: 2.2,                  // weapon muzzle climbs (degrees) per shot
        kickSide: 0.5,                // random sideways rotation (degrees)
        cameraPitch: 0.55,            // view climbs (degrees) per shot
        cameraYaw: 0.18,              // random view drift (degrees)
        stiffness: 210, damping: 19,  // weapon spring (higher damping = settles faster)
        cameraRecovery: 7,            // how fast the view returns (1/s)
        adsFactor: 0.7                // recoil multiplier while aiming
      },
      sound: {
        volume: 0.9,
        duration: 0.12,               // seconds
        noiseFreq: 2600, noiseQ: 0.7, // colour of the 'pop' (Hz)
        thumpFreq: 150, thumpDecay: 0.06,
        crack: 0.55,                  // sharp top-end of the shot, 0..1
        pitchJitter: 0.06
      },
      viewmodel: {
        position: [0.13, -0.15, -0.3],
        rotation: [0, 1.5, 0],
        // Aiming: with an optic fitted the eye is lined up with it automatically, `eyeRelief` metres behind it, looking through
        // the optic at `sightHeight` (0 = bottom, 1 = top of the optic model). `opticOpacity` = how see-through the optic gets while aiming.
        // `position` is used for guns without an optic (or when auto is false).
        ads: { auto: true, eyeRelief: 0.42, sightHeight: 0.6, opticOpacity: 0.3, position: [0.0, -0.085, -0.24], rotation: [0, 0, 0] }
      }
    },

    "assault-rifles": {},
    dmrs: {
      bb: { velocity: 135, hopUp: 9.5 },
      fire: { rpm: 300, modes: ["semi"], magazine: 20, reloadTime: 2.1 },
      recoil: { kickBack: 0.03, kickUp: 3.0, cameraPitch: 0.8 }
    },
    "sniper-rifles": {
      bb: { velocity: 150, hopUp: 9.6, spreadDeg: 0.12, life: 3 },
      fire: { rpm: 60, modes: ["semi"], magazine: 10, reloadTime: 2.6, pump: true },
      recoil: { kickBack: 0.05, kickUp: 4.5, cameraPitch: 1.6, cameraYaw: 0.3, stiffness: 150, damping: 15 },
      sound: { noiseFreq: 1500, thumpFreq: 110, thumpDecay: 0.1, duration: 0.2, volume: 1.0 },
      viewmodel: { position: [0.12, -0.13, -0.3] }
    },
    smgs: {
      bb: { velocity: 100, spreadDeg: 0.5 },
      fire: { rpm: 900, modes: ["semi", "auto"], magazine: 40, reloadTime: 1.7 },
      recoil: { kickBack: 0.015, kickUp: 1.4, cameraPitch: 0.35, cameraYaw: 0.22 },
      sound: { noiseFreq: 3000, thumpFreq: 170, duration: 0.09 },
      viewmodel: { position: [0.11, -0.12, -0.25] }
    },
    pistols: {
      bb: { velocity: 82, hopUp: 8.6, spreadDeg: 0.6 },
      fire: { rpm: 420, modes: ["semi"], magazine: 15, reloadTime: 1.5 },
      recoil: { kickBack: 0.02, kickUp: 3.2, cameraPitch: 0.7, kickSide: 0.8, stiffness: 240, damping: 20 },
      sound: { noiseFreq: 3400, thumpFreq: 190, duration: 0.08, volume: 0.75 },
      viewmodel: { position: [0.07, -0.11, -0.35], ads: { position: [0.0, -0.09, -0.3] } }
    },
    lmgs: {
      bb: { velocity: 112, spreadDeg: 0.55 },
      fire: { rpm: 750, modes: ["auto"], magazine: 100, reloadTime: 3.4 },
      recoil: { statRef: 190, kickBack: 0.026, kickUp: 1.9, cameraPitch: 0.45, stiffness: 170, damping: 17 },
      sound: { noiseFreq: 2100, thumpFreq: 125, thumpDecay: 0.08, duration: 0.15, volume: 1.0 },
      viewmodel: { position: [0.12, -0.14, -0.28] }
    },
    shotguns: {
      bb: { velocity: 92, spreadDeg: 0.2, pellets: 8, pelletSpreadDeg: 3.2 },
      fire: { rpm: 75, modes: ["semi"], magazine: 6, reloadTime: 2.4, pump: true },
      recoil: { statRef: 300, kickBack: 0.06, kickUp: 5.0, cameraPitch: 1.5, cameraYaw: 0.35, stiffness: 140, damping: 14 },
      sound: { noiseFreq: 1300, noiseQ: 0.5, thumpFreq: 85, thumpDecay: 0.13, duration: 0.24, volume: 1.0 },
      viewmodel: { position: [0.11, -0.13, -0.3] }
    }

    // Per weapon example (uses the weapon id from data.js):
    // "carbine-556": { bb: { velocity: 120 }, viewmodel: { position: [0.12, -0.13, -0.27] } }
  }
};
