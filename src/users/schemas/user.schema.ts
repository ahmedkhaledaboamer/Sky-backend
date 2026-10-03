import { applyImageCleanupHooks } from '../../common/uploads/image-cleanup.hooks';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const USER_ROLES = ['user', 'manager', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Schema()
export class Address {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  id?: Types.ObjectId;

  @Prop() alias?: string;
  @Prop() details?: string;
  @Prop() phone?: string;
  @Prop() city?: string;
  @Prop() postalCode?: string;
}
const AddressSchema = SchemaFactory.createForClass(Address);

@Schema({
  timestamps: true,
  // never send the password hash / reset data to the client
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.password;
      delete ret.passwordResetCode;
      delete ret.passwordResetExpires;
      delete ret.passwordResetVerified;
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  @Prop({ trim: true, required: [true, 'name required'] })
  name: string;

  @Prop({ lowercase: true })
  slug?: string;

  @Prop({ required: [true, 'email required'], unique: true, lowercase: true })
  email: string;

  @Prop() phone?: string;
  @Prop() profileImg?: string;

  @Prop({ required: [true, 'password required'], minlength: [6, 'Too short password'] })
  password: string;

  @Prop() passwordChangedAt?: Date;
  @Prop() passwordResetCode?: string;
  @Prop() passwordResetExpires?: Date;
  @Prop() passwordResetVerified?: boolean;

  @Prop({ type: String, enum: USER_ROLES, default: 'user' })
  role: UserRole;

  @Prop({ default: true })
  active: boolean;

  // child reference (one to many)
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Product' }] })
  wishlist: Types.ObjectId[];

  @Prop({ type: [AddressSchema] })
  addresses: Types.DocumentArray<Address>;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// profile pictures are stored in GridFS: drop them when replaced or when the user is deleted
applyImageCleanupHooks(UserSchema, 'users', ['profileImg']);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // Hashing user password
  this.password = await bcrypt.hash(this.password, 12);
});
