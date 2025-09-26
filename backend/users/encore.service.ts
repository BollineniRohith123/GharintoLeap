import { Service } from "encore.dev/service";

export default new Service("users");

// Import all user-related APIs
import "./list";
import "./profile";
import "./customer_management";
import "./employee_management";
