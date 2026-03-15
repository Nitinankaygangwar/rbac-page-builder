import mongoose, { Schema, Document, Model } from "mongoose";

export type PageStatus = "draft" | "preview" | "published" | "archived";

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  status: PageStatus;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "preview", "published", "archived"],
      default: "draft",
    },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PageSchema.index({ status: 1, updatedAt: -1 });
PageSchema.index({ authorId: 1 });

const PageModel: Model<IPage> =
  mongoose.models.Page ?? mongoose.model<IPage>("Page", PageSchema);

export default PageModel;
