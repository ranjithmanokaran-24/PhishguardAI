
const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://phishguardai-2.onrender.com";

function backendConnectionError() {
    return `Cannot reach the backend at ${API_BASE_URL}. Check that the Render Web Service is live, then try again.`;
}

async function requestPrediction(path, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || "The scan request failed.");
    }
    return data;
}

function showPrediction(result, data) {
    if (data.source === "trusted_domain") {
        result.textContent = `Recognized trusted domain: ${data.matched_domain}. This checks the domain only, not the page or redirects.`;
        return;
    }

    const label = String(data.prediction);
    const normalized = label.toLowerCase();
    let summary = label;

    if (/scam|phish|spam|malicious|suspicious/.test(normalized)) {
        summary = "Potentially unsafe";
    } else if (/legitimate|ham|benign|safe/.test(normalized)) {
        summary = "Likely legitimate";
    }

    const confidence = data.probabilities?.[label];
    result.textContent = confidence === undefined
        ? `Model result: ${summary} (${label}).`
        : `Model result: ${summary} (${label}), ${(confidence * 100).toFixed(1)}% confidence.`;
}

// Show the SMS detection form
function showSMS() {
    document.getElementById("sms-panel").hidden = false;
    document.getElementById("url-panel").hidden = true;

    document.getElementById("sms-panel").scrollIntoView({
        behavior: "smooth"
    });
}

// Show the URL detection form
function showURL() {
    document.getElementById("url-panel").hidden = false;
    document.getElementById("sms-panel").hidden = true;

    document.getElementById("url-panel").scrollIntoView({
        behavior: "smooth"
    });
}

// Check SMS input
async function checkSMS() {
    const message = document.getElementById("sms-input").value.trim();
    const result = document.getElementById("sms-result");

    if (message === "") {
        result.textContent = "Please enter an SMS message.";
        return;
    }

    result.textContent = "Checking message...";
    try {
        const data = await requestPrediction("/predict-message", { message });
        showPrediction(result, data);
    } catch (error) {
        result.textContent = error.message.includes("Failed to fetch")
            ? backendConnectionError()
            : error.message;
    }
}

// Check URL input
async function checkURL() {
    const urlText = document.getElementById("url-input").value.trim();
    const result = document.getElementById("url-result");

    if (urlText === "") {
        result.textContent = "Please enter a website URL.";
        return;
    }

    try {
        const parsedURL = new URL(urlText);

        if (parsedURL.protocol !== "http:" &&
            parsedURL.protocol !== "https:") {
            result.textContent = "Please enter a valid HTTP or HTTPS URL.";
            return;
        }

        result.textContent = "Checking URL...";
        requestPrediction("/predict", { url: parsedURL.href })
            .then(data => showPrediction(result, data))
            .catch(error => {
                result.textContent = error.message.includes("Failed to fetch")
                    ? backendConnectionError()
                    : error.message;
            });

    } catch (error) {
        result.textContent = "Please enter a valid URL.";
    }
}
