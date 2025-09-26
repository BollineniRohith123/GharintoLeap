import { Service } from "encore.dev/service";

export default new Service("analytics");

// Import all analytics-related APIs
import "./analytics_service";
import "./business_intelligence";
import "./performance_monitoring";
import "./custom_reports";
