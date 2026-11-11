/**
 * DAUDSONS ARMOURY (PVT.) LTD. — THREE.JS 3D CAD VIEWER
 * Precision CAD inspection for DSA Trushot 9mm Semi-Automatic Pistol.
 */

let trushotMeshGroup = null;
let isWireframeMode = false;
let isExplodedMode = false;
let trushotAnimId = null;

function initTrushot3DViewer() {
  try {
    const canvas = document.getElementById("trushot3DCanvas");
    if (!canvas || typeof THREE === "undefined") return;

    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 400;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 5.2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const brassLight = new THREE.DirectionalLight(0xc8a24a, 1.6);
  brassLight.position.set(4, 5, 4);
  scene.add(brassLight);

  const fillLight = new THREE.DirectionalLight(0x8a9099, 0.8);
  fillLight.position.set(-4, -2, -3);
  scene.add(fillLight);

  // Group
  trushotMeshGroup = new THREE.Group();

  // Materials
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x1c1f24,
    metalness: 0.85,
    roughness: 0.28,
    wireframe: false
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc8a24a,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: false
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f47,
    metalness: 0.92,
    roughness: 0.25,
    wireframe: false
  });

  const opticFiberMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

  // 1. Slide
  const slideGeo = new THREE.BoxGeometry(2.5, 0.52, 0.46);
  const slideMesh = new THREE.Mesh(slideGeo, metalMat);
  slideMesh.name = "slide";
  slideMesh.position.set(0, 0.38, 0);
  trushotMeshGroup.add(slideMesh);

  // 2. Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.13, 0.13, 2.65, 32);
  const barrelMesh = new THREE.Mesh(barrelGeo, steelMat);
  barrelMesh.name = "barrel";
  barrelMesh.rotation.z = Math.PI / 2;
  barrelMesh.position.set(0.12, 0.38, 0);
  trushotMeshGroup.add(barrelMesh);

  // 3. Lower Frame
  const frameGeo = new THREE.BoxGeometry(2.35, 0.42, 0.44);
  const frameMesh = new THREE.Mesh(frameGeo, metalMat);
  frameMesh.name = "frame";
  frameMesh.position.set(-0.06, -0.06, 0);
  trushotMeshGroup.add(frameMesh);

  // 4. Ergonomic Grip
  const gripGeo = new THREE.BoxGeometry(0.72, 1.45, 0.4);
  const gripMesh = new THREE.Mesh(gripGeo, steelMat);
  gripMesh.name = "grip";
  gripMesh.rotation.z = -0.28;
  gripMesh.position.set(-0.78, -0.68, 0);
  trushotMeshGroup.add(gripMesh);

  // 5. Trigger Guard
  const guardGeo = new THREE.TorusGeometry(0.35, 0.045, 16, 32, Math.PI);
  const guardMesh = new THREE.Mesh(guardGeo, metalMat);
  guardMesh.rotation.z = -Math.PI / 2;
  guardMesh.position.set(0.18, -0.42, 0);
  trushotMeshGroup.add(guardMesh);

  // 6. Brass Match Trigger
  const triggerGeo = new THREE.BoxGeometry(0.09, 0.28, 0.09);
  const triggerMesh = new THREE.Mesh(triggerGeo, brassMat);
  triggerMesh.rotation.z = -0.32;
  triggerMesh.position.set(0.12, -0.32, 0);
  trushotMeshGroup.add(triggerMesh);

  // 7. Ambidextrous Safety Catch
  const safetyGeo = new THREE.BoxGeometry(0.24, 0.1, 0.52);
  const safetyMesh = new THREE.Mesh(safetyGeo, brassMat);
  safetyMesh.name = "safety";
  safetyMesh.position.set(-0.82, 0.2, 0);
  trushotMeshGroup.add(safetyMesh);

  // 8. Fiber-Optic Sights
  const rearSightGeo = new THREE.BoxGeometry(0.16, 0.14, 0.38);
  const rearSightMesh = new THREE.Mesh(rearSightGeo, metalMat);
  rearSightMesh.position.set(-1.12, 0.7, 0);
  trushotMeshGroup.add(rearSightMesh);

  const frontSightGeo = new THREE.BoxGeometry(0.12, 0.12, 0.1);
  const frontSightMesh = new THREE.Mesh(frontSightGeo, metalMat);
  frontSightMesh.position.set(1.15, 0.7, 0);
  trushotMeshGroup.add(frontSightMesh);

  const fiberGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 16);
  const fiberMesh = new THREE.Mesh(fiberGeo, opticFiberMat);
  fiberMesh.rotation.z = Math.PI / 2;
  fiberMesh.position.set(1.15, 0.73, 0);
  trushotMeshGroup.add(fiberMesh);

  scene.add(trushotMeshGroup);

  // Mouse drag interaction
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;

  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  canvas.addEventListener("mousemove", e => {
    if (!isDragging || !trushotMeshGroup) return;
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    trushotMeshGroup.rotation.y += deltaX * 0.009;
    trushotMeshGroup.rotation.x += deltaY * 0.009;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  // Touch controls
  canvas.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  canvas.addEventListener("touchmove", e => {
    if (!isDragging || !trushotMeshGroup || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMouseX;
    const deltaY = e.touches[0].clientY - prevMouseY;
    trushotMeshGroup.rotation.y += deltaX * 0.009;
    trushotMeshGroup.rotation.x += deltaY * 0.009;
    prevMouseX = e.touches[0].clientX;
    prevMouseY = e.touches[0].clientY;
  }, { passive: true });

  // Handle Resize
  window.addEventListener("resize", () => {
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animation Loop
  function animate() {
    trushotAnimId = requestAnimationFrame(animate);
    if (!isDragging && trushotMeshGroup) {
      trushotMeshGroup.rotation.y += 0.0035;
    }
    renderer.render(scene, camera);
  }
  animate();

  // Wireframe Toggle
  const wireBtn = document.getElementById("toggle3DWireframeBtn");
  if (wireBtn) {
    wireBtn.addEventListener("click", () => {
      isWireframeMode = !isWireframeMode;
      if (!trushotMeshGroup) return;
      trushotMeshGroup.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.wireframe = isWireframeMode;
        }
      });
      wireBtn.textContent = isWireframeMode ? "Wireframe Mode: ON" : "Wireframe Mode: OFF";
    });
  }

  // Exploded View Toggle
  const explodeBtn = document.getElementById("toggle3DExplodeBtn");
  if (explodeBtn) {
    explodeBtn.addEventListener("click", () => {
      isExplodedMode = !isExplodedMode;
      if (!trushotMeshGroup) return;
      const slide = trushotMeshGroup.getObjectByName("slide");
      const barrel = trushotMeshGroup.getObjectByName("barrel");
      const grip = trushotMeshGroup.getObjectByName("grip");
      if (slide) slide.position.y = isExplodedMode ? 0.88 : 0.38;
      if (barrel) barrel.position.y = isExplodedMode ? 0.62 : 0.38;
      if (grip) grip.position.y = isExplodedMode ? -0.98 : -0.68;
      explodeBtn.textContent = isExplodedMode ? "Assembly: EXPLODED" : "Assembly: SOLID";
    });
  }

  // Reset CAD View
  const resetBtn = document.getElementById("reset3DViewBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (trushotMeshGroup) {
        trushotMeshGroup.rotation.set(0, 0, 0);
      }
    });
  }

  // Callouts
  const calloutMeta = {
    frame: ["01 / AEROSPACE ALLOY FRAME:", "CNC-machined from solid aerospace-grade aluminum billet with Gen 2 weight-reduction pockets.", 0.3],
    sights: ["02 / FIBER-OPTIC DOT SIGHTS:", "High-visibility light-gathering dot sights for rapid target alignment in all lighting conditions.", -0.6],
    slide: ["03 / DURABLE METAL COMPONENTS:", "Forged alloy steel slide and precision honed barrel rated for 10,000 rounds.", 1.1],
    safety: ["04 / AMBIDEXTROUS SAFETY:", "Dual-side mechanical thumb safety with improved Gen 2 catch geometry.", 2.4]
  };

  document.querySelectorAll(".trushot-callout-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-callout");
      const info = calloutMeta[key];
      if (info) {
        const titleEl = document.getElementById("calloutTitle");
        const descEl = document.getElementById("calloutDesc");
        if (titleEl) titleEl.textContent = info[0];
        if (descEl) descEl.textContent = info[1];
        if (trushotMeshGroup) {
          trushotMeshGroup.rotation.y = info[2];
          trushotMeshGroup.rotation.x = 0;
        }
      }
    });
  });
  } catch (err) {
    console.warn("[3D Viewer] Init skipped:", err.message);
  }
}

window.initTrushot3DViewer = initTrushot3DViewer;
