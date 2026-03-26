import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
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
        lineTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        variant: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: false,
        collection: "order_items",
    }
);

const OrderItem = mongoose.model("OrderItem", orderItemSchema);

export default OrderItem;