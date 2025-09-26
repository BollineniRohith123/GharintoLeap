import { Service } from "encore.dev/service";

export default new Service("system");

// Import all system-related APIs
import "./rbac";
import "./roles";
import "./super_admin_apis";
