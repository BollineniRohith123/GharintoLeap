import { Service } from "encore.dev/service";

export default new Service("users");

// Import all user-related APIs
import "./list";
import "./profile";
import "./customer_management";
import "./employee_management";
import "./password_reset_service";
import "./portfolio_service";
import "./kyc_service";
import "./preferences_service";
