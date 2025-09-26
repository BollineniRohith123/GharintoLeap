import { Service } from "encore.dev/service";

export default new Service("projects");

// Import all project-related APIs
import "./create";
import "./list";
import "./workflow_service";
import "./project_manager_apis";
