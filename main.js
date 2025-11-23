import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import anime from 'animejs';
import { createNoise3D, createNoise4D } from 'simplex-noise';
import { pulsarData } from './sample_pulsar_data.js'; // Use sample_pulsar_data.js or processed_pulsar_data.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("Pulsar Galaxy Initializing...");
  
  // Core Three.js variables
  let scene, camera, renderer, controls, clock;
  let composer, bloomPass;
  let starfield, pulsarSystem;
  let noise3D, noise4D;
  let isInitialized = false;
  
  // Audio variables
  let audioContext, audioAnalyser, audioGain;
  let isAudioInitialized = false;
  let activeAudioOscillator = null;

  // Constants and configuration
  const CONFIG = {
    galaxyRadius: 30,           // Size of our galaxy representation in units
    galaxyThickness: 5,         // Thickness of the galaxy disc
    bulgeSize: 10,              // Size of the galactic bulge (center)
    starCount: 20000,           // Background stars
    pulsarSizeRange: [0.15, 0.5], // Min/max size for pulsars (smaller for large dataset)
    fastPulsarThreshold: 0.1,   // Pulsars with period < this value are considered "fast"
    slowPulsarThreshold: 0.5,   // Pulsars with period > this value are considered "slow"
    bloomStrength: 1.5,         // Strength of the glow effect
    bloomRadius: 0.5,           // Radius of the glow effect
    bloomThreshold: 0.05,       // Minimum brightness to apply bloom
    dmIntensityFactor: 0.01,    // How much the DM affects the visual intensity
    selectedPulsarScale: 1.8,   // How much to scale up a selected pulsar
    audioEnabled: true,         // Whether audio is enabled by default
    defaultVolume: 0.15,        // Default audio volume (0-1)
    pulsarDataSubsample: 1.0,   // Fraction of pulsars to display (1.0 = all)
    performanceMode: false,     // Performance mode for slower devices
    loadingChunkSize: 100,      // Number of pulsars to process per chunk
    loadingChunkDelay: 5        // Delay between chunks in ms
  };

  // Stores all the pulsars and their properties
  const pulsars = [];
  let selectedPulsar = null;
  let currentViewMode = 'all'; // 'all', 'fast', or 'slow'
  
  // Initialize audio context and components
  function initAudio() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioGain = audioContext.createGain();
      audioGain.gain.value = CONFIG.defaultVolume;
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 2048;
      
      audioGain.connect(audioAnalyser);
      audioAnalyser.connect(audioContext.destination);
      
      isAudioInitialized = true;
      console.log("Audio system initialized");
      
      // Set initial volume slider value
      document.getElementById('volume-slider').value = CONFIG.defaultVolume * 100;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }
  
  function init() {
    // Setup loading progress
    let progress = 0;
    const progressBar = document.getElementById('progress');
    const loadingScreen = document.getElementById('loading');
    const totalPulsarCount = pulsarData.length;

    // Display pulsar count in loading screen
    document.querySelector('#loading span').textContent = 
      \`Loading \${totalPulsarCount} Pulsars...\`;

    function updateProgress(increment) {
      progress += increment;
      progressBar.style.width = \`\${Math.min(100, progress)}%\`;
      if (progress >= 100) {
        setTimeout(() => {
          loadingScreen.style.opacity = '0';
          setTimeout(() => {
            loadingScreen.style.display = 'none';
          }, 600);
        }, 200);
      }
    }
    
    // Setup core Three.js components
    clock = new THREE.Clock();
    noise3D = createNoise3D(() => Math.random());
    noise4D = createNoise4D(() => Math.random());
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000308, 0.01);
    updateProgress(5);
    
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 25, 45);
    camera.lookAt(scene.position);
    updateProgress(5);
    
    const canvas = document.getElementById('webglCanvas');
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    updateProgress(10);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    updateProgress(5);
    
    // Add lighting
    scene.add(new THREE.AmbientLight(0x101010));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(15, 20, 10);
    scene.add(dirLight1);
    updateProgress(10);
    
    // Setup post-processing for glow effects
    setupPostProcessing();
    updateProgress(10);
    
    // Create background stars
    createStarfield();
    updateProgress(15);
    
    // Create the galaxy structure with pulsars
    createGalaxyWithPulsars();
    // Note: Progress updates will happen inside createGalaxyWithPulsars for chunked loading
    
    // Initialize audio system
    initAudio();
    updateProgress(5);
    
    // Setup event handlers
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCanvasClick);
    
    // Setup UI buttons
    document.getElementById('view-all-btn').addEventListener('click', () => setViewMode('all'));
    document.getElementById('fast-pulsars-btn').addEventListener('click', () => setViewMode('fast'));
    document.getElementById('slow-pulsars-btn').addEventListener('click', () => setViewMode('slow'));
    
    // Setup audio controls
    const audioToggleBtn = document.getElementById('audio-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    
    audioToggleBtn.addEventListener('click', () => {
      CONFIG.audioEnabled = !CONFIG.audioEnabled;
      audioToggleBtn.textContent = CONFIG.audioEnabled ? '🔊' : '🔇';
      
      if (!CONFIG.audioEnabled) {
        stopPulsarSound();
      } else if (selectedPulsar) {
        playPulsarSound(selectedPulsar);
      }
    });
    
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value) / 100;
      if (audioGain) {
        audioGain.gain.value = volume;
      }
      CONFIG.defaultVolume = volume;
    });
    
    isInitialized = true;
    animate();
    console.log("Pulsar Galaxy Explorer initialized.");
  }

  function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CONFIG.bloomStrength,
      CONFIG.bloomRadius,
      CONFIG.bloomThreshold
    );
    composer.addPass(bloomPass);
  }

  function createStarfield() {
    const starVertices = [];
    const starSizes = [];
    const starColors = [];
    const starGeometry = new THREE.BufferGeometry();
    
    for (let i = 0; i < CONFIG.starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(500);
      const y = THREE.MathUtils.randFloatSpread(500);
      const z = THREE.MathUtils.randFloatSpread(500);
      const vector = new THREE.Vector3(x, y, z);
      
      // Make sure stars are not too close to the camera
      if (vector.length() < 100) {
        vector.setLength(100 + Math.random() * 300);
      }
      
      starVertices.push(vector.x, vector.y, vector.z);
      starSizes.push(Math.random() * 0.15 + 0.05);
      
      const color = new THREE.Color();
      if (Math.random() < 0.1) {
        // Some colored stars for variety
        color.setHSL(Math.random(), 0.7, 0.65);
      } else {
        // Most stars are white-blue
        color.setHSL(0.6, Math.random() * 0.1, 0.8 + Math.random() * 0.2);
      }
      starColors.push(color.r, color.g, color.b);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: createStarTexture() }
      },
      vertexShader: \`
        attribute float size;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      \`,
      fragmentShader: \`
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        
        void main() {
          float alpha = texture2D(pointTexture, gl_PointCoord).a;
          if (alpha < 0.1) discard;
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      \`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });
    
    starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);
  }

  function createStarTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    return new THREE.CanvasTexture(canvas);
  }

  function createGalaxyWithPulsars() {
    // Create galaxy geometry
    const pulsarPositions = [];
    const pulsarSizes = [];
    const pulsarColors = [];
    const pulsarPeriods = []; // Store the period for animation
    const pulsarDMs = [];     // Store the dispersion measure for visual effects
    
    // Apply data subsample if needed
    const dataToProcess = CONFIG.pulsarDataSubsample < 1.0 
      ? pulsarData.filter(() => Math.random() < CONFIG.pulsarDataSubsample)
      : pulsarData;
    
    console.log(\`Processing \${dataToProcess.length} pulsars for visualization\`);
    
    // Process pulsars in chunks for better performance with large datasets
    let processedCount = 0;
    const totalPulsars = dataToProcess.length;
    const totalChunks = Math.ceil(totalPulsars / CONFIG.loadingChunkSize);
    let currentChunk = 0;
    
    function processPulsarChunk() {
      const startIdx = currentChunk * CONFIG.loadingChunkSize;
      const endIdx = Math.min(startIdx + CONFIG.loadingChunkSize, totalPulsars);
      
      for (let i = startIdx; i < endIdx; i++) {
        const pulsar = dataToProcess[i];
        
        // Convert galactic coordinates to cartesian
        // Note: Real galaxy would need much more complex mapping
        // This is a simplified mapping for visualization purposes
        
        // Scale the distance to fit our galaxy size
        const dist = (pulsar.DIST || 1) * 2;
        const scale = CONFIG.galaxyRadius * (0.2 + 0.8 * (dist / 30));
        
        // Calculate position from galactic coordinates
        const glRad = (pulsar.GL * Math.PI) / 180;
        const gbRad = (pulsar.GB * Math.PI) / 180;
        
        const x = scale * Math.cos(glRad) * Math.cos(gbRad);
        const y = scale * Math.sin(gbRad);
        const z = scale * Math.sin(glRad) * Math.cos(gbRad);
        
        // Add some randomness to make it look more natural
        const noise = 0.2;
        const noiseX = noise3D(x * 0.1, y * 0.1, z * 0.1) * scale * noise;
        const noiseY = noise3D(x * 0.1 + 100, y * 0.1 + 100, z * 0.1 + 100) * scale * noise;
        const noiseZ = noise3D(x * 0.1 + 200, y * 0.1 + 200, z * 0.1 + 200) * scale * noise;
        
        pulsarPositions.push(x + noiseX, y + noiseY, z + noiseZ);
        
        // Size based on significance (for now just random within our range)
        const size = THREE.MathUtils.randFloat(
          CONFIG.pulsarSizeRange[0], 
          CONFIG.pulsarSizeRange[1]
        );
        pulsarSizes.push(size);
        
        // Color based on period (red for slow, blue for fast)
        const color = new THREE.Color();
        
        // Normalize the period value for visualization
        const period = pulsar.P0 || 0.5; // Default if missing
        
        if (period < CONFIG.fastPulsarThreshold) {
          // Fast pulsars - blue to cyan
          color.setHSL(0.6, 0.9, 0.7);
        } else if (period > CONFIG.slowPulsarThreshold) {
          // Slow pulsars - red to orange
          color.setHSL(0.05, 0.9, 0.7);
        } else {
          // Medium pulsars - green to yellow
          color.setHSL(0.3, 0.9, 0.7);
        }
        
        pulsarColors.push(color.r, color.g, color.b);
        pulsarPeriods.push(period);
        pulsarDMs.push(pulsar.DM || 100); // Default if missing
        
        // Add to our pulsars array for interaction
        pulsars.push({
          position: new THREE.Vector3(x + noiseX, y + noiseY, z + noiseZ),
          originalPosition: new THREE.Vector3(x + noiseX, y + noiseY, z + noiseZ),
          data: pulsar,
          size: size,
          index: pulsars.length,
          visible: true
        });
        
        processedCount++;
      }
      
      // Update progress
      const progressPercentage = Math.min(80, (processedCount / totalPulsars) * 80);
      document.getElementById('progress').style.width = \`\${progressPercentage}%\`;
      
      currentChunk++;
      
      // If more chunks to process, schedule the next one
      if (currentChunk < totalChunks) {
        setTimeout(processPulsarChunk, CONFIG.loadingChunkDelay);
      } else {
        finalizePulsarSystem();
      }
    }
    
    // Start processing the first chunk
    processPulsarChunk();
    
    function finalizePulsarSystem() {
      const pulsarGeometry = new THREE.BufferGeometry();
      pulsarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pulsarPositions, 3));
      pulsarGeometry.setAttribute('size', new THREE.Float32BufferAttribute(pulsarSizes, 1));
      pulsarGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pulsarColors, 3));
      pulsarGeometry.setAttribute('period', new THREE.Float32BufferAttribute(pulsarPeriods, 1));
      pulsarGeometry.setAttribute('dm', new THREE.Float32BufferAttribute(pulsarDMs, 1));
      
      // Create the pulsar material with custom shaders
      const pulsarMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: createPulsarTexture() },
          time: { value: 0 }
        },
        vertexShader: \`
          attribute float size;
          attribute float period;
          attribute float dm;
          varying vec3 vColor;
          varying float vPulseIntensity;
          uniform float time;
          
          // Function to get a pulse effect based on period
          float getPulseIntensity(float period, float t) {
            // Handle different periods - faster pulsars pulse more frequently
            float cycleTime = 3.0 * period;
            float pulseTime = mod(t, cycleTime) / cycleTime;
            
            // Create a sharp pulse
            float pulse = smoothstep(0.0, 0.1, pulseTime) * (1.0 - smoothstep(0.1, 0.9, pulseTime));
            
            // Add some noise to make it more interesting
            return pulse * 0.6 + 0.4;
          }
          
          void main() {
            vColor = color;
            
            // Calculate the pulse intensity based on time and period
            vPulseIntensity = getPulseIntensity(period, time);
            
            // Apply the DM effect (dispersion measure affects the brightness)
            float dmFactor = min(dm * 0.01, 1.0); // Scale DM to reasonable range
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Scale size by pulse intensity and DM
            float finalSize = size * (1.0 + vPulseIntensity * 0.5 + dmFactor * 0.2);
            gl_PointSize = finalSize * (400.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        \`,
        fragmentShader: \`
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vPulseIntensity;
          
          void main() {
            float alpha = texture2D(pointTexture, gl_PointCoord).a;
            if (alpha < 0.1) discard;
            
            // Brighten color based on pulse intensity
            vec3 finalColor = vColor * (0.6 + vPulseIntensity * 0.4);
            gl_FragColor = vec4(finalColor, alpha * 0.9);
          }
        \`,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        vertexColors: true
      });
      
      pulsarSystem = new THREE.Points(pulsarGeometry, pulsarMaterial);
      scene.add(pulsarSystem);
      
      // Update progress to nearly complete
      document.getElementById('progress').style.width = '90%';
      
      // Update the loading message
      document.querySelector('#loading span').textContent = 
        \`\${processedCount} Pulsars Loaded Successfully!\`;
        
      // Finish remaining initialization tasks
      setTimeout(() => {
        // Add remaining progress to reach 100%
        document.getElementById('progress').style.width = '100%';
        console.log(\`Galaxy creation completed with \${processedCount} pulsars\`);
      }, 500);
    }
  }

  function createPulsarTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // Create a more complex gradient for pulsars
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    return new THREE.CanvasTexture(canvas);
  }

  function setViewMode(mode) {
    currentViewMode = mode;
    
    // Reset all pulsars to visible
    pulsars.forEach(pulsar => {
      pulsar.visible = true;
    });
    
    if (mode === 'fast') {
      // Only show fast pulsars
      pulsars.forEach(pulsar => {
        pulsar.visible = pulsar.data.P0 < CONFIG.fastPulsarThreshold;
      });
    } else if (mode === 'slow') {
      // Only show slow pulsars
      pulsars.forEach(pulsar => {
        pulsar.visible = pulsar.data.P0 > CONFIG.slowPulsarThreshold;
      });
    }
    
    // Clear selection and stop any sound when changing view mode
    selectedPulsar = null;
    stopPulsarSound();
    document.getElementById('pulsar-details').classList.remove('visible');
    
    // Update the visibility
    updatePulsarVisibility();
  }

  function updatePulsarVisibility() {
    const positions = pulsarSystem.geometry.attributes.position.array;
    const originalPositions = pulsars.map(p => p.originalPosition);
    const hiddenPosition = new THREE.Vector3(10000, 10000, 10000); // Far away position for hidden pulsars
    
    for (let i = 0; i < pulsars.length; i++) {
      const i3 = i * 3;
      if (pulsars[i].visible) {
        positions[i3] = pulsars[i].position.x;
        positions[i3 + 1] = pulsars[i].position.y;
        positions[i3 + 2] = pulsars[i].position.z;
      } else {
        positions[i3] = hiddenPosition.x;
        positions[i3 + 1] = hiddenPosition.y;
        positions[i3 + 2] = hiddenPosition.z;
      }
    }
    
    pulsarSystem.geometry.attributes.position.needsUpdate = true;
  }

  // Generate sound based on pulsar frequency
  function playPulsarSound(pulsar) {
    // Stop any currently playing sound
    stopPulsarSound();
    
    if (!isAudioInitialized || !CONFIG.audioEnabled) return;
    
    try {
      // Resume audio context if it was suspended (browser policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const period = pulsar.data.P0;
      if (!period) return;
      
      // Convert period to frequency in audible range (period in seconds to Hz)
      // Using a logarithmic scale to map the diverse pulsar periods to audible frequencies
      // Typical pulsar periods: 0.001s to 10s → map to ~100Hz to ~2000Hz
      const minPeriod = 0.001; // 1ms for millisecond pulsars
      const maxPeriod = 10.0;  // 10s for slow pulsars
      
      const minFreq = 100;   // Lower audible frequency
      const maxFreq = 2000;  // Higher audible frequency
      
      // Logarithmic mapping from period to frequency
      // Shorter periods (faster pulsars) get higher frequencies
      let normalizedPeriod = Math.max(minPeriod, Math.min(maxPeriod, period));
      let logPeriodRange = Math.log(maxPeriod / minPeriod);
      let logPeriodValue = Math.log(normalizedPeriod / minPeriod);
      let normalizedValue = 1 - (logPeriodValue / logPeriodRange); // Invert so shorter periods give higher frequencies
      let frequency = minFreq + normalizedValue * (maxFreq - minFreq);
      
      // Create oscillator and connect
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine'; // Sine wave for a pure tone
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Add modulation to mimic pulsar rhythm
      const modulator = audioContext.createGain();
      modulator.gain.value = 1;
      
      // Calculate pulse speed based on period
      const pulseRate = 1 / period; // Pulses per second
      const pulseModulation = 5.0; // How many times faster to modulate than actual period (makes it more audible)
      
      // Create pulsing effect
      const now = audioContext.currentTime;
      const pulseDuration = 0.05; // Short pulse
      
      // Schedule regular gain changes for the next 10 seconds
      for (let i = 0; i < 10 * pulseRate * pulseModulation; i++) {
        const pulseTime = now + (i / (pulseRate * pulseModulation));
        modulator.gain.setValueAtTime(1, pulseTime);
        modulator.gain.exponentialRampToValueAtTime(0.01, pulseTime + pulseDuration);
        modulator.gain.setValueAtTime(0.01, pulseTime + pulseDuration);
        modulator.gain.exponentialRampToValueAtTime(1, pulseTime + 2 * pulseDuration);
      }
      
      // Connect the nodes
      oscillator.connect(modulator);
      modulator.connect(audioGain);
      
      // Start the oscillator
      oscillator.start();
      
      // Save reference to stop later
      activeAudioOscillator = {
        oscillator,
        modulator,
        pulsarPeriod: period
      };
      
      console.log(\`Playing sound for pulsar with period \${period}s (\${frequency.toFixed(2)} Hz)\`);
    } catch (error) {
      console.error("Failed to play pulsar sound:", error);
    }
  }
  
  // Stop any currently playing pulsar sound
  function stopPulsarSound() {
    if (activeAudioOscillator) {
      try {
        activeAudioOscillator.oscillator.stop();
        activeAudioOscillator.oscillator.disconnect();
        activeAudioOscillator.modulator.disconnect();
      } catch (error) {
        console.error("Error stopping sound:", error);
      }
      activeAudioOscillator = null;
    }
  }

  function selectPulsar(pulsar) {
    selectedPulsar = pulsar;
    
    // Show the pulsar details panel
    const detailsPanel = document.getElementById('pulsar-details');
    detailsPanel.classList.add('visible');
    
    // Update the details
    document.getElementById('pulsar-name').textContent = pulsar.data.JNAME || 'Unknown';
    document.getElementById('pulsar-assoc').textContent = pulsar.data.ASSOC || 'None';
    document.getElementById('pulsar-period').textContent = (pulsar.data.P0 ? pulsar.data.P0.toFixed(4) + ' s' : 'Unknown');
    document.getElementById('pulsar-distance').textContent = (pulsar.data.DIST ? pulsar.data.DIST.toFixed(2) + ' kpc' : 'Unknown');
    document.getElementById('pulsar-dm').textContent = (pulsar.data.DM ? pulsar.data.DM.toFixed(2) + ' cm⁻³ pc' : 'Unknown');
    
    // Play sound for this pulsar
    playPulsarSound(pulsar);
    
    // Animate camera to focus on the pulsar
    const targetPosition = pulsar.position.clone();
    const distance = 10; // Distance from the pulsar
    const startPosition = camera.position.clone();
    
    anime({
      targets: camera.position,
      x: targetPosition.x + distance,
      y: targetPosition.y + distance / 2,
      z: targetPosition.z + distance,
      duration: 1000,
      easing: 'easeInOutQuad',
      update: () => {
        camera.lookAt(targetPosition);
      }
    });
    
    // Temporarily disable auto-rotation
    controls.autoRotate = false;
    setTimeout(() => {
      controls.autoRotate = true;
    }, 1000);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!isInitialized) return;
    
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = clock.getDelta();
    
    // Update controls
    controls.update();
    
    // Update pulsar animations
    if (pulsarSystem) {
      // Update the shader time uniform
      pulsarSystem.material.uniforms.time.value = elapsedTime;
    }
    
    // Render the scene
    composer.render(deltaTime);
  }

  function onCanvasClick(event) {
    // Convert mouse position to normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.5; // Adjust the hit threshold as needed
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections with pulsars
    const intersects = raycaster.intersectObject(pulsarSystem);
    
    if (intersects.length > 0) {
      // Get the first intersected pulsar
      const intersect = intersects[0];
      const index = intersect.index;
      
      if (pulsars[index]) {
        selectPulsar(pulsars[index]);
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Clean up resources when page is unloaded
  window.addEventListener('beforeunload', () => {
    if (isAudioInitialized) {
      stopPulsarSound();
      if (audioContext) {
        audioContext.close();
      }
    }
  });
  
  // Start the initialization
  init();
});
