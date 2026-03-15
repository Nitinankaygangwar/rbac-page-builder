import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName:   { type: String, required: true },
    action:     { type: String, required: true },
    resource:   { type: String, required: true },
    resourceId: String,
    details:    Schema.Types.Mixed,
    ip:         String,
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: Record<string, any>) {
        ret.id     = ret._id?.toString();
        ret.userId = ret.userId?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

export async function createAuditLog(data: {
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await AuditLogModel.create(data);
  } catch {
    console.error("Failed to create audit log:", data.action);
  }
}

const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLogModel;