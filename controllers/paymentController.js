import axios from "axios";
import User from "../models/User.js"; // Adjust the path to your User schema file

export const verifyUpgradePayment = async (req, res) => {
  try {
    const { reference } = req.body;

    // 1. Enforce payload data validation
    if (!reference) {
      return res
        .status(400)
        .json({ message: "Transaction reference token is required." });
    }

    // 2. Query Paystack's server to confirm the transaction status
    // Inside controllers/paymentController.js -> verifyUpgradePayment

    const paystackResponse = await axios.get(`https://paystack.co{reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
        // ─── ADD THESE BROWSING HEADERS TO BYPASS CLOUDFLARE ───
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "cache-control": "no-cache",
      },
    });

    const { status, data } = paystackResponse.data;

    // 3. Verify if Paystack processed the charge successfully
    if (!status || data.status !== "success") {
      return res.status(400).json({
        message: "Payment verification failed. Transaction was not successful.",
      });
    }

    // 4. (Optional Safety Check) Ensure the transaction amount matches your expected upgrade price
    // Note: Paystack operates in minor units (e.g., 5000 Kobo/Pesewas = 50.00 Currency Units)
    // const expectedAmount = 5000;
    // if (data.amount !== expectedAmount) { return res.status(400).json({ message: "Amount mismatch." }); }

    // 5. Update the user account tier/role inside MongoDB
    // req.user._id is provided by your existing 'protect' authentication middleware
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        isPremiumStudent: true, // Or role: "premium", depending on your database design
        upgradeTransactionReference: reference,
      },
      { new: true }, // Returns the newly modified document mapping fields back instantly
    ).select("-password"); // Safeguard: exclude password string from delivery payload

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "Authenticated user record not found." });
    }

    // 6. Return successful response with the upgraded profile parameters back to the mobile app
    return res.status(200).json({
      message: "Account upgraded successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "❌ Paystack Verification Error Container:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message:
        error.response?.data?.message ||
        "Internal transaction processing verification failure.",
    });
  }
};

// POST /api/payments/initialize-upgrade
export const initializeUpgradePayment = async (req, res) => {
  try {
    // 1. Paystack operates in minor units (e.g., Currency * 100)
    // If your upgrade costs 50 GHS/NGN, you must send 5000
    const amountInMinorUnits = 50 * 100;

    // 2. Call Paystack's server API to generate a fresh dynamic session
    // Inside controllers/paymentController.js -> initializeUpgradePayment

    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: amountInMinorUnits,
        callback_url: "https://paystack.co",
        metadata: {
          userId: req.user._id,
          purpose: "account_upgrade",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
          // ─── ADD THESE BROWSING HEADERS TO BYPASS CLOUDFLARE ───
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "cache-control": "no-cache",
        },
      },
    );

    const { status, data } = paystackResponse.data;

    if (!status || !data.authorization_url) {
      return res
        .status(400)
        .json({ message: "Failed to generate Paystack checkout session." });
    }

    // 3. Return the authorization url and unique reference token back to your React Native app
    return res.status(200).json({
      checkoutUrl: data.authorization_url,
      reference: data.reference,
    });
  } catch (error) {
    console.error(
      "❌ Paystack Initialization Failed:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      message:
        error.response?.data?.message ||
        "Internal server initialization error.",
    });
  }
};
