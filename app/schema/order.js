import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        receiverName: {
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
        orderStatus: {
            type: String,
            enum: ["pending", "shipping", "completed", "cancelled"],
            default: "pending",
        },
        paymentMethod: {
            type: String,
            enum: ["cod", "bank", "ewallet", "qr"],
            required: true,
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
    },
    {
        timestamps: true,
        collection: "orders",
    }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
