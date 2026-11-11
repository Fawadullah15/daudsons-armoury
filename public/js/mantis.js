/**
 * DAUDSONS ARMOURY (PVT.) LTD. — MANTIS X10 TELEMETRY SIMULATOR
 * Live shot timer, split-time trace, trigger pull stability & PKR ammo savings.
 */

let mantisShotCount = 1;

function initMantisSimulator() {
  const btn = document.getElementById("simulateMantisShotBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    simulateMantisShot();
  });
}

function simulateMantisShot() {
  mantisShotCount += 1;
  const score = (93 + Math.random() * 6.5).toFixed(1);
  const hold = (0.04 + Math.random() * 0.09).toFixed(2);
  const splitTime = (0.22 + Math.random() * 0.12).toFixed(2);
  const ammoCostPerRoundPKR = 165; // Estimated 9mm Luger factory round PKR

  const counterEl = document.getElementById("mantisShotCounter");
  const holdEl = document.getElementById("mantisHoldVal");
  const triggerEl = document.getElementById("mantisTriggerVal");
  const savedEl = document.getElementById("mantisSavedVal");
  const waveLine = document.getElementById("mantisWaveLine");

  if (counterEl) {
    counterEl.textContent = `SHOT #0${mantisShotCount} • SCORE: ${score} / 100 • SPLIT: ${splitTime}s`;
  }
  if (holdEl) {
    holdEl.textContent = `${hold}° Hold Stability`;
  }
  if (triggerEl) {
    triggerEl.textContent = score > 96 ? `CLEAN BREAK (${score})` : `SLIGHT HEELING (${score})`;
  }
  if (savedEl) {
    const totalSaved = mantisShotCount * ammoCostPerRoundPKR;
    savedEl.textContent = `₨ ${totalSaved.toLocaleString()} Saved`;
  }

  // Generate dynamic wave trace
  if (waveLine) {
    const pts = [];
    for (let x = 10; x <= 490; x += 36) {
      const variation = Math.sin(x * 0.08) * 12 + (Math.random() - 0.5) * 16;
      pts.push(`${x},${Math.floor(85 + variation)}`);
    }
    waveLine.setAttribute("points", pts.join(" "));
  }
}

window.initMantisSimulator = initMantisSimulator;
window.simulateMantisShot = simulateMantisShot;
