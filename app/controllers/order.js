import mongoose from "mongoose";
import Order from "../schema/order.js";
import Product from "../schema/product.js";

const FREE_SHIP_THRESHOLD = 500000;
const SHIPPING_FEE_BY_METHOD = {
    standard: 30000,
    express: 50000,
};

const generateOrderCode = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);

    return `GLU-${yyyy}${mm}${dd}-${random}`;
};

const mapOrder = (order) => ({
    id: order._id,
    code: order.code,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    createdAt: order.createdAt,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    shippingMethod: order.shippingMethod,
    items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        price: item.price,
        quantity: item.quantity,
        ...(item.variant ? { variant: item.variant } : {}),
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    ...(order.note ? { note: order.note } : {}),
    userId: order.userId ?? null,
});

const isAdmin = (req) => req.user?.role === "admin";

const canAccessOrder = (req, order) => {
    if (isAdmin(req)) return true;
    return String(order.userId) === String(req.user?._id);
};

const restoreOrderItemsStock = async (items) => {
    for (const item of items) {
        await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
        });
    }
};

const normalizeShippingMethod = (value) =>
    value === "express" ? "express" : "standard";

const isValidShippingMethod = (value) =>
    value === undefined || value === "standard" || value === "express";

const calcShippingFee = (method, subtotal) => {
    if (subtotal >= FREE_SHIP_THRESHOLD) {
        return 0;
    }

    return SHIPPING_FEE_BY_METHOD[method] ?? SHIPPING_FEE_BY_METHOD.standard;
};

export const getOrdersForAdmin = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                message: "Bạn không có quyền truy cập",
            });
        }

        const { status, paymentStatus, page = 1, limit = 20 } = req.query;

        const parsedPage = Math.max(Number(page) || 1, 1);
        const parsedLimit = Math.max(Number(limit) || 20, 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const query = {};

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const [orders, total] = await Promise.all([
            Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
            Order.countDocuments(query),
        ]);

        return res.status(200).json({
            orders: orders.map(mapOrder),
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit),
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi lấy danh sách đơn hàng",
        });
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            orders: orders.map(mapOrder),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi lấy đơn hàng của bạn",
        });
    }
};

export const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng",
            });
        }

        if (!canAccessOrder(req, order)) {
            return res.status(403).json({
                message: "Bạn không có quyền truy cập đơn hàng này",
            });
        }

        return res.status(200).json({
            order: mapOrder(order),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi lấy chi tiết đơn hàng",
        });
    }
};

