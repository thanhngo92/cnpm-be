import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        brand: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        discountPrice: {
            type: Number,
            min: 0,
            default: null,
        },

        stock: {
            type: Number,
            required: true,
            min: 0,
        },

        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "products",
    }
);

productSchema.index({ categoryId: 1, slug: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);

export default Product;