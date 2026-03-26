import mongoose from "mongoose";
import Order from "../schema/order.js";
import OrderItem from "../schema/orderItem.js";
import Product from "../schema/product.js";

const FREE_SHIP_THRESHOLD = 500000;
const DEFAULT_SHIPPING_FEE = 30000;

const generateOrderCode = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);

    return `GLU-${yyyy}${mm}${dd}-${random}`;
};

const mapOrderItem = (item) => ({
    productId: item.productId,
    productName: item.productName,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
    ...(item.variant ? { variant: item.variant } : {}),
});

const mapOrder = (order, items = []) => ({
    id: order._id,
    code: order.code,
    receiverName: order.receiverName,
    phone: order.phone,
    address: order.address,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    items: items.map(mapOrderItem),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    ...(order.note ? { note: order.note } : {}),
    userId: order.userId ?? null,
});

const attachItemsToOrders = async (orders) => {
    if (orders.length === 0) {
        return [];
    }

    const orderIds = orders.map((order) => order._id);
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } }).sort({
        _id: 1,
    });

    const itemsByOrderId = new Map();

    for (const item of orderItems) {
        const key = String(item.orderId);
        const list = itemsByOrderId.get(key) ?? [];
        list.push(item);
        itemsByOrderId.set(key, list);
    }

    return orders.map((order) =>
        mapOrder(order, itemsByOrderId.get(String(order._id)) ?? [])
    );
};

const getOrderItems = async (orderId) => {
    return OrderItem.find({ orderId }).sort({ _id: 1 });
};

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

const calcShippingFee = (subtotal) => {
    if (subtotal > FREE_SHIP_THRESHOLD) {
        return 0;
    }

    return DEFAULT_SHIPPING_FEE;
};

export const getOrdersForAdmin = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({
                message: "Bạn không có quyền truy cập",
            });
        }

        const { orderStatus, page = 1, limit = 20 } = req.query;

        const parsedPage = Math.max(Number(page) || 1, 1);
        const parsedLimit = Math.max(Number(limit) || 20, 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const query = {};

        if (orderStatus) query.orderStatus = orderStatus;

        const [orders, total] = await Promise.all([
            Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
            Order.countDocuments(query),
        ]);

        const mappedOrders = await attachItemsToOrders(orders);

        return res.status(200).json({
            orders: mappedOrders,
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
        const mappedOrders = await attachItemsToOrders(orders);

        return res.status(200).json({
            orders: mappedOrders,
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

        const items = await getOrderItems(order._id);

        return res.status(200).json({
            order: mapOrder(order, items),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi lấy chi tiết đơn hàng",
        });
    }
};

export const createOrder = async (req, res) => {
    try {
        const { paymentMethod, items, note } = req.body;

        const receiverName = req.user.name;
        const phone = req.user.phone;
        const address = req.user.address;

        if (
            !receiverName ||
            !phone ||
            !address ||
            !paymentMethod ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Vui lòng cập nhật đầy đủ thông tin (Họ tên, SĐT, Địa chỉ) trong hồ sơ cá nhân trước khi đặt hàng",
            });
        }

        if (!["cod", "bank", "ewallet", "qr"].includes(paymentMethod)) {
            return res.status(400).json({
                message: "Phương thức thanh toán không hợp lệ",
            });
        }

        const normalizedReceiverName = String(receiverName).trim();
        const normalizedPhone = String(phone).trim();
        const normalizedAddress = String(address).trim();

        if (!normalizedReceiverName || !normalizedPhone || !normalizedAddress) {
            return res.status(400).json({
                message: "Thông tin người nhận không hợp lệ",
            });
        }

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
            const lineTotal = unitPrice * quantity;

            subtotal += lineTotal;

            normalizedItems.push({
                productId: product._id,
                productName: product.name,
                imageUrl: product.imageUrl,
                price: unitPrice,
                quantity,
                lineTotal,
                variant: item.variant?.trim() || "",
            });
        }

        const finalShippingFee = calcShippingFee(subtotal);
        const totalAmount = subtotal + finalShippingFee;

        const newOrder = await Order.create({
            code: generateOrderCode(),
            receiverName: normalizedReceiverName,
            phone: normalizedPhone,
            address: normalizedAddress,
            orderStatus: "pending",
            paymentMethod,
            subtotal,
            shippingFee: finalShippingFee,
            totalAmount,
            note: note?.trim() || "",
            userId: req.user._id,
        });

        const orderItems = normalizedItems.map((item) => ({
            orderId: newOrder._id,
            ...item,
        }));

        await OrderItem.insertMany(orderItems);

        for (const item of normalizedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity },
            });
        }

        return res.status(201).json({
            message: "Tạo đơn hàng thành công",
            order: mapOrder(newOrder, orderItems),
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

        const { receiverName, phone, orderStatus } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng",
            });
        }

        let previousStatus = order.orderStatus;

        if (orderStatus !== undefined) {
            if (!["pending", "shipping", "completed", "cancelled"].includes(orderStatus)) {
                return res.status(400).json({
                    message: "Trạng thái đơn hàng không hợp lệ",
                });
            }

            const currentStatus = order.orderStatus;
            previousStatus = currentStatus;

            const allowedTransitions = {
                pending: ["shipping", "cancelled"],
                shipping: ["completed"],
                completed: [],
                cancelled: [],
            };

            if (
                orderStatus !== currentStatus &&
                !allowedTransitions[currentStatus]?.includes(orderStatus)
            ) {
                return res.status(400).json({
                    message: "Không thể chuyển trạng thái đơn hàng như yêu cầu",
                });
            }

            order.orderStatus = orderStatus;
        }

        if (receiverName !== undefined) {
            const normalizedReceiverName = String(receiverName).trim();

            if (!normalizedReceiverName) {
                return res.status(400).json({
                    message: "Tên người nhận không được để trống",
                });
            }

            order.receiverName = normalizedReceiverName;
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

        const items = await getOrderItems(order._id);

        if (orderStatus === "cancelled" && previousStatus !== "cancelled") {
            await restoreOrderItemsStock(items);
        }

        return res.status(200).json({
            message: "Cập nhật đơn hàng thành công",
            order: mapOrder(order, items),
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

        if (order.orderStatus !== "pending") {
            return res.status(400).json({
                message: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
            });
        }

        order.orderStatus = "cancelled";
        await order.save();

        const items = await getOrderItems(order._id);
        await restoreOrderItemsStock(items);

        return res.status(200).json({
            message: "Hủy đơn hàng thành công",
            order: mapOrder(order, items),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi server khi hủy đơn hàng",
        });
    }
};
