import { Service } from "encore.dev/service";

export default new Service("projects");

// Import all project-related APIs
import "./create";
import "./list";
import "./task_management";
import "./change_orders";
import "./timeline_management";
import "./workflow_service";
import "./project_manager_apis";
