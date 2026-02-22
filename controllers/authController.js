const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const transporter = require("../config/nodemailer");

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      msg: "Missing Details",
    });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, msg: "User already exists." });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = new userModel({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Sending welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Our Website",
      text: `
      Hi there,

      Welcome to our website! 🎉
      We’re excited to have you on board.

      Your account has been successfully created using this email address. You can now log in and start exploring all the features and services we offer.

      If you ever need help or have any questions, feel free to reach out to us — we’re always happy to help.

      Thanks for joining us, and welcome to the journey!

      Best regards,
      The Team
      `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(201)
      .json({ success: true, msg: "User registered successfully." });
  } catch (error) {
    res.json({
      success: false,
      msg: error.message,
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      msg: "Email and password are required!",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid Credentials!" });
    }

    const isMatch = await bcryptjs.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid Credentials!" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    res.json({ success: false, msg: error.message });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ success: true, msg: "Logged Out" });
  } catch (error) {
    return res.status(400).json({ success: false, msg: "Server Error" });
  }
};

const sendVerifyOtp = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId);

    if (user.isAccountVerified) {
      return res
        .status(409)
        .json({ success: false, msg: "Account is already verified." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify Your Email",
      text: `
      Hi ${user.name},

      Thanks for signing up for User Auth!
      Your verification code is:

      ${otp}

      This code will expire in 24 hours.
      If you didn’t create this account, you can ignore this email.

      Thanks,
      User Authentication Team
      `,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ success: true, msg: "Verification OTP is Sent on Email" });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

const verifyEmail = async (req, res) => {
  const { otp } = req.body;
  const userId = req.user.id;

  if (!userId || !otp) {
    return res.status(400).json({ success: false, msg: "Missing Details" });
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.verifyOtp === "" || user.verifyOtp !== otp) {
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(410).json({ success: false, msg: " OTP Expired" });
    }

    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;

    await user.save();
    res
      .status(200)
      .json({ success: true, msg: "Email Verified Successfully." });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

const isAuthenticated = async (req, res) => {
  try {
    return res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, msg: error.message });
  }
};

const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, msg: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, msg: "User not found!" });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify Your Email",
      text: `
     Hi ${user.name},

      We received a request to reset the password for your User Auth account.

      Your password reset verification code is:

      ${otp}

      This code will expire in 15 minutes.

      If you didn’t request a password reset, please ignore this email—your account will remain secure.

      Thanks,
      User Authentication Team
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, msg: "Otp sent to your email" });
  } catch (error) {
    return res.status(500).json({ success: false, msg: error.message });
  }
};

// Reset user password
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      msg: "Email, OTP and New password are required",
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.json({ success: false, msg: "Invalid OTP" });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({ success: false, msg: "OTP Expired" });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();

    return res.json({
      success: true,
      msg: "Password has been reset successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, msg: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  sendVerifyOtp,
  verifyEmail,
  isAuthenticated,
  sendResetOtp,
  resetPassword,
};
