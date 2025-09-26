import { Service } from "encore.dev/service";

export default new Service("admin");

// Import all admin-related APIs
import "./testimonials_service";
import "./system_settings";
import "./content_management";
import "./platform_administration";
