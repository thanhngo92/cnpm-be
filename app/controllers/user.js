import User from "../schema/user.js";

export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách user",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy thông tin user",
    });
  }
};

export const updateCurrentUser = async (req, res) => {
  try {
    const { name, phone, address, password } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Tên không được để trống",
        });
      }
      user.name = name.trim();
    }

    if (phone !== undefined) {
      if (!phone.trim()) {
        return res.status(400).json({
          message: "Số điện thoại không được để trống",
        });
      }
      user.phone = phone.trim();
    }

    if (address !== undefined) {
      user.address = address.trim();
    }

    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi cập nhật user",
    });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const { name, phone, address } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Tên không được để trống" });
      }
      user.name = name.trim();
    }
    if (phone !== undefined) {
      if (!phone.trim()) {
        return res.status(400).json({ message: "Số điện thoại không được để trống" });
      }
      user.phone = phone.trim();
    }
    if (address !== undefined) {
      user.address = address.trim();
    }

    await user.save();

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server khi cập nhật user" });
  }
};

export const deleteUserById = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Xóa user thành công",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi xóa user",
    });
  }
};