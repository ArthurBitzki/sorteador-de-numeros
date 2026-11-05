const drawForm = document.querySelector("#draw-form");
const drawQuantityInput = document.querySelector("#draw-quantity");
const drawMinimumInput = document.querySelector("#draw-minimum");
const drawMaximumInput = document.querySelector("#draw-maximum");
const drawResults = document.querySelector("#draw-results");
const resultList = document.querySelector("#result-numbers");
const resultIndex = document.querySelector("#result-index");
const drawAgainButton = document.querySelector("#draw-again-button");

const initialResultOutputs = [
    document.querySelector("#result-number-1"),
    document.querySelector("#result-number-2"),
];

const MAX_DRAW_COUNT = 1000;
const DRAW_ANIMATION_DURATION = 900;
const DRAW_ANIMATION_INTERVAL = 60;

let currentResults = [];
let animationTimerId = null;
let isDrawing = false;
let completedDrawCount = 0;

resultIndex.hidden = true;

drawForm.noValidate = true;

function getFieldValue(input, label) {
    const rawValue = input.value.trim();

    if (input.validity.badInput || rawValue === "") {
        return { error: `Informe ${label}.` };
    }

    const value = input.valueAsNumber;

    if (!Number.isFinite(value)) {
        return { error: `Informe um valor válido para ${label}.` };
    }

    if (!Number.isInteger(value)) {
        return { error: `${label} deve ser um número inteiro.` };
    }

    if (!Number.isSafeInteger(value)) {
        return { error: `${label} deve estar dentro do limite de inteiros seguros.` };
    }

    return { value };
}

function readDrawConfiguration() {
    const quantity = getFieldValue(drawQuantityInput, "a quantidade");

    if (quantity.error) {
        return { input: drawQuantityInput, error: quantity.error };
    }

    const minimum = getFieldValue(drawMinimumInput, "o número mínimo");

    if (minimum.error) {
        return { input: drawMinimumInput, error: minimum.error };
    }

    const maximum = getFieldValue(drawMaximumInput, "o número máximo");

    if (maximum.error) {
        return { input: drawMaximumInput, error: maximum.error };
    }

    if (quantity.value < 1) {
        return {
            input: drawQuantityInput,
            error: "A quantidade de números deve ser maior que zero.",
        };
    }

    if (quantity.value > MAX_DRAW_COUNT) {
        return {
            input: drawQuantityInput,
            error: `A quantidade máxima por sorteio é ${MAX_DRAW_COUNT.toLocaleString("pt-BR")} números.`,
        };
    }

    if (minimum.value > maximum.value) {
        return {
            input: drawMaximumInput,
            error: "O número máximo deve ser igual ou maior que o número mínimo.",
        };
    }

    const rangeSize = maximum.value - minimum.value + 1;

    if (!Number.isSafeInteger(rangeSize)) {
        return {
            input: drawMaximumInput,
            error: "O intervalo é grande demais. Reduza a diferença entre o mínimo e o máximo.",
        };
    }

    const avoidRepeat = document.querySelector("#avoid-repeat").checked;

    if (avoidRepeat && quantity.value > rangeSize) {
        return {
            input: drawQuantityInput,
            error: `Esse intervalo permite no máximo ${rangeSize.toLocaleString("pt-BR")} números sem repetição.`,
        };
    }

    return {
        value: {
            quantity: quantity.value,
            minimum: minimum.value,
            maximum: maximum.value,
            rangeSize,
            avoidRepeat,
        },
    };
}

function validateDrawConfiguration() {
    const inputs = [drawQuantityInput, drawMinimumInput, drawMaximumInput];
    inputs.forEach((input) => input.setCustomValidity(""));

    const configuration = readDrawConfiguration();

    if (configuration.error) {
        configuration.input.setCustomValidity(configuration.error);
        configuration.input.reportValidity();
        return null;
    }

    return configuration.value;
}

function getRandomOffset(rangeSize) {
    return Math.min(
        Math.floor(Math.random() * rangeSize),
        rangeSize - 1,
    );
}

function generateDrawResults(configuration) {
    const { quantity, minimum, rangeSize, avoidRepeat } = configuration;
    const results = [];

    if (!avoidRepeat) {
        for (let index = 0; index < quantity; index += 1) {
            results.push(minimum + getRandomOffset(rangeSize));
        }

        return results;
    }

    const remainingOffsets = new Map();

    for (let index = 0; index < quantity; index += 1) {
        const remainingCount = rangeSize - index;
        const selectedIndex = index + getRandomOffset(remainingCount);
        const selectedOffset = remainingOffsets.get(selectedIndex) ?? selectedIndex;
        const currentOffset = remainingOffsets.get(index) ?? index;

        remainingOffsets.set(selectedIndex, currentOffset);
        remainingOffsets.set(index, selectedOffset);
        results.push(minimum + selectedOffset);
    }

    return results;
}

function renderResults(values) {
    const outputs = values.map((value, index) => {
        const output = initialResultOutputs[index] ?? document.createElement("output");
        output.className = "result-number";
        output.id = `result-number-${index + 1}`;
        output.value = value === null ? "" : String(value);
        output.textContent = value === null ? "" : String(value);

        const item = document.createElement("li");
        item.append(output);
        return item;
    });

    resultList.replaceChildren(...outputs);
}

function finishDraw() {
    if (animationTimerId !== null) {
        window.clearInterval(animationTimerId);
        animationTimerId = null;
    }

    renderResults(currentResults);
    completedDrawCount += 1;
    resultIndex.textContent = String(completedDrawCount);
    resultIndex.hidden = completedDrawCount < 2;
    drawResults.classList.remove("is-animating");
    drawResults.removeAttribute("aria-busy");
    drawAgainButton.hidden = false;
    isDrawing = false;
}

function animateResults(configuration) {
    const resultCount = currentResults.length;
    const animationStart = performance.now();

    renderResults(currentResults.map(() => null));
    drawAgainButton.hidden = true;
    drawResults.classList.add("is-animating");
    drawResults.setAttribute("aria-busy", "true");
    drawForm.hidden = true;
    drawResults.hidden = false;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishDraw();
        return;
    }

    animationTimerId = window.setInterval(() => {
        const elapsed = performance.now() - animationStart;

        if (elapsed >= DRAW_ANIMATION_DURATION) {
            finishDraw();
            return;
        }

        const revealedCount = Math.floor(
            (elapsed / DRAW_ANIMATION_DURATION) * resultCount,
        );
        const animatedValues = currentResults.map((value, index) => (
            index < revealedCount
                ? value
                : configuration.minimum + getRandomOffset(configuration.rangeSize)
        ));

        renderResults(animatedValues);
    }, DRAW_ANIMATION_INTERVAL);
}

function startDraw() {
    if (isDrawing) {
        return;
    }

    const configuration = validateDrawConfiguration();

    if (!configuration) {
        return;
    }

    currentResults = generateDrawResults(configuration);
    isDrawing = true;
    animateResults(configuration);
}

drawForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startDraw();
});

drawAgainButton.addEventListener("click", startDraw);

[drawQuantityInput, drawMinimumInput, drawMaximumInput].forEach((input) => {
    input.addEventListener("input", () => input.setCustomValidity(""));
});
