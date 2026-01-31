const state = {
    step: 1,
    data: {
        width: 21,
        length: 40,
        road: 'East',
        vastu: true,
        parking: 'Northeast',
        kitchen: 'Southeast',
        bedroom: 'Southwest',
        stairs: 'South wall',
        bath: 'Northwest'
    }
};

const DIRECTIONS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];

function adjustDirection(originalDir, roadFacing) {
    if (!originalDir || originalDir === 'Center' || originalDir === 'Attached') return originalDir;

    let dirToMap = originalDir;
    let suffix = '';

    if (originalDir.includes(' wall')) {
        dirToMap = originalDir.split(' ')[0];
        suffix = ' wall';
    }

    // Capitalize first letter just in case
    dirToMap = dirToMap.charAt(0).toUpperCase() + dirToMap.slice(1);

    const roadIndex = DIRECTIONS.indexOf(roadFacing);
    const dirIndex = DIRECTIONS.indexOf(dirToMap);

    if (roadIndex === -1 || dirIndex === -1) return originalDir;

    // Calculate shift to make roadFacing become South (index 4)
    const shift = 4 - roadIndex;
    let newIndex = (dirIndex + shift) % 8;
    if (newIndex < 0) newIndex += 8;

    return DIRECTIONS[newIndex] + suffix;
}

const totalSteps = 5;

