import { Service } from "encore.dev/service";

export default new Service("communications");

// Import all communication-related APIs
import "./messages";
import "./notifications";
import "./notification_service";
import "./notification_events";
import "./email_templates";
import "./chat_service";
