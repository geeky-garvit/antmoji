import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.bloomEnabled = true;
    this.dofEnabled = true;
    this.smaaEnabled = true;

    this.initPipeline();
  }

  initPipeline() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();

    // Render Target with Float Depth Buffer for high-quality post processing
    const renderTarget = new THREE.WebGLRenderTarget(
      width * pixelRatio,
      height * pixelRatio,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: true,
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 1. Base Scene Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. Depth of Field (BokehPass)
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 4.8,         // Focal distance for hero ant
      aperture: 0.018,    // Lens opening strength
      maxblur: 0.012,     // Max background blur radius
      width: width,
      height: height
    });
    this.composer.addPass(this.bokehPass);

    // 3. Subtle Apple-style Specular Bloom (UnrealBloomPass)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.22, // Strength
      0.4,  // Radius
      0.82  // Threshold (only shiny specular highlights and eye reflections bloom)
    );
    this.composer.addPass(this.bloomPass);

    // 4. SMAA Anti-Aliasing Pass (crisp jaggie-free character silhouettes)
    this.smaaPass = new SMAAPass(
      width * pixelRatio,
      height * pixelRatio
    );
    this.composer.addPass(this.smaaPass);
  }

  setSize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio();
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
    this.smaaPass.setSize(width * pixelRatio, height * pixelRatio);

    if (this.bokehPass.renderTargetDepth) {
      this.bokehPass.renderTargetDepth.setSize(width, height);
    }
  }

  setBloomEnabled(enabled) {
    this.bloomEnabled = enabled;
    this.bloomPass.enabled = enabled;
  }

  setDofEnabled(enabled) {
    this.dofEnabled = enabled;
    this.bokehPass.enabled = enabled;
  }

  setFocusDistance(focusDist) {
    if (this.bokehPass) {
      this.bokehPass.uniforms['focus'].value = focusDist;
    }
  }

  render() {
    this.composer.render();
  }
}
