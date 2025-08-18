import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found while generating tokens");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new Error("Unable to generate refresh and access token");
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password,phoneNumber, role } = req.body;
    if (
      [name, email, password,phoneNumber].some((field) => field?.trim() === "")
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All field is required" });
    }

    const checkUser = await User.findOne({ email: email });

    if (checkUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists!" });
    }

    const user = await User.create({
      name,
      email,
      password,
    phoneNumber,
      role,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken "
    );

    if (!createdUser) {
      return res.status(400).json({
        success: false,
        message: "Unable to create user",
      });
    }

    return res.status(201).json({
      success: true,
      message: "User registered Successfully!",
      data: createdUser,
    });
  } catch (error) {
    console.log("Error in register function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(404)
        .json({ success: false, message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isPassValid = await user.isPasswordCorrect(password);

    if (!isPassValid) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password" });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshTokenphoneNumber"
    );
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: "User logged in successfully!",
        user: loggedInUser,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
  } catch (error) {
    console.log("Error in login function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password -refreshToken");
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in Auth function", error);
    return res.status(404).json({ success: false, message: "User not found" });
  }
};

// Logout User : /api/user/logout

export const logoutUser = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(400).json({ message: "User is not authenticated" });
    }

    await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      { new: true }
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        success: true,
        message: "User logged out successfully!",
      });
  } catch (error) {
    console.log("Error in logout function", error);
    return res
      .status(404)
      .json({ success: false, message: "Error logging out user" });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is not recieved!" });
    }
    const decode = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY
    );
    if (!decode) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Refresh token" });
    }
    const user = await User.findById(decode?._id).select(
      " -phoneNumber -password "
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User doesn't exist or invalid refresh token",
      });
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is expired or Invalid",
      });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: "Access token is refreshed",
        user,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    console.log("Error in refrechAcessToken function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || !oldPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Old and new password is required" });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User is not authenticated" });
    }

    const user = await User.findById(userId);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Password is invalid" });
    }

    user.password = newPassword;
    await user.save({
      validateBeforeSave: false,
    });
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in updatePassword function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updateAccountDetails = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const changes = {};
    if (name) {
      changes.name = name;
    }
    if (phoneNumber) {
      changes.phoneNumber = phoneNumber;
    }

    if (!name && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "At least 1 field is required for the update",
      });
    }
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User is not authenticated" });
    }
    const updatedUser = await User.findByIdAndUpdate(userId, changes, {
      new: true,
    }).select(" -password ");
    if (!updatedUser) {
      return res
        .status(400)
        .json({ success: false, message: "unable to update the details" });
    }
    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Details updated successfully",
    });
  } catch (error) {
    console.log("Error in updateAccountDetails function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User id is required" });
    }
    const updateRole = await User.findByIdAndUpdate(
      userId,
      {
        role: "Admin",
      },
      { new: true }
    );

    if (!updateRole) {
      return res
        .status(404)
        .json({ success: false, message: "User with the given id not found" });
    }
    return res.status(200).json({
      success: true,
      data: updateRole,
      message: "User role updated successfully",
    });
  } catch (error) {
    console.log("Error in updateAccountDetails function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};
