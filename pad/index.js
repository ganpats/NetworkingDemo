document.addEventListener('DOMContentLoaded', () => {
    const modeBtnContainer = document.getElementById('modeToggle');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const refWeightInput = document.getElementById('refWeight');
    const refPriceInput = document.getElementById('refPrice');
    const targetValueInput = document.getElementById('targetValue');
    
    const targetLabel = document.getElementById('targetLabel');
    const targetValueUnit = document.getElementById('targetValueUnit');
    const resultLabel = document.getElementById('resultLabel');
    const finalValueDisplay = document.getElementById('finalValue');
    const resultUnitDisplay = document.getElementById('resultUnit');
    const resultSection = document.querySelector('.result-section');

    let currentMode = 'weight'; // Default mode

    // Mode Switch Logic
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateUIForMode();
            calculate();
        });
    });

    function updateUIForMode() {
        if (currentMode === 'weight') {
            targetLabel.textContent = 'Target Price';
            targetValueUnit.textContent = 'Rs.';
            resultLabel.textContent = 'You will get weight';
            resultUnitDisplay.textContent = 'kg';
        } else {
            targetLabel.textContent = 'Target Weight';
            targetValueUnit.textContent = 'KG';
            resultLabel.textContent = 'You will pay price';
            resultUnitDisplay.textContent = 'Rs.';
        }
    }

    // Calculation Logic
    function calculate() {
        const rw = parseFloat(refWeightInput.value);
        const rp = parseFloat(refPriceInput.value);
        const tv = parseFloat(targetValueInput.value);

        if (isNaN(rw) || isNaN(rp) || isNaN(tv) || rw === 0 || rp === 0) {
            finalValueDisplay.textContent = '0.00';
            return;
        }

        let result = 0;
        if (currentMode === 'weight') {
            // How much weight for price tv?
            // rw/rp = tw/tv => tw = (tv * rw) / rp
            result = (tv * rw) / rp;
        } else {
            // What price for weight tv?
            // rw/rp = tv/tp => tp = (tv * rp) / rw
            result = (tv * rp) / rw;
        }

        // Precision handling
        const displayValue = result % 1 === 0 ? result.toString() : result.toFixed(3);
        finalValueDisplay.textContent = displayValue;

        // Add a little animation pop
        finalValueDisplay.classList.remove('calculated');
        void finalValueDisplay.offsetWidth; // trigger reflow
        finalValueDisplay.classList.add('calculated');
    }

    // Event Listeners for inputs
    [refWeightInput, refPriceInput, targetValueInput].forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Initial calculation
    calculate();
});