// DOM Elements
const els = {
    steps: Array.from(document.querySelectorAll('.step')),
    progressFill: document.getElementById('progressFill'),
    currentStepNum: document.getElementById('currentStepNum'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    generateBtn: document.getElementById('generateBtn'),
    finalPrompt: document.getElementById('finalPrompt'),
    summaryList: document.getElementById('summaryList'),
    resultArea: document.getElementById('resultArea'),
    inputs: {
        width: document.getElementById('plotWidth'),
        length: document.getElementById('plotLength'),
        road: document.querySelectorAll('input[name="roadDirection"]'),
        vastu: document.getElementById('vastuCompliant'),
        parking: document.getElementById('parkingLoc'),
        kitchen: document.getElementById('kitchenLoc'),
        bedroom: document.getElementById('bedroomLoc'),
        stairs: document.getElementById('staircaseLoc'),
        bath: document.getElementById('bathLoc')
    }
};

// Init
function init() {
    updateUI();
    bindEvents();
}

function bindEvents() {
    els.nextBtn.addEventListener('click', () => {
        if (validateStep(state.step)) {
            captureData(state.step);
            state.step++;
            updateUI();
        }
    });

    els.prevBtn.addEventListener('click', () => {
        state.step--;
        updateUI();
    });

    els.generateBtn.addEventListener('click', () => {
        generatePrompt();
        els.generateBtn.classList.add('hidden');
        els.resultArea.classList.remove('hidden');
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
        els.finalPrompt.select();
        document.execCommand('copy');
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

function updateUI() {
    // Show/Hide Steps
    els.steps.forEach((step, index) => {
        if (index + 1 === state.step) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Progress Bar
    const progress = ((state.step - 1) / (totalSteps - 1)) * 100;
    els.progressFill.style.width = `${Math.max(progress, 5)}%`;
    els.currentStepNum.innerText = state.step;

    // Buttons
    els.prevBtn.disabled = state.step === 1;

    if (state.step === totalSteps) {
        els.nextBtn.classList.add('hidden');
        els.generateBtn.classList.remove('hidden');
        renderSummary();
    } else {
        els.nextBtn.classList.remove('hidden');
        els.generateBtn.classList.add('hidden');
        els.resultArea.classList.add('hidden');
    }
}

function validateStep(step) {
    if (step === 1) {
        if (!els.inputs.width.value || !els.inputs.length.value) {
            alert('Please enter valid dimensions.');
            return false;
        }
    }
    return true;
}

function captureData(step) {
    if (step === 1) {
        state.data.width = els.inputs.width.value;
        state.data.length = els.inputs.length.value;
    } else if (step === 2) {
        const checkedRoad = document.querySelector('input[name="roadDirection"]:checked');
        state.data.road = checkedRoad ? checkedRoad.value : 'East';
        state.data.vastu = els.inputs.vastu.checked;
    } else if (step === 3) {
        state.data.parking = els.inputs.parking.value;
        state.data.kitchen = els.inputs.kitchen.value;
        state.data.bedroom = els.inputs.bedroom.value;
    } else if (step === 4) {
        state.data.stairs = els.inputs.stairs.value;
        state.data.bath = els.inputs.bath.value;
    }
}

function renderSummary() {
    const s = state.data;
    const items = [
        `Plot: ${s.width} FT x ${s.length} FT`,
        `Orientation: ${s.road}-facing road`,
        `Structure: ${s.vastu ? 'Vastu Compliant' : 'Standard'}`,
        `Kitchen: ${s.kitchen}`,
        `Master Bedroom: ${s.bedroom}`,
        `Bathrooms: ${s.bath}`,
        `Staircase: ${s.stairs}`
    ];

    els.summaryList.innerHTML = items.map(i => `<li>${i}</li>`).join('');
}

function generatePrompt() {
    const s = state.data;

    // Constructing the Prompt to match the user's requested style
    let p = `Technical architectural 2D ground floor plan, top-down flat view, blueprint style with black lines on a white background. `;

    // Adjust dimensions if road is not East/West ?? 
    // Actually, user just said "East become South".
    // If we rotate the image, "Width" and "Length" might swap relative to the "bottom" if we rotate 90 deg.
    // However, usually "frontage" is width.
    // Let's assume user wants the label to stay as is, just the *locations* of rooms change.
    // But wait, if Road is East (Side), and we rotate so Road is South (Bottom), then the "Side" dimension becomes "Bottom" dimension?
    // User request: "If Road side is East... East become South".
    // This implies rotating the whole plan.
    // If the plot was 21(W) x 40(L).
    // If road is on the "Width" side, and that side becomes South, then Width is at bottom.
    // If road is on "Length" side...? The inputs are "Width" and "Length".
    // Usually "Width" is the shorter side, or frontage.
    // Let's assume "Width" matches the Road side if implied, or just list dimensions generic.
    // The previous code: `dimensions labeled '${s.width} FT WIDTH' at the bottom and '${s.length} FT LENGTH' along the side.`
    // This implies Width is ALWAYS at the bottom.
    // If we want the Road to be at the bottom, and the Road corresponds to a specific side...
    // The user input just says "Width" and "Length". It doesn't specify which side the road is on relative to W/L.
    // BUT the prompt generator logic previously said:
    // `dimensions labeled '${s.width} FT WIDTH' at the bottom`
    // `The bottom edge of the image is the ${s.road}-facing road.`
    // So the code ASSUMED the Road was ALREADY at the bottom (South) effectively?
    // No, it said "The bottom edge... is the East-facing road". This is contradictory if Bottom=South.

    // New Logic: We FORCE the road to be the bottom edge.
    // So we say: "The bottom edge is the road."
    // And we rotate all other zones.

    p += `The plot is a vertical rectangle with dimensions labeled '${s.width} FT WIDTH' at the bottom and '${s.length} FT LENGTH' along the side. `;
    p += `The bottom edge of the image is the road. `;

    if (s.vastu) {
        p += `The layout is fully Vastu Shastra compliant. `;
    }

    const parkingDir = adjustDirection(s.parking, s.road);
    const kitchenDir = adjustDirection(s.kitchen, s.road);
    const bedroomDir = adjustDirection(s.bedroom, s.road);
    const bathDir = adjustDirection(s.bath, s.road);
    const stairsDir = adjustDirection(s.stairs, s.road);

    p += `In the ${parkingDir} zone there is an open 'CAR PARKING' bay. `;

    // Entrance usually adjacent to parking
    p += `Adjacent to the parking, near the center-bottom, is the 'MAIN ENTRANCE' leading into a central 'LIVING HALL'. `;

    p += `The ${kitchenDir} zone contains the 'KITCHEN' with an L-shaped counter. `;

    p += `The ${bedroomDir} zone is the 'MASTER BEDROOM' with a bed icon. `;

    if (s.bath === 'Attached') {
        p += `The 'BATHROOM' and 'TOILET (WC)' are attached to the Master Bedroom. `;
    } else {
        p += `The ${bathDir} zone features two distinctly separate, small rooms labeled 'TOILET (WC)' and 'BATHROOM'. `;
    }

    p += `A 'STAIRCASE' is located along the ${stairsDir} ascending upwards. `;

    p += `The center of the plan (Brahmasthan) is kept open as part of the living hall. Room labels are clear uppercase text. Basic furniture icons included.`;

    els.finalPrompt.value = p;
}

init();
