import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        productName: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        variant: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        customerName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["pending", "shipping", "completed", "cancelled"],
            default: "pending",
        },
        paymentMethod: {
            type: String,
            enum: ["cod", "bank", "ewallet", "qr"],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid"],
            default: "unpaid",
        },
        shippingMethod: {
            type: String,
            enum: ["standard", "express"],
            default: "standard",
        },
        items: {
            type: [orderItemSchema],
            default: [],
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        shippingFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "orders",
    }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;