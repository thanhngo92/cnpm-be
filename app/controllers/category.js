import Category from "../schema/category.js";
import Product from "../schema/product.js";

const slugify = (text) => {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const mapCategory = (category) => ({
  id: category._id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  imageUrl: category.imageUrl,
  isActive: category.isActive,
});

const isAdmin = (req) => req.user?.role === "admin";

/**
 * PUBLIC
 * GET /categories
 */
export const getPublicCategories = async (req, res) => {
  try {
    // Chỉ lấy các danh mục đang hoạt động và có ít nhất 1 sản phẩm đang hoạt động
    const categoriesWithActiveProducts = await Product.distinct("categoryId", { isActive: true });
    
    const categories = await Category.find({ 
      _id: { $in: categoriesWithActiveProducts },
      isActive: true 
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      categories: categories.map(mapCategory),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách danh mục",
    });
  }
};

/**
 * PUBLIC
 * GET /categories/:categorySlug
 */
export const getPublicCategoryDetail = async (req, res) => {
  try {
    const { categorySlug } = req.params;

    const category = await Category.findOne({
      slug: categorySlug,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        message: "Không tìm thấy danh mục",
      });
    }

    return res.status(200).json({
      category: mapCategory(category),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy chi tiết danh mục",
    });
  }
};

/**
 * ADMIN
 * GET /categories/admin/list
 */
export const getAdminCategories = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { search, status, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Number(limit) || 20, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    if (search) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Category.countDocuments(query),
    ]);

    return res.status(200).json({
      categories: categories.map(mapCategory),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách danh mục quản trị",
    });
  }
};

/**
 * ADMIN
 * GET /categories/admin/:id
 */
export const getAdminCategoryDetail = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Không tìm thấy danh mục",
      });
    }

    return res.status(200).json({
      category: mapCategory(category),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy chi tiết danh mục quản trị",
    });
  }
};

/**
 * ADMIN
 * POST /categories/admin
 */
export const createCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { name, description, imageUrl, isActive } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin danh mục",
      });
    }

    const slug = slugify(name);

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(409).json({
        message: "Slug danh mục đã tồn tại",
      });
    }

    const newCategory = await Category.create({
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      imageUrl: imageUrl.trim(),
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    return res.status(201).json({
      message: "Tạo danh mục thành công",
      category: mapCategory(newCategory),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi tạo danh mục",
    });
  }
};

/**
 * ADMIN
 * PATCH /categories/admin/:id
 */
export const updateCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { name, description, imageUrl, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Không tìm thấy danh mục",
      });
    }

    if (name !== undefined) {
      const nextName = name.trim();
      const nextSlug = slugify(nextName);

      const existingCategory = await Category.findOne({
        slug: nextSlug,
        _id: { $ne: category._id },
      });

      if (existingCategory) {
        return res.status(409).json({
          message: "Slug danh mục đã tồn tại",
        });
      }

      category.name = nextName;
      category.slug = nextSlug;
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (imageUrl !== undefined) {
      category.imageUrl = imageUrl.trim();
    }

    if (isActive !== undefined) {
      category.isActive = isActive === true || isActive === "true";
    }

    await category.save();

    return res.status(200).json({
      message: "Cập nhật danh mục thành công",
      category: mapCategory(category),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi cập nhật danh mục",
    });
  }
};

/**
 * ADMIN
 * PATCH /categories/admin/:id/status
 */
export const updateCategoryStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        message: "Thiếu trạng thái danh mục",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Không tìm thấy danh mục",
      });
    }

    category.isActive = isActive === true || isActive === "true";
    await category.save();

    return res.status(200).json({
      message: "Cập nhật trạng thái danh mục thành công",
      category: mapCategory(category),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi cập nhật trạng thái danh mục",
    });
  }
};

/**
 * ADMIN
 * DELETE /categories/admin/:id
 */
export const deleteCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Không tìm thấy danh mục",
      });
    }

    const hasProducts = await Product.findOne({ categoryId: category._id });

    if (hasProducts) {
      return res.status(400).json({
        message: "Không thể xóa danh mục đang có sản phẩm",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Xóa danh mục thành công",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi xóa danh mục",
    });
  }
};