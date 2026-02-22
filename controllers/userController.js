const userModel = require("../models/userModel");

const getUserData = async (req, res) => {
  try {
    const userId = req.body;

    const user = await userModel.findOne(userId);

    if (!user) {
      return res.json({ success: false, msg: "User not found" });
    }

    res.json({
      success: true,
      userData: {
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (error) {
    res.json({ success: true, msg: error.message });
  }
};

module.exports = getUserData;