export const createOrder = async (req, res) => {
    try {
        const {
            paymentMethod,
            items,
            shippingMethod,
            note,
        } = req.body;

        // Bắt buộc lấy thông tin từ Profile (không cho phép client gửi thông tin khác)
        const customerName = req.user.name;
        const phone = req.user.phone;
        const address = req.user.address;

        if (
            !customerName ||
            !phone ||
            !address ||
            !paymentMethod ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message: "Vui lòng cập nhật đầy đủ thông tin (Họ tên, SĐT, Địa chỉ) trong hồ sơ cá nhân trước khi đặt hàng",
            });
        }

        if (!["cod", "bank", "ewallet", "qr"].includes(paymentMethod)) {
            return res.status(400).json({
                message: "Phương thức thanh toán không hợp lệ",
            });
        }

        const normalizedCustomerName = String(customerName).trim();
        const normalizedPhone = String(phone).trim();
        const normalizedAddress = String(address).trim();

        if (!normalizedCustomerName || !normalizedPhone || !normalizedAddress) {
            return res.status(400).json({
                message: "Thông tin người nhận không hợp lệ",
            });
        }

        if (!isValidShippingMethod(shippingMethod)) {
            return res.status(400).json({
                message: "Phương thức giao hàng không hợp lệ",
            });
        }

        const normalizedShippingMethod = normalizeShippingMethod(shippingMethod);

        const normalizedItems = [];
        let subtotal = 0;

        for (const item of items) {
            if (!item.productId || !item.quantity) {
                return res.status(400).json({
                    message: "Dữ liệu sản phẩm trong đơn hàng không hợp lệ",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                return res.status(400).json({
                    message: "productId không hợp lệ",
                });
            }

            const product = await Product.findById(item.productId).populate(
                "categoryId",
                "name slug imageUrl isActive"
            );

            if (!product) {
                return res.status(404).json({
                    message: "Có sản phẩm không tồn tại",
                });
            }

            if (!product.isActive) {
                return res.status(400).json({
                    message: `Sản phẩm ${product.name} hiện không khả dụng`,
                });
            }

            if (product.categoryId && product.categoryId.isActive === false) {
                return res.status(400).json({
                    message: `Danh mục của sản phẩm ${product.name} hiện không khả dụng`,
                });
            }

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    message: "Số lượng sản phẩm không hợp lệ",
                });
            }

            if (product.stock < quantity) {
                return res.status(400).json({
                    message: `Sản phẩm ${product.name} không đủ tồn kho`,
                });
            }

            const unitPrice =
                product.discountPrice && product.discountPrice > 0
                    ? product.discountPrice
                    : product.price;

            subtotal += unitPrice * quantity;

            normalizedItems.push({
                productId: product._id,
                productName: product.name,
                imageUrl: product.imageUrl,
                price: unitPrice,
                quantity,
                variant: item.variant?.trim() || "",
            });
        }

        const finalShippingFee = calcShippingFee(normalizedShippingMethod, subtotal);
        const totalAmount = subtotal + finalShippingFee;

        const newOrder = await Order.create({
            code: generateOrderCode(),
            customerName: normalizedCustomerName,
            phone: normalizedPhone,
            address: normalizedAddress,
            paymentMethod,
            paymentStatus: "unpaid",
            shippingMethod: normalizedShippingMethod,
            items: normalizedItems,
            subtotal,
            shippingFee: finalShippingFee,
            totalAmount,
            note: note?.trim() || "",
            userId: req.user._id,
        });

        for (const item of normalizedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity },
            });
        }

        return res.status(201).json({
            message: "Tạo đơn hàng thành công",
            order: mapOrder(newOrder),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi tạo đơn hàng",
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                message: "Bạn không có quyền truy cập",
            });
        }

        const { customerName, phone, status, paymentStatus } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng",
            });
        }

        let previousStatus = order.status;

        if (status !== undefined) {
            if (!["pending", "shipping", "completed", "cancelled"].includes(status)) {
                return res.status(400).json({
                    message: "Trạng thái đơn hàng không hợp lệ",
                });
            }

            const currentStatus = order.status;
            previousStatus = currentStatus;

            const allowedTransitions = {
                pending: ["shipping", "cancelled"],
                shipping: ["completed"],
                completed: [],
                cancelled: [],
            };

            if (
                status !== currentStatus &&
                !allowedTransitions[currentStatus]?.includes(status)
            ) {
                return res.status(400).json({
                    message: "Không thể chuyển trạng thái đơn hàng như yêu cầu",
                });
            }

            order.status = status;
        }

        if (paymentStatus !== undefined) {
            if (!["unpaid", "paid"].includes(paymentStatus)) {
                return res.status(400).json({
                    message: "Trạng thái thanh toán không hợp lệ",
                });
            }

            order.paymentStatus = paymentStatus;
        }

        if (customerName !== undefined) {
            const normalizedCustomerName = String(customerName).trim();

            if (!normalizedCustomerName) {
                return res.status(400).json({
                    message: "Tên khách hàng không được để trống",
                });
            }

            order.customerName = normalizedCustomerName;
        }

        if (phone !== undefined) {
            const normalizedPhone = String(phone).trim();

            if (!normalizedPhone) {
                return res.status(400).json({
                    message: "Số điện thoại không được để trống",
                });
            }

            order.phone = normalizedPhone;
        }

        await order.save();

        if (status === "cancelled" && previousStatus !== "cancelled") {
            await restoreOrderItemsStock(order.items);
        }

        return res.status(200).json({
            message: "Cập nhật đơn hàng thành công",
            order: mapOrder(order),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi cập nhật đơn hàng",
        });
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng",
            });
        }

        if (!canAccessOrder(req, order)) {
            return res.status(403).json({
                message: "Bạn không có quyền thao tác đơn hàng này",
            });
        }

        if (!["pending"].includes(order.status)) {
            return res.status(400).json({
                message: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
            });
        }

        order.status = "cancelled";
        await order.save();

        await restoreOrderItemsStock(order.items);

        return res.status(200).json({
            message: "Hủy đơn hàng thành công",
            order: mapOrder(order),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi hủy đơn hàng",
        });
    }
};
