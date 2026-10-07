import * as THREE from 'three';
import { AntMemoji, ANT_COLOR_PRESETS } from './AntMemoji.js';
import gsap from 'gsap';

export class AntGroup {
  constructor() {
    this.group = new THREE.Group();
    this.ants = [];
    this.activeFocusIndex = 0; // 0 is center hero ant

    this.initGroup();
  }

  initGroup() {
    // 5 Staggered Ant Avatar Configurations
    const configs = [
      { id: 'hero', key: 'pearl_blue', pos: [0, 0, 0], scale: 1.0, expr: 'happy', timeOffset: 0 },
      { id: 'ruby', key: 'ruby_red', pos: [-1.8, 0.1, -0.7], scale: 0.9, expr: 'wink', timeOffset: 1.5 },
      { id: 'emerald', key: 'emerald_green', pos: [1.8, 0.1, -0.7], scale: 0.9, expr: 'curious', timeOffset: 3.2 },
      { id: 'obsidian', key: 'obsidian', pos: [-3.2, 0.25, -1.5], scale: 0.82, expr: 'sleepy', timeOffset: 4.8 },
      { id: 'rosegold', key: 'rose_gold', pos: [3.2, 0.25, -1.5], scale: 0.82, expr: 'surprised', timeOffset: 6.1 },
    ];

    configs.forEach((cfg, idx) => {
      const ant = new AntMemoji({
        presetKey: cfg.key,
        timeOffset: cfg.timeOffset,
      });

      ant.group.position.set(...cfg.pos);
      ant.group.scale.setScalar(cfg.scale);

      // Save initial transform for smooth focus swaps
      ant.homePos = new THREE.Vector3(...cfg.pos);
      ant.homeScale = cfg.scale;
      ant.id = cfg.id;

      // Set initial expression
      ant.setExpression(cfg.expr, 1.0);

      this.ants.push(ant);
      this.group.add(ant.group);
    });
  }

  /**
   * Set active focused character ant index [0..4]
   */
  setFocusIndex(index) {
    if (index < 0 || index >= this.ants.length) return;
    this.activeFocusIndex = index;

    this.ants.forEach((ant, idx) => {
      const isFocused = idx === index;
      const targetPos = isFocused
        ? new THREE.Vector3(0, 0, 0.5)
        : ant.homePos.clone();
      const targetScale = isFocused ? 1.05 : ant.homeScale * 0.85;

      gsap.to(ant.group.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 0.8,
        ease: 'power2.out',
      });

      gsap.to(ant.group.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: 0.8,
        ease: 'power2.out',
      });

      if (isFocused) {
        ant.setExpression('happy', 0.6);
        ant.triggerPhysicsImpulse(new THREE.Vector3(0, 0.8, 0.4));
      }
    });
  }

  /**
   * Apply expression to active hero ant or all ants
   */
  setExpressionForFocused(expName, applyToAll = false) {
    if (applyToAll) {
      this.ants.forEach(ant => ant.setExpression(expName));
    } else {
      this.ants[this.activeFocusIndex].setExpression(expName);
    }
  }

  /**
   * Apply physics shake impulse to focused ant or all ants
   */
  shakeAnts(all = false) {
    if (all) {
      this.ants.forEach(ant => ant.triggerPhysicsImpulse());
    } else {
      this.ants[this.activeFocusIndex].triggerPhysicsImpulse();
    }
  }

  /**
   * Update gaze cursor tracking for all ants
   */
  setGazeTarget(ndcPos) {
    this.ants.forEach((ant, idx) => {
      // Background ants look slightly towards cursor with lower magnitude
      const isFocused = idx === this.activeFocusIndex;
      const factor = isFocused ? 1.0 : 0.65;
      ant.setGazeTarget(new THREE.Vector2(ndcPos.x * factor, ndcPos.y * factor));
    });
  }

  update(time, delta) {
    this.ants.forEach(ant => ant.update(time, delta));
  }
}
