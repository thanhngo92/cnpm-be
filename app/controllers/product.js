import Product from "../schema/product.js";
import Category from "../schema/category.js";

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

const mapProduct = (product) => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  brand: product.brand,
  description: product.description,
  price: product.price,
  discountPrice: product.discountPrice ?? null,
  stock: product.stock,
  imageUrl: product.imageUrl,
  isActive: product.isActive,
  categoryId: product.categoryId?._id || product.categoryId,
  category:
    product.categoryId && typeof product.categoryId === "object"
      ? {
          id: product.categoryId._id,
          name: product.categoryId.name,
          slug: product.categoryId.slug,
          imageUrl: product.categoryId.imageUrl,
        }
      : null,
});

const isAdmin = (req) => req.user?.role === "admin";

/**
 * PUBLIC
 * GET /products
 * Query hỗ trợ:
 * ?category=nuoc-hoa
 * ?search=rose
 * ?onSale=true
 * ?page=1
 * ?limit=12
 */
export const getPublicProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      onSale,
      page = 1,
      limit = 12,
    } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Number(limit) || 12, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {
      isActive: true,
    };

    // Luôn lọc theo category đang hoạt động
    const activeCategories = await Category.find({ isActive: true }).select("_id");
    const activeCategoryIds = activeCategories.map((c) => c._id);
    query.categoryId = { $in: activeCategoryIds };

    if (search) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    if (onSale === "true") {
      query.discountPrice = { $gt: 0 };
    } else if (onSale === "false") {
      query.$or = [
        { discountPrice: null },
        { discountPrice: 0 },
        { discountPrice: { $exists: false } }
      ];
    }

    if (category) {
      const foundCategory = await Category.findOne({
        slug: category,
        isActive: true,
      }).select("_id");

      if (!foundCategory) {
        return res.status(200).json({
          products: [],
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      query.categoryId = foundCategory._id;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name slug imageUrl isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      products: products.map(mapProduct),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách sản phẩm",
    });
  }
};

/**
 * PUBLIC
 * GET /products/:productSlug
 */
export const getPublicProductDetail = async (req, res) => {
  try {
    const { productSlug } = req.params;

    const product = await Product.findOne({
      slug: productSlug,
      isActive: true,
    }).populate("categoryId", "name slug imageUrl isActive");

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    if (product.categoryId && product.categoryId.isActive === false) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm do danh mục đã ngừng hoạt động",
      });
    }

    return res.status(200).json({
      product: mapProduct(product),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy chi tiết sản phẩm",
    });
  }
};

/**
 * ADMIN
 * GET /products/admin/list
 */
export const getAdminProducts = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { search, category, status, page = 1, limit = 20 } = req.query;

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

    if (category) {
      const foundCategory = await Category.findOne({ slug: category }).select("_id");
      if (foundCategory) {
        query.categoryId = foundCategory._id;
      } else {
        return res.status(200).json({
          products: [],
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name slug imageUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      products: products.map(mapProduct),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách sản phẩm quản trị",
    });
  }
};

/**
 * ADMIN
 * GET /products/admin/:id
 */
export const getAdminProductDetail = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const product = await Product.findById(req.params.id).populate(
      "categoryId",
      "name slug imageUrl"
    );

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      product: mapProduct(product),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi lấy chi tiết sản phẩm quản trị",
    });
  }
};

/**
 * ADMIN
 * POST /products/admin
 */
export const createProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const {
      name,
      brand,
      description,
      price,
      discountPrice,
      stock,
      imageUrl,
      categoryId,
      isActive,
    } = req.body;

    if (
      !name ||
      !brand ||
      !description ||
      price === undefined ||
      stock === undefined ||
      !imageUrl ||
      !categoryId
    ) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin sản phẩm",
      });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(400).json({
        message: "Danh mục không tồn tại",
      });
    }

    const slug = slugify(name);

    const existingProduct = await Product.findOne({
      slug,
      categoryId,
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "Slug sản phẩm đã tồn tại trong danh mục này",
      });
    }

    const newProduct = await Product.create({
      name: name.trim(),
      slug,
      brand: brand.trim(),
      description: description.trim(),
      price: Number(price),
      discountPrice:
        discountPrice === undefined || discountPrice === null || discountPrice === ""
          ? null
          : Number(discountPrice),
      stock: Number(stock),
      imageUrl: imageUrl.trim(),
      categoryId,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    const createdProduct = await Product.findById(newProduct._id).populate(
      "categoryId",
      "name slug imageUrl"
    );

    return res.status(201).json({
      message: "Tạo sản phẩm thành công",
      product: mapProduct(createdProduct),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi tạo sản phẩm",
    });
  }
};

/**
 * ADMIN
 * PATCH /products/admin/:id
 */
export const updateProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const {
      name,
      brand,
      description,
      price,
      discountPrice,
      stock,
      imageUrl,
      categoryId,
      isActive,
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    let nextCategoryId = product.categoryId;

    if (categoryId !== undefined) {
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(400).json({
          message: "Danh mục không tồn tại",
        });
      }

      product.categoryId = categoryId;
      nextCategoryId = categoryId;
    }

    if (name !== undefined) {
      const nextName = name.trim();
      const nextSlug = slugify(nextName);

      const existingProduct = await Product.findOne({
        slug: nextSlug,
        categoryId: nextCategoryId,
        _id: { $ne: product._id },
      });

      if (existingProduct) {
        return res.status(409).json({
          message: "Slug sản phẩm đã tồn tại trong danh mục này",
        });
      }

      product.name = nextName;
      product.slug = nextSlug;
    }

    if (brand !== undefined) product.brand = brand.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) {
      product.discountPrice =
        discountPrice === null || discountPrice === ""
          ? null
          : Number(discountPrice);
    }
    if (stock !== undefined) product.stock = Number(stock);
    if (imageUrl !== undefined) product.imageUrl = imageUrl.trim();
    if (isActive !== undefined) {
      product.isActive = isActive === true || isActive === "true";
    }

    await product.save();

    const updatedProduct = await Product.findById(product._id).populate(
      "categoryId",
      "name slug imageUrl"
    );

    return res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: mapProduct(updatedProduct),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi cập nhật sản phẩm",
    });
  }
};

/**
 * ADMIN
 * PATCH /products/admin/:id/status
 */
export const updateProductStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        message: "Thiếu trạng thái sản phẩm",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    product.isActive = isActive === true || isActive === "true";
    await product.save();

    const updatedProduct = await Product.findById(product._id).populate(
      "categoryId",
      "name slug imageUrl"
    );

    return res.status(200).json({
      message: "Cập nhật trạng thái sản phẩm thành công",
      product: mapProduct(updatedProduct),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi cập nhật trạng thái sản phẩm",
    });
  }
};

/**
 * ADMIN
 * DELETE /products/admin/:id
 */
export const deleteProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập",
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.status(200).json({
      message: "Xóa sản phẩm thành công",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server khi xóa sản phẩm",
    });
  }
};
