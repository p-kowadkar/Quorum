KNOWN_FIX = """
// Configurable timeout for payment gateway calls
const GATEWAY_TIMEOUT_MS = parseInt(process.env.GATEWAY_TIMEOUT_MS || "5000", 10);

async function processPayment(cart, paymentDetails) {
    if (!cart || cart.items.length === 0) {
        throw new Error("Cannot process payment for empty cart");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

    try {
        const response = await fetch(process.env.PAYMENT_GATEWAY_URL + "/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: cart.total, ...paymentDetails }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Gateway error ${response.status}: ${err.message || "unknown"}`);
        }

        return await response.json();
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Payment gateway timed out after ${GATEWAY_TIMEOUT_MS}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}
"""
