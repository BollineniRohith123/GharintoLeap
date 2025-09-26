import { Service } from "encore.dev/service";

export default new Service("payments");

// Import all payment-related APIs
import "./payment_service";
import "./wallet";
import "./credit_management";
