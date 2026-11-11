/**
 * DAUDSONS ARMOURY (PVT.) LTD. — PAKISTAN DEALER MAP (D3.JS / SVG)
 * Interactive geographic visualizer with WGS-84 coordinates and pulsing radar pins.
 */

let activeDealerId = "peshawar";
let loadedDealers = [];

function initPakistanMap(dealers) {
  try {
    loadedDealers = dealers || [];
    if (!loadedDealers.length) return;

    renderPakistanMap();
    selectDealerCity(activeDealerId || loadedDealers[0].id);
  } catch (err) {
    console.warn("[Pakistan Map] Notice:", err.message);
  }
}

function renderPakistanMap() {
  if (typeof d3 === "undefined") {
    console.warn("[Pakistan Map] D3 library not loaded yet.");
    return;
  }
  const svg = d3.select("#pakistanDealerMapSvg");
  if (!svg.node()) return;

  svg.selectAll("*").remove();

  // Stylized high-precision projection centered on Pakistan
  const projection = d3.geoMercator()
    .center([70.5, 30.2])
    .scale(2150)
    .translate([325, 265]);

  // Technical lat/lng graticule grid
  const graticule = d3.geoGraticule().step([2, 2]);
  const pathGen = d3.geoPath().projection(projection);

  svg.append("path")
    .datum(graticule())
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "rgba(200, 162, 74, 0.12)")
    .attr("stroke-width", 0.75);

  // GeoJSON outline of Pakistan sovereign territory
  const pakistanOutlineGeoJSON = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [61.5, 25.2], [64.8, 25.3], [67.0, 24.8], [68.2, 23.8], [71.0, 24.4],
        [70.2, 26.8], [71.8, 28.2], [74.0, 30.2], [74.6, 31.6], [75.2, 32.8],
        [77.0, 35.2], [75.8, 36.8], [73.2, 36.9], [71.5, 36.0], [71.2, 34.2],
        [69.4, 31.8], [66.4, 29.8], [62.8, 29.4], [60.9, 27.2], [61.5, 25.2]
      ]]
    }
  };

  svg.append("path")
    .datum(pakistanOutlineGeoJSON)
    .attr("d", pathGen)
    .attr("fill", "rgba(200, 162, 74, 0.08)")
    .attr("stroke", "#C8A24A")
    .attr("stroke-width", 1.5);

  // Find Peshawar HQ coordinates
  const hq = loadedDealers.find(d => d.isHQ || d.id === 'peshawar') || loadedDealers[0];
  const hqCoords = hq ? projection([hq.lng, hq.lat]) : [325, 265];

  // Connect Peshawar HQ to all regional dealer cities with blueprint dashed corridors
  loadedDealers.forEach(d => {
    if (!d.isHQ && d.id !== hq.id) {
      const target = projection([d.lng, d.lat]);
      if (target && hqCoords) {
        svg.append("line")
          .attr("x1", hqCoords[0]).attr("y1", hqCoords[1])
          .attr("x2", target[0]).attr("y2", target[1])
          .attr("stroke", "rgba(200, 162, 74, 0.28)")
          .attr("stroke-dasharray", "3 3")
          .attr("stroke-width", 1);
      }
    }
  });

  // Plot pulsing city pins
  const pinGroups = svg.selectAll(".dealer-pin")
    .data(loadedDealers)
    .enter()
    .append("g")
    .attr("class", "dealer-pin cursor-pointer")
    .attr("transform", d => {
      const [x, y] = projection([d.lng, d.lat]);
      return `translate(${x}, ${y})`;
    })
    .on("click", (event, d) => {
      selectDealerCity(d.id);
    });

  pinGroups.append("circle")
    .attr("r", d => d.isHQ ? 10 : 7)
    .attr("fill", d => d.id === activeDealerId ? "#E4572E" : "#C8A24A")
    .attr("class", "pin-pulse");

  pinGroups.append("circle")
    .attr("r", d => d.isHQ ? 6 : 4.5)
    .attr("fill", d => d.id === activeDealerId ? "#E4572E" : "#C8A24A")
    .attr("stroke", "#0A0B0D")
    .attr("stroke-width", 1.5);

  pinGroups.append("text")
    .attr("x", 9)
    .attr("y", 4)
    .attr("fill", "#F2F0EB")
    .attr("font-size", "10px")
    .attr("font-family", "JetBrains Mono, monospace")
    .text(d => d.city.split(" (")[0]);
}

function selectDealerCity(cityId) {
  activeDealerId = cityId;
  const d = loadedDealers.find(item => item.id === cityId) || loadedDealers[0];
  if (!d) return;

  const badge = document.getElementById("selectedMapCityBadge");
  if (badge) badge.textContent = d.city.toUpperCase();

  const card = document.getElementById("homeDealerDetailCard");
  if (card) {
    card.innerHTML = `
      <div class="flex items-center justify-between font-mono-tech text-xs text-theme-brass">
        <span>${d.province} • WGS-84 (${d.lat}°N, ${d.lng}°E)</span>
        <span class="px-2 py-0.5 ${d.isHQ ? 'bg-[#E4572E] text-white' : 'bg-theme-surface-2 text-theme-brass'}">${d.isHQ ? 'FACTORY HQ & OUTLET' : 'AUTHORIZED DEALER'}</span>
      </div>
      <h3 class="font-display text-xl font-bold uppercase">${d.name}</h3>
      <p class="text-xs font-mono-tech text-theme-primary">${d.address}</p>
      <p class="text-xs font-mono-tech text-theme-brass font-bold">Tel: ${d.phone}</p>
      <p class="text-xs text-theme-steel border-t border-theme-muted pt-2">${d.note || 'Requires valid license and demand note.'}</p>
    `;
  }

  const btnWrap = document.getElementById("homeCityQuickButtons");
  if (btnWrap) {
    btnWrap.innerHTML = loadedDealers.map(city => `
      <button type="button" onclick="selectDealerCity('${city.id}')" class="px-2.5 py-1.5 font-mono-tech text-[11px] border transition-colors ${city.id === activeDealerId ? 'bg-[#C8A24A] text-[#0A0B0D] font-bold border-[#C8A24A]' : 'bg-theme-base border-theme-muted text-theme-steel hover:border-[#C8A24A]'}">
        ${city.city.split(" (")[0]}
      </button>
    `).join("");
  }

  renderPakistanMap();
}

window.initPakistanMap = initPakistanMap;
window.selectDealerCity = selectDealerCity;
window.renderPakistanMap = renderPakistanMap;
