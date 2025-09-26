import { Service } from "encore.dev/service";

export default new Service("complaints");

// Import all complaint-related APIs
import "./complaint_management";